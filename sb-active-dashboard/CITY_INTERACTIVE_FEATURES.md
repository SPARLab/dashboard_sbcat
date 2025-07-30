# City Boundary Interactive Features - Test Guide

## Overview
The city boundary layer now includes visual feedback with hover and selection effects.

## Interactive Features

### 🟡 Hover Effect (Yellow)
- **Trigger**: Mouse pointer moves over a city boundary
- **Effect**: City polygon highlights in **yellow** with golden outline
- **Cursor**: Changes to pointer to indicate clickable
- **Behavior**: Only shows if city is not currently selected

### 🔵 Selection Effect (Blue) 
- **Trigger**: Click on a city boundary
- **Effect**: City polygon highlights in **blue** with solid blue outline  
- **Persistence**: Remains until another city is selected
- **Console**: Logs selected city name

## How to Test

### Option 1: Test Page
1. **Navigate to**: `http://localhost:5173/dashboard/test-boundaries`
2. **Click "Test city"** button or **"Run All Tests"**
3. **Wait for success message** (✓ Success!)
4. **Hover over cities** on the map → Should see yellow highlights
5. **Click a city** → Should see blue selection highlight
6. **Check browser console** → Should see "City selected: [City Name]"

### Option 2: Manual Integration
```typescript
// In your map component
const boundaryService = new GeographicBoundariesService();

// Switch to city level (enables interactivity)
await boundaryService.switchGeographicLevel('city', mapView);

// Get selected city
const selectedCity = boundaryService.getSelectedArea();
if (selectedCity) {
  console.log(`Selected: ${selectedCity.name}`);
  console.log(`Geometry:`, selectedCity.geometry);
}
```

## Visual Behavior

### Expected Sequence:
1. **Load city boundaries** → Thin steel blue outlines
2. **Hover over city** → Yellow fill with golden outline + pointer cursor  
3. **Click city** → Blue fill with solid blue outline
4. **Hover different city** → Yellow highlight (original stays blue)
5. **Click different city** → New city turns blue, previous returns to default

### Troubleshooting

**Yellow hover not working?**
- Check browser console for errors
- Ensure you're on city level (`switchGeographicLevel('city')`)
- Verify CSS is loaded (check Network tab)

**Blue selection not working?**
- Check console for "City selected:" messages
- Ensure click hit test is working
- Try clicking directly on city outline

**No cursor change?**
- Check that pointer events are working
- Verify map view is active

## CSS Customization

To modify colors, edit `src/city-boundary-styles.css`:

```css
/* Change hover color from yellow to green */
.esri-view .esri-highlight polygon {
  fill: rgba(0, 255, 0, 0.5) !important; /* Green hover */
  stroke: rgba(0, 200, 0, 0.9) !important;
}

/* Change selection color from blue to red */
.esri-view .esri-highlight.city-selected polygon {
  fill: rgba(255, 0, 0, 0.6) !important; /* Red selection */
  stroke: rgba(255, 0, 0, 1) !important;
}
```

## Integration with Volume Data

Once a city is selected, you can use its geometry for spatial filtering:

```typescript
// Get selected city geometry
const selectedCity = boundaryService.getSelectedArea();

if (selectedCity && selectedCity.level === 'city') {
  // Filter volume data to selected city
  const volumeQuery = {
    geometry: selectedCity.geometry,
    spatialRelationship: 'intersects'
  };
  
  const cityVolumeData = await queryVolumeData(volumeQuery);
  // Update charts/UI with city-specific data
}
```

## Next Steps

1. **Test the interactive features** using the test page
2. **Verify yellow hover and blue selection** work as expected  
3. **Check console logs** for selection confirmations
4. **Integrate with your volume app** using selected city geometry
5. **Connect to right sidebar** to show selected city name/stats

The city boundaries are now fully interactive and ready for integration with your volume filtering workflow! 🎉