#!/usr/bin/env python3
"""
Usage:
  python3 scripts/histogram_avg_hourly_per_site_day.py /path/to/full_raw_counts_YYYY-YYYY.json 2022 7

Reads the exported JSON (full raw counts), computes:
  - average hourly traffic per site-day, then
  - daily average across sites (for each calendar day)

Outputs a line chart where x = day of month, y = average hourly traffic (across sites).
Also prints summary stats and saves a PNG.
"""

import json
import sys
from datetime import datetime, timezone
from statistics import mean, median
import math

import matplotlib
matplotlib.use("Agg")  # headless/non-interactive backend
import matplotlib.pyplot as plt


def parse_ts(ts):
    # Accept ISO string or epoch millis/seconds
    if isinstance(ts, (int, float)):
        # heuristically treat as ms if large
        if ts > 1e12:
            ts = ts / 1000.0
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        except Exception:
            pass
        try:
            base = ts.split('.')[0]
            return datetime.fromisoformat(base.replace('Z', '+00:00'))
        except Exception:
            pass
    raise ValueError(f"Unrecognized timestamp: {ts!r}")


def main():
    if len(sys.argv) < 4:
        print("usage: python3 scripts/histogram_avg_hourly_per_site_day.py <full_raw_counts.json> <year> <month>")
        sys.exit(1)

    path = sys.argv[1]
    year = int(sys.argv[2])
    month = int(sys.argv[3])

    with open(path, 'r') as f:
        data = json.load(f)

    # Flexible field readers (handles varied attribute schemas)
    def get_site_id(rec):
        for k in ('site_id', 'siteID', 'site', 'SITE_ID', 'id'):
            if k in rec:
                return rec[k]
        raise KeyError("site_id not found")

    def get_counts(rec):
        for k in ('counts', 'count', 'COUNT', 'value'):
            if k in rec:
                return rec[k]
        return None

    def get_timestamp(rec):
        for k in ('timestamp', 'Timestamp', 'TIMESTAMP', 'date', 'DATE'):
            if k in rec:
                return rec[k]
        raise KeyError("timestamp not found")

    # Filter to month/year and valid counts
    filtered = []
    for rec in data:
        try:
            cnt = get_counts(rec)
            if cnt is None or not isinstance(cnt, (int, float)) or cnt <= 0:
                continue

            dt = parse_ts(get_timestamp(rec))
            if dt.year != year or dt.month != month:
                continue

            site_id = get_site_id(rec)
            filtered.append((site_id, dt.date().isoformat(), float(cnt)))
        except Exception:
            # Skip malformed
            continue

    # Group by (site_id, date) and compute avg per hour for that site-day
    from collections import defaultdict
    totals = defaultdict(float)
    hours = defaultdict(int)

    for site_id, date_str, cnt in filtered:
        key = (site_id, date_str)
        totals[key] += cnt
        hours[key] += 1

    site_day_avgs = []
    for key in totals:
        h = hours[key]
        if h > 0:
            site_day_avgs.append(totals[key] / h)

    if not site_day_avgs:
        print("No site-day averages found for the specified month.")
        return

    print(f"Month {year}-{str(month).zfill(2)}")
    print(f"Site-days: {len(site_day_avgs)}")
    print(f"Mean avg/hour (site-day): {mean(site_day_avgs):.2f}")
    print(f"Median avg/hour (site-day): {median(site_day_avgs):.2f}")
    print(f"Min/Max avg/hour (site-day): {min(site_day_avgs):.2f} / {max(site_day_avgs):.2f}")

    # Aggregate to day-level mean across sites
    from collections import defaultdict
    day_to_site_avgs = defaultdict(list)
    for (site_id, date_str), _ in hours.items():
        # recompute site-day avg from maps to avoid rounding
        avg = totals[(site_id, date_str)] / hours[(site_id, date_str)]
        day_to_site_avgs[date_str].append(avg)

    # Sort by date and compute per-day mean across sites
    sorted_days = sorted(day_to_site_avgs.keys())
    y_values = [mean(day_to_site_avgs[d]) for d in sorted_days]
    x_values = [int(d.split('-')[-1]) for d in sorted_days]  # day of month as int

    # Line chart: x = day, y = avg hourly traffic across sites
    plt.figure(figsize=(9, 5))
    plt.plot(x_values, y_values, marker='o', color="#3b82f6", linewidth=2)
    plt.title(f"Average Hourly Traffic Across Sites by Day\n{year}-{str(month).zfill(2)}")
    plt.xlabel("Day of month")
    plt.ylabel("Average hourly traffic (counts/hour)")
    plt.grid(alpha=0.25, linestyle='--')
    plt.xticks(x_values)
    plt.tight_layout()
    out = f"daily_avg_hourly_across_sites_{year}_{month}.png"
    plt.savefig(out, dpi=150)
    print(f"Saved line chart to {out}")


if __name__ == '__main__':
    main()

