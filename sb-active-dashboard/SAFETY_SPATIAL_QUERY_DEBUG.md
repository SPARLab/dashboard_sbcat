# Safety App Spatial Query Debugging Guide

## Overview
Comprehensive debugging statements have been added to track the exact coordinates and query results for the Custom Draw Tool spatial query issue in the Safety App.

## Debug Locations Added

### 1. NewSafetyMap.tsx - Polygon Creation
**Location**: `ui/safety-app/components/map/NewSafetyMap.tsx` (lines ~268-286)
**What it logs**:
- Raw polygon object from sketch tool
- Polygon type and spatial reference WKID
- Number of rings and sample coordinates (first 5 points)
- Polygon extent (xmin, ymin, xmax, ymax)

### 2. useSafetySpatialQuery Hook - Query Initiation
**Location**: `lib/hooks/useSpatialQuery.ts` (lines ~182-207, ~217-223)
**What it logs**:
- Query ID for tracking
- Complete geometry details before query execution
- Applied filters
- Query results summary including total incidents found

### 3. SafetyIncidentsDataService - Service Layer
**Location**: `lib/data-services/SafetyIncidentsDataService.ts`

#### getEnrichedSafetyData method (lines ~247-268, ~273-278, ~299-302)
- Parameters received (extent, geometry, filters)
- Spatial filter details and extent
- Raw query results (incidents/parties count, errors)
- Final enriched results

#### querySafetyData method (lines ~95-120, ~127-138, ~168-198)
- ArcGIS spatial query details (geometry, spatial reference, where clause)
- Sample feature data from query results
- Final count verification comparing pagination vs queryFeatureCount
- **Critical**: Test query WITHOUT spatial filter when spatial query returns 0
- Sample feature coordinates for comparison

## How to Use the Debugging

### Step 1: Open Browser Developer Tools
1. Open the Safety App in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab

### Step 2: Trigger the Custom Draw Tool
1. In the Safety App, select "Custom" from the geographic level dropdown
2. Draw a polygon on the map in an area where you can see safety incidents
3. Complete the polygon by clicking the starting point

### Step 3: Analyze the Debug Output
Look for these debug groups in the console (in order):

1. **🔍 [SAFETY DEBUG] Custom Draw Tool - Polygon Created**
   - Verify polygon coordinates are reasonable (not NaN, not [0,0])
   - Check spatial reference is 102100 (Web Mercator)
   - Note the extent values

2. **🔍 [SAFETY DEBUG] useSafetySpatialQuery - Starting Query**
   - Confirm geometry is passed correctly to the hook
   - Verify filters are applied as expected

3. **🔍 [SAFETY DEBUG] SafetyIncidentsDataService.getEnrichedSafetyData**
   - Check if geometry parameter is received correctly
   - Verify spatial filter details match the drawn polygon

4. **🔍 [SAFETY DEBUG] ArcGIS Spatial Query Details**
   - **CRITICAL**: Compare query geometry coordinates with drawn polygon
   - Verify spatial reference matches (should be 102100)
   - Check the WHERE clause for any filter issues

5. **🔍 [SAFETY DEBUG] ArcGIS Query Results**
   - See how many features the spatial query returned
   - If 0 features, check sample feature data for coordinate comparison

6. **🔍 [SAFETY DEBUG] Final Count Verification**
   - **MOST IMPORTANT**: If spatial query returns 0 but test query without spatial filter returns > 0, this confirms a coordinate mismatch issue
   - Compare sample feature coordinates with your drawn polygon coordinates

## Expected Issues to Look For

### Coordinate System Mismatch
- Drawn polygon coordinates in one system (e.g., geographic lat/lon)
- Feature layer coordinates in another system (e.g., Web Mercator)
- Look for coordinates like [-120, 34] vs [-13367000, 4000000]

### Geometry Precision Issues
- Polygon coordinates with excessive precision causing floating-point errors
- Very small polygons that don't intersect due to precision

### Spatial Reference Issues
- Different WKID values between polygon and feature layer
- Missing or undefined spatial reference

### Filter Issues
- WHERE clause excluding all data
- Date range or data source filters too restrictive

## Next Steps Based on Debug Output

1. **If coordinates look wrong**: Check coordinate system transformation
2. **If spatial reference differs**: Add coordinate system conversion
3. **If test query without spatial filter works**: Definitely a spatial geometry issue
4. **If sample feature coordinates are in different range**: Coordinate system mismatch confirmed

## Cleanup
Once debugging is complete, search for `🔍 [SAFETY DEBUG]` to remove all debug statements.
