export type DayType = "weekday" | "saturday" | "sunday";

export type ProfilesIndex = Record<string, {
  hours: Record<number, Record<string, Record<number, number>>>;
  days: Record<number, Record<string, number>>;
  months: Record<number, number>;
}>;

/**
 * Load Santa Cruz factor profiles from the public factors JSON file
 * @returns Promise resolving to the profiles index containing Santa Cruz factors
 * @throws Error if the factors file cannot be loaded
 */
export async function loadProfiles(): Promise<ProfilesIndex> {
  const response = await fetch("/factors/santa_cruz_factors.json");
  if (!response.ok) {
    throw new Error(`Santa Cruz factors load failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
