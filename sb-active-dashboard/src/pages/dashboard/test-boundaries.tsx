import React, { useEffect, useRef, useState } from "react";
import MapView from "@arcgis/core/views/MapView";
import Map from "@arcgis/core/Map";
import { GeographicBoundariesService } from "../../../lib/data-services/GeographicBoundariesService";

interface TestResult {
  level: string;
  status: 'testing' | 'success' | 'error';
  message: string;
}

export default function TestBoundariesPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const boundaryServiceRef = useRef<GeographicBoundariesService | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map and view
    const map = new Map({
      basemap: "streets-navigation-vector"
    });

    const view = new MapView({
      container: mapRef.current,
      map: map,
      center: [-119.7, 34.4], // Santa Barbara area
      zoom: 10
    });

    viewRef.current = view;

    // Initialize boundary service
    boundaryServiceRef.current = new GeographicBoundariesService();

    view.when(() => {
      // Add boundary layers to map
      const boundaryLayers = boundaryServiceRef.current!.getBoundaryLayers();
      boundaryLayers.forEach(layer => map.add(layer));
      setIsInitialized(true);
    });

    return () => {
      view?.destroy();
    };
  }, []);

  const testGeographicLevel = async (level: 'county' | 'city' | 'census-tract' | 'hexagons' | 'custom') => {
    if (!boundaryServiceRef.current || !viewRef.current) return;

    const testId = `test-${level}-${Date.now()}`;
    
    // Add testing result
    setTestResults(prev => [...prev, {
      level,
      status: 'testing',
      message: 'Testing...'
    }]);

    try {
      const result = await boundaryServiceRef.current.switchGeographicLevel(level, viewRef.current);
      
      if (result.success) {
        setTestResults(prev => prev.map(test => 
          test.level === level && test.status === 'testing' 
            ? {
                ...test,
                status: 'success' as const,
                message: result.defaultArea 
                  ? `✓ Success! Selected: ${result.defaultArea.name}`
                  : `✓ Success! ${result.warning || 'Level activated'}`
              }
            : test
        ));
      } else {
        setTestResults(prev => prev.map(test => 
          test.level === level && test.status === 'testing'
            ? {
                ...test,
                status: 'error' as const,
                message: `✗ Failed: ${result.warning}`
              }
            : test
        ));
      }
    } catch (error) {
      setTestResults(prev => prev.map(test => 
        test.level === level && test.status === 'testing'
          ? {
              ...test,
              status: 'error' as const,
              message: `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          : test
      ));
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    const levels: Array<'county' | 'city' | 'census-tract' | 'hexagons' | 'custom'> = 
      ['county', 'city', 'census-tract', 'hexagons', 'custom'];
    
    for (const level of levels) {
      await testGeographicLevel(level);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getDataSourcesReport = () => {
    if (!boundaryServiceRef.current) return null;
    return boundaryServiceRef.current.getMissingDataSources();
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white p-4 border-b shadow-sm">
        <h1 id="test-boundaries-title" className="text-2xl font-bold text-gray-900">
          Geographic Boundaries Test Page
        </h1>
        <p className="text-gray-600 mt-1">
          Test the GeographicBoundariesService functionality
        </p>
      </div>

      <div className="flex-1 flex">
        {/* Test Panel */}
        <div className="w-96 bg-gray-50 p-4 overflow-y-auto border-r">
          <div className="space-y-4">
            <div>
              <button
                id="run-all-tests-button"
                onClick={runAllTests}
                disabled={!isInitialized}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isInitialized ? 'Run All Tests' : 'Initializing...'}
              </button>
            </div>

            {/* Individual Test Buttons */}
            <div className="space-y-2">
              <h3 id="individual-tests-title" className="text-sm font-medium text-gray-700">Individual Tests:</h3>
              {(['county', 'city', 'census-tract', 'hexagons', 'custom'] as const).map(level => (
                <button
                  key={level}
                  id={`test-${level}-button`}
                  onClick={() => testGeographicLevel(level)}
                  disabled={!isInitialized}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-left"
                >
                  Test {level.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              <h3 id="test-results-title" className="text-sm font-medium text-gray-700">Test Results:</h3>
              <div id="test-results-container" className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={`${result.level}-${index}`}
                    className={`p-3 rounded-md text-sm ${
                      result.status === 'success' 
                        ? 'bg-green-100 border border-green-300' 
                        : result.status === 'error'
                        ? 'bg-red-100 border border-red-300'
                        : 'bg-yellow-100 border border-yellow-300'
                    }`}
                  >
                    <div className="font-medium capitalize">{result.level.replace('-', ' ')}</div>
                    <div className="text-xs mt-1">{result.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Sources Report */}
            <div className="space-y-2">
              <h3 id="data-sources-title" className="text-sm font-medium text-gray-700">Data Sources:</h3>
              <div id="data-sources-report" className="bg-white p-3 rounded-md border text-xs">
                {(() => {
                  const report = getDataSourcesReport();
                  if (!report) return <p>Loading...</p>;
                  
                  return (
                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-green-700">Available:</div>
                        <ul className="list-disc list-inside text-gray-600">
                          {report.available.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      {report.missing.length > 0 && (
                        <div>
                          <div className="font-medium text-red-700">Missing:</div>
                          <ul className="list-disc list-inside text-gray-600">
                            {report.missing.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div 
            id="test-boundaries-map"
            ref={mapRef} 
            className="w-full h-full"
          />
          
                      {/* Map Info Overlay */}
          <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg max-w-xs">
            <h4 id="map-info-title" className="text-sm font-medium text-gray-900 mb-2">Interactive Features</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <span className="font-medium">Test "city"</span> to enable interactivity</li>
              <li>• <span className="inline-block w-3 h-3 bg-yellow-400 rounded mr-1"></span>Hover cities → Yellow highlight</li>
              <li>• <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span>Click cities → Blue selection</li>
              <li>• Check console for selection logs</li>
              <li>• Pan/zoom to explore boundaries</li>
            </ul>
            
            {boundaryServiceRef.current?.getSelectedArea() && (
              <div className="mt-3 pt-2 border-t">
                <div className="text-xs">
                  <div className="font-medium">🎯 Selected:</div>
                  <div className="text-blue-600 font-medium">
                    {boundaryServiceRef.current.getSelectedArea()?.name}
                  </div>
                  <div className="text-gray-600">
                    Level: {boundaryServiceRef.current.getCurrentLevel()}
                  </div>
                </div>
              </div>
            )}
            
            {boundaryServiceRef.current?.getCurrentLevel() === 'city' && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-green-600 font-medium">
                  ✨ City interactivity enabled!
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Hover and click cities to test
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}