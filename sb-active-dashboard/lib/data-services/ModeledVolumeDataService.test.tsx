import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ArcGIS modules BEFORE importing the service
vi.mock('@arcgis/core/layers/FeatureLayer', () => ({
  default: vi.fn()
}));

vi.mock('@arcgis/core/geometry/geometryEngine', () => ({
  geodesicLength: vi.fn()
}));

vi.mock('@arcgis/core/geometry/Polygon', () => ({
  default: vi.fn()
}));

vi.mock('@arcgis/core/geometry/Polyline', () => ({
  default: vi.fn()
}));

vi.mock('@arcgis/core/views/MapView', () => ({
  default: vi.fn()
}));

// Now import the service after mocking its dependencies
import { ModeledVolumeDataService } from './ModeledVolumeDataService';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Polygon from '@arcgis/core/geometry/Polygon';
import Polyline from '@arcgis/core/geometry/Polyline';

describe('ModeledVolumeDataService', () => {
  let service: ModeledVolumeDataService;
  let mockLineSegmentLayer: any;
  let mockTrafficDataTable: any;
  let mockMapView: any;

  beforeEach(() => {
    // Mock the FeatureLayer constructor calls
    mockLineSegmentLayer = {
      createQuery: vi.fn(() => ({})),
      queryFeatures: vi.fn()
    };
    
    mockTrafficDataTable = {
      createQuery: vi.fn(() => ({})),
      queryFeatures: vi.fn()
    };

    // Mock FeatureLayer constructor to return our mocks in order
    (FeatureLayer as any as jest.Mock)
      .mockImplementationOnce(() => mockLineSegmentLayer)  // lineSegmentLayer
      .mockImplementationOnce(() => mockTrafficDataTable); // trafficDataTable

    mockMapView = {
      extent: { rings: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    };

    // Mock geometryEngine
    (geometryEngine.geodesicLength as any).mockReturnValue(1.0); // 1 mile per segment

    service = new ModeledVolumeDataService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('buildTrafficDataWhereClause', () => {
    it('should include year filter in WHERE clause', () => {
      const config = {
        dataSource: 'dillon' as const,
        countTypes: ['bike' as const],
        year: 2020,
        dateRange: { start: new Date(), end: new Date() }
      };

      // Access private method for testing
      const whereClause = (service as any).buildTrafficDataWhereClause([123, 456], config);
      
      expect(whereClause).toContain('year = 2020');
    });

    it('should include network_id filter for edge UIDs', () => {
      const config = {
        dataSource: 'dillon' as const,
        countTypes: ['bike' as const],
        year: 2023,
        dateRange: { start: new Date(), end: new Date() }
      };

      const whereClause = (service as any).buildTrafficDataWhereClause([123, 456], config);
      
      expect(whereClause).toContain("network_id = 'edge_123'");
      expect(whereClause).toContain("network_id = 'edge_456'");
    });

    it('should include count_type filter', () => {
      const config = {
        dataSource: 'dillon' as const,
        countTypes: ['bike' as const, 'ped' as const],
        year: 2023,
        dateRange: { start: new Date(), end: new Date() }
      };

      const whereClause = (service as any).buildTrafficDataWhereClause([123], config);
      
      expect(whereClause).toContain("count_type IN ('bike', 'ped')");
    });

    it('should include AADT validity filter', () => {
      const config = {
        dataSource: 'dillon' as const,
        countTypes: ['bike' as const],
        year: 2023,
        dateRange: { start: new Date(), end: new Date() }
      };

      const whereClause = (service as any).buildTrafficDataWhereClause([123], config);
      
      expect(whereClause).toContain("aadt IS NOT NULL AND aadt > 0");
    });

    it('should return no-results clause when no edge UIDs provided', () => {
      const config = {
        dataSource: 'dillon' as const,
        countTypes: ['bike' as const],
        year: 2023,
        dateRange: { start: new Date(), end: new Date() }
      };

      const whereClause = (service as any).buildTrafficDataWhereClause([], config);
      
      expect(whereClause).toBe("1=0");
    });
  });

  describe('processJoinedTrafficData', () => {
    const mockConfig = {
      dataSource: 'dillon' as const,
      countTypes: ['bike' as const, 'ped' as const],
      year: 2023,
      dateRange: { start: new Date(), end: new Date() }
    };

    it('should use maximum AADT when multiple records exist for a segment', () => {
      const networkFeatures = [{
        attributes: { edgeuid: 123 },
        geometry: { paths: [[[0, 0], [1, 1]]] }
      }];

      const dataFeatures = [
        { attributes: { network_id: 'edge_123', aadt: 25, count_type: 'bike' } },
        { attributes: { network_id: 'edge_123', aadt: 75, count_type: 'ped' } }
      ];

      const result = (service as any).processJoinedTrafficData(networkFeatures, dataFeatures, mockConfig);

      // Should use max AADT (75) which puts it in medium category (50-200)
      expect(result.totalMiles).toEqual([0, 1, 0]); // [low, medium, high]
      expect(result.details.medium.segments).toBe(1);
    });

    it('should categorize low AADT correctly (<50)', () => {
      const networkFeatures = [{
        attributes: { edgeuid: 123 },
        geometry: { paths: [[[0, 0], [1, 1]]] }
      }];

      const dataFeatures = [
        { attributes: { network_id: 'edge_123', aadt: 25, count_type: 'bike' } },
        { attributes: { network_id: 'edge_123', aadt: 30, count_type: 'ped' } }
      ];

      const result = (service as any).processJoinedTrafficData(networkFeatures, dataFeatures, mockConfig);

      // Max AADT is 30, which is low category
      expect(result.totalMiles).toEqual([1, 0, 0]); // [low, medium, high]
      expect(result.details.low.segments).toBe(1);
    });

    it('should categorize medium AADT correctly (50-200)', () => {
      const networkFeatures = [{
        attributes: { edgeuid: 123 },
        geometry: { paths: [[[0, 0], [1, 1]]] }
      }];

      const dataFeatures = [
        { attributes: { network_id: 'edge_123', aadt: 100, count_type: 'bike' } }
      ];

      const result = (service as any).processJoinedTrafficData(networkFeatures, dataFeatures, mockConfig);

      // AADT 100 is medium category
      expect(result.totalMiles).toEqual([0, 1, 0]); // [low, medium, high]
      expect(result.details.medium.segments).toBe(1);
    });

    it('should categorize high AADT correctly (≥200)', () => {
      const networkFeatures = [{
        attributes: { edgeuid: 123 },
        geometry: { paths: [[[0, 0], [1, 1]]] }
      }];

      const dataFeatures = [
        { attributes: { network_id: 'edge_123', aadt: 250, count_type: 'bike' } }
      ];

      const result = (service as any).processJoinedTrafficData(networkFeatures, dataFeatures, mockConfig);

      // AADT 250 is high category
      expect(result.totalMiles).toEqual([0, 0, 1]); // [low, medium, high]
      expect(result.details.high.segments).toBe(1);
    });

    it('should handle multiple segments with different volume levels', () => {
      const networkFeatures = [
        {
          attributes: { edgeuid: 123 },
          geometry: { paths: [[[0, 0], [1, 1]]] }
        },
        {
          attributes: { edgeuid: 456 },
          geometry: new Polyline({ paths: [[[1, 1], [2, 2]]] })
        }
      ];

      const dataFeatures = [
        { attributes: { network_id: 'edge_123', aadt: 25, count_type: 'bike' } }, // Low
        { attributes: { network_id: 'edge_456', aadt: 300, count_type: 'ped' } }  // High
      ];

      const result = (service as any).processJoinedTrafficData(networkFeatures, dataFeatures, mockConfig);

      // Should have 1 low and 1 high segment
      expect(result.totalMiles).toEqual([1, 0, 1]); // [low, medium, high]
      expect(result.details.low.segments).toBe(1);
      expect(result.details.high.segments).toBe(1);
    });

    it('should skip segments with no traffic data', () => {
      const networkFeatures = [
        {
          attributes: { edgeuid: 123 },
          geometry: { paths: [[[0, 0], [1, 1]]] }
        },
        {
          attributes: { edgeuid: 456 }, // No corresponding data
          geometry: new Polyline({ paths: [[[1, 1], [2, 2]]] })
        }
      ];

      const dataFeatures = [
        { attributes: { network_id: 'edge_123', aadt: 100, count_type: 'bike' } }
      ];

      const result = (service as any).processJoinedTrafficData(networkFeatures, dataFeatures, mockConfig);

      // Should only process segment 123, ignore 456
      expect(result.totalMiles).toEqual([0, 1, 0]); // [low, medium, high]
      expect(result.details.medium.segments).toBe(1);
    });

    it('should return correct categories and structure', () => {
      const networkFeatures = [{
        attributes: { edgeuid: 123 },
        geometry: { paths: [[[0, 0], [1, 1]]] }
      }];

      const dataFeatures = [
        { attributes: { network_id: 'edge_123', aadt: 100, count_type: 'bike' } }
      ];

      const result = (service as any).processJoinedTrafficData(networkFeatures, dataFeatures, mockConfig);

      expect(result.categories).toEqual(['Low', 'Medium', 'High']);
      expect(result).toHaveProperty('totalMiles');
      expect(result).toHaveProperty('details');
      expect(result.details).toHaveProperty('low');
      expect(result.details).toHaveProperty('medium');
      expect(result.details).toHaveProperty('high');
    });
  });

  describe('getTrafficLevelDataWithGeometry', () => {
    const mockConfig = {
      dataSource: 'dillon' as const,
      countTypes: ['bike' as const],
      year: 2023,
      dateRange: { start: new Date(), end: new Date() }
    };

    const mockGeometry = { rings: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] };

    it('should query network features with correct spatial parameters', async () => {
      // Mock createQuery to return an object that can be mutated
      const mockQuery = {};
      mockLineSegmentLayer.createQuery.mockReturnValue(mockQuery);
      
      mockLineSegmentLayer.queryFeatures.mockResolvedValue({
        features: [{ attributes: { edgeuid: 123 } }]
      });
      mockTrafficDataTable.queryFeatures.mockResolvedValue({
        features: []
      });

      await service.getTrafficLevelDataWithGeometry(mockMapView, mockConfig, mockGeometry);

      expect(mockLineSegmentLayer.createQuery).toHaveBeenCalled();
      // Verify that the properties were set on the query object
      expect(mockQuery).toEqual(expect.objectContaining({
        geometry: mockGeometry,
        spatialRelationship: "intersects",
        returnGeometry: true,
        outFields: [
          "id", "SHAPE__Length",
          "cos_2019_bike", "cos_2019_ped", "cos_2020_bike", "cos_2020_ped",
          "cos_2021_bike", "cos_2021_ped", "cos_2022_bike", "cos_2022_ped", 
          "cos_2023_bike", "cos_2023_ped",
          "str_2023_bike", "str_2023_ped"
        ]
      }));
    });

    it('should use simulation data when layers are not available', async () => {
      const serviceWithoutLayers = new ModeledVolumeDataService();
      (serviceWithoutLayers as any).lineSegmentLayer = null;

      const result = await serviceWithoutLayers.getTrafficLevelDataWithGeometry(
        mockMapView, 
        mockConfig, 
        mockGeometry
      );

      // Should return simulation data structure
      expect(result.categories).toEqual(['Low', 'Medium', 'High']);
      expect(Array.isArray(result.totalMiles)).toBe(true);
    });

    it('should handle network query returning no features', async () => {
      mockLineSegmentLayer.queryFeatures.mockResolvedValue({
        features: []
      });

      const result = await service.getTrafficLevelDataWithGeometry(
        mockMapView, 
        mockConfig, 
        mockGeometry
      );

      // Should return simulation data when no network features found
      expect(result.categories).toEqual(['Low', 'Medium', 'High']);
      expect(mockTrafficDataTable.queryFeatures).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockLineSegmentLayer.queryFeatures.mockRejectedValue(new Error('Network error'));

      const result = await service.getTrafficLevelDataWithGeometry(
        mockMapView, 
        mockConfig, 
        mockGeometry
      );

      // Should return simulation data on error
      expect(result.categories).toEqual(['Low', 'Medium', 'High']);
    });
  });
});