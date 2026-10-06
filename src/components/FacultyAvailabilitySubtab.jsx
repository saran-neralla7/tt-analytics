import React, { useState, useMemo } from 'react';
import initialData from '../data/initialData.json';
import { periodSlots, getActiveDays } from '../data/mockData';
import { getFacultyShortName } from '../utils/facultyShortNames';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Sparkles, 
  LayoutGrid, 
  Table as TableIcon, 
  Briefcase, 
  Building, 
  Users, 
  Printer, 
  DoorOpen,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import PrintFormatToggle from './PrintFormatToggle';
import { triggerPrint, getPrintFormat } from '../utils/printUtils';

export const SESSION_DEFINITIONS = [
  {
    id: 'session-1',
    number: 1,
    name: 'Session 1',
    label: 'Session 1 (Pre-Break)',
    timeRange: '09:00 - 11:00',
    description: 'First two periods before break',
    periods: ['09:00-10:00', '10:00-11:00'],
    periodLabels: ['Period 1 (09:00-10:00)', 'Period 2 (10:00-11:00)'],
    badge: 'P1 & P2',
    breakNote: 'Followed by Morning Break (11:00-11:15)'
  },
  {
    id: 'session-2',
    number: 2,
    name: 'Session 2',
    label: 'Session 2 (Post-Break)',
    timeRange: '11:15 - 01:15',
    description: 'Two periods between break and lunch',
    periods: ['11:15-12:15', '12:15-01:15'],
    periodLabels: ['Period 3 (11:15-12:15)', 'Period 4 (12:15-01:15)'],
    badge: 'P3 & P4',
    breakNote: 'Followed by Lunch Break (01:15-02:15)'
  },
  {
    id: 'session-3',
    number: 3,
    name: 'Session 3',
    label: 'Session 3 (Post-Lunch)',
    timeRange: '02:15 - 04:15',
    description: 'Two periods after lunch',
    periods: ['02:15-03:15', '03:15-04:15'],
    periodLabels: ['Period 5 (02:15-03:15)', 'Period 6 (03:15-04:15)'],
    badge: 'P5 & P6',
    breakNote: 'End of Academic Day'
  },
];

