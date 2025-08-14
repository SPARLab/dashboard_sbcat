import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PercentOfNetworkByVolumeLevelBarChart from './PercentOfNetworkByVolumeLevelBarChart'
import { createMockPolygonGeometry, createMockMapView } from '../../../../src/test-utils/factories'

// Mock the data service used inside the component to control returned values
vi.mock('../../../../lib/data-services/ModeledVolumeChartDataService', () => {
  return {
    ModeledVolumeChartDataService: class {
      async getTrafficLevelBreakdownData() {
        return {
          categories: ['Low', 'Medium', 'High'],
          totalMiles: [20, 60, 20],
          percentages: [20, 60, 20],
          details: {
            low: { miles: 20, percentage: 20, segments: 2 },
            medium: { miles: 60, percentage: 60, segments: 6 },
            high: { miles: 20, percentage: 20, segments: 2 },
          },
          totalNetworkMiles: 100,
        }
      }
    }
  }
})

describe('PercentOfNetworkByVolumeLevelBarChart', () => {
  const baseProps = {
    dataType: 'modeled-data',
    horizontalMargins: 'mx-4',
    mapView: createMockMapView() as any,
    showBicyclist: true,
    showPedestrian: true,
    modelCountsBy: 'cost-benefit',
    year: 2023,
    selectedGeometry: createMockPolygonGeometry() as any,
  }

  it('renders title and description for percent view', async () => {
    render(<PercentOfNetworkByVolumeLevelBarChart {...baseProps} />)

    expect(screen.getByText('Percent of Network by Volume Level')).toBeInTheDocument()
    expect(screen.getByText(/Percent of network miles assigned to each category/)).toBeInTheDocument()
  })

  it('maps service percentages directly to chart data (sanity check)', async () => {
    const { container } = render(<PercentOfNetworkByVolumeLevelBarChart {...baseProps} />)

    // Wait for the component to load and render the chart
    await screen.findByText('Mocked ECharts Component')

    // Our echarts mock stores the provided option JSON on the element for inspection
    const chartEl = container.querySelector('[data-testid="echarts-mock"]') as HTMLElement
    expect(chartEl).toBeTruthy()

    const option = JSON.parse(chartEl.getAttribute('data-option') || '{}')
    const seriesData = (option?.series?.[0]?.data || []).map((d: any) => d.value)
    expect(seriesData).toEqual([20, 60, 20])
  })

  it('formats tooltip percent text when hovering (uses event wiring)', async () => {
    // Import the mock to access the React component directly
    const ReactECharts = await import('echarts-for-react')
    const originalMock = ReactECharts.default as any

    // Set up a custom mock that calls the onEvents.mouseover handler
    let mockOnEvents: any = null
    ReactECharts.default = vi.fn(({ onEvents, ...props }) => {
      mockOnEvents = onEvents
      return originalMock({ onEvents, ...props })
    })

    render(<PercentOfNetworkByVolumeLevelBarChart {...baseProps} />)

    // Wait for the chart to load
    await screen.findByText('Mocked ECharts Component')

    // Directly call the mouseover event handler with our test value
    expect(mockOnEvents).toBeTruthy()
    expect(mockOnEvents.mouseover).toBeTruthy()
    
    mockOnEvents.mouseover({ value: 42.345 })

    // Tooltip should show our formatted percentage value
    expect(await screen.findByText('42.3% of Network')).toBeInTheDocument()

    // Restore the original mock
    ReactECharts.default = originalMock
  })

  it('drops trailing .0 for whole-number percentages', async () => {
    // Import the mock to access the React component directly
    const ReactECharts = await import('echarts-for-react')
    const originalMock = ReactECharts.default as any

    // Set up a custom mock that calls the onEvents.mouseover handler
    let mockOnEvents: any = null
    ReactECharts.default = vi.fn(({ onEvents, ...props }) => {
      mockOnEvents = onEvents
      return originalMock({ onEvents, ...props })
    })

    render(<PercentOfNetworkByVolumeLevelBarChart {...baseProps} />)

    // Wait for the chart to load
    await screen.findByText('Mocked ECharts Component')

    // Directly call the mouseover event handler with a whole number value
    expect(mockOnEvents).toBeTruthy()
    expect(mockOnEvents.mouseover).toBeTruthy()
    
    mockOnEvents.mouseover({ value: 60.0 })

    expect(await screen.findByText('60% of Network')).toBeInTheDocument()

    // Restore the original mock
    ReactECharts.default = originalMock
  })
})
