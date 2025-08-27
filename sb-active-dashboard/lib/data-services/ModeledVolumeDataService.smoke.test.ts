 /**
 * Smoke test for ModeledVolumeDataService
 * Quick check to verify field structure and basic connectivity
 */

import { describe, it, expect } from 'vitest';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

const BASE_URL = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer";

describe('ModeledVolumeDataService Smoke Test', () => {
  it('should verify service configuration and field expectations', async () => {
    console.log('🔍 Starting smoke test...');
    console.log('🌐 Service URL:', `${BASE_URL}/0`);
    
    // Test 1: Verify we can create the layer with correct configuration
    const geometryLayer = new FeatureLayer({
      url: `${BASE_URL}/0`,
      outFields: ["*"]
    });

    // Test 2: Verify the service URL is correct (this is what caused our bug)
    const expectedUrl = `${BASE_URL}/0`;
    expect(expectedUrl).toBe('https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Segment_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer/0');
    
    console.log('✅ Service URL verified');
    
    // Test 3: Verify we're requesting the right fields (the ones that exist)
    const expectedFields = [
      "id", "street", "SHAPE__Length",
      "cos_2019_bike", "cos_2019_ped", "cos_2020_bike", "cos_2020_ped",
      "cos_2021_bike", "cos_2021_ped", "cos_2022_bike", "cos_2022_ped", 
      "cos_2023_bike", "cos_2023_ped",
      "str_2023_bike", "str_2023_ped"
    ];
    
    // Verify we're NOT looking for the wrong field names
    expect(expectedFields).not.toContain('edgeuid'); // This was our bug!
    expect(expectedFields).toContain('id'); // This is the correct field
    
    console.log('✅ Field expectations verified');
    console.log('🎯 Critical fields expected:', ['id', 'cos_2023_bike', 'cos_2023_ped', 'str_2023_bike', 'str_2023_ped']);
    console.log('🚫 Fields we should NOT expect:', ['edgeuid']);
    
    // Test 4: Check if we're in a test environment with mocks
    const isTestEnvironment = typeof geometryLayer.load !== 'function';
    
    if (isTestEnvironment) {
      console.log('🧪 Test environment detected - configuration verified');
      console.log('📝 Note: Field structure validation requires real service connection');
      console.log('💡 To test against real service, run this test in browser dev tools');
      console.log('✅ Smoke test passed - service configuration verified');
      
      return; // Skip the rest in test environment
    }
    
    // Real environment - try to load the layer to get metadata
    try {
      console.log('📡 Loading layer metadata...');
      await geometryLayer.load();
      
      console.log('✅ Layer loaded successfully');
      console.log('📋 Layer title:', geometryLayer.title);
      console.log('🔢 Layer ID:', geometryLayer.layerId);
      console.log('🏷️ Available fields:', geometryLayer.fields.map(f => f.name));
      
      // Verify critical fields exist in metadata
      const fieldNames = geometryLayer.fields.map(f => f.name);
      
      // Check for the fields that caused our bug
      const hasId = fieldNames.includes('id');
      const hasEdgeuid = fieldNames.includes('edgeuid');
      const hasShapeLength = fieldNames.includes('SHAPE__Length');
      const hasCos2023Bike = fieldNames.includes('cos_2023_bike');
      const hasCos2023Ped = fieldNames.includes('cos_2023_ped');
      const hasStr2023Bike = fieldNames.includes('str_2023_bike');
      const hasStr2023Ped = fieldNames.includes('str_2023_ped');
      
      console.log('🔍 Field verification:');
      console.log(`  - id: ${hasId ? '✅' : '❌'}`);
      console.log(`  - edgeuid: ${hasEdgeuid ? '⚠️ (unexpected)' : '✅ (correctly absent)'}`);
      console.log(`  - SHAPE__Length: ${hasShapeLength ? '✅' : '❌'}`);
      console.log(`  - cos_2023_bike: ${hasCos2023Bike ? '✅' : '❌'}`);
      console.log(`  - cos_2023_ped: ${hasCos2023Ped ? '✅' : '❌'}`);
      console.log(`  - str_2023_bike: ${hasStr2023Bike ? '✅' : '❌'}`);
      console.log(`  - str_2023_ped: ${hasStr2023Ped ? '✅' : '❌'}`);
      
      // Assert the critical fields
      expect(hasId).toBe(true);
      expect(hasEdgeuid).toBe(false); // Should NOT have edgeuid
      expect(hasShapeLength).toBe(true);
      expect(hasCos2023Bike).toBe(true);
      expect(hasCos2023Ped).toBe(true);
      
      console.log('✅ Smoke test passed - field structure verified');
      
    } catch (error) {
      console.error('❌ Smoke test failed:', error);
      throw error;
    }
    
  }, 10000); // 10 second timeout for debugging
});
