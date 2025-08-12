import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ArcGIS modules globally since they're used throughout the app
vi.mock('@arcgis/core/geometry/Polygon', () => ({
  default: vi.fn().mockImplementation(() => ({
    extent: {
      xmin: -120,
      ymin: 34,
      xmax: -119,
      ymax: 35
    },
    type: 'polygon',
    contains: vi.fn().mockReturnValue(true),
    intersects: vi.fn().mockReturnValue(true)
  }))
}))

vi.mock('@arcgis/core/layers/FeatureLayer', () => ({
  default: vi.fn().mockImplementation(() => ({
    id: 'mock-layer',
    queryFeatures: vi.fn().mockResolvedValue({
      features: []
    }),
    createQuery: vi.fn().mockReturnValue({
      where: '',
      outFields: [],
      returnGeometry: false
    })
  }))
}))

vi.mock('@arcgis/core/layers/GraphicsLayer', () => ({
  default: vi.fn().mockImplementation(() => ({
    id: 'mock-graphics-layer',
    add: vi.fn(),
    removeAll: vi.fn(),
    graphics: {
      length: 0
    }
  }))
}))

vi.mock('@arcgis/core/views/MapView', () => ({
  default: vi.fn().mockImplementation(() => ({
    extent: {
      xmin: -120,
      ymin: 34,
      xmax: -119,
      ymax: 35
    },
    map: {
      add: vi.fn(),
      remove: vi.fn()
    }
  }))
}))

vi.mock('@arcgis/core/symbols/SimpleLineSymbol', () => ({
  default: vi.fn()
}))

vi.mock('@arcgis/core/symbols/SimpleMarkerSymbol', () => ({
  default: vi.fn()
}))

vi.mock('@arcgis/core/Graphic', () => ({
  default: vi.fn()
}))

// Mock ECharts components
vi.mock('echarts-for-react', () => ({
  default: vi.fn(({ option, onEvents, style }) => {
    const mockChart = document.createElement('div')
    mockChart.setAttribute('data-testid', 'echarts-mock')
    mockChart.setAttribute('data-option', JSON.stringify(option || {}))
    mockChart.style.width = style?.width || '100%'
    mockChart.style.height = style?.height || '400px'
    mockChart.textContent = 'Mocked ECharts Component'
    
    // Simulate event handlers if provided
    if (onEvents) {
      mockChart.addEventListener('click', () => {
        if (onEvents.click) {
          onEvents.click({ value: 100, name: 'Test', seriesName: 'MockSeries' })
        }
      })
      
      mockChart.addEventListener('mouseover', () => {
        if (onEvents.mouseover) {
          onEvents.mouseover({ value: 100, name: 'Test', seriesName: 'MockSeries' })
        }
      })
    }
    
    return mockChart
  })
}))

// Mock window.ResizeObserver for charts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock HTMLCanvasElement.getContext for chart rendering
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => new Array(4)),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
})

// Suppress console warnings during tests for cleaner output
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = vi.fn((message) => {
    // Only suppress specific warnings we expect in tests
    if (
      typeof message === 'string' && 
      (message.includes('Warning: ReactDOM.render') ||
       message.includes('Warning: validateDOMNesting') ||
       message.includes('ArcGIS'))
    ) {
      return
    }
    originalWarn(message)
  })
  
  console.error = vi.fn((message) => {
    // Suppress expected test errors
    if (
      typeof message === 'string' && 
      (message.includes('Warning: ReactDOM.render') ||
       message.includes('ArcGIS'))
    ) {
      return
    }
    originalError(message)
  })
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})