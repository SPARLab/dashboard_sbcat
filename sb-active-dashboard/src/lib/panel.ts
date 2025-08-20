export type SiteYear = { siteId: string; year: number; aadx: number };

export function listYears(rows: SiteYear[]): number[] {
  return Array.from(new Set(rows.map(r => r.year))).sort((a,b)=>a-b);
}

export function sitesByYear(rows: SiteYear[]): Map<number, Set<string>> {
  const m = new Map<number, Set<string>>();
  for (const r of rows) {
    const s = m.get(r.year) ?? new Set<string>();
    s.add(r.siteId);
    m.set(r.year, s);
  }
  return m;
}

export function overlapSites(rows: SiteYear[], y0: number, y1: number) {
  const byYear = sitesByYear(rows);
  const s0 = byYear.get(y0) ?? new Set<string>();
  const s1 = byYear.get(y1) ?? new Set<string>();
  const sharedSites = [...s0].filter(id => s1.has(id));
  const onlyInY0 = [...s0].filter(id => !s1.has(id));
  const onlyInY1 = [...s1].filter(id => !s0.has(id));
  return { 
    sharedSites, 
    onlyInY0, 
    onlyInY1, 
    sharedCount: sharedSites.length,
    totalY0: s0.size,
    totalY1: s1.size
  };
}

export function sharedSiteMean(rows: SiteYear[], year: number, sharedSites: string[]): number {
  const xs = rows.filter(r => r.year === year && sharedSites.includes(r.siteId)).map(r => r.aadx);
  if (!xs.length) return NaN;
  return xs.reduce((a,b)=>a+b,0) / xs.length;
}

export function computeSharedSiteYoY(rows: SiteYear[], y0: number, y1: number) {
  const { sharedSites, onlyInY0, onlyInY1, sharedCount, totalY0, totalY1 } = overlapSites(rows, y0, y1);

  const m0 = sharedSiteMean(rows, y0, sharedSites);
  const m1 = sharedSiteMean(rows, y1, sharedSites);
  const ok = sharedCount > 0 && isFinite(m0) && isFinite(m1) && m0 > 0;

  const yoy = ok ? m1 / m0 - 1 : null;

  return { 
    ok, 
    yoy, 
    mean0: m0, 
    mean1: m1, 
    sharedCount, 
    sharedSites, 
    onlyInY0, 
    onlyInY1,
    totalY0,
    totalY1
  };
}
