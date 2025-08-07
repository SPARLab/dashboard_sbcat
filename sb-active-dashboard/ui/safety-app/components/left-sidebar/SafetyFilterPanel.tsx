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
  // Date range state for safety data filtering
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 3); // Default to 3 years of data
    return { startDate, endDate };
  });

  const handleDateRangeChange = (newDateRange: DateRangeValue) => {
    setDateRange(newDateRange);
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
      <ConflictTypeSection />
      <hr className="border-gray-200" />

      {/* Date Range - Reused from New Volume */}
      <DateRangeSection 
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
      <hr className="border-gray-200" />

      {/* Time of Day */}
      <TimeOfDaySection />
      <hr className="border-gray-200" />

      {/* Weekdays vs Weekends */}
      <WeekdaysWeekendsSection />
      <hr className="border-gray-200" />

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
        <div id="safety-severity-no-injury-container">
          <SeverityToggle 
            label="No Injury" 
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
            label="Self-Reports (BikeMaps.org" 
            checked={selfReports}
            onChange={() => toggleDataSource('self')}
          />
          <img 
            id="safety-data-source-bikemaps-logo"
            src="/icons/bike-maps-icon.svg" 
            alt="BikeMaps.org logo" 
            className="w-4 h-4 -ml-1"
          />
          <span id="safety-data-source-closing-paren" className="text-sm -ml-1 text-gray-700">)</span>
        </div>
      </div>
    </div>
  );
}

