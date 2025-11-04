# Layer Recreation Test Guide

This guide helps verify that the layer recreation mechanism fixes the ArcGIS rendering issues.

## Current Status: Enhanced Interactivity Readiness Fix

The solution has been implemented with an enhanced interactivity readiness mechanism to fix the initial load race condition. The core issue was that mouse events were being processed before the layers were fully rendered and ready for hit testing.

## Test Scenario 1: Post-Drawing Rendering Failure

### Steps to Reproduce the Original Issue
1. Load the volume app
2. Select a geographic boundary level (e.g., "City")
3. Verify hover effects work (yellow outline appears on mouse over)
4. Switch to "Custom" drawing mode
5. Draw a polygon using the sketch tool
6. Switch back to "City" boundary mode
7. **Expected Issue**: Hover effects no longer work (no yellow outline)

### Steps to Verify the Fix
1. Follow the same steps as above
2. **Expected Fix**: Hover effects should work correctly after switching back from custom mode
3. Check browser console for debug messages:
   ```
   [DEBUG] Marked highlight layer for recreation after SketchViewModel usage
   [DEBUG] Recreating highlight layer to fix rendering corruption...
   [DEBUG] Removed old highlight layer from map
   [DEBUG] Highlight layer recreated and added to map successfully
   [DEBUG] Interactivity setup completed successfully
   ```

## Test Scenario 2: Initial Load Race Condition - ENHANCED FIX

### Steps to Reproduce the Original Issue
1. Load the volume app
2. **Immediately** move your mouse over the map while it's still animating
3. **Expected Issue**: Hover effects don't work during initial animation

### Steps to Verify the Fix
1. Follow the same steps as above
2. **Expected Fix**: Hover effects should work even during initial animation
3. Check browser console for:
   ```
   [DEBUG] Map is fully ready and stationary, layers should be rendered
   [DEBUG] Setting up interactivity with layers: [layer names]
   [DEBUG] Layer [name]: visible=true, loaded=true
   [DEBUG] Interactivity setup completed successfully
   [DEBUG] Interactivity is now fully ready for mouse events
   [DEBUG] Mouse entered map
   [DEBUG] Hit test found graphic: [attributes]
   ```

## Debug Information

### Console Messages to Look For
- ✅ **Success**: All debug messages appear without errors
- ❌ **Failure**: Missing debug messages or error messages

### Key Debug Messages
```
[DEBUG] Marked highlight layer for recreation after SketchViewModel usage
[DEBUG] Recreating highlight layer to fix rendering corruption...
[DEBUG] Removed old highlight layer from map
[DEBUG] Highlight layer recreated and added to map successfully
[DEBUG] Map is fully ready and stationary, layers should be rendered
[DEBUG] Setting up interactivity with layers: [layer names]
[DEBUG] Layer [name]: visible=true, loaded=true
[DEBUG] Interactivity setup completed successfully
[DEBUG] Interactivity is now fully ready for mouse events
[DEBUG] Mouse entered map
[DEBUG] Hit test found graphic: [attributes]
[DEBUG] Creating new hover graphic for: [attributes]
[DEBUG] Adding hover graphic to highlight layer. Layer graphics count: [number]
[DEBUG] After adding hover graphic. Layer graphics count: [number]
```

### Error Messages to Watch For
```
[DEBUG] Failed to add recreated highlight layer to map
[DEBUG] Map view initialization failed: [error]
[DEBUG] Warning: Layer [name] is not visible!
[DEBUG] Warning: Layer [name] is not loaded!
[DEBUG] Not all layers are ready for interaction, waiting...
[DEBUG] Ignoring pointer move - interactivity not fully ready
[DEBUG] Ignoring click - interactivity not fully ready
TypeError: mapView.map.contains is not a function
```

## Current Issues to Debug

### Issue 1: Layer Visibility and Loading
- Check if boundary layers are visible and loaded when switching to boundary mode
- Look for: `[DEBUG] Warning: Layer [name] is not visible!` or `[DEBUG] Warning: Layer [name] is not loaded!`
- Expected: All layers should be visible and loaded when active

### Issue 2: Initial Load Timing
- Check if the enhanced waiting mechanism is working
- Look for: `[DEBUG] Map is fully ready and stationary, layers should be rendered`
- Expected: Should see this message before interactivity setup