export default function FacultyAvailabilitySubtab({
  facultyList = initialData.facultyList || [],
  timetableData = {},
  universityInfo = {},
  onSlotClick
}) {
  const activeDaysList = useMemo(() => getActiveDays(timetableData), [timetableData]);
  const academicSlots = useMemo(() => {
    return periodSlots.filter(s => s.type !== 'break').map(s => s.time);
  }, []);

  // Tracking Mode: 'period' (1 hour period-wise) | 'session' (2 hours session-wise)
  const [trackingMode, setTrackingMode] = useState('period');

  // Filter States
  const [selectedDay, setSelectedDay] = useState('MON');
  const [selectedSlot, setSelectedSlot] = useState(academicSlots[0] || '09:00-10:00');
  const [selectedSessionId, setSelectedSessionId] = useState('session-1');
  const [selectedDept, setSelectedDept] = useState('ALL');
  
  // Status Filter:
  // In period mode: 'ALL' | 'FREE' | 'OCCUPIED'
  // In session mode: 'ALL' | 'FULL_FREE' | 'PARTIAL_FREE' | 'OCCUPIED'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [printFormat, setPrintFormat] = useState('a4-portrait');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Current session object
  const activeSession = useMemo(() => {
    return SESSION_DEFINITIONS.find(s => s.id === selectedSessionId) || SESSION_DEFINITIONS[0];
  }, [selectedSessionId]);

  // Unique departments with preferred sorting
  const departments = useMemo(() => {
    const set = new Set();
    facultyList.forEach(f => {
      const d = f.dept?.trim() || 'General';
      if (d) set.add(d);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [facultyList]);

  // Handle mode switch cleanly
  const handleModeChange = (mode) => {
    setTrackingMode(mode);
    setStatusFilter('ALL');
  };

  // Real-time "Right Now" auto-detector for both Period & Session modes
  const handleSelectRightNow = () => {
    const now = new Date();
    const dayIndex = now.getDay(); // 0 is Sun, 1 is Mon... 6 is Sat
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const currentDay = dayNames[dayIndex] || 'MON';
    const activeCollegeDay = !activeDaysList.includes(currentDay) ? (activeDaysList[0] || 'MON') : currentDay;
    setSelectedDay(activeCollegeDay);

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentDec = hours + minutes / 60;

    if (trackingMode === 'period') {
      let matchedSlot = academicSlots[0] || '09:00-10:00';
      if (currentDec >= 9 && currentDec < 10) matchedSlot = '09:00-10:00';
      else if (currentDec >= 10 && currentDec < 11.25) matchedSlot = '10:00-11:00';
      else if (currentDec >= 11.25 && currentDec < 12.25) matchedSlot = '11:15-12:15';
      else if (currentDec >= 12.25 && currentDec < 14.25) matchedSlot = '12:15-01:15';
      else if (currentDec >= 14.25 && currentDec < 15.25) matchedSlot = '02:15-03:15';
      else if (currentDec >= 15.25 && currentDec <= 16.5) matchedSlot = '03:15-04:15';
      setSelectedSlot(matchedSlot);
    } else {
      // Session mode:
      // Session 1: 09:00 - 11:00 (until break at 11:15)
      // Session 2: 11:15 - 01:15 (until lunch at 02:15)
      // Session 3: 02:15 - 04:15
      if (currentDec < 11.25) {
        setSelectedSessionId('session-1');
      } else if (currentDec >= 11.25 && currentDec < 14.25) {
        setSelectedSessionId('session-2');
      } else {
        setSelectedSessionId('session-3');
      }
    }
  };

  // Compile availability status for all faculty
  const allFacultyAvailability = useMemo(() => {
    const master = initialData.masterFacultyTimetables || {};

    return facultyList.map(fac => {
      const facFull = fac.fullName;
      const short = fac.shortName || getFacultyShortName(facFull);
      const sched = master[facFull] || {};
      const daySched = sched[selectedDay] || {};

      if (trackingMode === 'period') {
        const sessions = daySched[selectedSlot] || [];
        const isOccupied = sessions.length > 0;
        const isFree = sessions.length === 0;
        const hasClash = sessions.length > 1;

        return {
          ...fac,
          shortName: short,
          isOccupied,
          isFree,
          hasClash,
          currentSessions: sessions
        };
      } else {
        // SESSION-WISE AVAILABILITY:
        // Analyzes both periods in the session
        const [periodA, periodB] = activeSession.periods;
        const pASessions = daySched[periodA] || [];
        const pBSessions = daySched[periodB] || [];
        
        const isP1Free = pASessions.length === 0;
        const isP2Free = pBSessions.length === 0;
        
        const isCompletelyFree = isP1Free && isP2Free;
        const isPartiallyFree = (isP1Free && !isP2Free) || (!isP1Free && isP2Free);
        const isFullyOccupied = !isP1Free && !isP2Free;
        const hasClash = pASessions.length > 1 || pBSessions.length > 1;

        const freeCountInSession = (isP1Free ? 1 : 0) + (isP2Free ? 1 : 0);

        return {
          ...fac,
          shortName: short,
          isCompletelyFree,
          isPartiallyFree,
          isFullyOccupied,
          hasClash,
          freeCountInSession,
          // Backwards compat for general filters
          isFree: isCompletelyFree,
          isOccupied: isFullyOccupied,
          sessionDetails: {
            periodA: {
              slotTime: periodA,
              label: activeSession.periodLabels[0],
              sessions: pASessions,
              isFree: isP1Free,
              hasClash: pASessions.length > 1
            },
            periodB: {
              slotTime: periodB,
              label: activeSession.periodLabels[1],
              sessions: pBSessions,
              isFree: isP2Free,
              hasClash: pBSessions.length > 1
            }
          }
        };
      }
    });
  }, [facultyList, selectedDay, selectedSlot, trackingMode, activeSession]);

  // Overall department metrics for the current slot/session
  const deptFacultyList = useMemo(() => {
    if (selectedDept === 'ALL') return allFacultyAvailability;
    return allFacultyAvailability.filter(f => (f.dept?.trim() || 'General') === selectedDept);
  }, [allFacultyAvailability, selectedDept]);

  const totalInFilter = deptFacultyList.length;

  // Period mode counts
  const periodFreeCount = deptFacultyList.filter(f => f.isFree).length;
  const periodOccupiedCount = deptFacultyList.filter(f => f.isOccupied).length;
  const periodClashCount = deptFacultyList.filter(f => f.hasClash).length;

  // Session mode counts
  const sessionFullFreeCount = deptFacultyList.filter(f => f.isCompletelyFree).length;
  const sessionPartialFreeCount = deptFacultyList.filter(f => f.isPartiallyFree).length;
  const sessionOccupiedCount = deptFacultyList.filter(f => f.isFullyOccupied).length;
  const sessionClashCount = deptFacultyList.filter(f => f.hasClash).length;

  // Search and status-filtered items to display
  const displayedFaculty = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return deptFacultyList.filter(fac => {
      // Search match
      let matchesSearch = !q || 
        fac.fullName.toLowerCase().includes(q) || 
        fac.shortName.toLowerCase().includes(q) ||
        (fac.designation && fac.designation.toLowerCase().includes(q)) ||
        (fac.dept && fac.dept.toLowerCase().includes(q));

      if (!matchesSearch) {
        if (trackingMode === 'period') {
          matchesSearch = fac.currentSessions.some(s => 
            (s.branch && s.branch.toLowerCase().includes(q)) ||
            (s.subject && s.subject.toLowerCase().includes(q)) ||
            (s.room && s.room.toLowerCase().includes(q))
          );
        } else if (fac.sessionDetails) {
          const allS = [
            ...(fac.sessionDetails.periodA.sessions || []),
            ...(fac.sessionDetails.periodB.sessions || [])
          ];
          matchesSearch = allS.some(s => 
            (s.branch && s.branch.toLowerCase().includes(q)) ||
            (s.subject && s.subject.toLowerCase().includes(q)) ||
            (s.room && s.room.toLowerCase().includes(q))
          );
        }
      }

      // Status match
      let matchesStatus = true;
      if (trackingMode === 'period') {
        matchesStatus = 
          statusFilter === 'ALL' ||
          (statusFilter === 'FREE' && fac.isFree) ||
          (statusFilter === 'OCCUPIED' && fac.isOccupied);
      } else {
        matchesStatus = 
          statusFilter === 'ALL' ||
          (statusFilter === 'FULL_FREE' && fac.isCompletelyFree) ||
          (statusFilter === 'PARTIAL_FREE' && fac.isPartiallyFree) ||
          (statusFilter === 'OCCUPIED' && fac.isFullyOccupied);
      }

      return matchesSearch && matchesStatus;
    });
  }, [deptFacultyList, searchQuery, statusFilter, trackingMode]);

  // Grouped lists for Cards Grid View
  const displayedFree = useMemo(() => displayedFaculty.filter(f => f.isFree), [displayedFaculty]);
  const displayedOccupied = useMemo(() => displayedFaculty.filter(f => f.isOccupied), [displayedFaculty]);

  const displayedSessionFullFree = useMemo(() => displayedFaculty.filter(f => f.isCompletelyFree), [displayedFaculty]);
  const displayedSessionPartialFree = useMemo(() => displayedFaculty.filter(f => f.isPartiallyFree), [displayedFaculty]);
  const displayedSessionOccupied = useMemo(() => displayedFaculty.filter(f => f.isFullyOccupied), [displayedFaculty]);

  return (
    <div className="w-full space-y-6">
      {/* 1. Header & Tracking Mode Selector Bar */}
      <div className="no-print bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  Faculty Availability & Vacancy Tracker
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Instant identification of free faculty for substitutions, 2-hour lab invigilation, or department meetings.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action: Available Right Now, Format Toggle & Print */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSelectRightNow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
              title={`Detect and switch to current ${trackingMode === 'period' ? 'period' : 'session'} automatically`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Available Right Now</span>
            </button>

            <PrintFormatToggle 
              selectedFormat={printFormat}
              onFormatChange={setPrintFormat}
              formats={['a4-portrait', 'a4-landscape']}
              compact={true}
            />

            <button
              onClick={() => triggerPrint(printFormat)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
              title={`Print Availability Roster in ${getPrintFormat(printFormat).label}`}
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Print Roster ({getPrintFormat(printFormat).shortLabel})</span>
            </button>
          </div>
        </div>

        {/* Tracking Mode Switcher: Period-Wise vs Session-Wise */}
        <div className="pt-4 pb-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> Tracking Mode:
            </span>
            <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200">
              <button
                onClick={() => handleModeChange('period')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackingMode === 'period'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Period-Wise (1 Hour)</span>
              </button>
              <button
                onClick={() => handleModeChange('session')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackingMode === 'session'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Session-Wise (2 Hours)</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            {trackingMode === 'period' ? (
              <span>Viewing individual 1-hour periods (P1 to P6).</span>
            ) : (
              <span>Session 1: P1 & P2 (Pre-Break) • Session 2: P3 & P4 (Pre-Lunch) • Session 3: P5 & P6 (Post-Lunch).</span>
            )}
          </div>
        </div>

        {/* Day & Time Selectors */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Day Selector Buttons */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Select Day
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeDaysList.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDay === day
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Granular Time Selector: Period vs Session */}
          <div className="md:col-span-8 flex flex-col gap-1.5">
            {trackingMode === 'period' ? (
              /* PERIOD SELECTOR */
              <>
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Select Period Slot (1 Hour)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {academicSlots.map((slot, sIdx) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedSlot === slot
                          ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <span className="text-[10px] font-sans font-black opacity-75">P{sIdx + 1}</span>
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* SESSION SELECTOR (Session 1, Session 2, Session 3) */
              <>
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Select 2-Hour Session
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SESSION_DEFINITIONS.map(sess => {
                    const isSelected = selectedSessionId === sess.id;
                    return (
                      <button
                        key={sess.id}
                        onClick={() => setSelectedSessionId(sess.id)}
                        className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {sess.name}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {sess.badge}
                          </span>
                        </div>
                        <div className={`text-[11.5px] font-extrabold mt-0.5 font-mono ${
                          isSelected ? 'text-blue-100' : 'text-blue-700'
                        }`}>
                          {sess.timeRange}
                        </div>
                        <div className={`text-[10px] mt-1 font-medium ${
                          isSelected ? 'text-blue-100/90' : 'text-gray-500'
                        }`}>
                          {sess.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      {trackingMode === 'period' ? (
        /* PERIOD MODE KPIS */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total in Scope */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Faculty</div>
              <div className="text-xl font-black text-gray-900">{totalInFilter}</div>
              <div className="text-[10px] text-gray-500">
                {selectedDept === 'ALL' ? 'Across All Departments' : `${selectedDept} Department`}
              </div>
            </div>
          </div>

          {/* Free / Available */}
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Free / Available</div>
              <div className="text-xl font-black text-emerald-950 flex items-baseline gap-1.5">
                {periodFreeCount}
                <span className="text-xs font-bold text-emerald-700">
                  ({totalInFilter > 0 ? Math.round((periodFreeCount / totalInFilter) * 100) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">Free for 1-hr substitution</div>
            </div>
          </div>

          {/* Occupied / In Class */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">In Class (Occupied)</div>
              <div className="text-xl font-black text-amber-950 flex items-baseline gap-1.5">
                {periodOccupiedCount}
                <span className="text-xs font-bold text-amber-700">
                  ({totalInFilter > 0 ? Math.round((periodOccupiedCount / totalInFilter) * 100) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-amber-700 font-semibold">Teaching in Lecture/Lab</div>
            </div>
          </div>

          {/* Clashing Faculty */}
          <div className={`p-4 rounded-xl border shadow-xs flex items-center gap-3 ${
            periodClashCount > 0 ? 'bg-red-50/70 border-red-200' : 'bg-gray-50/60 border-gray-200'
          }`}>
            <div className={`p-3 rounded-xl ${periodClashCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-[11px] font-bold uppercase tracking-wide ${periodClashCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                Overlapping Clashes
              </div>
              <div className={`text-xl font-black ${periodClashCount > 0 ? 'text-red-950' : 'text-gray-900'}`}>
                {periodClashCount}
              </div>
              <div className={`text-[10px] font-semibold ${periodClashCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                {periodClashCount > 0 ? 'Double-booked in this slot' : 'No conflicts in this slot'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SESSION MODE KPIS (2 Hours: Full Free vs Partial Free vs Occupied) */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total in Scope */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Faculty</div>
              <div className="text-xl font-black text-gray-900">{totalInFilter}</div>
              <div className="text-[10px] text-gray-500 font-semibold">
                {selectedDept === 'ALL' ? 'Across All Departments' : `${selectedDept} Department`}
              </div>
            </div>
          </div>

          {/* Completely Free (Both periods free) */}
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Full Session Free (2/2)</div>
              <div className="text-xl font-black text-emerald-950 flex items-baseline gap-1.5">
                {sessionFullFreeCount}
                <span className="text-xs font-bold text-emerald-700">
                  ({totalInFilter > 0 ? Math.round((sessionFullFreeCount / totalInFilter) * 100) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">Free for entire 2-hour block</div>
            </div>
          </div>

          {/* Partially Free (1 period free) */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Partially Free (1/2)</div>
              <div className="text-xl font-black text-blue-950 flex items-baseline gap-1.5">
                {sessionPartialFreeCount}
                <span className="text-xs font-bold text-blue-700">
                  ({totalInFilter > 0 ? Math.round((sessionPartialFreeCount / totalInFilter) * 100) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-blue-700 font-semibold">Free in 1 period, busy in 1</div>
            </div>
          </div>

          {/* Fully Occupied (Both periods busy) */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Fully In Class (0/2)</div>
              <div className="text-xl font-black text-amber-950 flex items-baseline gap-1.5">
                {sessionOccupiedCount}
                <span className="text-xs font-bold text-amber-700">
                  ({totalInFilter > 0 ? Math.round((sessionOccupiedCount / totalInFilter) * 100) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-amber-700 font-semibold">Assigned in both periods</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Secondary Controls: Department, Status Filter, Search & View Mode */}
      <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-gray-900 text-xs font-bold outline-none cursor-pointer uppercase"
            >
              <option value="ALL">All Departments ({facultyList.length})</option>
              {departments.filter(d => d !== 'ALL').map(dept => {
                const count = facultyList.filter(f => (f.dept?.trim() || 'General') === dept).length;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter Toggle Pills */}
          {trackingMode === 'period' ? (
            /* PERIOD MODE PILLS */
            <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({totalInFilter})
              </button>
              <button
                onClick={() => setStatusFilter('FREE')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'FREE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Free ({periodFreeCount})
              </button>
              <button
                onClick={() => setStatusFilter('OCCUPIED')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'OCCUPIED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                In Class ({periodOccupiedCount})
              </button>
            </div>
          ) : (
            /* SESSION MODE PILLS */
            <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({totalInFilter})
              </button>
              <button
                onClick={() => setStatusFilter('FULL_FREE')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'FULL_FREE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Free in both periods"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Full Free ({sessionFullFreeCount})
              </button>
              <button
                onClick={() => setStatusFilter('PARTIAL_FREE')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'PARTIAL_FREE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 hover:bg-blue-50'
                }`}
                title="Free in 1 of 2 periods"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Partial ({sessionPartialFreeCount})
              </button>
              <button
                onClick={() => setStatusFilter('OCCUPIED')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'OCCUPIED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
                title="Occupied in both periods"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                In Class ({sessionOccupiedCount})
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculty, code, class..."
              className="w-full text-xs px-3 py-1.5 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Compact Roster Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Print-Only Title Header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-2 mb-4">
        <h1 className="text-base font-black uppercase">{universityInfo.name || 'GAYATRI VIDYA PARISHAD'}</h1>
        <h2 className="text-xs font-bold uppercase mt-0.5">
          {trackingMode === 'period' 
            ? `Faculty Availability Roster • ${selectedDay} (${selectedSlot})`
            : `Faculty Availability Roster • ${selectedDay} • ${activeSession.name}: ${activeSession.timeRange} (${activeSession.periods.join(' & ')})`
          }
        </h2>
        <p className="text-[10px] text-gray-600">
          Department: {selectedDept === 'ALL' ? 'All Departments' : selectedDept} • Total: {totalInFilter}
          {trackingMode === 'period' 
            ? ` (Free: ${periodFreeCount}, In Class: ${periodOccupiedCount})`
            : ` (Full Session Free: ${sessionFullFreeCount}, Partial Free: ${sessionPartialFreeCount}, In Class: ${sessionOccupiedCount})`
          }
        </p>
      </div>

      {/* 4. Display Content: Grid vs Table */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-black text-gray-800 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-gray-200">S.No</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Faculty Name</th>
                  <th className="py-2.5 px-3 w-20 text-center border-r border-gray-200">Code</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Department</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Designation</th>
                  <th className="py-2.5 px-3 w-32 text-center border-r border-gray-200">Status</th>
                  
                  {trackingMode === 'period' ? (
                    <th className="py-2.5 px-3">Current Assignment at {selectedSlot}</th>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 border-r border-gray-200 w-1/4">
                        {activeSession.periodLabels[0]}
                      </th>
                      <th className="py-2.5 px-3 w-1/4">
                        {activeSession.periodLabels[1]}
                      </th>
                    </>
                  )}

                  <th className="py-2.5 px-3 w-24 text-center border-l border-gray-200">Total Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={trackingMode === 'period' ? 8 : 9} className="py-8 text-center text-gray-500 font-semibold">
                      No faculty match the current filters for {selectedDay} {trackingMode === 'period' ? selectedSlot : activeSession.name}.
                    </td>
                  </tr>
                ) : (
                  displayedFaculty.map((fac, idx) => (
                    <tr key={fac.fullName} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-gray-500 border-r border-gray-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900 border-r border-gray-200">
                        {fac.fullName}
                      </td>
                      <td className="py-2 px-3 text-center font-black font-mono text-blue-700 bg-blue-50/30 border-r border-gray-200">
                        {fac.shortName}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-700 border-r border-gray-200">
                        {fac.dept || 'General'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-[11px] border-r border-gray-200">
                        {fac.designation || 'Faculty'}
                      </td>

                      {/* Status Column */}
                      <td className="py-2 px-3 text-center border-r border-gray-200">
                        {trackingMode === 'period' ? (
                          fac.isFree ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              FREE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <XCircle className="w-3 h-3 text-amber-600" />
                              IN CLASS
                            </span>
                          )
                        ) : (
                          /* SESSION STATUS BADGE */
                          fac.isCompletelyFree ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              FULL FREE (2/2)
                            </span>
                          ) : fac.isPartiallyFree ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                              <Clock className="w-3 h-3 text-blue-600" />
                              PARTIAL (1/2)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <XCircle className="w-3 h-3 text-amber-600" />
                              IN CLASS (0/2)
                            </span>
                          )
                        )}
                      </td>

                      {/* Assignment Columns */}
                      {trackingMode === 'period' ? (
                        <td className="py-2 px-3">
                          {fac.isFree ? (
                            <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                              <span>✓ Available for Substitution / Duties</span>
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {fac.currentSessions.map((s, sIdx) => (
                                <div 
                                  key={sIdx}
                                  onClick={() => onSlotClick && onSlotClick([s], selectedDay, selectedSlot, s.branch)}
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded bg-gray-50 border border-gray-200 flex flex-wrap items-center gap-1.5 ${
                                    onSlotClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors' : ''
                                  }`}
                                >
                                  <span className="font-black text-black uppercase">{s.branch}:</span>
                                  <span className="font-bold text-gray-800">{s.subject}</span>
                                  {s.room && (
                                    <span className="font-mono text-gray-600 font-semibold">({s.room})</span>
                                  )}
                                  {s.isLab && (
                                    <span className="px-1 text-[9px] font-bold bg-purple-100 text-purple-700 rounded">LAB</span>
                                  )}
                                </div>
                              ))}
                              {fac.hasClash && (
                                <div className="text-[10px] font-black text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Double-booked period
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      ) : (
                        /* SESSION MODE: PERIOD A & PERIOD B CELLS */
                        <>
                          {/* Period A Cell */}
                          <td className="py-2 px-3 border-r border-gray-200">
                            {fac.sessionDetails?.periodA?.isFree ? (
                              <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Available (Free)
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {fac.sessionDetails?.periodA?.sessions?.map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([s], selectedDay, fac.sessionDetails.periodA.slotTime, s.branch)}
                                    className={`text-[11px] font-medium px-2 py-0.5 rounded bg-gray-50 border border-gray-200 flex flex-wrap items-center gap-1.5 ${
                                      onSlotClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors' : ''
                                    }`}
                                  >
                                    <span className="font-black text-black uppercase">{s.branch}:</span>
                                    <span className="font-bold text-gray-800">{s.subject}</span>
                                    {s.room && <span className="font-mono text-gray-600 font-semibold">({s.room})</span>}
                                    {s.isLab && <span className="px-1 text-[9px] font-bold bg-purple-100 text-purple-700 rounded">LAB</span>}
                                  </div>
                                ))}
                                {fac.sessionDetails?.periodA?.hasClash && (
                                  <div className="text-[10px] font-black text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Double-booked
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Period B Cell */}
                          <td className="py-2 px-3">
                            {fac.sessionDetails?.periodB?.isFree ? (
                              <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Available (Free)
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {fac.sessionDetails?.periodB?.sessions?.map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([s], selectedDay, fac.sessionDetails.periodB.slotTime, s.branch)}
                                    className={`text-[11px] font-medium px-2 py-0.5 rounded bg-gray-50 border border-gray-200 flex flex-wrap items-center gap-1.5 ${
                                      onSlotClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors' : ''
                                    }`}
                                  >
                                    <span className="font-black text-black uppercase">{s.branch}:</span>
                                    <span className="font-bold text-gray-800">{s.subject}</span>
                                    {s.room && <span className="font-mono text-gray-600 font-semibold">({s.room})</span>}
                                    {s.isLab && <span className="px-1 text-[9px] font-bold bg-purple-100 text-purple-700 rounded">LAB</span>}
                                  </div>
                                ))}
                                {fac.sessionDetails?.periodB?.hasClash && (
                                  <div className="text-[10px] font-black text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Double-booked
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      )}

                      <td className="py-2 px-3 text-center font-bold text-gray-800 border-l border-gray-200">
                        {fac.totalLoad || 0} hrs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : trackingMode === 'period' ? (
        /* ================= CARDS GRID VIEW: PERIOD MODE ================= */
        <div className="space-y-8">
          {/* SECTION A: FREE FACULTY */}
          {(statusFilter === 'ALL' || statusFilter === 'FREE') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                      Available / Free Faculty ({displayedFree.length})
                    </h3>
                    <p className="text-[11px] text-emerald-700">
                      No scheduled teaching period on {selectedDay} at {selectedSlot}. Available for class substitution, exam duty, or meetings.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  {displayedFree.length} Available
                </span>
              </div>

              {displayedFree.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold text-xs">
                  No free faculty found under current department/search criteria at this hour.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayedFree.map(fac => (
                    <div
                      key={fac.fullName}
                      className="bg-white p-3.5 rounded-xl border-2 border-emerald-200/80 hover:border-emerald-500 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-gray-900 text-xs sm:text-[13px] leading-snug group-hover:text-blue-700 transition-colors">
                            {fac.fullName}
                          </h4>
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-black text-[11px] font-mono">
                            {fac.shortName}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-[10px] uppercase">
                            {fac.dept || 'General'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {fac.designation || 'Faculty'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-[10.5px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Free this period</span>
                        </div>
                        <span className="text-gray-500 text-[10.5px] font-medium font-mono">
                          {fac.totalLoad || 0} hrs/wk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: OCCUPIED / IN CLASS FACULTY */}
          {(statusFilter === 'ALL' || statusFilter === 'OCCUPIED') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <XCircle className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                      Occupied in Class ({displayedOccupied.length})
                    </h3>
                    <p className="text-[11px] text-amber-700">
                      Currently assigned to teaching periods or laboratories during this time slot.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                  {displayedOccupied.length} Teaching
                </span>
              </div>

              {displayedOccupied.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold text-xs">
                  No occupied faculty found under current department/search criteria at this hour.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayedOccupied.map(fac => (
                    <div
                      key={fac.fullName}
                      className={`bg-white p-3.5 rounded-xl border-2 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                        fac.hasClash ? 'border-red-400 bg-red-50/20' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-gray-900 text-xs sm:text-[13px] leading-snug">
                            {fac.fullName}
                          </h4>
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-black text-[11px] font-mono">
                            {fac.shortName}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-[10px] uppercase">
                            {fac.dept || 'General'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {fac.designation || 'Faculty'}
                          </span>
                        </div>

                        {/* Current Assigned Classes */}
                        <div className="pt-2 space-y-1.5">
                          {fac.currentSessions.map((s, sIdx) => (
                            <div
                              key={sIdx}
                              onClick={() => onSlotClick && onSlotClick([s], selectedDay, selectedSlot, s.branch)}
                              className={`p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs flex flex-col gap-0.5 ${
                                onSlotClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors' : ''
                              }`}
                              title="Click to view slot details"
                            >
                              <div className="flex items-center justify-between gap-1 font-bold">
                                <span className="text-black font-black uppercase">{s.branch}</span>
                                {s.room && (
                                  <span className="font-mono text-[10.5px] font-bold text-slate-700 bg-white px-1.5 py-0.2 border border-gray-300 rounded">
                                    {s.room}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-800 font-semibold text-[11.5px] flex items-center justify-between">
                                <span>{s.subject}</span>
                                {s.isLab && (
                                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">LAB</span>
                                )}
                              </div>
                            </div>
                          ))}

                          {fac.hasClash && (
                            <div className="px-2 py-1 bg-red-100 border border-red-300 rounded text-[10.5px] font-black text-red-800 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                              <span>Double-booked in this slot!</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="text-amber-800 font-bold text-[10.5px] flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          In Class
                        </span>
                        <span className="font-mono text-[10.5px]">
                          {fac.totalLoad || 0} hrs/wk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================= CARDS GRID VIEW: SESSION MODE ================= */
        <div className="space-y-8">
          {/* SECTION A: COMPLETELY FREE FOR FULL SESSION (2/2 Periods) */}
          {(statusFilter === 'ALL' || statusFilter === 'FULL_FREE') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                      Full Session Available • Both Periods Free ({displayedSessionFullFree.length})
                    </h3>
                    <p className="text-[11px] text-emerald-700">
                      Free for both periods ({activeSession.periods.join(' & ')}). Ideal for full 2-hour lab coverage, exam invigilation, or department meetings.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  {displayedSessionFullFree.length} Fully Available
                </span>
              </div>

              {displayedSessionFullFree.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold text-xs">
                  No faculty completely free for both periods under current filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayedSessionFullFree.map(fac => (
                    <div
                      key={fac.fullName}
                      className="bg-white p-3.5 rounded-xl border-2 border-emerald-200 hover:border-emerald-500 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-gray-900 text-xs sm:text-[13px] leading-snug group-hover:text-blue-700 transition-colors">
                            {fac.fullName}
                          </h4>
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-black text-[11px] font-mono">
                            {fac.shortName}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-[10px] uppercase">
                            {fac.dept || 'General'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {fac.designation || 'Faculty'}
                          </span>
                        </div>

                        {/* Session Breakdown Mini Pills */}
                        <div className="pt-2 grid grid-cols-2 gap-1.5">
                          <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-[9.5px] font-bold text-emerald-800 block">{activeSession.periods[0]}</span>
                            <span className="text-[10px] font-black text-emerald-600">✓ FREE</span>
                          </div>
                          <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-[9.5px] font-bold text-emerald-800 block">{activeSession.periods[1]}</span>
                            <span className="text-[10px] font-black text-emerald-600">✓ FREE</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-[10.5px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Entire Session Free</span>
                        </div>
                        <span className="text-gray-500 text-[10.5px] font-medium font-mono">
                          {fac.totalLoad || 0} hrs/wk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: PARTIALLY FREE (1 Period Free, 1 Period In Class) */}
          {(statusFilter === 'ALL' || statusFilter === 'PARTIAL_FREE') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-blue-950 uppercase tracking-wide">
                      Partially Available • Free in 1 of 2 Periods ({displayedSessionPartialFree.length})
                    </h3>
                    <p className="text-[11px] text-blue-700">
                      Faculty available for 1 hour within {activeSession.name}. Useful for 1-period substitutions or short consultations.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-300">
                  {displayedSessionPartialFree.length} Partial Free
                </span>
              </div>

              {displayedSessionPartialFree.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold text-xs">
                  No partially free faculty found under current filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayedSessionPartialFree.map(fac => {
                    const pA = fac.sessionDetails.periodA;
                    const pB = fac.sessionDetails.periodB;

                    return (
                      <div
                        key={fac.fullName}
                        className="bg-white p-3.5 rounded-xl border-2 border-blue-200 hover:border-blue-400 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-extrabold text-gray-900 text-xs sm:text-[13px] leading-snug">
                              {fac.fullName}
                            </h4>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-black text-[11px] font-mono">
                              {fac.shortName}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-[10px] uppercase">
                              {fac.dept || 'General'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {fac.designation || 'Faculty'}
                            </span>
                          </div>

                          {/* Period-by-Period Status Breakdown */}
                          <div className="pt-2 space-y-2">
                            {/* Period A */}
                            <div className="p-2 rounded-lg border text-xs bg-gray-50">
                              <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                                <span className="font-mono">{pA.slotTime}</span>
                                {pA.isFree ? (
                                  <span className="text-emerald-700 font-black">✓ FREE</span>
                                ) : (
                                  <span className="text-amber-800 font-black">IN CLASS</span>
                                )}
                              </div>
                              {pA.isFree ? (
                                <div className="text-[10.5px] text-emerald-700 font-semibold">Available for duty</div>
                              ) : (
                                pA.sessions.map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([s], selectedDay, pA.slotTime, s.branch)}
                                    className={`text-[11px] font-bold text-gray-900 flex items-center justify-between ${
                                      onSlotClick ? 'cursor-pointer hover:text-blue-600' : ''
                                    }`}
                                  >
                                    <span>{s.branch}: {s.subject}</span>
                                    {s.room && <span className="font-mono text-gray-500 text-[10px]">({s.room})</span>}
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Period B */}
                            <div className="p-2 rounded-lg border text-xs bg-gray-50">
                              <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                                <span className="font-mono">{pB.slotTime}</span>
                                {pB.isFree ? (
                                  <span className="text-emerald-700 font-black">✓ FREE</span>
                                ) : (
                                  <span className="text-amber-800 font-black">IN CLASS</span>
                                )}
                              </div>
                              {pB.isFree ? (
                                <div className="text-[10.5px] text-emerald-700 font-semibold">Available for duty</div>
                              ) : (
                                pB.sessions.map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([s], selectedDay, pB.slotTime, s.branch)}
                                    className={`text-[11px] font-bold text-gray-900 flex items-center justify-between ${
                                      onSlotClick ? 'cursor-pointer hover:text-blue-600' : ''
                                    }`}
                                  >
                                    <span>{s.branch}: {s.subject}</span>
                                    {s.room && <span className="font-mono text-gray-500 text-[10px]">({s.room})</span>}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                          <span className="text-blue-700 font-bold text-[10.5px] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Free {pA.isFree ? pA.slotTime : pB.slotTime}
                          </span>
                          <span className="font-mono text-[10.5px]">
                            {fac.totalLoad || 0} hrs/wk
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION C: FULLY OCCUPIED (Both Periods In Class) */}
          {(statusFilter === 'ALL' || statusFilter === 'OCCUPIED') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <XCircle className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                      Fully Occupied In Class • Both Periods Busy ({displayedSessionOccupied.length})
                    </h3>
                    <p className="text-[11px] text-amber-700">
                      Teaching in both periods across the entire 2-hour session. Not available for substitutions.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                  {displayedSessionOccupied.length} Teaching
                </span>
              </div>

              {displayedSessionOccupied.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold text-xs">
                  No fully occupied faculty under current filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayedSessionOccupied.map(fac => {
                    const pA = fac.sessionDetails.periodA;
                    const pB = fac.sessionDetails.periodB;

                    return (
                      <div
                        key={fac.fullName}
                        className={`bg-white p-3.5 rounded-xl border-2 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                          fac.hasClash ? 'border-red-400 bg-red-50/20' : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-extrabold text-gray-900 text-xs sm:text-[13px] leading-snug">
                              {fac.fullName}
                            </h4>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-black text-[11px] font-mono">
                              {fac.shortName}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-[10px] uppercase">
                              {fac.dept || 'General'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {fac.designation || 'Faculty'}
                            </span>
                          </div>

                          {/* Both Assigned Classes */}
                          <div className="pt-2 space-y-2">
                            {/* Period A */}
                            <div className="p-2 rounded-lg border text-xs bg-gray-50">
                              <div className="text-[10px] font-bold text-gray-500 font-mono mb-0.5">
                                {pA.slotTime}
                              </div>
                              {pA.sessions.map((s, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() => onSlotClick && onSlotClick([s], selectedDay, pA.slotTime, s.branch)}
                                  className={`text-[11px] font-bold text-gray-900 flex items-center justify-between ${
                                    onSlotClick ? 'cursor-pointer hover:text-blue-600' : ''
                                  }`}
                                >
                                  <span>{s.branch}: {s.subject}</span>
                                  {s.room && <span className="font-mono text-gray-500 text-[10px]">({s.room})</span>}
                                </div>
                              ))}
                              {pA.hasClash && (
                                <div className="text-[10px] font-black text-red-600 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Double-booked
                                </div>
                              )}
                            </div>

                            {/* Period B */}
                            <div className="p-2 rounded-lg border text-xs bg-gray-50">
                              <div className="text-[10px] font-bold text-gray-500 font-mono mb-0.5">
                                {pB.slotTime}
                              </div>
                              {pB.sessions.map((s, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() => onSlotClick && onSlotClick([s], selectedDay, pB.slotTime, s.branch)}
                                  className={`text-[11px] font-bold text-gray-900 flex items-center justify-between ${
                                    onSlotClick ? 'cursor-pointer hover:text-blue-600' : ''
                                  }`}
                                >
                                  <span>{s.branch}: {s.subject}</span>
                                  {s.room && <span className="font-mono text-gray-500 text-[10px]">({s.room})</span>}
                                </div>
                              ))}
                              {pB.hasClash && (
                                <div className="text-[10px] font-black text-red-600 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Double-booked
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                          <span className="text-amber-800 font-bold text-[10.5px] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            In Class Both Periods
                          </span>
                          <span className="font-mono text-[10.5px]">
                            {fac.totalLoad || 0} hrs/wk
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
