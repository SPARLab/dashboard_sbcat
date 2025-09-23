import { useState } from "react";
import { SafetyFilters } from "../../../../lib/safety-app/types";
import DateRangeSection from "../../../components/filters/DateRangeSection";
import GeographicLevelSection from "../../../components/filters/GeographicLevelSection";

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface SafetyFilterPanelProps {
  filters: Partial<SafetyFilters>;
  onFiltersChange: (newFilters: Partial<SafetyFilters>) => void;
  geographicLevel: string;
  onGeographicLevelChange: (level: string) => void;
}

export default function SafetyFilterPanel({
  filters,
  onFiltersChange,
  geographicLevel,
  onGeographicLevelChange
}: SafetyFilterPanelProps) {
  // Convert SafetyFilters dateRange format to DateRangeValue format for the component
  const dateRangeFromFilters: DateRangeValue = {
    startDate: filters.dateRange?.start || new Date(new Date().getFullYear() - 3, 0, 1),
    endDate: filters.dateRange?.end || new Date()
  };

  const handleDateRangeChange = (newDateRange: DateRangeValue) => {
    // Convert back to SafetyFilters format and update filters
    onFiltersChange({
      ...filters,
      dateRange: {
        start: newDateRange.startDate,
        end: newDateRange.endDate
      }
    });
  };
  return (
    <>
      {/* Severity of Incident */}
      <SeverityOfIncidentSection 
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <hr className="border-gray-200" />

      {/* Data Source */}
      <DataSourceSection 
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <hr className="border-gray-200" />

      {/* Conflict Type */}
      <ConflictTypeSection 
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <hr className="border-gray-200" />

      {/* Date Range - Reused from New Volume */}
      <DateRangeSection 
        dateRange={dateRangeFromFilters}
        onDateRangeChange={handleDateRangeChange}
      />
      <hr className="border-gray-200" />

      {/* Time of Day */}
      <TimeOfDaySection 
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <hr className="border-gray-200" />

      {/* Weekdays vs Weekends */}
      <WeekdaysWeekendsSection 
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <hr className="border-gray-200" />

      {/* Custom Draw Tool Instructions - Only show when custom is selected */}
      {geographicLevel === 'custom' && (
        <>
          <div
            id="safety-custom-draw-tool-instructions"
            className="px-4 py-4 bg-blue-100 border-l-4 border-blue-500"
          >
            <h3 className="text-base font-medium text-gray-900">Custom Draw Tool</h3>
            <p className="text-sm text-gray-600 mt-1">
              Click on the map to draw a custom area. Click the first point again to complete the polygon.
            </p>
          </div>
          <hr className="border-gray-200" />
        </>
      )}

      {/* Geographic Level - Reused from New Volume */}
      <GeographicLevelSection 
        geographicLevel={geographicLevel}
        onGeographicLevelChange={onGeographicLevelChange}
      />
    </>
  );
}