### Issue 3: Interactivity Readiness
- Check if the interactivity readiness flag is working
- Look for: `[DEBUG] Interactivity is now fully ready for mouse events`
- Expected: Should see this message before mouse events are processed

### Issue 4: Hit Test Results
- Check if hitTest is finding graphics
- Look for: `[DEBUG] Hit test found graphic: [attributes]`
- Expected: Should see graphics when hovering over boundaries

### Issue 5: Graphics Layer Management
- Check if graphics are being added to the highlight layer
- Look for: `[DEBUG] Adding hover graphic to highlight layer. Layer graphics count: [number]`
- Expected: Graphics count should increase when adding hover graphics

## Manual Verification

### Visual Indicators
1. **Hover Effect**: Yellow outline should appear when hovering over boundaries
2. **Selection Effect**: Blue outline should appear when clicking boundaries
3. **Custom Drawing**: Purple polygon should appear when drawing
4. **Layer List**: "Boundary Highlights" layer should be present in ArcGIS layer list

### Functional Indicators
1. **Click Events**: Clicking boundaries should trigger selection callbacks
2. **State Updates**: Selected area should update in the sidebar
3. **Data Filtering**: Volume data should filter based on selected boundary

## Troubleshooting Steps

### Step 1: Check Initial Load Timing
1. Open browser console
2. Load the app and immediately move mouse over the map
3. Look for the enhanced waiting messages
4. If you see "Ignoring pointer move - interactivity not fully ready", the fix is working

### Step 2: Check Interactivity Readiness
1. Look for "Interactivity is now fully ready for mouse events" message
2. This should appear after "Interactivity setup completed successfully"
3. Mouse events should only be processed after this message

### Step 3: Check Layer Readiness
1. Switch to a boundary mode (e.g., "City")
2. Look for layer readiness messages
3. If layers are not ready, check the retry mechanism

### Step 4: Check Hit Test
1. Move mouse over the map after it's fully loaded
2. Look for hit test messages in console
3. If no hit test results, check if layers are properly configured

### Step 5: Check Graphics Layer
1. Look for graphics count messages
2. If graphics count doesn't increase, check layer recreation
3. Verify highlight layer is properly added to map

## Performance Considerations

### Expected Behavior
- Layer recreation should be nearly instantaneous
- No visible flickering during mode switches
- Smooth hover effects without lag
- Consistent performance across multiple switches
- Initial load should have a small delay (150ms) for proper rendering

### Performance Issues to Watch For
- Slow layer recreation (>500ms)
- Visible flickering during switches
- Laggy hover effects
- Memory leaks after multiple switches
- Excessive delays during initial load (>500ms)

## Integration Testing

### Test with Real Data
1. Load actual volume data
2. Test boundary selection with data filtering
3. Verify charts update correctly
4. Test custom polygon queries

### Test with Different Boundary Types
1. Test all boundary levels (City, County, Census Tract, Service Area)
2. Verify each type works correctly after custom drawing
3. Test switching between different boundary types

### Test Edge Cases
1. Rapid switching between modes
2. Drawing multiple custom polygons
3. Switching during data loading
4. Testing with slow network conditions

## Next Steps

If the current implementation still has issues:

1. **Check Layer Order**: Ensure highlight layer is on top
2. **Verify Symbol Configuration**: Check if symbols are properly configured
3. **Test Layer Recreation**: Verify the recreation process works
4. **Check Event Handlers**: Ensure pointer events are working
5. **Debug Hit Test**: Verify hitTest is finding the right layers
6. **Adjust Timing**: If needed, increase the delay in interactivity readiness

## Summary of Fixes Applied

1. **Enhanced waitForMapReady()**: Added 100ms delay after map is ready and stationary
2. **Layer Readiness Check**: Added verification that all layers are visible and loaded
3. **Interactivity Readiness Flag**: Added flag to prevent mouse events until everything is ready
4. **Retry Mechanism**: Added automatic retry if layers aren't ready
5. **Comprehensive Debugging**: Added detailed logging to track the entire process
6. **Layer Recreation**: Complete layer recreation after SketchViewModel usage
7. **Event Processing Control**: Mouse events are ignored until interactivity is fully ready 