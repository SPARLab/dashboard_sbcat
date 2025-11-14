/**
 * Jittered Layer Service
 * Creates a jittered display layer from incidents while preserving the original for queries
 */

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import { generateIncidentPopupContent } from "../../ui/safety-app/utils/popupContentGenerator";

/**
 * Generates a random jitter offset using a deterministic seed based on incident ID
 * This ensures consistent jittering across renders
 */
function generateJitterOffset(incidentId: number, maxOffsetMeters: number = 20): { offsetX: number; offsetY: number } {
  // Use incident ID as seed for deterministic "random" jitter
  const seed = incidentId * 9301 + 49297;
  const random1 = (seed % 233280) / 233280.0;
  const random2 = ((seed * 1.5) % 233280) / 233280.0;
  
  // Convert to angle and distance
  const angle = random1 * Math.PI * 2;
  const distance = random2 * maxOffsetMeters;
  
  // Convert meters to degrees (rough approximation at ~34° latitude like Santa Barbara)
  const metersToDegreesLat = 1 / 111000; // ~111km per degree latitude
  const metersToDegreesLon = 1 / (111000 * Math.cos(34 * Math.PI / 180)); // Adjust for longitude at this latitude
  
  const offsetX = Math.cos(angle) * distance * metersToDegreesLon;
  const offsetY = Math.sin(angle) * distance * metersToDegreesLat;
  
  return { offsetX, offsetY };
}

/**
 * Creates a jittered display layer from an original incidents layer
 * The jittered layer is for visual display only - all queries should use the original layer
 */
export async function createJitteredDisplayLayer(
  originalLayer: FeatureLayer,
  maxJitterMeters: number = 20
): Promise<FeatureLayer> {
  
  try {
    // Query all features from the original layer
    const query = originalLayer.createQuery();
    query.where = "1=1";
    query.outFields = ["*"];
    query.returnGeometry = true;
    
    const result = await originalLayer.queryFeatures(query);
    
    // Create jittered graphics
    const jitteredGraphics = result.features.map(feature => {
      const originalGeometry = feature.geometry as __esri.Point;
      const incidentId = feature.attributes.id || feature.attributes.incident_id || feature.attributes.OBJECTID;
      
      // Generate deterministic jitter offset
      const { offsetX, offsetY } = generateJitterOffset(incidentId, maxJitterMeters);
      
      // Create new jittered point
      const jitteredGeometry = new Point({
        longitude: (originalGeometry.longitude ?? 0) + offsetX,
        latitude: (originalGeometry.latitude ?? 0) + offsetY,
        spatialReference: originalGeometry.spatialReference
      });
      
      // Create new graphic with jittered geometry but same attributes
      return new Graphic({
        geometry: jitteredGeometry,
        attributes: { ...feature.attributes }
      });
    });
    
    // Get fields from original layer
    const fields = await originalLayer.when().then(layer => layer.fields);
    
    // Create popup template with function (cannot be cloned properly)
    // Must explicitly define with the function reference
    // CRITICAL: Close over originalLayer so we can query it for full attributes
    const popupTemplate = {
      title: "Safety Incident Details",
      content: async ({ graphic }: { graphic: __esri.Graphic }) => {
        // With outFields: ["*"], the graphic should have all attributes
        // If needed, we can query the original layer for additional data
        return await generateIncidentPopupContent(graphic.attributes);
      }
    };
    
    // Create new client-side FeatureLayer with jittered geometries
    const jitteredLayer = new FeatureLayer({
      source: jitteredGraphics,
      title: "Safety Incidents (Display)",
      objectIdField: originalLayer.objectIdField,
      fields: fields,
      geometryType: "point",
      spatialReference: originalLayer.spatialReference,
      renderer: originalLayer.renderer?.clone(),
      popupTemplate: popupTemplate, // Use explicitly defined popup template instead of clone
      visible: true,
      listMode: "hide", // Hide from layer list to avoid confusion
      outFields: ["*"] // CRITICAL: Ensure ALL fields are available for queries/popups
    });
    
    return jitteredLayer;
    
  } catch (error) {
    console.error('Error creating jittered display layer:', error);
    throw error;
  }
}

/**
 * Updates the jittered layer when filters change
 * This re-queries the original layer and creates new jittered graphics
 */
export async function updateJitteredLayer(
  originalLayer: FeatureLayer,
  jitteredLayer: FeatureLayer,
  whereClause: string = "1=1",
  maxJitterMeters: number = 20
): Promise<void> {
  try {
    // Query filtered features from original layer
    const query = originalLayer.createQuery();
    query.where = whereClause;
    query.outFields = ["*"];
    query.returnGeometry = true;
    
    const result = await originalLayer.queryFeatures(query);
    
    // Create jittered graphics
    const jitteredGraphics = result.features.map(feature => {
      const originalGeometry = feature.geometry as __esri.Point;
      const incidentId = feature.attributes.id || feature.attributes.incident_id || feature.attributes.OBJECTID;
      
      const { offsetX, offsetY } = generateJitterOffset(incidentId, maxJitterMeters);
      
      const jitteredGeometry = new Point({
        longitude: (originalGeometry.longitude ?? 0) + offsetX,
        latitude: (originalGeometry.latitude ?? 0) + offsetY,
        spatialReference: originalGeometry.spatialReference
      });
      
      return new Graphic({
        geometry: jitteredGeometry,
        attributes: { ...feature.attributes }
      });
    });
    
    // Update the jittered layer's source
    await jitteredLayer.queryFeatures().then(async (existingResult) => {
      // Remove all existing features
      const objectIds = existingResult.features.map(f => f.attributes[jitteredLayer.objectIdField]);
      if (objectIds.length > 0) {
        await jitteredLayer.applyEdits({
          deleteFeatures: existingResult.features
        });
      }
      
      // Add new jittered features
      await jitteredLayer.applyEdits({
        addFeatures: jitteredGraphics
      });
    });
    
  } catch (error) {
    console.error('Error updating jittered layer:', error);
    throw error;
  }
}

