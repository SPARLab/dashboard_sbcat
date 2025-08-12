import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { vi } from 'vitest'

// Extended render function for components that need providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  // For now, just use standard render
  // In the future, you can add providers like React Query, Context providers, etc.
  return render(ui, options)
}

// Helper to wait for async operations to complete
export const waitForAsyncOperations = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper to create mock functions that track calls
export const createMockFunction = (returnValue?: any) => {
  const mockFn = vi.fn()
  if (returnValue !== undefined) {
    mockFn.mockReturnValue(returnValue)
  }
  return mockFn
}

// Helper to create async mock functions
export const createAsyncMockFunction = (resolveValue?: any, rejectValue?: any) => {
  const mockFn = vi.fn()
  if (rejectValue) {
    mockFn.mockRejectedValue(rejectValue)
  } else {
    mockFn.mockResolvedValue(resolveValue)
  }
  return mockFn
}

// Helper to simulate user interactions with delays
export const simulateUserDelay = (delay: number = 100) => 
  new Promise(resolve => setTimeout(resolve, delay))

// Helper to assert function calls with flexible matching
export const expectFunctionToHaveBeenCalledWith = (
  mockFn: any,
  expectedArgs: any[],
  callIndex: number = 0
) => {
  expect(mockFn).toHaveBeenCalled()
  const actualArgs = mockFn.mock.calls[callIndex]
  expectedArgs.forEach((expectedArg, index) => {
    if (typeof expectedArg === 'object' && expectedArg !== null) {
      expect(actualArgs[index]).toMatchObject(expectedArg)
    } else {
      expect(actualArgs[index]).toBe(expectedArg)
    }
  })
}

// Helper to create controlled promises for testing loading states
export const createControlledPromise = <T>() => {
  let resolve: (value: T) => void
  let reject: (reason?: any) => void
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  
  return {
    promise,
    resolve: resolve!,
    reject: reject!
  }
}

// Helper to test component prop changes
export const testPropChanges = async (
  component: any,
  initialProps: any,
  propChanges: any[],
  assertions: ((props: any) => void)[]
) => {
  const { rerender } = component
  
  for (let i = 0; i < propChanges.length; i++) {
    const newProps = { ...initialProps, ...propChanges[i] }
    rerender(newProps)
    
    if (assertions[i]) {
      await assertions[i](newProps)
    }
  }
}

// Helper to mock console methods during tests
export const mockConsole = (methods: ('log' | 'warn' | 'error')[] = ['error']) => {
  const originalMethods: any = {}
  const mockedMethods: any = {}
  
  methods.forEach(method => {
    originalMethods[method] = console[method]
    mockedMethods[method] = vi.fn()
    console[method] = mockedMethods[method]
  })
  
  return {
    mocked: mockedMethods,
    restore: () => {
      methods.forEach(method => {
        console[method] = originalMethods[method]
      })
    }
  }
}

// Helper for testing error boundaries and error states
export const expectErrorHandling = async (
  asyncFn: () => Promise<any>,
  expectedErrorMessage?: string
) => {
  const consoleMock = mockConsole(['error'])
  
  try {
    await asyncFn()
    // If we get here, the function didn't throw as expected
    throw new Error('Expected function to throw an error')
  } catch (error) {
    if (expectedErrorMessage) {
      expect(error).toHaveProperty('message', expectedErrorMessage)
    }
  } finally {
    consoleMock.restore()
  }
}

// Custom matchers for common test scenarios
export const customMatchers = {
  toHaveBeenCalledWithFilters: (mockFn: any, expectedFilters: any) => {
    const calls = mockFn.mock.calls
    const matchingCall = calls.find((call: any) => {
      const filtersArg = call.find((arg: any) => 
        typeof arg === 'object' && 
        'showBicyclist' in arg && 
        'showPedestrian' in arg
      )
      return filtersArg && 
        filtersArg.showBicyclist === expectedFilters.showBicyclist &&
        filtersArg.showPedestrian === expectedFilters.showPedestrian
    })
    
    return {
      pass: !!matchingCall,
      message: () => `Expected function to be called with filters ${JSON.stringify(expectedFilters)}`
    }
  },
  
  toHaveBeenCalledWithGeometry: (mockFn: any, expectedGeometry?: any) => {
    const calls = mockFn.mock.calls
    const hasGeometryCall = calls.some((call: any) => {
      return call.some((arg: any) => 
        arg && typeof arg === 'object' && arg.extent
      )
    })
    
    return {
      pass: expectedGeometry ? hasGeometryCall : !hasGeometryCall,
      message: () => expectedGeometry 
        ? 'Expected function to be called with geometry'
        : 'Expected function to be called without geometry'
    }
  }
}

// Helper to generate test IDs consistently
export const testIds = {
  highestVolume: {
    container: 'highest-volume-container',
    loading: 'highest-volume-loading',
    error: 'highest-volume-error',
    noData: 'highest-volume-no-data',
    list: 'highest-volume-list',
    item: (index: number) => `highest-volume-item-${index}`,
    itemName: (index: number) => `highest-volume-item-${index}-name`,
    itemValue: (index: number) => `highest-volume-item-${index}-value`
  },
  charts: {
    echarts: 'echarts-mock',
    loading: 'chart-loading',
    error: 'chart-error'
  },
  filters: {
    bicyclistToggle: 'show-bicyclist-toggle',
    pedestrianToggle: 'show-pedestrian-toggle',
    timeScaleDropdown: 'time-scale-dropdown'
  }
}

export default {
  renderWithProviders,
  waitForAsyncOperations,
  createMockFunction,
  createAsyncMockFunction,
  simulateUserDelay,
  expectFunctionToHaveBeenCalledWith,
  createControlledPromise,
  testPropChanges,
  mockConsole,
  expectErrorHandling,
  customMatchers,
  testIds
}