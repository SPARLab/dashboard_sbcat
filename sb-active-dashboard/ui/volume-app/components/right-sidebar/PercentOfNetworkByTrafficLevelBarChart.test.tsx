import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PercentOfNetworkByTrafficLevelBarChart from './PercentOfNetworkByTrafficLevelBarChart'
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

describe('PercentOfNetworkByTrafficLevelBarChart', () => {
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
    render(<PercentOfNetworkByTrafficLevelBarChart {...baseProps} />)

    expect(screen.getByText('Percent of Network by Traffic Level')).toBeInTheDocument()
    expect(screen.getByText(/Percent of network miles assigned to each category/)).toBeInTheDocument()
  })

  it('maps service percentages directly to chart data (sanity check)', async () => {
    const { container } = render(<PercentOfNetworkByTrafficLevelBarChart {...baseProps} />)

    // Our echarts mock stores the provided option JSON on the element for inspection
    const chartEl = container.querySelector('[data-testid="echarts-mock"]') as HTMLElement
    expect(chartEl).toBeTruthy()

    const option = JSON.parse(chartEl.getAttribute('data-option') || '{}')
    const seriesData = (option?.series?.[0]?.data || []).map((d: any) => d.value)
    expect(seriesData).toEqual([20, 60, 20])
  })

  it('formats tooltip percent text when hovering (uses event wiring)', async () => {
    // The echarts mock triggers mouseover and sets value 100 in test-setup,
    // but we want to verify percent formatting path. We'll override the mock locally.
    const addEventListenerSpy = vi.spyOn(Element.prototype, 'addEventListener')
    render(<PercentOfNetworkByTrafficLevelBarChart {...baseProps} />)

    // Find the last call to mouseover registration and invoke the handler with a custom value
    const mouseoverCall = addEventListenerSpy.mock.calls.find((c) => c[0] === 'mouseover')
    expect(mouseoverCall).toBeTruthy()
    const handler = mouseoverCall?.[1] as (e: any) => void
    handler?.({ value: 42.345 })

    // Tooltip should show our formatted percentage value
    expect(await screen.findByText('42.3% of Network')).toBeInTheDocument()
  })

  it('drops trailing .0 for whole-number percentages', async () => {
    const addEventListenerSpy = vi.spyOn(Element.prototype, 'addEventListener')
    render(<PercentOfNetworkByTrafficLevelBarChart {...baseProps} />)

    const mouseoverCall = addEventListenerSpy.mock.calls.find((c) => c[0] === 'mouseover')
    const handler = mouseoverCall?.[1] as (e: any) => void
    handler?.({ value: 60.0 })

    expect(await screen.findByText('60% of Network')).toBeInTheDocument()
  })
})