function ConflictTypeSection() {
  const [conflictMode, setConflictMode] = useState<'all' | 'none' | 'individual'>('all');
  const [individualConflicts, setIndividualConflicts] = useState({
    bikeVsCar: true,
    bikeVsBike: true,
    bikeVsPedestrian: true,
    bikeVsInfrastructure: true,
    bikeVsOther: true,
    pedestrianVsCar: true,
    pedestrianVsPedestrian: true,
    pedestrianVsInfrastructure: true,
  });

  const toggleIndividualConflict = (key: keyof typeof individualConflicts) => {
    setIndividualConflicts(prev => ({ ...prev, [key]: !prev[key] }));
    setConflictMode('individual');
  };

  const handleModeChange = (mode: 'all' | 'none') => {
    setConflictMode(mode);
    if (mode === 'all') {
      setIndividualConflicts({
        bikeVsCar: true,
        bikeVsBike: true,
        bikeVsPedestrian: true,
        bikeVsInfrastructure: true,
        bikeVsOther: true,
        pedestrianVsCar: true,
        pedestrianVsPedestrian: true,
        pedestrianVsInfrastructure: true,
      });
    } else {
      setIndividualConflicts({
        bikeVsCar: false,
        bikeVsBike: false,
        bikeVsPedestrian: false,
        bikeVsInfrastructure: false,
        bikeVsOther: false,
        pedestrianVsCar: false,
        pedestrianVsPedestrian: false,
        pedestrianVsInfrastructure: false,
      });
    }
  };

  return (
    <div id="safety-conflict-type-section" className="px-4 py-4">
      <h3 id="safety-conflict-type-title" className="text-base font-medium text-gray-700 mb-2">Conflict Type</h3>
      
      {/* All/None buttons */}
      <div id="safety-conflict-type-mode-buttons" className="flex gap-1 mb-2">
        <button 
          id="safety-conflict-type-all-button"
          onClick={() => handleModeChange('all')}
          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none active:outline-none ${
            conflictMode === 'all' 
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
            conflictMode === 'none' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white border border-blue-500 text-blue-500 hover:bg-blue-50'
          }`}
        >
          None
        </button>
      </div>

      {/* Individual conflict toggles */}
      <div id="safety-conflict-type-toggles" className="space-y-0.5">
        <div id="safety-conflict-type-bike-vs-car-container">
          <ConflictToggle 
            label="Bike vs car" 
            checked={individualConflicts.bikeVsCar}
            onChange={() => toggleIndividualConflict('bikeVsCar')}
          />
        </div>
        <div id="safety-conflict-type-bike-vs-bike-container">
          <ConflictToggle 
            label="Bike vs bike" 
            checked={individualConflicts.bikeVsBike}
            onChange={() => toggleIndividualConflict('bikeVsBike')}
          />
        </div>
        <div id="safety-conflict-type-bike-vs-pedestrian-container">
          <ConflictToggle 
            label="Bike vs pedestrian" 
            checked={individualConflicts.bikeVsPedestrian}
            onChange={() => toggleIndividualConflict('bikeVsPedestrian')}
          />
        </div>
        <div id="safety-conflict-type-bike-vs-infrastructure-container">
          <ConflictToggle 
            label="Bike vs infrastructure" 
            checked={individualConflicts.bikeVsInfrastructure}
            onChange={() => toggleIndividualConflict('bikeVsInfrastructure')}
          />
        </div>
        <div id="safety-conflict-type-bike-vs-other-container">
          <ConflictToggle 
            label="Bike vs other" 
            checked={individualConflicts.bikeVsOther}
            onChange={() => toggleIndividualConflict('bikeVsOther')}
          />
        </div>
        <div id="safety-conflict-type-pedestrian-vs-car-container">
          <ConflictToggle 
            label="Pedestrian vs car" 
            checked={individualConflicts.pedestrianVsCar}
            onChange={() => toggleIndividualConflict('pedestrianVsCar')}
          />
        </div>
        <div id="safety-conflict-type-pedestrian-vs-pedestrian-container">
          <ConflictToggle 
            label="Pedestrian vs pedestrian" 
            checked={individualConflicts.pedestrianVsPedestrian}
            onChange={() => toggleIndividualConflict('pedestrianVsPedestrian')}
          />
        </div>
        <div id="safety-conflict-type-pedestrian-vs-infrastructure-container">
          <ConflictToggle 
            label="Pedestrian vs infrastructure" 
            checked={individualConflicts.pedestrianVsInfrastructure}
            onChange={() => toggleIndividualConflict('pedestrianVsInfrastructure')}
          />
        </div>
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

function TimeOfDaySection() {
  const [timeOfDayEnabled, setTimeOfDayEnabled] = useState(true);
  const [selectedTime, setSelectedTime] = useState('morning');

  const timeOptions = [
    { id: 'morning', label: 'Morning' },
    { id: 'afternoon', label: 'Afternoon' },
    { id: 'evening', label: 'Evening' }
  ];

  return (
    <div id="safety-time-of-day-section" className="px-4 py-4">
      <div id="safety-time-of-day-header" className="flex items-center justify-between mb-3">
        <h3 id="safety-time-of-day-title" className="text-base font-medium text-gray-700">Time of Day</h3>
        <div id="safety-time-of-day-toggle-container" className="relative">
          <input
            id="safety-time-of-day-toggle-input"
            type="checkbox"
            checked={timeOfDayEnabled}
            onChange={(e) => setTimeOfDayEnabled(e.target.checked)}
            className="sr-only"
          />
          <div
            id="safety-time-of-day-toggle-visual"
            onClick={() => setTimeOfDayEnabled(!timeOfDayEnabled)}
            className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-all duration-200 focus:outline-none active:outline-none ${
              timeOfDayEnabled ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <div id="safety-time-of-day-toggle-dot" className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"></div>
          </div>
        </div>
      </div>

      {timeOfDayEnabled && (
        <div id="safety-time-of-day-options" className="bg-gray-100 p-2 rounded-md flex gap-1">
          {timeOptions.map((option) => (
            <button
              key={option.id}
              id={`safety-time-of-day-${option.id}-button`}
              onClick={() => setSelectedTime(option.id)}
              className={`flex-1 px-1.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none active:outline-none ${
                selectedTime === option.id
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

function WeekdaysWeekendsSection() {
  const [weekdayEnabled, setWeekdayEnabled] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekdays');

  const periodOptions = [
    { id: 'weekdays', label: 'Weekdays' },
    { id: 'weekends', label: 'Weekends' }
  ];

  return (
    <div id="safety-weekdays-weekends-section" className="px-4 py-4">
      <div id="safety-weekdays-weekends-header" className="flex items-center justify-between mb-3">
        <h3 id="safety-weekdays-weekends-title" className="text-base font-medium text-gray-700">Weekdays vs Weekends</h3>
        <div id="safety-weekdays-weekends-toggle-container" className="relative">
          <input
            id="safety-weekdays-weekends-toggle-input"
            type="checkbox"
            checked={weekdayEnabled}
            onChange={(e) => setWeekdayEnabled(e.target.checked)}
            className="sr-only"
          />
          <div
            id="safety-weekdays-weekends-toggle-visual"
            onClick={() => setWeekdayEnabled(!weekdayEnabled)}
            className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-all duration-200 focus:outline-none active:outline-none ${
              weekdayEnabled ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <div id="safety-weekdays-weekends-toggle-dot" className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"></div>
          </div>
        </div>
      </div>

      {weekdayEnabled && (
        <div id="safety-weekdays-weekends-options" className="bg-gray-100 p-2 rounded-md flex gap-1">
          {periodOptions.map((option) => (
            <button
              key={option.id}
              id={`safety-weekdays-weekends-${option.id}-button`}
              onClick={() => setSelectedPeriod(option.id)}
              className={`flex-1 px-1.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none active:outline-none ${
                selectedPeriod === option.id
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