function SeverityOfIncidentSection({
  filters,
  onFiltersChange
}: {
  filters: Partial<SafetyFilters>;
  onFiltersChange: (filters: Partial<SafetyFilters>) => void;
}) {

  const currentSeverityTypes = filters.severityTypes || [];

  const toggleSeverity = (severity: 'Fatality' | 'Severe Injury' | 'Injury' | 'No Injury' | 'Unknown') => {
    let newSeverityTypes: ('Fatality' | 'Severe Injury' | 'Injury' | 'No Injury' | 'Unknown')[] = [...currentSeverityTypes];

    if (newSeverityTypes.includes(severity)) {
      newSeverityTypes = newSeverityTypes.filter(s => s !== severity);
    } else {
      newSeverityTypes.push(severity);
    }

    newSeverityTypes.sort();
    onFiltersChange({ severityTypes: newSeverityTypes });
  };

  return (
    <div id="safety-severity-section" className="px-4 py-4">
      <h3 id="safety-severity-title" className="text-base font-medium text-gray-700 mb-3">Severity of Incident</h3>
      <div id="safety-severity-toggles" className="space-y-1.5">
        <div id="safety-severity-fatality-container">
          <SeverityToggle 
            label="Fatality" 
            checked={currentSeverityTypes.includes('Fatality')}
            onChange={() => toggleSeverity('Fatality')}
          />
        </div>
        <div id="safety-severity-severe-injury-container">
          <SeverityToggle 
            label="Severe Injury" 
            checked={currentSeverityTypes.includes('Severe Injury')}
            onChange={() => toggleSeverity('Severe Injury')}
          />
        </div>
        <div id="safety-severity-injury-container">
          <SeverityToggle 
            label="Injury" 
            checked={currentSeverityTypes.includes('Injury')}
            onChange={() => toggleSeverity('Injury')}
          />
        </div>
        <div id="safety-severity-near-miss-container">
          <SeverityToggle 
            label="Near Miss" 
            checked={currentSeverityTypes.includes('No Injury')}
            onChange={() => toggleSeverity('No Injury')}
          />
        </div>
        <div id="safety-severity-unknown-container">
          <SeverityToggle 
            label="Unknown" 
            checked={currentSeverityTypes.includes('Unknown')}
            onChange={() => toggleSeverity('Unknown')}
          />
        </div>
      </div>
    </div>
  );
}

function SeverityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  const labelId = label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  return (
    <div id={`safety-toggle-${labelId}`} className="flex items-center gap-1">
      <div id={`safety-toggle-${labelId}-input-container`} className="relative">
        <input
          id={`safety-toggle-${labelId}-checkbox`}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          id={`safety-toggle-${labelId}-visual`}
          onClick={onChange}
          className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-all duration-200 focus:outline-none active:outline-none ${
            checked 
              ? 'bg-blue-500 justify-end' 
              : 'bg-gray-300 justify-start'
          }`}
        >
          <div 
            id={`safety-toggle-${labelId}-dot`} 
            className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
          ></div>
        </div>
      </div>
      <label 
        id={`safety-toggle-${labelId}-label`} 
        className="text-sm text-gray-700 cursor-pointer focus:outline-none active:outline-none" 
        onClick={onChange}
      >
        {label}
      </label>
    </div>
  );
}

function DataSourceSection({ 
  filters, 
  onFiltersChange 
}: { 
  filters: Partial<SafetyFilters>; 
  onFiltersChange: (filters: Partial<SafetyFilters>) => void; 
}) {
  const currentDataSources = filters.dataSource || [];
  const policeReports = currentDataSources.includes('SWITRS');
  const selfReports = currentDataSources.includes('BikeMaps.org');

  const toggleDataSource = (sourceType: 'police' | 'self') => {
    let newDataSources: ('SWITRS' | 'BikeMaps.org')[] = [...currentDataSources];
    
    if (sourceType === 'police') {
      if (policeReports) {
        newDataSources = newDataSources.filter(src => src !== 'SWITRS');
      } else {
        newDataSources.push('SWITRS');
      }
    } else {
      if (selfReports) {
        newDataSources = newDataSources.filter(src => src !== 'BikeMaps.org');
      } else {
        newDataSources.push('BikeMaps.org');
      }
    }
    
    // Sort the array to ensure the cache key is consistent
    newDataSources.sort();
    
    // Only pass the dataSource change, not the entire filters object
    onFiltersChange({ dataSource: newDataSources });
  };

  return (
    <div id="safety-data-source-section" className="px-4 py-4">
      <h3 id="safety-data-source-title" className="text-base font-medium text-gray-700 mb-3">Data Source</h3>
      <div id="safety-data-source-toggles" className="space-y-1.5">
        <div id="safety-data-source-police-container">
          <SeverityToggle 
            label="Police Reports" 
            checked={policeReports}
            onChange={() => toggleDataSource('police')}
          />
        </div>
        <div id="safety-data-source-self-reports-container" className="flex items-center gap-1">
          <SeverityToggle 
            label="Self-Reports (" 
            checked={selfReports}
            onChange={() => toggleDataSource('self')}
          />
          <a 
            id="safety-data-source-bikemaps-link"
            href="https://bikemaps.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm -ml-1"
          >
            BikeMaps.org
          </a>
          <img 
            id="safety-data-source-bikemaps-logo"
            src="/icons/bike-maps-icon.svg" 
            alt="BikeMaps.org logo" 
            className="w-4 h-4 -ml-1"
          />
          <span id="safety-data-source-closing-paren" className="text-sm text-gray-700">)</span>
        </div>
      </div>
    </div>
  );
}

function ConflictTypeSection({ 
  filters, 
  onFiltersChange 
}: { 
  filters: Partial<SafetyFilters>; 
  onFiltersChange: (filters: Partial<SafetyFilters>) => void; 
}) {
  // Available conflict types from the user's data
  const availableConflictTypes = [
    'Bike vs vehicle',
    'Pedestrian vs vehicle', 
    'Bike vs other',
    'Bike vs bike',
    'Bike vs pedestrian',
    'Bike vs infrastructure',
    'Pedestrian vs other'
  ];

  const currentConflictTypes = filters.conflictType || [];
  const isEbikeMode = filters.ebikeMode || false;
  
  const toggleConflictType = (conflictType: string) => {
    let newConflictTypes: string[];
    
    if (currentConflictTypes.includes(conflictType)) {
      // Remove conflict type if it's currently selected
      newConflictTypes = currentConflictTypes.filter(type => type !== conflictType);
    } else {
      // Add conflict type if it's not currently selected
      newConflictTypes = [...currentConflictTypes, conflictType];
    }
    
    // Sort the array to ensure the cache key is consistent
    newConflictTypes.sort();
    
    // When toggling conflict types, also update roadUser based on what's selected
    const hasAnyPedConflicts = newConflictTypes.some(type => type.startsWith('Pedestrian vs'));
    const hasAnyBikeConflicts = newConflictTypes.some(type => type.startsWith('Bike vs'));
    
    const updatedFilters: Partial<SafetyFilters> = {
      conflictType: newConflictTypes
    };
    
    // Update roadUser based on selected conflict types
    if (!isEbikeMode) {
      const newRoadUser = [];
      if (hasAnyPedConflicts) newRoadUser.push('pedestrian');
      if (hasAnyBikeConflicts) newRoadUser.push('bicyclist');
      
      if (newRoadUser.length > 0) {
        updatedFilters.roadUser = newRoadUser;
        updatedFilters.showPedestrian = hasAnyPedConflicts;
        updatedFilters.showBicyclist = hasAnyBikeConflicts;
      }
    }
    
    onFiltersChange(updatedFilters);
  };

  const handleModeChange = (mode: 'all' | 'none' | 'ebike') => {
    console.log(`🔘 Conflict Type Mode Changed: ${mode}`);
    
    if (mode === 'all') {
      // Reset to ALL filters to their default state to ensure everything is visible
      // This fixes the issue where incidents would remain filtered out
      const resetFilters = { 
        conflictType: [...availableConflictTypes],
        ebikeMode: false,
        roadUser: ['pedestrian', 'bicyclist'],
        showPedestrian: true,
        showBicyclist: true,
        // Also restore severity types and data sources to defaults
        severityTypes: ['Fatality', 'Severe Injury', 'Injury', 'No Injury', 'Unknown'],
        dataSource: ['SWITRS', 'BikeMaps.org'],
        // Reset time filters to show all times and days
        weekdayFilter: {
          enabled: false,  // Show all days
          type: 'weekdays'
        },
        timeOfDay: {
          enabled: false,  // Show all times
          periods: ['morning', 'afternoon', 'evening']
        }
      };
      console.log('🔄 ALL button - Resetting filters to:', resetFilters);
      onFiltersChange(resetFilters);
    } else if (mode === 'none') {
      onFiltersChange({ 
        conflictType: [],
        ebikeMode: false
      });
    } else if (mode === 'ebike') {
      // Enable e-bike mode and keep only bike-related conflicts initially
      // But allow pedestrian toggles to be added later
      const bikeConflictTypes = availableConflictTypes.filter(type => 
        type.startsWith('Bike vs')
      );
      const ebikeFilters = { 
        conflictType: bikeConflictTypes,
        ebikeMode: true,
        roadUser: ['bicyclist'],  // Start with bicyclist only
        showBicyclist: true
        // Don't change showPedestrian - let user toggle it
      };
      console.log('⚡ E-BIKE button - Setting filters to:', ebikeFilters);
      onFiltersChange(ebikeFilters);
    }
  };

  // Determine current mode based on selected conflict types and e-bike mode
  const allSelected = availableConflictTypes.every(type => currentConflictTypes.includes(type)) && !isEbikeMode;
  const noneSelected = currentConflictTypes.length === 0;
  const currentMode = isEbikeMode ? 'ebike' : allSelected ? 'all' : noneSelected ? 'none' : 'individual';

  // Get display labels based on e-bike mode
  const getDisplayLabel = (conflictType: string): string => {
    if (isEbikeMode && conflictType.startsWith('Bike vs')) {
      return conflictType.replace('Bike vs', 'E-bike vs');
    }
    return conflictType;
  };

  return (
    <div id="safety-conflict-type-section" className="px-4 py-4">
      <h3 id="safety-conflict-type-title" className="text-base font-medium text-gray-700 mb-2">Conflict Type</h3>
      
      {/* All/None/E-bike buttons */}
      <div id="safety-conflict-type-mode-buttons" className="flex gap-1 mb-2">
        <button 
          id="safety-conflict-type-all-button"
          onClick={() => handleModeChange('all')}
          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none active:outline-none ${
            currentMode === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white border border-blue-500 text-blue-500 hover:bg-blue-50'
          }`}
        >
          All
        </button>
        <button 
          id="safety-conflict-type-none-button"
          onClick={() => handleModeChange('none')}
          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none active:outline-none ${
            currentMode === 'none' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white border border-blue-500 text-blue-500 hover:bg-blue-50'
          }`}
        >
          None
        </button>
        <button 
          id="safety-conflict-type-ebike-button"
          onClick={() => handleModeChange('ebike')}
          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none active:outline-none ${
            currentMode === 'ebike' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white border border-blue-500 text-blue-500 hover:bg-blue-50'
          }`}
        >
          E-bike
        </button>
      </div>

      {/* E-bike mode disclaimer */}
      {isEbikeMode && (
        <div id="safety-ebike-disclaimer" className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          <p>⚠️ E-bike data available from 2022+. Earlier incidents may include unclassified e-bikes in general bike category.</p>
        </div>
      )}

      {/* Individual conflict toggles */}
      <div id="safety-conflict-type-toggles" className="space-y-0.5">
        {availableConflictTypes.map((conflictType) => {
          const labelId = conflictType.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const displayLabel = getDisplayLabel(conflictType);
          
          return (
            <div key={conflictType} id={`safety-conflict-type-${labelId}-container`}>
              <ConflictToggle 
                label={displayLabel} 
                checked={currentConflictTypes.includes(conflictType)}
                onChange={() => toggleConflictType(conflictType)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConflictToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <SeverityToggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

function TimeOfDaySection({
  filters,
  onFiltersChange
}: {
  filters: Partial<SafetyFilters>;
  onFiltersChange: (filters: Partial<SafetyFilters>) => void;
}) {
  const timeOfDayFilter = filters.timeOfDay || { enabled: true, periods: ['morning'] };
  
  const timeOptions = [
    { id: 'morning', label: 'Morning' },
    { id: 'afternoon', label: 'Afternoon' },
    { id: 'evening', label: 'Evening' }
  ] as const;

  const handleToggleEnabled = (enabled: boolean) => {
    onFiltersChange({
      timeOfDay: {
        ...timeOfDayFilter,
        enabled
      }
    });
  };

  const handlePeriodToggle = (period: 'morning' | 'afternoon' | 'evening') => {
    const currentPeriods = timeOfDayFilter.periods || [];
    let newPeriods: ('morning' | 'afternoon' | 'evening')[];

    if (currentPeriods.includes(period)) {
      // Remove the period if it's currently selected, but ensure at least one remains
      newPeriods = currentPeriods.filter(p => p !== period);
      if (newPeriods.length === 0) {
        newPeriods = [period]; // Keep at least one selected
      }
    } else {
      // Add the period if it's not currently selected
      newPeriods = [...currentPeriods, period];
    }

    onFiltersChange({
      timeOfDay: {
        ...timeOfDayFilter,
        periods: newPeriods
      }
    });
  };

  return (
    <div id="safety-time-of-day-section" className="px-4 py-4">
      <div id="safety-time-of-day-header" className="flex items-center justify-between mb-3">
        <h3 id="safety-time-of-day-title" className="text-base font-medium text-gray-700">Time of Day</h3>
        <div id="safety-time-of-day-toggle-container" className="relative">
          <input
            id="safety-time-of-day-toggle-input"
            type="checkbox"
            checked={timeOfDayFilter.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="sr-only"
          />
          <div
            id="safety-time-of-day-toggle-visual"
            onClick={() => handleToggleEnabled(!timeOfDayFilter.enabled)}
            className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-all duration-200 focus:outline-none active:outline-none ${
              timeOfDayFilter.enabled ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <div id="safety-time-of-day-toggle-dot" className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"></div>
          </div>
        </div>
      </div>

      {timeOfDayFilter.enabled && (
        <div id="safety-time-of-day-options" className="bg-gray-100 p-2 rounded-md flex gap-1">
          {timeOptions.map((option) => {
            const isSelected = timeOfDayFilter.periods?.includes(option.id) || false;
            return (
              <button
                key={option.id}
                id={`safety-time-of-day-${option.id}-button`}
                onClick={() => handlePeriodToggle(option.id)}
                className={`flex-1 px-1.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none active:outline-none ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekdaysWeekendsSection({
  filters,
  onFiltersChange
}: {
  filters: Partial<SafetyFilters>;
  onFiltersChange: (filters: Partial<SafetyFilters>) => void;
}) {
  const weekdayFilter = filters.weekdayFilter || { enabled: true, type: 'weekdays' };

  const periodOptions = [
    { id: 'weekdays', label: 'Weekdays' },
    { id: 'weekends', label: 'Weekends' }
  ] as const;

  const handleToggleEnabled = (enabled: boolean) => {
    onFiltersChange({
      weekdayFilter: {
        ...weekdayFilter,
        enabled
      }
    });
  };

  const handlePeriodChange = (type: 'weekdays' | 'weekends') => {
    onFiltersChange({
      weekdayFilter: {
        ...weekdayFilter,
        type
      }
    });
  };

  return (
    <div id="safety-weekdays-weekends-section" className="px-4 py-4">
      <div id="safety-weekdays-weekends-header" className="flex items-center justify-between mb-3">
        <h3 id="safety-weekdays-weekends-title" className="text-base font-medium text-gray-700">Weekdays vs Weekends</h3>
        <div id="safety-weekdays-weekends-toggle-container" className="relative">
          <input
            id="safety-weekdays-weekends-toggle-input"
            type="checkbox"
            checked={weekdayFilter.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="sr-only"
          />
          <div
            id="safety-weekdays-weekends-toggle-visual"
            onClick={() => handleToggleEnabled(!weekdayFilter.enabled)}
            className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-all duration-200 focus:outline-none active:outline-none ${
              weekdayFilter.enabled ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <div id="safety-weekdays-weekends-toggle-dot" className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"></div>
          </div>
        </div>
      </div>

      {weekdayFilter.enabled && (
        <div id="safety-weekdays-weekends-options" className="bg-gray-100 p-2 rounded-md flex gap-1">
          {periodOptions.map((option) => (
            <button
              key={option.id}
              id={`safety-weekdays-weekends-${option.id}-button`}
              onClick={() => handlePeriodChange(option.id)}
              className={`flex-1 px-1.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none active:outline-none ${
                weekdayFilter.type === option.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
