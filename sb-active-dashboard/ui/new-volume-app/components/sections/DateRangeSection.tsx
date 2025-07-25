import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { DateRange, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

export default function DateRangeSection() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState<{ top: number; left: number } | null>(null);
  const [selection, setSelection] = useState({
    startDate: new Date(2023, 0, 1),
    endDate: new Date(2023, 11, 31),
    key: 'selection'
  });
  const [focusedRange, setFocusedRange] = useState<[number, 0 | 1]>([0, 0]);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const calendarIcon = "http://localhost:3845/assets/1be83d6e0c00a3e729a68de2ad961591d68c608d.svg";

  // Click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        closeCalendar();
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
    // The component now correctly manages the start/end date logic
    // because we are controlling its focus.
    // We just need to update our state with the new range.
    if (ranges.selection) {
      setSelection(prev => ({...prev, ...ranges.selection}));
    }
  };

  const openCalendar = () => {
    if (datePickerRef.current) {
      const rect = datePickerRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    setShowCalendar(true);
  };

  const closeCalendar = () => {
    setShowCalendar(false);
    setCalendarPosition(null);
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

  // Portal calendar component
  const CalendarPortal = () => {
    if (!showCalendar || !calendarPosition) return null;

    return ReactDOM.createPortal(
      <div 
        ref={calendarRef}
        className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg"
        style={{ top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px` }}
      >
        <style>{`
          .rdrMonth { width: 250px; }
          .rdrCalendarWrapper { font-size: 12px; }
          .rdrDateDisplayWrapper { display: none; }
          
          /* Add left padding and increase font size for month name */
          .rdrMonthName {
            padding: 0 0 0 8px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
          }
          
          /* Make month picker dropdown text bigger */
          .rdrMonthPicker select {
            font-size: 16px !important;
            font-weight: 600 !important;
          }
          
          /* Make year picker dropdown text bigger */
          .rdrYearPicker select {
            font-size: 16px !important;
            font-weight: 600 !important;
          }
          
          /* Make months fill more width */
          .rdrMonths.rdrMonthsHorizontal {
            width: 100% !important;
          }
          
          .rdrMonths.rdrMonthsHorizontal .rdrMonth {
            width: 100% !important;
          }
          
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
          onRangeFocusChange={setFocusedRange}
          focusedRange={focusedRange}
          moveRangeOnFirstSelection={false}
          months={1}
          direction="horizontal"
          showDateDisplay={false}
        />
        <div className="p-2 border-t">
          <button 
            onClick={closeCalendar}
            className="w-full px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Done
          </button>
        </div>
      </div>,
      document.getElementById('tooltip-portal')!
    );
  };

  return (
    <div className="p-4">
      <div id="date-range-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Date Range</h3>
        <div ref={datePickerRef} id="date-range-picker" className="bg-gray-100 p-2 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <div 
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
              onClick={() => showCalendar ? closeCalendar() : openCalendar()}
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
              onClick={() => showCalendar ? closeCalendar() : openCalendar()}
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

          <CalendarPortal />
        </div>
      </div>
    </div>
  );
} 