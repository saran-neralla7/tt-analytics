import React, { useState, useMemo, useEffect } from 'react';
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
  DoorOpen
} from 'lucide-react';

export default function RoomsView({ timetableData, universityInfo, onSlotClick }) {
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

    const all = Array.from(roomsSet).sort((a, b) => {
      // Put Classrooms first (G-, E-, C-), then Labs
      const isLabA = a.includes('LAB') || a.startsWith('A-');
      const isLabB = b.includes('LAB') || b.startsWith('A-');
      if (isLabA && !isLabB) return 1;
      if (!isLabA && isLabB) return -1;
      return a.localeCompare(b);
    });

    const labs = all.filter(r => r.toUpperCase().includes('LAB') || r.startsWith('A-'));
    const classrooms = all.filter(r => !labs.includes(r));

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
                        <div className="text-sm font-black text-slate-900 font-mono tracking-tight">
                          {item.room}
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
                          {item.room}
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
      {/* VIEW 2: BY ROOM TIMETABLE (WEEKLY SCHEDULE)                  */}
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
                      {r} (Classroom)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Laboratories">
                  {labsList.map((r) => (
                    <option key={r} value={r}>
                      {r} (Lab)
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
              <h3 className="text-xs sm:text-sm font-black text-purple-900 mt-1 uppercase font-mono">
                ROOM MASTER TIMETABLE: <span className="underline decoration-purple-600">{selectedRoom}</span>
                <span className="ml-2 px-2 py-0.5 rounded text-[10.5px] font-bold bg-purple-100 text-purple-950 border border-purple-300">
                  {labsList.includes(selectedRoom) ? 'Laboratory' : 'Classroom'}
                </span>
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
