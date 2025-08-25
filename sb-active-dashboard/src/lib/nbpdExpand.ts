import { ProfilesIndex, DayType } from "./factors";

/**
 * Infer day type (weekday/saturday/sunday) from ISO date string
 * @param dateISO Date string in YYYY-MM-DD format
 * @returns Day type for NBPD factor lookup
 */
export function inferDayType(dateISO: string): DayType {
  const date = new Date(dateISO);
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0) return "sunday";
  if (dayOfWeek === 6) return "saturday";
  return "weekday";
}

/**
 * Infer day name from ISO date string
 * @param dateISO Date string in YYYY-MM-DD format
 * @returns Day name for NBPD factor lookup
 */
export function inferDayName(dateISO: string): string {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const date = new Date(dateISO);
  return dayNames[date.getUTCDay()];
}

/**
 * Hour observation record
 */
export type HourObs = { 
  hour: number; 
  count: number; 
};

/**
 * Short-duration count record before NBPD expansion
 */
export type ShortRecord = {
  siteId: string;
  mode: "bike" | "ped";
  context: "PATH" | "PED";
  date: string; // YYYY-MM-DD
  hours: HourObs[];
};

/**
 * Result of NBPD expansion with warnings
 */
export type ExpansionResult = {
  aadx: number;
  warnings: string[];
};

/**
 * Expand short-duration count record to Annual Average Daily X (AADX) using NBPD factors
 * 
 * Process:
 * 1. Sum hourly counts × hour factors to get Average Daily Traffic (ADT)
 * 2. Multiply ADT × day factor to get Monthly Average Daily Traffic (MADT)
 * 3. Multiply MADT × month factor to get Annual Average Daily X (AADX)
 * 
 * @param record Short-duration count record
 * @param profileKey NBPD profile key (e.g., "NBPD_PATH_moderate_2009")
 * @param profiles Loaded NBPD profiles index
 * @returns Expansion result with AADX value and any warnings
 * @throws Error if profile or required factors are missing
 */
export function expandToAADX(
  record: ShortRecord,
  profileKey: string,
  profiles: ProfilesIndex
): ExpansionResult {
  const profile = profiles[profileKey];
  if (!profile) {
    throw new Error(`Unknown NBPD profile: ${profileKey}`);
  }

  const date = new Date(record.date);
  const month = date.getUTCMonth() + 1; // Convert 0-11 to 1-12
  const dayType = inferDayType(record.date);
  const dayName = inferDayName(record.date);

  // Step 1: Calculate ADT from hourly observations
  let adt = 0;
  const hourFactors = profile.hours?.[month]?.[dayType] ?? {};
  const warnings: string[] = [];

  // Check if profile has hourly factors
  const hasHourlyFactors = Object.keys(hourFactors).length > 0;
  
  if (hasHourlyFactors) {
    // Use hourly factors for expansion (NBPD style)
    for (const hourObs of record.hours) {
      const hourFactor = hourFactors[hourObs.hour];
      if (hourFactor == null) {
        warnings.push(`Missing hour factor: month=${month}, dayType=${dayType}, hour=${hourObs.hour}`);
        continue; // Skip hours without factors (outside 6-21 range)
      }
      adt += hourObs.count * hourFactor;
    }
  } else {
    // No hourly factors - assume input is already daily total (Santa Cruz style)
    adt = record.hours.reduce((sum, hourObs) => sum + hourObs.count, 0);
    warnings.push(`Profile ${profileKey} has no hourly factors - treating input as daily total`);
  }

  // Step 2: Get day factor and calculate MADT
  const dayFactor = profile.days?.[month]?.[dayName];
  if (dayFactor == null) {
    throw new Error(`Missing day factor: month=${month}, dayName=${dayName}`);
  }
  const madt = adt * dayFactor;

  // Step 3: Get month factor and calculate AADX
  const monthFactor = profile.months?.[month];
  if (monthFactor == null) {
    throw new Error(`Missing month factor: month=${month}`);
  }
  const aadx = madt * monthFactor;

  return { 
    aadx: Math.round(aadx * 100) / 100, // Round to 2 decimal places
    warnings 
  };
}
