import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DateRange, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

export default function DateRangeSection() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selection, setSelection] = useState({
    startDate: new Date(2023, 0, 1),
    endDate: new Date(2023, 11, 31),
    key: 'selection'
  });
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const calendarIcon = "http://localhost:3845/assets/1be83d6e0c00a3e729a68de2ad961591d68c608d.svg";

  // Click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const handleSelect = (ranges: RangeKeyDict) => {
    const { startDate, endDate } = ranges.selection;
    if (startDate && endDate) {
      setSelection({
        startDate,
        endDate,
        key: 'selection'
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const startOfYear = new Date(2023, 0, 1);
  const endOfYear = new Date(2023, 11, 31);
  const totalDays = (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  
  const startPercent = ((selection.startDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;
  const endPercent = ((selection.endDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;

  const handleMouseDown = useCallback((type: 'start' | 'end') => {
    setIsDragging(type);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const days = Math.round((percent / 100) * totalDays);
    const newDate = new Date(startOfYear.getTime() + days * 24 * 60 * 60 * 1000);

    if (isDragging === 'start' && newDate <= selection.endDate) {
      setSelection(prev => ({ ...prev, startDate: newDate }));
    } else if (isDragging === 'end' && newDate >= selection.startDate) {
      setSelection(prev => ({ ...prev, endDate: newDate }));
    }
  }, [isDragging, totalDays, startOfYear, selection.startDate, selection.endDate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  return (
    <div className="p-4">
      <div id="date-range-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Date Range</h3>
        <div id="date-range-picker" className="bg-gray-100 p-2 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <div 
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <span id="start-date-label" className="text-xs text-gray-600">
                {formatDate(selection.startDate)}
              </span>
              <img 
                src={calendarIcon} 
                alt="start date" 
                className="w-3.5 h-3.5" 
              />
            </div>
            <div 
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <span id="end-date-label" className="text-xs text-gray-600">
                {formatDate(selection.endDate)}
              </span>
              <img 
                src={calendarIcon} 
                alt="end date" 
                className="w-3.5 h-3.5" 
              />
            </div>
          </div>
          
          <div 
            className="relative h-6 flex items-center px-2"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div ref={trackRef} className="relative w-full h-2 bg-gray-200 rounded-full">
              <div 
                id="date-range-selection"
                className="absolute h-2 bg-blue-500 rounded-full"
                style={{
                  left: `${startPercent}%`,
                  width: `${endPercent - startPercent}%`
                }}
              />
              <div
                className="absolute size-4 bg-white border-2 border-blue-500 rounded-full -top-1 cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${startPercent}%`,
                  transform: 'translateX(-50%)'
                }}
                onMouseDown={() => handleMouseDown('start')}
              />
              <div
                className="absolute size-4 bg-white border-2 border-blue-500 rounded-full -top-1 cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${endPercent}%`,
                  transform: 'translateX(-50%)'
                }}
                onMouseDown={() => handleMouseDown('end')}
              />
            </div>
          </div>

          {showCalendar && (
            <div className="relative">
              <div 
                ref={calendarRef}
                className="absolute top-0 left-0 z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg"
              >
                <style>{`
                  .rdrMonth { width: 250px; }
                  .rdrCalendarWrapper { font-size: 12px; }
                  .rdrDateDisplayWrapper { display: none; }
                  
                  /* Force black text on selected dates */
                  .rdrInRange .rdrDayNumber span,
                  .rdrStartEdge .rdrDayNumber span,
                  .rdrEndEdge .rdrDayNumber span,
                  .rdrSelected .rdrDayNumber span {
                    color: #000000 !important;
                    font-weight: 700 !important;
                  }
                `}</style>
                <DateRange
                  ranges={[selection]}
                  onChange={handleSelect}
                  moveRangeOnFirstSelection={false}
                  months={1}
                  direction="horizontal"
                  showDateDisplay={false}
                />
                <div className="p-2 border-t">
                  <button 
                    onClick={() => setShowCalendar(false)}
                    className="w-full px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 