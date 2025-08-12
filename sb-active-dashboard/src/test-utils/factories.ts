import { faker } from '@faker-js/faker'
import { vi } from 'vitest'

// Test data factory for HighestVolume component data
export const createMockHighestVolumeSite = (overrides: Partial<{
  siteId: number
  siteName: string
  bikeAADT: number
  pedAADT: number
  totalAADT: number
  locality: string
}> = {}) => ({
  siteId: faker.number.int({ min: 1, max: 1000 }),
  siteName: faker.location.streetAddress(),
  bikeAADT: faker.number.int({ min: 10, max: 500 }),
  pedAADT: faker.number.int({ min: 5, max: 200 }),
  totalAADT: 0, // Will be calculated
  locality: faker.location.city(),
  ...overrides
})

export const createMockHighestVolumeData = (count: number = 5, overrides: any = {}) => {
  const sites = Array.from({ length: count }, (_, index) => {
    const site = createMockHighestVolumeSite({
      siteId: index + 1,
      siteName: `Test Site ${String.fromCharCode(65 + index)}`, // A, B, C, etc.
      ...overrides
    })
    // Calculate totalAADT
    site.totalAADT = site.bikeAADT + site.pedAADT
    return site
  })

  // Sort by totalAADT descending (highest first)
  sites.sort((a, b) => b.totalAADT - a.totalAADT)

  return { sites }
}

// Factory for YearToYearComparison data
export const createMockYearToYearData = (overrides: any = {}) => ({
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    {
      name: '2023',
      data: Array.from({ length: 6 }, () => faker.number.int({ min: 50, max: 300 }))
    },
    {
      name: '2024', 
      data: Array.from({ length: 6 }, () => faker.number.int({ min: 50, max: 300 }))
    }
  ],
  totalsByYear: {
    2023: faker.number.int({ min: 1000, max: 5000 }),
    2024: faker.number.int({ min: 1000, max: 5000 })
  },
  ...overrides
})

// Factory for ArcGIS geometry
export const createMockPolygonGeometry = (overrides: any = {}) => ({
  extent: {
    xmin: faker.location.longitude({ min: -125, max: -115 }),
    ymin: faker.location.latitude({ min: 32, max: 37 }),
    xmax: faker.location.longitude({ min: -125, max: -115 }),
    ymax: faker.location.latitude({ min: 32, max: 37 })
  },
  type: 'polygon',
  contains: () => true,
  intersects: () => true,
  ...overrides
})

// Factory for MapView
export const createMockMapView = (overrides: any = {}) => ({
  extent: {
    xmin: -120.5,
    ymin: 34.3,
    xmax: -119.5,
    ymax: 34.8
  },
  map: {
    add: vi.fn(),
    remove: vi.fn()
  },
  ...overrides
})

// Factory for FeatureLayer
export const createMockFeatureLayer = (id: string, overrides: any = {}) => ({
  id,
  queryFeatures: vi.fn(() => Promise.resolve({
    features: []
  })),
  createQuery: vi.fn(() => ({
    where: '',
    outFields: [],
    returnGeometry: false
  })),
  ...overrides
})

// Factory for VolumeChartDataService responses
export const createMockVolumeServiceResponse = (type: 'highest-volume' | 'summary-stats' | 'year-comparison') => {
  switch (type) {
    case 'highest-volume':
      return createMockHighestVolumeData()
    case 'summary-stats':
      return {
        totalBikeVolume: faker.number.int({ min: 1000, max: 10000 }),
        totalPedVolume: faker.number.int({ min: 500, max: 5000 }),
        avgDailyBike: faker.number.int({ min: 50, max: 500 }),
        avgDailyPed: faker.number.int({ min: 25, max: 250 }),
        siteCount: faker.number.int({ min: 5, max: 50 })
      }
    case 'year-comparison':
      return createMockYearToYearData()
    default:
      return {}
  }
}

// Factory for filter combinations
export const createFilterCombinations = () => [
  { showBicyclist: true, showPedestrian: true, description: 'Both modes' },
  { showBicyclist: true, showPedestrian: false, description: 'Bicycle only' },
  { showBicyclist: false, showPedestrian: true, description: 'Pedestrian only' },
  { showBicyclist: false, showPedestrian: false, description: 'No modes (edge case)' }
]

// Factory for date ranges
export const createMockDateRange = (overrides: any = {}) => ({
  startDate: new Date('2023-01-01'),
  endDate: new Date('2024-12-31'),
  ...overrides
})

// Helper to create realistic volume data with proper rankings
export const createRealisticVolumeData = () => {
  const sites = [
    { siteName: 'Downtown Transit Hub', bikeAADT: 450, pedAADT: 200 },
    { siteName: 'University Campus', bikeAADT: 380, pedAADT: 150 },
    { siteName: 'Beach Boardwalk', bikeAADT: 120, pedAADT: 300 },
    { siteName: 'Shopping District', bikeAADT: 200, pedAADT: 180 },
    { siteName: 'Residential Area', bikeAADT: 80, pedAADT: 60 }
  ].map((site, index) => ({
    siteId: index + 1,
    siteName: site.siteName,
    bikeAADT: site.bikeAADT,
    pedAADT: site.pedAADT,
    totalAADT: site.bikeAADT + site.pedAADT,
    locality: 'Santa Barbara'
  }))

  // Sort by total volume (highest first)
  sites.sort((a, b) => b.totalAADT - a.totalAADT)

  return { sites }
}

// Factory for creating filter-specific data
export const createFilteredVolumeData = (showBicyclist: boolean, showPedestrian: boolean) => {
  const baseData = createRealisticVolumeData()
  
  return {
    sites: baseData.sites.map(site => ({
      ...site,
      // Simulate filtering by zeroing out excluded modes
      bikeAADT: showBicyclist ? site.bikeAADT : 0,
      pedAADT: showPedestrian ? site.pedAADT : 0,
      totalAADT: (showBicyclist ? site.bikeAADT : 0) + (showPedestrian ? site.pedAADT : 0)
    })).filter(site => site.totalAADT > 0) // Remove sites with no relevant data
      .sort((a, b) => b.totalAADT - a.totalAADT) // Re-sort after filtering
  }
}