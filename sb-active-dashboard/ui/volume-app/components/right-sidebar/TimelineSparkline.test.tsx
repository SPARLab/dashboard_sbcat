import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TimelineSparkline from './TimelineSparkline'
import { createMockPolygonGeometry } from '../../../../src/test-utils/factories'

const startDate = new Date('2020-01-01')
const endDate = new Date('2024-12-31')

describe('TimelineSparkline - sorting by site coverage', () => {
  it('sorts sites by total coverage descending (most coverage at the top)', () => {
    const sites = [
      {
        id: 's1',
        name: 'Site One',
        label: 'Site One',
        // coverage = 70
        dataPeriods: [
          { start: 0, end: 20 },
          { start: 40, end: 90 }
        ]
      },
      {
        id: 's2',
        name: 'Site Two',
        label: 'Site Two',
        // coverage = 30
        dataPeriods: [
          { start: 10, end: 25 },
          { start: 60, end: 75 }
        ]
      },
      {
        id: 's3',
        name: 'Site Three',
        label: 'Site Three',
        // coverage = 100
        dataPeriods: [
          { start: 0, end: 100 }
        ]
      }
    ]

    const { container } = render(
      <TimelineSparkline
        sites={sites}
        startDate={startDate}
        endDate={endDate}
        dateRange={'2020 - 2024'}
        selectedGeometry={createMockPolygonGeometry() as any}
      />
    )

    const rowsContainer = container.querySelector('#timeline-sparkline-chart-rows') as HTMLElement
    expect(rowsContainer).toBeTruthy()

    const rowElements = Array.from(rowsContainer.children) as HTMLElement[]
    const labelsInOrder = rowElements.map((el) => {
      const labelEl = el.querySelector('[id^="timeline-sparkline-chart-site-label-"]') as HTMLElement
      return labelEl?.textContent?.trim()
    })

    expect(labelsInOrder).toEqual(['Site Three', 'Site One', 'Site Two'])
  })

  it('uses label as a tie-breaker (alphabetical ascending) when coverage is equal', () => {
    const sites = [
      {
        id: 'a',
        name: 'Alpha Name',
        label: 'Alpha',
        // coverage = 50
        dataPeriods: [
          { start: 0, end: 50 }
        ]
      },
      {
        id: 'b',
        name: 'Beta Name',
        label: 'Beta',
        // coverage = 50
        dataPeriods: [
          { start: 10, end: 60 }
        ]
      }
    ]

    const { container } = render(
      <TimelineSparkline
        sites={sites}
        startDate={startDate}
        endDate={endDate}
        dateRange={'2020 - 2024'}
        selectedGeometry={createMockPolygonGeometry() as any}
      />
    )

    const rowsContainer = container.querySelector('#timeline-sparkline-chart-rows') as HTMLElement
    expect(rowsContainer).toBeTruthy()

    const rowElements = Array.from(rowsContainer.children) as HTMLElement[]
    const labelsInOrder = rowElements.map((el) => {
      const labelEl = el.querySelector('[id^="timeline-sparkline-chart-site-label-"]') as HTMLElement
      return labelEl?.textContent?.trim()
    })

    expect(labelsInOrder).toEqual(['Alpha', 'Beta'])
  })
})

