import React, { useState, useMemo, useEffect, useRef } from 'react';
import { days, periodSlots, getActiveDays } from '../data/mockData';
import { 
  Building, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Layers, 
  MapPin, 
  Calendar, 
  Filter, 
  Sparkles, 
  Table, 
  LayoutGrid,
  FlaskConical,
  DoorOpen,
  ChevronDown,
  Check,
  CheckSquare,
  Square,
  Printer,
  RotateCcw,
  Users
} from 'lucide-react';
import initialData from '../data/initialData.json';

export default function RoomsView({ 
  timetableData, 
  universityInfo, 
  onSlotClick, 
  roomCapacities = initialData.roomCapacities || {} 
}) {
  // 1. Compile room schedules across all 13 branches in timetableData
  const { allRoomsList, classroomsList, labsList, roomSchedules } = useMemo(() => {
    const schedules = {};
    const roomsSet = new Set();

    Object.entries(timetableData || {}).forEach(([branch, bDays]) => {
      Object.entries(bDays || {}).forEach(([day, slots]) => {
        Object.entries(slots || {}).forEach(([slot, sessions]) => {
          const items = Array.isArray(sessions) ? sessions : (sessions ? [sessions] : []);
          items.forEach(sess => {
            if (sess && sess.room && sess.room.trim()) {
              const rawRoom = sess.room.trim();
              // Keep combined rooms intact
              const normalizedRooms = (rawRoom.includes('A-301,302') || rawRoom.includes('A-303,304'))
                ? [rawRoom]
                : rawRoom.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

              normalizedRooms.forEach(rm => {
                roomsSet.add(rm);
                if (!schedules[rm]) schedules[rm] = {};
                if (!schedules[rm][day]) schedules[rm][day] = {};
                if (!schedules[rm][day][slot]) schedules[rm][day][slot] = [];
                schedules[rm][day][slot].push({
                  branch,
                  subject: sess.subject,
                  faculty: sess.faculty,
                  isLab: sess.isLab
                });
              });
            }
          });
        });
      });
    });

    // Dedicated Laboratory rooms set
    const KNOWN_LAB_ROOMS = new Set([
      'COMP. LAB-1', 'COMP. LAB-2', 'COMP. LAB-3', 'COMP. LAB-4',
      'CHEM. LAB.', 'PHY LAB', 'A-406', 'A-301,302', 'A-303,304', 
      'C-208', 'E-319',
      'GVPCE CHEM. LAB. (B6-102)', 'GVPCE MECH. LAB (B12-103)', 'GVPCE SUR. LAB (B11-101)'
    ]);

    // Helper to determine if a room is a laboratory vs a classroom
    const isLabRoom = (r) => {
      if (!r) return false;
      const trimmed = r.trim();
      const upper = trimmed.toUpperCase();
      if (KNOWN_LAB_ROOMS.has(trimmed) || KNOWN_LAB_ROOMS.has(upper)) return true;
      if (
        upper.includes('LAB') ||
        upper.startsWith('A-') ||
        upper === 'C-208' ||
        upper === 'E-319' ||
        upper.startsWith('A-301') ||
        upper.startsWith('A-303')
      ) {
        return true;
      }
      // Check if all sessions scheduled in this room across the timetable are lab sessions
      const daysObj = schedules[r] || {};
      let totalSessions = 0;
      let labSessions = 0;
      Object.values(daysObj).forEach((slotsObj) => {
        Object.values(slotsObj).forEach((items) => {
          items.forEach((it) => {
            totalSessions++;
            if (it.isLab || (it.subject && it.subject.toUpperCase().includes('LAB'))) {
              labSessions++;
            }
          });
        });
      });
      if (totalSessions > 0 && labSessions === totalSessions) {
        return true;
      }
      return false;
    };

    const all = Array.from(roomsSet).sort((a, b) => {
      // Put Classrooms first (E-, G-, etc.), then Labs
      const isLabA = isLabRoom(a);
      const isLabB = isLabRoom(b);
      if (isLabA && !isLabB) return 1;
      if (!isLabA && isLabB) return -1;
      return a.localeCompare(b);
    });

    const labs = all.filter(r => isLabRoom(r));
    const classrooms = all.filter(r => !isLabRoom(r));

    return {
      allRoomsList: all,
      classroomsList: classrooms,
      labsList: labs,
      roomSchedules: schedules
    };
  }, [timetableData]);

  // Active days list: only includes Saturday if Saturday has classes in timetableData
  const activeDaysList = useMemo(() => getActiveDays(timetableData), [timetableData]);

  // View Mode: 'locator' (Room Finder / Vacancy Matrix) | 'timetable' (By Room Timetable)
  const [viewMode, setViewMode] = useState('locator');

  // Locator Filter States
  const [selectedDay, setSelectedDay] = useState('MON');
  const academicSlots = periodSlots.filter(s => s.type !== 'break').map(s => s.time);
  const [selectedSlot, setSelectedSlot] = useState(academicSlots[0] || '09:00-10:00');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL'); // 'ALL' | 'CLASSROOM' | 'LAB'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'VACANT' | 'OCCUPIED'
  const [searchQuery, setSearchQuery] = useState('');
  const [locatorViewType, setLocatorViewType] = useState('grid'); // 'grid' | 'heatmap'

  // Timetable Filter States
  const [selectedRoom, setSelectedRoom] = useState(allRoomsList[0] || 'G-304');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  // Weekly Day-Wise Vacancy Matrix Filter States
  // In this tab:
  // - Classrooms: ONLY include rooms given in Rooms_Capacity sheet
  // - Laboratories: Include all lab rooms
  const matrixClassroomsList = useMemo(() => {
    const capKeys = Object.keys(roomCapacities || {});
    const matched = classroomsList.filter(r => capKeys.includes(r));
    return matched.length > 0 ? matched : classroomsList;
  }, [classroomsList, roomCapacities]);

  const matrixLabsList = useMemo(() => {
    return labsList;
  }, [labsList]);

  const matrixMonitoredRoomsList = useMemo(() => {
    // Classrooms first, then Labs
    return [...matrixClassroomsList, ...matrixLabsList];
  }, [matrixClassroomsList, matrixLabsList]);

  const [matrixSelectedRooms, setMatrixSelectedRooms] = useState(() => new Set(matrixMonitoredRoomsList));
  const [matrixDayFilter, setMatrixDayFilter] = useState('ALL'); // 'ALL' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'
  const [matrixStatusFilter, setMatrixStatusFilter] = useState('VACANT'); // 'VACANT' | 'OCCUPIED' | 'BOTH'
  const [matrixSearchQuery, setMatrixSearchQuery] = useState('');
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [dropdownSearchRoom, setDropdownSearchRoom] = useState('');
  const roomDropdownRef = useRef(null);

  // Cell expand/collapse state: tracks which slot cells have their room lists open.
  // By default, initialize with all cells expanded, or allow user to toggle each individually or expand/collapse all!
  const [collapsedCells, setCollapsedCells] = useState(() => new Set());

  const toggleCellExpand = (cellKey) => {
    setCollapsedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellKey)) {
        next.delete(cellKey); // expanded
      } else {
        next.add(cellKey); // collapsed
      }
      return next;
    });
  };

  const handleExpandAllCells = () => {
    setCollapsedCells(new Set());
  };

  const handleCollapseAllCells = () => {
    const allKeys = new Set();
    activeDaysList.forEach((d) => {
      academicSlots.forEach((s) => {
        allKeys.add(`${d}_${s}`);
      });
    });
    setCollapsedCells(allKeys);
  };

  // Sync matrixSelectedRooms when matrixMonitoredRoomsList changes
  useEffect(() => {
    if (matrixMonitoredRoomsList.length > 0) {
      setMatrixSelectedRooms(new Set(matrixMonitoredRoomsList));
    }
  }, [matrixMonitoredRoomsList]);

  // Click outside listener for the multi-select room dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(event.target)) {
        setIsRoomDropdownOpen(false);
      }
    }
    if (isRoomDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRoomDropdownOpen]);

  // Multi-select room helper handlers for the Matrix tab
  const handleToggleRoom = (r) => {
    setMatrixSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(r)) {
        next.delete(r);
      } else {
        next.add(r);
      }
      return next;
    });
  };

  const handleSelectAllRooms = () => {
    setMatrixSelectedRooms(new Set(matrixMonitoredRoomsList));
  };

  const handleSelectOnlyClassrooms = () => {
    setMatrixSelectedRooms(new Set(matrixClassroomsList));
  };

  const handleSelectOnlyLabs = () => {
    setMatrixSelectedRooms(new Set(matrixLabsList));
  };

  const handleClearAllRooms = () => {
    setMatrixSelectedRooms(new Set());
  };

  const roomDropdownLabel = useMemo(() => {
    if (matrixSelectedRooms.size === 0) return 'No Rooms Selected';
    if (matrixSelectedRooms.size === matrixMonitoredRoomsList.length) return `All Rooms & Labs (${matrixMonitoredRoomsList.length})`;
    if (matrixClassroomsList.length > 0 && matrixSelectedRooms.size === matrixClassroomsList.length && matrixClassroomsList.every(r => matrixSelectedRooms.has(r))) {
      return `Classrooms Only (${matrixClassroomsList.length})`;
    }
    if (matrixLabsList.length > 0 && matrixSelectedRooms.size === matrixLabsList.length && matrixLabsList.every(r => matrixSelectedRooms.has(r))) {
      return `Laboratories Only (${matrixLabsList.length})`;
    }
    return `${matrixSelectedRooms.size} Rooms Selected`;
  }, [matrixSelectedRooms, matrixMonitoredRoomsList, matrixClassroomsList, matrixLabsList]);

  const selectedRoomsArray = useMemo(() => {
    return matrixMonitoredRoomsList.filter(r => matrixSelectedRooms.has(r));
  }, [matrixMonitoredRoomsList, matrixSelectedRooms]);

  const matrixDaysToDisplay = useMemo(() => {
    if (matrixDayFilter === 'ALL') return activeDaysList;
    return activeDaysList.filter(d => d === matrixDayFilter);
  }, [activeDaysList, matrixDayFilter]);

  // Auto-detect "Available Right Now"
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

    let matchedSlot = academicSlots[0];
    if (currentDec >= 9 && currentDec < 10) matchedSlot = '09:00-10:00';
    else if (currentDec >= 10 && currentDec < 11.25) matchedSlot = '10:00-11:00';
    else if (currentDec >= 11.25 && currentDec < 12.25) matchedSlot = '11:15-12:15';
    else if (currentDec >= 12.25 && currentDec < 14.25) matchedSlot = '12:15-01:15';
    else if (currentDec >= 14.25 && currentDec < 15.25) matchedSlot = '02:15-03:15';
    else if (currentDec >= 15.25 && currentDec <= 16.5) matchedSlot = '03:15-04:15';

    setSelectedSlot(matchedSlot);
  };

  // Evaluate vacancy status for each room for the selectedDay and selectedSlot
  const roomStatusList = useMemo(() => {
    return allRoomsList.map(room => {
      const isLab = labsList.includes(room);
      const sessions = roomSchedules[room]?.[selectedDay]?.[selectedSlot] || [];
      const isOccupied = sessions.length > 0;
      return {
        room,
        isLab,
        type: isLab ? 'Laboratory' : 'Classroom',
        isOccupied,
        status: isOccupied ? 'OCCUPIED' : 'VACANT',
        sessions
      };
    });
  }, [allRoomsList, labsList, roomSchedules, selectedDay, selectedSlot]);

  // Filtered room status list
  const filteredRoomStatusList = useMemo(() => {
    return roomStatusList.filter(item => {
      if (roomTypeFilter === 'CLASSROOM' && item.isLab) return false;
      if (roomTypeFilter === 'LAB' && !item.isLab) return false;
      if (statusFilter === 'VACANT' && item.isOccupied) return false;
      if (statusFilter === 'OCCUPIED' && !item.isOccupied) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRoom = item.room.toLowerCase().includes(q);
        const matchesSessions = item.sessions.some(s => 
          (s.branch || '').toLowerCase().includes(q) ||
          (s.subject || '').toLowerCase().includes(q) ||
          (s.faculty || '').toLowerCase().includes(q)
        );
        if (!matchesRoom && !matchesSessions) return false;
      }
      return true;
    });
  }, [roomStatusList, roomTypeFilter, statusFilter, searchQuery]);

  // Vacancy stats
  const totalCount = roomStatusList.length;
  const vacantCount = roomStatusList.filter(r => !r.isOccupied).length;
  const occupiedCount = roomStatusList.filter(r => r.isOccupied).length;
  const utilizationRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  // Selected room schedule for By Room Timetable
  const currentRoomSchedule = roomSchedules[selectedRoom] || {};

  return (
    <div className="w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8 py-4">
      {/* Top View Mode Switcher Pills */}
      <div className="no-print flex justify-center mb-6">
        <div className="inline-flex p-1.5 bg-slate-200/90 rounded-xl gap-2 shadow-inner border border-slate-300 flex-wrap justify-center">
          <button
            onClick={() => setViewMode('locator')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-black rounded-lg transition-all ${
              viewMode === 'locator'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <DoorOpen className="w-4 h-4" /> Room & Lab Vacancy Locator
          </button>

          <button
            onClick={() => setViewMode('weekly-matrix')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-black rounded-lg transition-all ${
              viewMode === 'weekly-matrix'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" /> Day-Wise Vacant Rooms Matrix
          </button>

          <button
            onClick={() => setViewMode('timetable')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-black rounded-lg transition-all ${
              viewMode === 'timetable'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <Building className="w-4 h-4" /> By Room Timetable ({allRoomsList.length})
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: ROOM & LAB VACANCY LOCATOR (ROOM FINDER)             */}
      {/* ============================================================ */}
      {viewMode === 'locator' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="no-print bg-white p-4 sm:p-5 rounded-xl border border-slate-300 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Campus Infrastructure Vacancy Finder
                  </h3>
                  <p className="text-xs text-slate-500">
                    Locate available classrooms or labs for remedial sessions, club events, or extra classes
                  </p>
                </div>
              </div>

              {/* "Available Right Now" Button */}
              <button
                onClick={handleSelectRightNow}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                Available Right Now
              </button>
            </div>

            {/* Selectors Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Day Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Day of Week:
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  {activeDaysList.map((d) => (
                    <option key={d} value={d}>
                      {d === 'MON' ? 'Monday' : d === 'TUE' ? 'Tuesday' : d === 'WED' ? 'Wednesday' : d === 'THU' ? 'Thursday' : d === 'FRI' ? 'Friday' : 'Saturday'} ({d})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slot Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Time Slot:
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 cursor-pointer font-mono"
                >
                  {academicSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Type Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Room Type:
                </label>
                <select
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Rooms ({allRoomsList.length})</option>
                  <option value="CLASSROOM">Classrooms Only ({classroomsList.length})</option>
                  <option value="LAB">Laboratories Only ({labsList.length})</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Availability:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses ({totalCount})</option>
                  <option value="VACANT">Vacant Only ({vacantCount})</option>
                  <option value="OCCUPIED">Occupied Only ({occupiedCount})</option>
                </select>
              </div>

              {/* Search Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Quick Search:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Room or branch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg pl-8 pr-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Vacancy Analytics Stat Cards */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Monitored Rooms</div>
                <div className="text-lg font-bold text-slate-900">{totalCount} Rooms</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Vacant / Available</div>
                <div className="text-lg font-bold text-emerald-700">{vacantCount} Rooms Free</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Occupied in Slot</div>
                <div className="text-lg font-bold text-rose-700">{occupiedCount} Rooms In Use</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Campus Utilization</div>
                <div className="text-lg font-bold text-purple-900">{utilizationRate}% Occupied</div>
              </div>
            </div>
          </div>

          {/* Sub-view switcher: Grid Matrix vs Full Day Heatmap */}
          <div className="no-print flex justify-between items-center bg-slate-100 p-2 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-700">
              Showing <strong>{filteredRoomStatusList.length}</strong> rooms for <strong className="text-blue-800">{selectedDay} {selectedSlot}</strong>
            </span>
            <div className="inline-flex gap-1 bg-white p-1 rounded-md border border-slate-300">
              <button
                onClick={() => setLocatorViewType('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded ${
                  locatorViewType === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Room Grid
              </button>
              <button
                onClick={() => setLocatorViewType('heatmap')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded ${
                  locatorViewType === 'heatmap' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" /> Day Heatmap
              </button>
            </div>
          </div>

          {/* 1. ROOM GRID VIEW */}
          {locatorViewType === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRoomStatusList.map((item) => (
                <div
                  key={item.room}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                    item.isOccupied
                      ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400'
                      : 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400'
                  }`}
                >
                  <div>
                    {/* Header: Room Name & Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/80">
                      <div>
                        <div className="text-sm font-black text-slate-900 font-mono tracking-tight flex items-center gap-1.5">
                          <span>{item.room}</span>
                          {roomCapacities[item.room] && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-sans" title={`Seating Capacity: ${roomCapacities[item.room]} Seats`}>
                              {roomCapacities[item.room]} seats
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] font-bold text-slate-500 uppercase">
                          {item.type}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black tracking-wide uppercase ${
                          item.isOccupied
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {item.isOccupied ? (
                          <>
                            <XCircle className="w-3 h-3" /> Occupied
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Vacant
                          </>
                        )}
                      </span>
                    </div>

                    {/* Body: Occupancy details or Free message */}
                    {item.isOccupied ? (
                      <div className="space-y-1.5 text-xs">
                        {item.sessions.map((sess, idx) => (
                          <div key={idx} className="bg-white/80 p-2 rounded-lg border border-rose-200">
                            <div className="font-black text-slate-900 text-xs">
                              Branch: <span className="text-blue-700">{sess.branch}</span>
                            </div>
                            <div className="font-bold text-purple-900 text-[11px] mt-0.5">
                              {sess.subject}
                            </div>
                            {sess.faculty && (
                              <div className="text-[10px] text-slate-600 font-medium mt-0.5 leading-tight">
                                Faculty: {sess.faculty}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-3 text-center">
                        <div className="text-xs font-bold text-emerald-800">
                          Available for Booking
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          Free for remedial sessions, club events, or extra lectures.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer link to view full room timetable */}
                  <div className="mt-3 pt-2 border-t border-slate-200/80 flex justify-between items-center text-[10.5px]">
                    <button
                      onClick={() => {
                        setSelectedRoom(item.room);
                        setViewMode('timetable');
                      }}
                      className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                    >
                      View Weekly Schedule →
                    </button>
                    <span className="text-slate-400 font-mono text-[10px]">{selectedDay}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. FULL DAY HEATMAP VIEW (All Rooms vs All Periods of Selected Day) */}
          {locatorViewType === 'heatmap' && (
            <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card">
              <div className="text-center py-3 px-6 border-b-2 border-slate-700 bg-slate-50">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase font-mono">
                  CAMPUS INFRASTRUCTURE MATRIX • {selectedDay === 'MON' ? 'MONDAY' : selectedDay === 'TUE' ? 'TUESDAY' : selectedDay === 'WED' ? 'WEDNESDAY' : selectedDay === 'THU' ? 'THURSDAY' : selectedDay === 'FRI' ? 'FRIDAY' : 'SATURDAY'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Green = Vacant (Free to use) | Red = Occupied by Academic Class
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse border-2 border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3 border-r border-slate-300 text-left w-36">Room Name</th>
                      <th className="py-2.5 px-2 border-r border-slate-300 w-24">Type</th>
                      {academicSlots.map((slot) => (
                        <th key={slot} className="py-2.5 px-2 border-r border-slate-300">
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {filteredRoomStatusList.map((item) => (
                      <tr key={item.room} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-left font-black text-slate-900 border-r border-slate-300 font-mono text-xs">
                          <div className="flex items-center justify-between gap-1.5">
                            <span>{item.room}</span>
                            {roomCapacities[item.room] && (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded shadow-2xs font-sans" title={`Seating Capacity: ${roomCapacities[item.room]}`}>
                                {roomCapacities[item.room]} cap
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 border-r border-slate-300 text-[10.5px] font-bold text-slate-500">
                          {item.type}
                        </td>
                        {academicSlots.map((slot) => {
                          const sessions = roomSchedules[item.room]?.[selectedDay]?.[slot] || [];
                          const isOccupied = sessions.length > 0;
                          return (
                            <td
                              key={slot}
                              className={`p-1.5 border-r border-slate-300 text-center ${
                                isOccupied ? 'bg-rose-50 text-rose-900 font-bold' : 'bg-emerald-50/70 text-emerald-800'
                              }`}
                            >
                              {isOccupied ? (
                                <div className="leading-tight">
                                  <div className="font-bold text-[10px] text-rose-950">
                                    {sessions[0]?.branch}
                                  </div>
                                  <div className="text-[9.5px] text-slate-600 font-semibold truncate max-w-[120px]">
                                    {sessions[0]?.subject}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700">Vacant</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: DAY-WISE VACANT ROOMS MATRIX (DAYS × TIME SLOTS)    */}
      {/* ============================================================ */}
      {viewMode === 'weekly-matrix' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="no-print bg-white p-4 sm:p-5 rounded-xl border border-slate-300 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Day-Wise Vacant & Occupied Rooms Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive cross-sectional matrix showing vacant or occupied rooms for every day and academic time period
                  </p>
                </div>
              </div>

              {/* Action Buttons: Reset, Expand/Collapse All & Print */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={collapsedCells.size === 0 ? handleCollapseAllCells : handleExpandAllCells}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title={collapsedCells.size === 0 ? "Collapse all slot dropdowns" : "Expand all slot dropdowns"}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedCells.size === 0 ? 'rotate-180' : ''}`} />
                  {collapsedCells.size === 0 ? 'Collapse All' : 'Expand All'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMatrixDayFilter('ALL');
                    setMatrixStatusFilter('VACANT');
                    setMatrixSelectedRooms(new Set(matrixMonitoredRoomsList));
                    setMatrixSearchQuery('');
                    setCollapsedCells(new Set());
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="Reset filters to default"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Print this matrix"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Matrix
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* 1. ROOM SELECTION DROPDOWN WITH CHECKBOXES */}
              <div className="relative" ref={roomDropdownRef}>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Room Selection ({selectedRoomsArray.length}):
                </label>
                <button
                  type="button"
                  onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                  className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 text-xs font-bold rounded-lg px-3 py-2 text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer transition-all shadow-xs"
                >
                  <span className="truncate pr-2 font-mono">{roomDropdownLabel}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isRoomDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Popover Dropdown Panel */}
                {isRoomDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-slate-300 z-50 p-3 space-y-3">
                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={handleSelectAllRooms}
                        className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 cursor-pointer text-[11px]"
                      >
                        All ({matrixMonitoredRoomsList.length})
                      </button>
                      {matrixClassroomsList.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectOnlyClassrooms}
                          className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200 cursor-pointer text-[11px]"
                        >
                          Classrooms ({matrixClassroomsList.length})
                        </button>
                      )}
                      {matrixLabsList.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectOnlyLabs}
                          className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 cursor-pointer text-[11px]"
                        >
                          Labs ({matrixLabsList.length})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearAllRooms}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 cursor-pointer text-[11px] ml-auto"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Room Search input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={dropdownSearchRoom}
                        onChange={(e) => setDropdownSearchRoom(e.target.value)}
                        placeholder="Search rooms..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    {/* Scrollable Room List */}
                    <div className="max-h-64 overflow-y-auto space-y-3 pr-1 text-xs">
                      {/* Classrooms Group */}
                      {matrixClassroomsList.filter(r => !dropdownSearchRoom || r.toLowerCase().includes(dropdownSearchRoom.toLowerCase())).length > 0 && (
                        <div>
                          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                            <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                              <Building className="w-3 h-3 text-purple-600" /> Classrooms ({matrixClassroomsList.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = matrixClassroomsList.every(r => matrixSelectedRooms.has(r));
                                setMatrixSelectedRooms(prev => {
                                  const next = new Set(prev);
                                  matrixClassroomsList.forEach(r => allSelected ? next.delete(r) : next.add(r));
                                  return next;
                                });
                              }}
                              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              {matrixClassroomsList.every(r => matrixSelectedRooms.has(r)) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {matrixClassroomsList
                              .filter(r => !dropdownSearchRoom || r.toLowerCase().includes(dropdownSearchRoom.toLowerCase()))
                              .map(room => {
                                const checked = matrixSelectedRooms.has(room);
                                return (
                                  <label
                                    key={room}
                                    onClick={() => handleToggleRoom(room)}
                                    className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer select-none transition-all ${
                                      checked
                                        ? 'bg-purple-50/70 border-purple-300 text-purple-950 font-bold'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {}}
                                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                    />
                                    <span className="font-mono text-[11px] truncate">{room}</span>
                                    {roomCapacities[room] && (
                                      <span className="ml-auto text-[9.5px] font-bold text-purple-700 bg-purple-100/90 px-1 rounded font-sans">
                                        {roomCapacities[room]}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Laboratories Group */}
                      {matrixLabsList.filter(r => !dropdownSearchRoom || r.toLowerCase().includes(dropdownSearchRoom.toLowerCase())).length > 0 && (
                        <div>
                          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                            <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                              <FlaskConical className="w-3 h-3 text-teal-600" /> Laboratories ({matrixLabsList.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = matrixLabsList.every(r => matrixSelectedRooms.has(r));
                                setMatrixSelectedRooms(prev => {
                                  const next = new Set(prev);
                                  matrixLabsList.forEach(r => allSelected ? next.delete(r) : next.add(r));
                                  return next;
                                });
                              }}
                              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              {matrixLabsList.every(r => matrixSelectedRooms.has(r)) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {matrixLabsList
                              .filter(r => !dropdownSearchRoom || r.toLowerCase().includes(dropdownSearchRoom.toLowerCase()))
                              .map(room => {
                                const checked = matrixSelectedRooms.has(room);
                                return (
                                  <label
                                    key={room}
                                    onClick={() => handleToggleRoom(room)}
                                    className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer select-none transition-all ${
                                      checked
                                        ? 'bg-teal-50/70 border-teal-300 text-teal-950 font-bold'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {}}
                                      className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                                    />
                                    <span className="font-mono text-[11px] truncate">{room}</span>
                                    {roomCapacities[room] && (
                                      <span className="ml-auto text-[9.5px] font-bold text-purple-700 bg-purple-100/90 px-1 rounded font-sans">
                                        {roomCapacities[room]}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Popover Footer */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500 text-[11px]">
                        {matrixSelectedRooms.size} of {matrixMonitoredRoomsList.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsRoomDropdownOpen(false)}
                        className="px-3 py-1 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-bold cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. DAY OF WEEK SELECTOR */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Day of Week:
                </label>
                <select
                  value={matrixDayFilter}
                  onChange={(e) => setMatrixDayFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer transition-all shadow-xs"
                >
                  <option value="ALL">All Days (Monday – Friday)</option>
                  {activeDaysList.map((d) => (
                    <option key={d} value={d}>
                      {d === 'MON' ? 'Monday (MON)' : d === 'TUE' ? 'Tuesday (TUE)' : d === 'WED' ? 'Wednesday (WED)' : d === 'THU' ? 'Thursday (THU)' : d === 'FRI' ? 'Friday (FRI)' : 'Saturday (SAT)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. STATUS DISPLAY FILTER */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status Display:
                </label>
                <select
                  value={matrixStatusFilter}
                  onChange={(e) => setMatrixStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer transition-all shadow-xs"
                >
                  <option value="VACANT">Vacant Rooms Only</option>
                  <option value="OCCUPIED">Occupied Rooms Only</option>
                  <option value="BOTH">Both (Vacant & Occupied)</option>
                </select>
              </div>

              {/* 4. QUICK SEARCH */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Quick Search:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={matrixSearchQuery}
                    onChange={(e) => setMatrixSearchQuery(e.target.value)}
                    placeholder="Filter by room name..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white placeholder-slate-400 shadow-xs font-mono"
                  />
                  {matrixSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMatrixSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <Building className="w-5 h-5" />
              </span>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rooms Monitored</div>
                <div className="text-base font-black text-slate-900 font-mono">{selectedRoomsArray.length} Rooms</div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classrooms Filtered</div>
                <div className="text-base font-black text-emerald-800 font-mono">
                  {matrixClassroomsList.filter(r => matrixSelectedRooms.has(r)).length} of {matrixClassroomsList.length}
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <span className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                <FlaskConical className="w-5 h-5" />
              </span>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Laboratories Filtered</div>
                <div className="text-base font-black text-teal-800 font-mono">
                  {matrixLabsList.filter(r => matrixSelectedRooms.has(r)).length} of {matrixLabsList.length}
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <span className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                <Filter className="w-5 h-5" />
              </span>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Mode</div>
                <div className="text-xs font-black text-purple-900 uppercase">
                  {matrixStatusFilter === 'VACANT' ? 'Vacant Rooms' : matrixStatusFilter === 'OCCUPIED' ? 'Occupied Rooms' : 'Vacant + Occupied'}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* THE MASTER DAY-WISE VACANCY MATRIX TABLE                     */}
          {/* ============================================================ */}
          <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card">
            {/* Header Banner */}
            <div className="text-center py-3.5 px-6 border-b-2 border-slate-700 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase font-serif">
                {universityInfo.name}
              </h2>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 mt-1 uppercase font-mono tracking-wider">
                WEEKLY ROOM VACANCY & ALLOCATION MATRIX • {matrixDayFilter === 'ALL' ? 'ALL ACADEMIC DAYS' : (matrixDayFilter === 'MON' ? 'MONDAY' : matrixDayFilter === 'TUE' ? 'TUESDAY' : matrixDayFilter === 'WED' ? 'WEDNESDAY' : matrixDayFilter === 'THU' ? 'THURSDAY' : matrixDayFilter === 'FRI' ? 'FRIDAY' : 'SATURDAY')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {matrixStatusFilter === 'VACANT' && 'Displaying all vacant and unallocated rooms available for academic use or booking'}
                {matrixStatusFilter === 'OCCUPIED' && 'Displaying all occupied rooms and their active section & course allocations'}
                {matrixStatusFilter === 'BOTH' && 'Displaying comprehensive status for both vacant and occupied rooms across each slot'}
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border-2 border-slate-700 min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 border-r-2 border-slate-400 text-center w-28 bg-slate-200/90 font-mono">
                      DAY
                    </th>
                    {academicSlots.map((slot) => (
                      <th key={slot} className="py-3 px-2 border-r border-slate-300 text-center font-mono">
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-400">
                  {matrixDaysToDisplay.map((day) => {
                    const fullDayName = day === 'MON' ? 'MONDAY' : day === 'TUE' ? 'TUESDAY' : day === 'WED' ? 'WEDNESDAY' : day === 'THU' ? 'THURSDAY' : day === 'FRI' ? 'FRIDAY' : 'SATURDAY';

                    return (
                      <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                        {/* Row Header: Day Name */}
                        <td className="py-4 px-3 text-center border-r-2 border-slate-400 bg-slate-100 font-mono font-black text-slate-900 align-middle">
                          <div className="text-sm font-black text-blue-950">{fullDayName}</div>
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">
                            ({day})
                          </div>
                        </td>

                        {/* Slots */}
                        {academicSlots.map((slot) => {
                          const slotVacantRooms = selectedRoomsArray.filter(
                            (r) => (roomSchedules[r]?.[day]?.[slot] || []).length === 0
                          );
                          const slotOccupiedRooms = selectedRoomsArray.filter(
                            (r) => (roomSchedules[r]?.[day]?.[slot] || []).length > 0
                          );

                          const q = matrixSearchQuery.toLowerCase().trim();
                          const displayVacant = q
                            ? slotVacantRooms.filter((r) => r.toLowerCase().includes(q))
                            : slotVacantRooms;
                          const displayOccupied = q
                            ? slotOccupiedRooms.filter((r) => {
                                const matchesRoom = r.toLowerCase().includes(q);
                                const sess = roomSchedules[r]?.[day]?.[slot] || [];
                                const matchesSess = sess.some(
                                  (s) =>
                                    (s.branch || '').toLowerCase().includes(q) ||
                                    (s.subject || '').toLowerCase().includes(q) ||
                                    (s.faculty || '').toLowerCase().includes(q)
                                );
                                return matchesRoom || matchesSess;
                              })
                            : slotOccupiedRooms;

                          const totalMonitored = selectedRoomsArray.length;
                          const vacantPct = totalMonitored > 0 ? Math.round((slotVacantRooms.length / totalMonitored) * 100) : 0;
                          const occupiedPct = totalMonitored > 0 ? Math.round((slotOccupiedRooms.length / totalMonitored) * 100) : 0;

                          const cellKey = `${day}_${slot}`;
                          const isCollapsed = collapsedCells.has(cellKey);

                          return (
                            <td
                              key={slot}
                              className="p-2 border-r border-slate-300 align-top min-w-[170px] max-w-[240px] bg-white transition-all"
                            >
                              {/* MODE 1: VACANT ONLY */}
                              {matrixStatusFilter === 'VACANT' && (
                                <div className="space-y-1.5">
                                  {/* Clickable Header Badge Dropdown Trigger */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCellExpand(cellKey)}
                                    title={isCollapsed ? "Click to expand rooms list" : "Click to collapse rooms list"}
                                    className="w-full flex items-center justify-between text-[11px] font-black text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200/90 px-2 py-1 rounded border border-emerald-300 shadow-2xs transition-all cursor-pointer select-none"
                                  >
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>{displayVacant.length} Free</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-[10px] text-emerald-700 font-mono font-bold">
                                        {vacantPct}%
                                      </span>
                                      <ChevronDown className={`w-3.5 h-3.5 text-emerald-700 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                                    </span>
                                  </button>

                                  {/* List of Vacant Room Pills (collapsible) */}
                                  {!isCollapsed && (
                                    <div className="flex flex-wrap gap-1 max-h-[190px] overflow-y-auto p-0.5">
                                      {displayVacant.map((room) => {
                                        const isLab = labsList.includes(room);
                                        return (
                                          <button
                                            key={room}
                                            type="button"
                                            onClick={() => {
                                              setSelectedRoom(room);
                                              setViewMode('timetable');
                                            }}
                                            title={`${room} (${isLab ? 'Laboratory' : 'Classroom'})${roomCapacities[room] ? ` - Seating Capacity: ${roomCapacities[room]} Seats` : ''} - Click to view weekly timetable`}
                                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-black transition-all shadow-2xs hover:scale-105 cursor-pointer inline-flex items-center gap-1 ${
                                              isLab
                                                ? 'bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100'
                                                : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                                            }`}
                                          >
                                            {isLab && <FlaskConical className="w-2.5 h-2.5 inline text-teal-700" />}
                                            <span>{room}</span>
                                            {roomCapacities[room] && (
                                              <span className="text-[9.5px] font-bold text-slate-700 bg-white/90 px-1 rounded border border-emerald-200 font-sans">
                                                {roomCapacities[room]}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                      {displayVacant.length === 0 && (
                                        <div className="w-full text-center py-3 text-slate-400 italic text-[11px]">
                                          0 Rooms Vacant
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* MODE 2: OCCUPIED ONLY */}
                              {matrixStatusFilter === 'OCCUPIED' && (
                                <div className="space-y-1.5">
                                  {/* Clickable Header Badge Dropdown Trigger */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCellExpand(cellKey)}
                                    title={isCollapsed ? "Click to expand occupied rooms list" : "Click to collapse occupied rooms list"}
                                    className="w-full flex items-center justify-between text-[11px] font-black text-rose-800 bg-rose-100/90 hover:bg-rose-200/90 px-2 py-1 rounded border border-rose-300 shadow-2xs transition-all cursor-pointer select-none"
                                  >
                                    <span className="flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5 text-rose-700" />
                                      <span>{displayOccupied.length} In Use</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-[10px] text-rose-700 font-mono font-bold">
                                        {occupiedPct}%
                                      </span>
                                      <ChevronDown className={`w-3.5 h-3.5 text-rose-700 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                                    </span>
                                  </button>

                                  {/* List of Occupied Room Pills (collapsible) */}
                                  {!isCollapsed && (
                                    <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto p-0.5">
                                      {displayOccupied.map((room) => {
                                        const sess = roomSchedules[room]?.[day]?.[slot] || [];
                                        const isLab = labsList.includes(room);
                                        return (
                                          <div
                                            key={room}
                                            onClick={() => sess.length > 0 && onSlotClick && onSlotClick(sess, day, slot, sess[0]?.branch)}
                                            title={`${room}${roomCapacities[room] ? ` (Capacity: ${roomCapacities[room]})` : ''}: ${sess.map((s) => `${s.branch} - ${s.subject}`).join(', ')}`}
                                            className="p-1 rounded bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-2xs cursor-pointer text-left"
                                          >
                                            <div className="flex items-center justify-between font-mono font-black text-rose-950 text-[10.5px]">
                                              <span className="flex items-center gap-1">
                                                {isLab && <FlaskConical className="w-2.5 h-2.5 text-teal-700 inline" />}
                                                <span>{room}</span>
                                                {roomCapacities[room] && (
                                                  <span className="text-[9px] font-bold text-slate-700 bg-white/90 px-1 rounded border border-rose-200 font-sans">
                                                    {roomCapacities[room]}
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-[9.5px] font-bold text-blue-700">
                                                {sess[0]?.branch}
                                              </span>
                                            </div>
                                            <div className="text-[9.5px] text-slate-700 font-medium truncate mt-0.5">
                                              {sess[0]?.subject}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {displayOccupied.length === 0 && (
                                        <div className="w-full text-center py-3 text-emerald-600 font-bold text-[11px]">
                                          All Rooms Free
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* MODE 3: BOTH (VACANT & OCCUPIED) */}
                              {matrixStatusFilter === 'BOTH' && (
                                <div className="space-y-2">
                                  {/* Toggle button for both */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCellExpand(cellKey)}
                                    className="w-full flex items-center justify-between text-[10.5px] font-black text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300 shadow-2xs transition-all cursor-pointer select-none"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span className="text-emerald-700">{displayVacant.length} Free</span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-rose-700">{displayOccupied.length} In Use</span>
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                                  </button>

                                  {!isCollapsed && (
                                    <>
                                      {/* Vacant sub-section */}
                                      <div>
                                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center justify-between mb-1">
                                          <span>Vacant ({displayVacant.length})</span>
                                          <span className="font-mono">{vacantPct}%</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-0.5">
                                          {displayVacant.slice(0, 15).map((room) => (
                                            <span
                                              key={room}
                                              onClick={() => {
                                                setSelectedRoom(room);
                                                setViewMode('timetable');
                                              }}
                                              title={`${room}${roomCapacities[room] ? ` (Capacity: ${roomCapacities[room]})` : ''} - Click to view schedule`}
                                              className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100/90 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 cursor-pointer shadow-2xs inline-flex items-center gap-0.5"
                                            >
                                              <span>{room}</span>
                                              {roomCapacities[room] && (
                                                <span className="text-[8.5px] font-bold text-emerald-800 bg-white/80 px-0.5 rounded font-sans">
                                                  ({roomCapacities[room]})
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                          {displayVacant.length > 15 && (
                                            <span className="text-[9px] text-emerald-700 font-bold self-center">
                                              +{displayVacant.length - 15} more
                                            </span>
                                          )}
                                          {displayVacant.length === 0 && (
                                            <span className="text-[9.5px] text-slate-400 italic">None</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Occupied sub-section */}
                                      <div>
                                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center justify-between mb-1">
                                          <span>In Use ({displayOccupied.length})</span>
                                          <span className="font-mono">{occupiedPct}%</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-0.5">
                                          {displayOccupied.slice(0, 10).map((room) => {
                                            const sess = roomSchedules[room]?.[day]?.[slot] || [];
                                            return (
                                              <span
                                                key={room}
                                                onClick={() => sess.length > 0 && onSlotClick && onSlotClick(sess, day, slot, sess[0]?.branch)}
                                                title={`${room}${roomCapacities[room] ? ` (Capacity: ${roomCapacities[room]})` : ''}: ${sess.map((s) => `${s.branch} - ${s.subject}`).join(', ')}`}
                                                className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-rose-100/90 text-rose-950 border border-rose-300 hover:bg-rose-200 cursor-pointer shadow-2xs inline-flex items-center gap-0.5"
                                              >
                                                <span>{room}</span>
                                                {roomCapacities[room] && (
                                                  <span className="text-[8.5px] font-bold text-rose-800 bg-white/80 px-0.5 rounded font-sans">
                                                    ({roomCapacities[room]})
                                                  </span>
                                                )}
                                              </span>
                                            );
                                          })}
                                          {displayOccupied.length > 10 && (
                                            <span className="text-[9px] text-rose-700 font-bold self-center">
                                              +{displayOccupied.length - 10} more
                                            </span>
                                          )}
                                          {displayOccupied.length === 0 && (
                                            <span className="text-[9.5px] text-slate-400 italic">None</span>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Matrix Table Footer Legend */}
            <div className="bg-slate-50 px-4 py-2.5 border-t-2 border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block"></span>
                  <span>Classroom (Vacant)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-teal-100 border border-teal-300 inline-block"></span>
                  <span>Laboratory (Vacant)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block"></span>
                  <span>Occupied / Active Class</span>
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-500 font-mono">
                Showing {selectedRoomsArray.length} Selected Rooms Across {matrixDaysToDisplay.length} Academic Days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: BY ROOM TIMETABLE (WEEKLY SCHEDULE)                  */}
      {/* ============================================================ */}
      {viewMode === 'timetable' && (
        <div className="space-y-6">
          {/* Room Selector Bar */}
          <div className="no-print flex justify-center mb-6">
            <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm max-w-xl w-full">
              <label htmlFor="room-picker" className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" /> Select Room:
              </label>
              <select
                id="room-picker"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase cursor-pointer"
              >
                <optgroup label="Classrooms">
                  {classroomsList.map((r) => (
                    <option key={r} value={r}>
                      {r} {roomCapacities[r] ? `(${roomCapacities[r]} Seats)` : ''} (Classroom)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Laboratories">
                  {labsList.map((r) => (
                    <option key={r} value={r}>
                      {r} {roomCapacities[r] ? `(${roomCapacities[r]} Seats)` : ''} (Lab)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Room Timetable Card */}
          <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-6">
            <div className="text-center py-3.5 px-6 border-b-2 border-slate-700 bg-gray-50/90">
              <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
                {universityInfo.name}
              </h2>
              <h3 className="text-xs sm:text-sm font-black text-purple-900 mt-1 uppercase font-mono flex flex-wrap items-center justify-center gap-2">
                <span>ROOM MASTER TIMETABLE: <span className="underline decoration-purple-600">{selectedRoom}</span></span>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-purple-100 text-purple-950 border border-purple-300">
                  {labsList.includes(selectedRoom) ? 'Laboratory' : 'Classroom'}
                </span>
                {roomCapacities[selectedRoom] && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-950 border border-blue-300 font-sans flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-700 inline" /> Capacity: {roomCapacities[selectedRoom]} Seats
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                Academic Year {universityInfo.academicYear} | Weekly Class & Lab Room Allocation
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1000px] border-2 border-slate-700">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11.5px]">
                    <th className="py-3 px-2 border-r border-gray-300 w-20 text-xs font-black text-slate-900">Day</th>
                    {periodSlots.map((slot) => (
                      <th 
                        key={slot.id} 
                        className={`py-3 px-2 border-r border-gray-300 ${
                          slot.type === 'break' ? 'bg-amber-100/80 text-amber-950 font-black w-20' : 'text-slate-950'
                        }`}
                      >
                        {slot.type === 'break' && slot.time.includes('-') ? (
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block">
                              {slot.time.split('-')[0]}–
                            </span>
                            <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block">
                              {slot.time.split('-')[1]}
                            </span>
                          </div>
                        ) : (
                          <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block">
                            {slot.time}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-600">
                  {activeDaysList.map((day) => {
                    const daySched = currentRoomSchedule[day] || {};

                    return (
                      <tr key={day} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                        {/* Day Column */}
                        <td className="py-4 px-3 font-extrabold text-gray-900 bg-gray-100/60 border-r border-gray-300 border-b-2 border-slate-600 uppercase tracking-wide align-middle">
                          {day}
                        </td>

                        {periodSlots.map((slot) => {
                          if (slot.type === 'break') {
                            return (
                              <td 
                                key={slot.id} 
                                className="py-4 px-2 bg-amber-100/70 text-amber-950 font-black text-[11px] border-r border-gray-300 border-b-2 border-slate-600 tracking-wider uppercase align-middle select-none text-center"
                              >
                                {slot.label}
                              </td>
                            );
                          }

                          const sessions = daySched[slot.time] || [];

                          return (
                            <td 
                              key={slot.id}
                              className={`p-2 border-r border-gray-300 border-b-2 border-slate-600 align-middle ${
                                sessions.length > 0 ? 'bg-purple-50/80' : 'bg-slate-50/30'
                              }`}
                              onClick={() => sessions.length > 0 && onSlotClick && onSlotClick(sessions, day, slot.time, sessions[0]?.branch)}
                            >
                              {sessions.length > 0 ? (
                                <div className="flex flex-col gap-1 justify-center items-center cursor-pointer hover:bg-purple-100 p-1.5 rounded-lg transition-colors">
                                  {sessions.map((sess, sIdx) => (
                                    <div key={sIdx} className="w-full text-center">
                                      <div className="font-black text-purple-950 text-xs">
                                        {sess.subject}
                                      </div>
                                      <div className="text-[10.5px] font-bold text-blue-800">
                                        Section: {sess.branch}
                                      </div>
                                      {sess.faculty && (
                                        <div className="text-[10px] font-medium text-slate-600 leading-tight mt-0.5">
                                          {sess.faculty}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center min-h-[44px]">
                                  <span className="text-gray-300 font-mono text-[11px]">—</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
