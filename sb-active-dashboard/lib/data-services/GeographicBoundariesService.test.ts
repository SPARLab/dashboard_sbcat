import { describe, it, expect, beforeEach } from 'vitest';

// TIGER service URLs for testing
const TIGER_URLS = {
  CITIES: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/25',
  SERVICE_AREAS: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/26',
  COUNTIES: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1',
  CENSUS_TRACTS: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0'
};

// Helper function to query TIGER service
async function queryTigerService(url: string, whereClause: string, outFields = 'NAME,STATE,GEOID') {
  const queryUrl = `${url}/query`;
  const params = new URLSearchParams({
    where: whereClause,
    outFields,
    f: 'json',
    returnGeometry: 'false',
    resultRecordCount: '50'
  });

  const response = await fetch(`${queryUrl}?${params}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

describe('TIGER Geographic Boundaries Query Tests', () => {
  // Test timeout for network requests
  const NETWORK_TIMEOUT = 10000;

  describe('Cities Query Validation', () => {
    it('should return Santa Barbara city when querying for Santa Barbara', async () => {
      const whereClause = "STATE = '06' AND NAME LIKE '%Santa Barbara%'";
      const result = await queryTigerService(TIGER_URLS.CITIES, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThan(0);
      
      const santaBarbaraCity = result.features.find((f: any) => 
        f.attributes.NAME.includes('Santa Barbara')
      );
      expect(santaBarbaraCity).toBeDefined();
      expect(santaBarbaraCity.attributes.STATE).toBe('06');
    }, NETWORK_TIMEOUT);

    it('should return Goleta city when querying for Goleta', async () => {
      const whereClause = "STATE = '06' AND NAME LIKE '%Goleta%'";
      const result = await queryTigerService(TIGER_URLS.CITIES, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThan(0);
      
      const goletaCity = result.features.find((f: any) => 
        f.attributes.NAME.includes('Goleta')
      );
      expect(goletaCity).toBeDefined();
      expect(goletaCity.attributes.STATE).toBe('06');
    }, NETWORK_TIMEOUT);

    it('should return multiple cities with combined query for target cities', async () => {
      const cities = ['Santa Barbara', 'Goleta', 'Carpinteria', 'Santa Maria', 'Lompoc', 'Solvang', 'Buellton', 'Guadalupe'];
      const cityFilter = cities.map(city => `NAME LIKE '%${city}%'`).join(' OR ');
      const whereClause = `STATE = '06' AND (${cityFilter})`;
      
      const result = await queryTigerService(TIGER_URLS.CITIES, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThanOrEqual(7); // At least 7 of our target cities
      
      // Verify we get California cities only
      result.features.forEach((feature: any) => {
        expect(feature.attributes.STATE).toBe('06');
      });
      
      // Check for specific cities
      const cityNames = result.features.map((f: any) => f.attributes.NAME);
      const foundCities = cities.filter(city => 
        cityNames.some((name: string) => name.includes(city))
      );
      expect(foundCities.length).toBeGreaterThanOrEqual(7);
    }, NETWORK_TIMEOUT);
  });

  describe('Census Designated Places (CDP) Query Validation', () => {
    it('should return Isla Vista CDP when querying for Isla Vista', async () => {
      const whereClause = "STATE = '06' AND NAME LIKE '%Isla Vista%'";
      const result = await queryTigerService(TIGER_URLS.SERVICE_AREAS, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThan(0);
      
      const islaVistaCDP = result.features.find((f: any) => 
        f.attributes.NAME.includes('Isla Vista')
      );
      expect(islaVistaCDP).toBeDefined();
      expect(islaVistaCDP.attributes.STATE).toBe('06');
    }, NETWORK_TIMEOUT);

    it('should return Eastern Goleta Valley CDP when querying specifically', async () => {
      const whereClause = "STATE = '06' AND NAME LIKE '%Eastern Goleta Valley%'";
      const result = await queryTigerService(TIGER_URLS.SERVICE_AREAS, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThan(0);
      
      const easternGoletaCDP = result.features.find((f: any) => 
        f.attributes.NAME.includes('Eastern Goleta Valley')
      );
      expect(easternGoletaCDP).toBeDefined();
      expect(easternGoletaCDP.attributes.STATE).toBe('06');
    }, NETWORK_TIMEOUT);

    it('should return multiple CDPs with combined query for target places', async () => {
      const places = [
        'Isla Vista', 'Montecito', 'Eastern Goleta Valley', 'Toro Canyon', 'Summerland',
        'Santa Ynez', 'Los Alamos', 'Los Olivos', 'Ballard', 'Mission Hills',
        'Orcutt', 'Vandenberg Village', 'Vandenberg AFB', 'Casmalia', 'Sisquoc',
        'Cuyama', 'New Cuyama', 'Garey'
      ];
      const placeFilter = places.map(place => `NAME LIKE '%${place}%'`).join(' OR ');
      const whereClause = `STATE = '06' AND (${placeFilter})`;
      
      const result = await queryTigerService(TIGER_URLS.SERVICE_AREAS, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThanOrEqual(10); // At least 10 of our target CDPs
      
      // Verify we get California places only
      result.features.forEach((feature: any) => {
        expect(feature.attributes.STATE).toBe('06');
      });
      
      // Check for specific places
      const placeNames = result.features.map((f: any) => f.attributes.NAME);
      const foundPlaces = places.filter(place => 
        placeNames.some((name: string) => name.includes(place))
      );
      expect(foundPlaces.length).toBeGreaterThanOrEqual(10);
    }, NETWORK_TIMEOUT);
  });

  describe('County Query Validation', () => {
    it('should return Santa Barbara County when querying for target counties', async () => {
      const whereClause = "NAME IN ('Santa Barbara County', 'San Luis Obispo County') OR NAME LIKE '%Santa Barbara%' OR NAME LIKE '%San Luis Obispo%'";
      const result = await queryTigerService(TIGER_URLS.COUNTIES, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThanOrEqual(2); // Should get both counties
      
      const santaBarbaraCounty = result.features.find((f: any) => 
        f.attributes.NAME.includes('Santa Barbara')
      );
      expect(santaBarbaraCounty).toBeDefined();
      
      const sloCounty = result.features.find((f: any) => 
        f.attributes.NAME.includes('San Luis Obispo')
      );
      expect(sloCounty).toBeDefined();
    }, NETWORK_TIMEOUT);

    it('should return exactly our target counties and no others from California', async () => {
      const whereClause = "NAME IN ('Santa Barbara County', 'San Luis Obispo County')";
      const result = await queryTigerService(TIGER_URLS.COUNTIES, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBe(2); // Exactly 2 counties
      
      const countyNames = result.features.map((f: any) => f.attributes.NAME);
      expect(countyNames).toContain('Santa Barbara County');
      expect(countyNames).toContain('San Luis Obispo County');
    }, NETWORK_TIMEOUT);
  });

  describe('Census Tract Query Validation', () => {
    it('should return census tracts for Santa Barbara County using GEOID filtering', async () => {
      const whereClause = "GEOID LIKE '06083%'";
      const result = await queryTigerService(TIGER_URLS.CENSUS_TRACTS, whereClause);
      
      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThan(0);
      
      // Verify all returned tracts are from Santa Barbara County (GEOID starts with 06083)
      result.features.forEach((feature: any) => {
        expect(feature.attributes.GEOID).toMatch(/^06083/);
      });
    }, NETWORK_TIMEOUT);

    it('should not return census tracts from other counties', async () => {
      const whereClause = "GEOID LIKE '06083%'";
      const result = await queryTigerService(TIGER_URLS.CENSUS_TRACTS, whereClause);
      
      // Verify no tracts from neighboring counties (e.g., Ventura County 06111, Kern County 06029)
      result.features.forEach((feature: any) => {
        expect(feature.attributes.GEOID).not.toMatch(/^06111/); // Not Ventura County
        expect(feature.attributes.GEOID).not.toMatch(/^06029/); // Not Kern County
        expect(feature.attributes.GEOID).not.toMatch(/^06079/); // Not San Luis Obispo County
      });
    }, NETWORK_TIMEOUT);
  });

  describe('SQL Query Syntax Validation', () => {
    it('should construct valid SQL WHERE clauses for cities', async () => {
      const cities = ['Santa Barbara', 'Goleta', 'Carpinteria', 'Santa Maria'];
      const cityFilter = cities.map(city => `NAME LIKE '%${city}%'`).join(' OR ');
      const whereClause = `STATE = '06' AND (${cityFilter})`;
      
      // Test that the query is syntactically valid by executing it
      const result = await queryTigerService(TIGER_URLS.CITIES, whereClause);
      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
      
      // Verify proper quote escaping (no unmatched quotes)
      expect((whereClause.match(/'/g) || []).length % 2).toBe(0);
    }, NETWORK_TIMEOUT);

    it('should construct valid SQL WHERE clauses for CDPs', async () => {
      const places = ['Isla Vista', 'Montecito', 'Eastern Goleta Valley'];
      const placeFilter = places.map(place => `NAME LIKE '%${place}%'`).join(' OR ');
      const whereClause = `STATE = '06' AND (${placeFilter})`;
      
      // Test that the query is syntactically valid by executing it
      const result = await queryTigerService(TIGER_URLS.SERVICE_AREAS, whereClause);
      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
      
      // Verify proper quote escaping
      expect((whereClause.match(/'/g) || []).length % 2).toBe(0);
    }, NETWORK_TIMEOUT);
  });

  describe('Geographic Coverage Integration Test', () => {
    it('should return comprehensive geographic coverage for Santa Barbara and San Luis Obispo counties', async () => {
      // Test the exact queries our service uses
      const cityQuery = "STATE = '06' AND (NAME LIKE '%Santa Barbara%' OR NAME LIKE '%Goleta%' OR NAME LIKE '%Carpinteria%' OR NAME LIKE '%Santa Maria%' OR NAME LIKE '%Lompoc%' OR NAME LIKE '%Solvang%' OR NAME LIKE '%Buellton%' OR NAME LIKE '%Guadalupe%')";
      const cdpQuery = "STATE = '06' AND (NAME LIKE '%Isla Vista%' OR NAME LIKE '%Montecito%' OR NAME LIKE '%Eastern Goleta Valley%' OR NAME LIKE '%Toro Canyon%' OR NAME LIKE '%Summerland%' OR NAME LIKE '%Santa Ynez%' OR NAME LIKE '%Los Alamos%' OR NAME LIKE '%Los Olivos%' OR NAME LIKE '%Ballard%' OR NAME LIKE '%Mission Hills%' OR NAME LIKE '%Orcutt%' OR NAME LIKE '%Vandenberg Village%' OR NAME LIKE '%Vandenberg AFB%' OR NAME LIKE '%Casmalia%' OR NAME LIKE '%Sisquoc%' OR NAME LIKE '%Cuyama%' OR NAME LIKE '%New Cuyama%' OR NAME LIKE '%Garey%' OR NAME LIKE '%Santa Maria%')";
      const countyQuery = "NAME IN ('Santa Barbara County', 'San Luis Obispo County') OR NAME LIKE '%Santa Barbara%' OR NAME LIKE '%San Luis Obispo%'";
      const censusTractQuery = "GEOID LIKE '06083%'"; // Santa Barbara County census tracts only
      
      // Execute all queries in parallel
      const [cityResult, cdpResult, countyResult, censusTractResult] = await Promise.all([
        queryTigerService(TIGER_URLS.CITIES, cityQuery),
        queryTigerService(TIGER_URLS.SERVICE_AREAS, cdpQuery),
        queryTigerService(TIGER_URLS.COUNTIES, countyQuery),
        queryTigerService(TIGER_URLS.CENSUS_TRACTS, censusTractQuery)
      ]);
      
      // Verify we get results from all queries
      expect(cityResult.features.length).toBeGreaterThan(0);
      expect(cdpResult.features.length).toBeGreaterThan(0);
      expect(countyResult.features.length).toBeGreaterThanOrEqual(2);
      expect(censusTractResult.features.length).toBeGreaterThan(0);
      
      // Verify Eastern Goleta Valley is included (the main fix we implemented)
      const easternGoleta = cdpResult.features.find((f: any) => 
        f.attributes.NAME.includes('Eastern Goleta Valley')
      );
      expect(easternGoleta).toBeDefined();
      
      // Verify we get both target counties
      const countyNames = countyResult.features.map((f: any) => f.attributes.NAME);
      expect(countyNames.some((name: string) => name.includes('Santa Barbara'))).toBe(true);
      expect(countyNames.some((name: string) => name.includes('San Luis Obispo'))).toBe(true);
      
      // Verify all census tracts are from Santa Barbara County
      censusTractResult.features.forEach((feature: any) => {
        expect(feature.attributes.GEOID).toMatch(/^06083/);
      });
      
      // Verify all results are from California
      [...cityResult.features, ...cdpResult.features].forEach((feature: any) => {
        expect(feature.attributes.STATE).toBe('06');
      });
    }, NETWORK_TIMEOUT);
  });
});