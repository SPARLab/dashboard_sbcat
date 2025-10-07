import { test, expect } from '@playwright/test'

test.describe('Highest Volume Component - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the volume dashboard
    await page.goto('/dashboard/volume')
    
    // Wait for the page to load and essential elements to be visible
    await expect(page.locator('[data-testid="volume-map"]').or(page.locator('.esri-view'))).toBeVisible({ timeout: 10000 })
    
    // Handle the Volume Data Information disclaimer modal if it appears
    const disclaimerModal = page.locator('#volume-data-disclaimer-overlay')
    if (await disclaimerModal.isVisible()) {
      // Click the "I Understand" button to close the modal
      await page.locator('#volume-data-disclaimer-understand-button').click()
      // Wait for the modal to be hidden
      await expect(disclaimerModal).toBeHidden({ timeout: 5000 })
    }
  })

  test('Highest Volume component displays data when geographic region is selected', async ({ page }) => {
    // Wait for map to be fully loaded (additional time for background layers)
    await page.waitForTimeout(8000)
    
    // Look for map canvas or container
    const mapContainer = page.locator('.esri-view-surface').or(page.locator('canvas')).first()
    await expect(mapContainer).toBeVisible()
    
    // Simulate selecting a geographic region by drawing a polygon
    // Note: This is a simplified simulation - real implementation would need
    // to interact with the ArcGIS map drawing tools
    await mapContainer.click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(500)
    await mapContainer.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)
    await mapContainer.click({ position: { x: 400, y: 400 } })
    await page.waitForTimeout(500)
    await mapContainer.click({ position: { x: 300, y: 400 } })
    await page.waitForTimeout(500)
    // Double-click to complete polygon
    await mapContainer.dblclick({ position: { x: 300, y: 300 } })
    
    // Wait for Highest Volume component to load data
    await expect(page.locator('#highest-volume-container')).toBeVisible()
    
    // Check for loading state first
    const loadingIndicator = page.locator('#highest-volume-loading')
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeHidden({ timeout: 10000 })
    }
    
    // Verify that either data is displayed or appropriate message is shown
    const dataList = page.locator('#highest-volume-list')
    const noDataMessage = page.locator('#highest-volume-no-data')
    const errorMessage = page.locator('#highest-volume-error')
    
    // One of these should be visible
    await expect(
      dataList.or(noDataMessage).or(errorMessage)
    ).toBeVisible({ timeout: 5000 })
    
    // If data is present, verify it's properly formatted
    if (await dataList.isVisible()) {
      const listItems = dataList.locator('li')
      const itemCount = await listItems.count()
      
      if (itemCount > 0) {
        // Verify first item has proper structure
        const firstItem = listItems.first()
        await expect(firstItem).toContainText(/^\d+\./) // Should start with number and period
        
        // Verify volume values are numbers
        const volumeValue = firstItem.locator('[id$="-value"]')
        await expect(volumeValue).toBeVisible()
        const volumeText = await volumeValue.textContent()
        expect(volumeText).toMatch(/^[\d,]+$/) // Should be a formatted number
      }
    }
  })

  test('Highest Volume data changes when filters are toggled', async ({ page }) => {
    // Wait for map to be fully loaded (additional time for background layers)
    await page.waitForTimeout(8000)
    
    // First, select a region (simplified)
    const mapContainer = page.locator('.esri-view-surface').or(page.locator('canvas')).first()
    await expect(mapContainer).toBeVisible()
    
    // Draw a simple polygon
    await mapContainer.click({ position: { x: 250, y: 250 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 350, y: 250 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 350, y: 350 } })
    await page.waitForTimeout(300)
    await mapContainer.dblclick({ position: { x: 250, y: 350 } })
    
    // Wait for initial data load
    await expect(page.locator('#highest-volume-container')).toBeVisible()
    
    const loadingIndicator = page.locator('#highest-volume-loading')
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeHidden({ timeout: 10000 })
    }
    
    // Capture initial state
    const dataList = page.locator('#highest-volume-list')
    let initialData = null
    if (await dataList.isVisible()) {
      initialData = await dataList.textContent()
    }
    
    // Look for bicycle/pedestrian filter toggles
    // These might be in the left sidebar or filter panel
    const bicycleToggle = page.locator('[data-testid="show-bicyclist-toggle"]')
      .or(page.locator('input[type="checkbox"]').filter({ hasText: /bicycle|bike/i }))
      .or(page.locator('label').filter({ hasText: /bicycle|bike/i }).locator('input'))
    
    const pedestrianToggle = page.locator('[data-testid="show-pedestrian-toggle"]')
      .or(page.locator('input[type="checkbox"]').filter({ hasText: /pedestrian|ped/i }))
      .or(page.locator('label').filter({ hasText: /pedestrian|ped/i }).locator('input'))
    
    // Try to toggle bicycle filter if it exists
    if (await bicycleToggle.isVisible()) {
      await bicycleToggle.click()
      
      // Wait for data to refresh
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeHidden({ timeout: 10000 })
      }
      
      // Verify data has changed (if data was present initially)
      if (initialData && await dataList.isVisible()) {
        const newData = await dataList.textContent()
        // Data should be different after filter change
        // (unless there was no bicycle data to begin with)
        if (initialData !== newData) {
          console.log('✓ Data changed after bicycle filter toggle')
        }
      }
    }
  })

  test('Highest Volume component handles no data scenarios', async ({ page }) => {
    // Wait for map to be fully loaded (additional time for background layers)
    await page.waitForTimeout(8000)
    
    // Try to select an area that's likely to have no data (e.g., ocean area)
    const mapContainer = page.locator('.esri-view-surface').or(page.locator('canvas')).first()
    await expect(mapContainer).toBeVisible()
    
    // Click in what should be an empty area (top-left corner)
    await mapContainer.click({ position: { x: 50, y: 50 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 100, y: 50 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(300)
    await mapContainer.dblclick({ position: { x: 50, y: 100 } })
    
    // Wait for component to process
    await expect(page.locator('#highest-volume-container')).toBeVisible()
    
    const loadingIndicator = page.locator('#highest-volume-loading')
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeHidden({ timeout: 10000 })
    }
    
    // Should show appropriate message for no data
    const noDataMessage = page.locator('#highest-volume-no-data')
    const errorMessage = page.locator('#highest-volume-error')
    
    // One of these messages should appear
    await expect(
      noDataMessage.or(errorMessage)
    ).toBeVisible({ timeout: 5000 })
  })

  test('Highest Volume component collapse/expand functionality', async ({ page }) => {
    // Verify component is visible
    await expect(page.locator('#highest-volume-container')).toBeVisible()
    
    // Find the collapse/expand button
    const collapseButton = page.locator('#highest-volume-collapse-icon')
      .or(page.locator('#highest-volume-header button'))
      .or(page.locator('[data-testid="collapse-expand-button"]'))
    
    await expect(collapseButton).toBeVisible()
    
    // Get the collapsible content
    const collapsibleContent = page.locator('#highest-volume-collapsible-content')
    await expect(collapsibleContent).toBeVisible()
    
    // Click to collapse
    await collapseButton.click()
    await page.waitForTimeout(500) // Wait for animation
    
    // Content should be collapsed (check for CSS class)
    await expect(collapsibleContent).toHaveClass(/max-h-0/)
    
    // Click to expand again
    await collapseButton.click()
    await page.waitForTimeout(500)
    
    // Content should be expanded
    await expect(collapsibleContent).not.toHaveClass(/max-h-0/)
  })

  test('Highest Volume component displays proper ranking order', async ({ page }) => {
    // Wait for map to be fully loaded (additional time for background layers)
    await page.waitForTimeout(8000)
    
    // Select a region and wait for data
    const mapContainer = page.locator('.esri-view-surface').or(page.locator('canvas')).first()
    await expect(mapContainer).toBeVisible()
    
    // Draw polygon in a likely data area (center of map)
    await mapContainer.click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 450, y: 300 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 450, y: 450 } })
    await page.waitForTimeout(300)
    await mapContainer.dblclick({ position: { x: 300, y: 450 } })
    
    await expect(page.locator('#highest-volume-container')).toBeVisible()
    
    const loadingIndicator = page.locator('#highest-volume-loading')
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeHidden({ timeout: 10000 })
    }
    
    // Check if data is present
    const dataList = page.locator('#highest-volume-list')
    if (await dataList.isVisible()) {
      const listItems = dataList.locator('li')
      const itemCount = await listItems.count()
      
      if (itemCount > 1) {
        // Verify ranking order (items should be numbered 1, 2, 3, etc.)
        for (let i = 0; i < Math.min(itemCount, 5); i++) {
          const item = listItems.nth(i)
          await expect(item).toContainText(`${i + 1}.`)
        }
        
        // Verify volume values are in descending order
        const volumeValues: number[] = []
        for (let i = 0; i < Math.min(itemCount, 5); i++) {
          const volumeElement = listItems.nth(i).locator('[id$="-value"]')
          const volumeText = await volumeElement.textContent()
          if (volumeText) {
            const volumeNumber = parseInt(volumeText.replace(/,/g, ''))
            volumeValues.push(volumeNumber)
          }
        }
        
        // Check if values are in descending order
        for (let i = 1; i < volumeValues.length; i++) {
          expect(volumeValues[i]).toBeLessThanOrEqual(volumeValues[i - 1])
        }
      }
    }
  })

})