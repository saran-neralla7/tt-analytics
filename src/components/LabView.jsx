import React, { useState, useMemo } from 'react';
import { days, periodSlots } from '../data/mockData';
import { FlaskConical, Clock, Layers, Users, Building, Table, BookOpen, Filter, FileSpreadsheet, Search } from 'lucide-react';
import initialData from '../data/initialData.json';

export default function LabView({ timetableData, labSheetsData = {}, universityInfo, onSlotClick }) {
  // 1. Available Lab Data from initialData / props
  const consolidatedLabs = useMemo(() => {
    return labSheetsData.consolidatedLabs || initialData.labSheetsData?.consolidatedLabs || {};
  }, [labSheetsData]);

  const roomLabs = useMemo(() => {
    return labSheetsData.roomLabs || initialData.labSheetsData?.roomLabs || {};
  }, [labSheetsData]);

  const masterLabSchedule = useMemo(() => {
    return labSheetsData.masterLabSchedule || initialData.labSheetsData?.masterLabSchedule || {};
  }, [labSheetsData]);

  const labSummary = useMemo(() => {
    return labSheetsData.labSummary || initialData.labSheetsData?.labSummary || [];
  }, [labSheetsData]);

  const labSummaryTotals = useMemo(() => {
    return labSheetsData.labSummaryTotals || initialData.labSheetsData?.labSummaryTotals || {
      required: 112,
      allotted: 112,
      pending: 0,
      extra: 0
    };
  }, [labSheetsData]);

  // Course lab names
  const courseLabKeys = useMemo(() => {
    const keys = Object.keys(consolidatedLabs);
    if (keys.length > 0) return keys;
    return [
      'Problem solving using C lab',
      'Engineering Physics lab',
      'AI Tools and Applications Lab',
      'Foundations of Artificial Intel',
      '3D Design and Animation',
      'Fundamentals of Web Designing L'
    ];
  }, [consolidatedLabs]);

  // Room lab names
  const roomLabKeys = useMemo(() => {
    const keys = Object.keys(roomLabs);
    if (keys.length > 0) return keys;
    return [
      'COMP. LAB-1', 'COMP. LAB-2', 'COMP. LAB-3', 'COMP. LAB-4',
      'CHEM. LAB.', 'PHY LAB', 'A-406', 'A-301,302', 'A-303,304', 'C-208',
      'E-319', 'G-302', 'G-303', 'G-304', 'G-305', 'G-405',
      'GVPCE CHEM. LAB.', 'GVPCE MECH. LAB', 'GVPCE SUR. LAB'
    ];
  }, [roomLabs]);

  // Branches in master lab schedule
  const masterBranches = useMemo(() => {
    const keys = Object.keys(masterLabSchedule);
    if (keys.length > 0) return keys;
    return [
      'CSE-1', 'CSE-2', 'CSE(AI&ML)-1', 'CSE(AI&ML)-2', 'CSE (CS & DS)',
      'ECE-1', 'ECE-2', 'ECE-3', 'MECH', 'EEE', 'CIVIL', 'CHEMICAL', 'MECH-ROBOTICS'
    ];
  }, [masterLabSchedule]);

  // View mode: 'course' | 'room' | 'master' | 'summary'
  const [viewMode, setViewMode] = useState('course');
  const [selectedCourse, setSelectedCourse] = useState(courseLabKeys[0] || 'Problem solving using C lab');
  const [selectedRoom, setSelectedRoom] = useState(roomLabKeys[0] || 'COMP. LAB-1');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [summarySearch, setSummarySearch] = useState('');

  // Filtered lab summary
  const filteredLabSummary = useMemo(() => {
    if (!summarySearch.trim()) return labSummary;
    const q = summarySearch.toLowerCase().trim();
    return labSummary.filter(item =>
      (item.labName || '').toLowerCase().includes(q) ||
      (item.subShort || '').toLowerCase().includes(q) ||
      (item.roomNo || '').toLowerCase().includes(q) ||
      (item.branches || '').toLowerCase().includes(q) ||
      (item.remarks || '').toLowerCase().includes(q)
    );
  }, [labSummary, summarySearch]);

  // Time slot columns used in lab sheets (2-hour blocks)
  const labTimeSlots = [
    { id: 's1', time: '09:00-11:00' },
    { id: 'b1', time: '11:00-11:15', isBreak: true, label: 'BREAK' },
    { id: 's2', time: '11:15-01:15' },
    { id: 'b2', time: '01:15-02:15', isBreak: true, label: 'LUNCH' },
    { id: 's3', time: '02:15-04:15' }
  ];

  // Stats calculation
  let totalOccupiedSessions = 0;
  const activeBranchesSet = new Set();

  if (viewMode === 'course') {
    const sched = consolidatedLabs[selectedCourse] || {};
    days.forEach(d => {
      const dSched = sched[d] || {};
      ['09:00-11:00', '11:15-01:15', '02:15-04:15'].forEach(slot => {
        const sessions = dSched[slot] || [];
        totalOccupiedSessions += sessions.length;
        sessions.forEach(s => {
          if (s.branch) activeBranchesSet.add(s.branch);
        });
      });
    });
  } else if (viewMode === 'room') {
    const currentRoomData = roomLabs[selectedRoom] || labSheetsData[selectedRoom] || { schedule: {}, labDetails: [] };
    const sched = currentRoomData.schedule || {};
    days.forEach(d => {
      const dSched = sched[d] || {};
      ['09:00-11:00', '11:15-01:15', '02:15-04:15'].forEach(slot => {
        const item = dSched[slot];
        if (item && item.raw) {
          totalOccupiedSessions += 1;
          if (item.branch) activeBranchesSet.add(item.branch);
        }
      });
    });
  } else {
    // Master mode
    const branchesToCount = selectedBranch === 'ALL' ? masterBranches : [selectedBranch];
    branchesToCount.forEach(b => {
      const bSched = masterLabSchedule[b] || {};
      days.forEach(d => {
        const dSched = bSched[d] || {};
        ['09:00-11:00', '11:15-01:15', '02:15-04:15'].forEach(slot => {
          const sessions = dSched[slot] || [];
          totalOccupiedSessions += sessions.length;
          if (sessions.length > 0) activeBranchesSet.add(b);
        });
      });
    });
  }

  // Room details legend for room view
  const currentRoomData = roomLabs[selectedRoom] || labSheetsData[selectedRoom] || { schedule: {}, labDetails: [] };
  const labDetailsList = currentRoomData.labDetails || [];

  return (
    <div className="w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8 py-4">
      {/* View Mode Switcher Pills */}
      <div className="no-print flex justify-center mb-5">
        <div className="inline-flex p-1.5 bg-gray-200/80 rounded-xl border border-gray-300 shadow-sm gap-1.5 flex-wrap justify-center">
          <button
            onClick={() => setViewMode('course')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
              viewMode === 'course'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className="w-4 h-4" /> By Lab Subject / Course ({courseLabKeys.length})
          </button>

          <button
            onClick={() => setViewMode('room')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
              viewMode === 'room'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <Building className="w-4 h-4" /> By Lab Room ({roomLabKeys.length})
          </button>

          <button
            onClick={() => setViewMode('master')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
              viewMode === 'master'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <Table className="w-4 h-4" /> Master Laboratory Timetable
          </button>

          <button
            onClick={() => setViewMode('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
              viewMode === 'summary'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Lab Sheets Summary
          </button>
        </div>
      </div>

      {/* Selectors Bar based on active viewMode */}
      <div className="no-print flex justify-center mb-6">
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-3 rounded-xl border border-gray-300 shadow-sm w-full max-w-2xl">
          {viewMode === 'course' && (
            <div className="flex items-center gap-2">
              <label htmlFor="course-select" className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-purple-600" /> Lab Course:
              </label>
              <select
                id="course-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-purple-500 focus:border-purple-500 px-3 py-1.5 cursor-pointer max-w-xs sm:max-w-md"
              >
                {courseLabKeys.map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'room' && (
            <div className="flex items-center gap-2">
              <label htmlFor="room-select" className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-purple-600" /> Laboratory Room:
              </label>
              <select
                id="room-select"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-purple-500 focus:border-purple-500 px-3 py-1.5 cursor-pointer font-mono uppercase"
              >
                {roomLabKeys.map((rName) => (
                  <option key={rName} value={rName}>
                    {rName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'master' && (
            <div className="flex items-center gap-2">
              <label htmlFor="branch-select" className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-purple-600" /> Filter by Branch:
              </label>
              <select
                id="branch-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-purple-500 focus:border-purple-500 px-3 py-1.5 cursor-pointer font-mono uppercase"
              >
                <option value="ALL">All Branches ({masterBranches.length})</option>
                {masterBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'summary' && (
            <div className="flex items-center gap-2 w-full max-w-lg">
              <label htmlFor="summary-search" className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <Search className="w-4 h-4 text-purple-600" /> Filter:
              </label>
              <input
                id="summary-search"
                type="text"
                placeholder="Search by lab name, code, room, branch..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-semibold rounded-lg focus:ring-purple-500 focus:border-purple-500 px-3 py-1.5"
              />
              {summarySearch && (
                <button
                  onClick={() => setSummarySearch('')}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lab Stats Header */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">
              {viewMode === 'summary' ? 'Total Required Sessions' : 'Occupied Lab Sessions'}
            </div>
            <div className="text-lg font-bold text-gray-900">
              {viewMode === 'summary' ? `${labSummaryTotals.required} Sessions Required` : `${totalOccupiedSessions} Sessions (2 hrs each)`}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">
              {viewMode === 'summary' ? 'Allotted Sessions Status' : 'Participating Branches'}
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {viewMode === 'summary' ? `${labSummaryTotals.allotted} Allotted (${labSummaryTotals.pending} Pending)` : `${activeBranchesSet.size} Branches Active`}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Active Schedule Mode</div>
            <div className="text-lg font-bold text-emerald-700 capitalize">
              {viewMode === 'course' ? 'Course Schedule' : viewMode === 'room' ? 'Room Allocation' : viewMode === 'master' ? 'Master Lab Timetable' : 'Lab Sheets Summary'}
            </div>
          </div>
        </div>
      </div>

      {/* 1. VIEW MODE: COURSE LAB SCHEDULE */}
      {viewMode === 'course' && (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-6">
          <div className="text-center py-3.5 px-6 border-b-2 border-slate-700 bg-gray-50/90">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
              {universityInfo.name}
            </h2>
            <h3 className="text-xs font-black text-purple-900 mt-1 uppercase font-mono">
              CONSOLIDATED LABORATORY SCHEDULE: <span className="underline decoration-purple-600">{selectedCourse}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              Academic Year {universityInfo.academicYear} | 2-Hour Practical Lab Sessions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse table-fixed min-w-[800px] border-2 border-slate-700">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11.5px]">
                  <th className="py-3 px-3 border-r border-gray-300 w-24">Day</th>
                  {labTimeSlots.map((slot) => (
                    <th 
                      key={slot.id} 
                      className={`py-3 px-3 border-r border-gray-300 ${
                        slot.isBreak ? 'bg-amber-100/80 text-amber-950 font-black w-24' : 'text-slate-950'
                      }`}
                    >
                      {slot.isBreak && slot.time.includes('-') ? (
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className="block font-black text-xs sm:text-[13px]">{slot.time.split('-')[0]}–</span>
                          <span className="block font-black text-xs sm:text-[13px]">{slot.time.split('-')[1]}</span>
                        </div>
                      ) : (
                        <span className="block font-black text-xs sm:text-[13px]">{slot.time}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-600">
                {days.map((day) => {
                  const courseSched = consolidatedLabs[selectedCourse] || {};
                  const dSched = courseSched[day] || {};

                  return (
                    <tr key={day} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-3 font-extrabold text-gray-900 bg-gray-100/60 border-r border-gray-300 uppercase tracking-wide align-middle">
                        {day}
                      </td>

                      {labTimeSlots.map((slot) => {
                        if (slot.isBreak) {
                          return (
                            <td key={slot.id} className="py-4 px-2 bg-amber-100/70 text-amber-950 font-black text-[10.5px] border-r border-gray-300 tracking-wider uppercase align-middle text-center">
                              {slot.label}
                            </td>
                          );
                        }

                        const sessions = dSched[slot.time] || [];

                        return (
                          <td 
                            key={slot.id}
                            className={`p-2 border-r border-gray-300 align-middle ${
                              sessions.length > 0 ? 'bg-purple-50/70' : 'bg-slate-50/30'
                            }`}
                          >
                            {sessions.length > 0 ? (
                              <div className="flex flex-col gap-1.5 justify-center items-center">
                                {sessions.map((sess, sIdx) => (
                                  <div 
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([{
                                      subject: selectedCourse,
                                      branch: sess.branch,
                                      room: sess.room
                                    }], day, slot.time, sess.branch)}
                                    className="w-full py-1.5 px-2 rounded-lg bg-white border border-purple-300 shadow-xs flex flex-col justify-center items-center cursor-pointer hover:bg-purple-100 transition-all"
                                  >
                                    <div className="font-black text-purple-950 text-xs">
                                      Section: {sess.branch}
                                    </div>
                                    {sess.room && (
                                      <div className="text-[10.5px] font-mono font-bold text-slate-700 mt-0.5">
                                        Room: <span className="text-purple-700">{sess.room}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[44px]">
                                <span className="text-gray-300 font-mono text-[12px]">—</span>
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
      )}

      {/* 2. VIEW MODE: LAB ROOM OCCUPANCY */}
      {viewMode === 'room' && (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-6">
          <div className="text-center py-3.5 px-6 border-b-2 border-slate-700 bg-gray-50/90">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
              {universityInfo.name}
            </h2>
            <h3 className="text-xs font-black text-purple-900 mt-1 uppercase font-mono">
              LABORATORY ROOM ALLOCATION: <span className="underline decoration-purple-600">{selectedRoom}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              Academic Year {universityInfo.academicYear} | Room Sheet: {selectedRoom}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse table-fixed min-w-[750px] border-2 border-slate-700">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11.5px]">
                  <th className="py-3 px-3 border-r border-gray-300 w-24">Day</th>
                  {labTimeSlots.map((slot) => (
                    <th 
                      key={slot.id} 
                      className={`py-3 px-3 border-r border-gray-300 ${
                        slot.isBreak ? 'bg-amber-100/80 text-amber-950 font-black w-24' : 'text-slate-950'
                      }`}
                    >
                      {slot.isBreak && slot.time.includes('-') ? (
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className="block font-black text-xs sm:text-[13px]">{slot.time.split('-')[0]}–</span>
                          <span className="block font-black text-xs sm:text-[13px]">{slot.time.split('-')[1]}</span>
                        </div>
                      ) : (
                        <span className="block font-black text-xs sm:text-[13px]">{slot.time}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-600">
                {days.map((day) => {
                  const currentSchedule = currentRoomData.schedule || {};
                  const dSched = currentSchedule[day] || {};

                  return (
                    <tr key={day} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-3 font-extrabold text-gray-900 bg-gray-100/60 border-r border-gray-300 uppercase tracking-wide align-middle">
                        {day}
                      </td>

                      {labTimeSlots.map((slot) => {
                        if (slot.isBreak) {
                          return (
                            <td key={slot.id} className="py-4 px-2 bg-amber-100/70 text-amber-950 font-black text-[10.5px] border-r border-gray-300 tracking-wider uppercase align-middle text-center">
                              {slot.label}
                            </td>
                          );
                        }

                        const item = dSched[slot.time];

                        return (
                          <td 
                            key={slot.id} 
                            onClick={() => item && onSlotClick && onSlotClick([{
                              subject: item.subject,
                              branch: item.branch,
                              room: selectedRoom
                            }], day, slot.time, selectedRoom)}
                            className={`py-3 px-3 border-r border-gray-300 align-middle ${
                              item && item.raw ? 'bg-purple-50/90 font-semibold cursor-pointer hover:bg-purple-100 transition-colors' : 'bg-slate-50/30'
                            }`}
                            title={item ? "Click to view details" : ""}
                          >
                            {item && item.raw ? (
                              <div className="flex flex-col justify-center items-center gap-1 min-h-[50px]">
                                <div className="font-black text-purple-950 text-xs">
                                  {item.subject}
                                </div>
                                <div className="inline-flex items-center gap-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                    Section: {item.branch}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[50px]">
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

          {/* LAB DETAILS Legend matching the Excel sheet */}
          {labDetailsList.length > 0 && (
            <div className="p-4 bg-gray-50/80 border-t-2 border-slate-700">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-purple-600" /> Lab Details ({selectedRoom})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-gray-300 bg-white rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 text-[10.5px]">
                      <th className="py-1.5 px-3 w-12 border-r border-gray-200 text-center">S.No</th>
                      <th className="py-1.5 px-3 w-32 border-r border-gray-200">Lab Short Name</th>
                      <th className="py-1.5 px-3">Full Lab Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[11px]">
                    {labDetailsList.map((detail, dIdx) => (
                      <tr key={dIdx} className="hover:bg-gray-50">
                        <td className="py-1.5 px-3 font-mono text-center text-gray-500 border-r border-gray-200">
                          {detail.sno || dIdx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-purple-900 border-r border-gray-200">
                          {detail.shortName}
                        </td>
                        <td className="py-1.5 px-3 text-gray-800 font-medium">
                          {detail.fullName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. VIEW MODE: MASTER LABORATORY TIMETABLE (Timetable_Labs_Rearrange) */}
      {viewMode === 'master' && (
        <div className="space-y-6 my-6">
          {(selectedBranch === 'ALL' ? masterBranches : [selectedBranch]).map((branchKey) => {
            const bSched = masterLabSchedule[branchKey] || {};

            return (
              <div key={branchKey} className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card">
                <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded font-black text-xs bg-purple-500 text-white tracking-wider">
                      {branchKey}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
                      Master Laboratory Allocation Timetable
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-300 font-mono">
                    Timetable_Labs_Rearrange Schedule
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse table-fixed min-w-[750px] border-2 border-slate-700">
                    <thead>
                      <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 border-r border-gray-300 w-24">Day</th>
                        {labTimeSlots.map((slot) => (
                          <th 
                            key={slot.id} 
                            className={`py-2.5 px-3 border-r border-gray-300 ${
                              slot.isBreak ? 'bg-amber-100/80 text-amber-950 font-black w-24' : 'text-slate-950'
                            }`}
                          >
                            {slot.isBreak && slot.time.includes('-') ? (
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="block font-black text-xs">{slot.time.split('-')[0]}–</span>
                                <span className="block font-black text-xs">{slot.time.split('-')[1]}</span>
                              </div>
                            ) : (
                              <span className="block font-black text-xs">{slot.time}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-600">
                      {days.map((day) => {
                        const dSched = bSched[day] || {};

                        return (
                          <tr key={day} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-3 font-extrabold text-gray-900 bg-gray-100/60 border-r border-gray-300 uppercase tracking-wide align-middle">
                              {day}
                            </td>

                            {labTimeSlots.map((slot) => {
                              if (slot.isBreak) {
                                return (
                                  <td key={slot.id} className="py-3 px-2 bg-amber-100/70 text-amber-950 font-black text-[10px] border-r border-gray-300 tracking-wider uppercase align-middle text-center">
                                    {slot.label}
                                  </td>
                                );
                              }

                              const sessions = dSched[slot.time] || [];

                              return (
                                <td 
                                  key={slot.id}
                                  className={`p-2 border-r border-gray-300 align-middle ${
                                    sessions.length > 0 ? 'bg-purple-50/80 font-semibold cursor-pointer hover:bg-purple-100 transition-colors' : 'bg-slate-50/30'
                                  }`}
                                  onClick={() => sessions.length > 0 && onSlotClick && onSlotClick(sessions.map(s => ({
                                    subject: s.subject,
                                    branch: branchKey,
                                    room: s.room,
                                    faculty: s.faculty
                                  })), day, slot.time, branchKey)}
                                >
                                  {sessions.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 justify-center items-center min-h-[46px]">
                                      {sessions.map((sess, sIdx) => (
                                        <div key={sIdx} className="w-full flex flex-col justify-center items-center">
                                          <div className="font-black text-purple-950 text-xs">
                                            {sess.subject}
                                          </div>
                                          {sess.faculty && (
                                            <div className="text-[10px] font-semibold text-slate-700 mt-0.5 leading-tight">
                                              {sess.faculty}
                                            </div>
                                          )}
                                          {sess.room && (
                                            <div className="mt-0.5 text-[10.5px] font-bold text-purple-700 font-mono">
                                              {sess.room}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center min-h-[46px]">
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
            );
          })}
        </div>
      )}

      {/* 4. VIEW MODE: LAB SHEETS SUMMARY */}
      {viewMode === 'summary' && (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-6">
          <div className="text-center py-3.5 px-6 border-b-2 border-slate-700 bg-gray-50/90">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
              {universityInfo.name}
            </h2>
            <h3 className="text-xs font-black text-purple-900 mt-1 uppercase font-mono">
              LABORATORY SHEETS SUMMARY & ALLOTMENT REGISTER
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              Academic Year {universityInfo.academicYear} | Total Lab Sessions Required: {labSummaryTotals.required} | Allotted: {labSummaryTotals.allotted} | Pending: {labSummaryTotals.pending}
            </p>
          </div>

          <div className="w-full">
            <table className="w-full text-xs text-left border-collapse table-fixed border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-extrabold border-b-2 border-slate-700 uppercase tracking-normal text-[11px]">
                  <th className="py-2.5 px-1.5 text-center w-[3%] min-w-[36px] border-r border-slate-300">S.No</th>
                  <th className="py-2.5 px-2.5 text-left w-[18%] min-w-[130px] border-r border-slate-300">Lab Name</th>
                  <th className="py-2.5 px-2 text-left w-[8%] min-w-[65px] border-r border-slate-300">Code</th>
                  <th className="py-2.5 px-2 text-left w-[12%] min-w-[85px] border-r border-slate-300">Room(s)</th>
                  <th className="py-2.5 px-2.5 text-left w-[37%] min-w-[280px] border-r border-slate-300">Branches & Time Slots</th>
                  <th className="py-2.5 px-1 text-center w-[4.5%] min-w-[42px] border-r border-slate-300">Req.</th>
                  <th className="py-2.5 px-1 text-center w-[4.5%] min-w-[42px] border-r border-slate-300">Allot.</th>
                  <th className="py-2.5 px-1 text-center w-[4.5%] min-w-[42px] border-r border-slate-300">Pend.</th>
                  <th className="py-2.5 px-1 text-center w-[3.5%] min-w-[36px] border-r border-slate-300">Extra</th>
                  <th className="py-2.5 px-1 text-center w-[3.5%] min-w-[36px] border-r border-slate-300">Hrs</th>
                  <th className="py-2.5 px-2 text-center w-[7.5%] min-w-[65px]">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLabSummary.map((row) => (
                  <tr key={row.sno} className="hover:bg-purple-50/40 transition-colors">
                    <td className="py-2.5 px-1.5 text-center font-bold text-gray-500 border-r border-gray-200 align-top">
                      {row.sno}
                    </td>
                    <td className="py-2.5 px-2.5 font-bold text-gray-900 border-r border-gray-200 align-top break-words whitespace-normal leading-snug">
                      {row.labName}
                    </td>
                    <td className="py-2.5 px-2 font-mono font-bold text-purple-800 border-r border-gray-200 align-top break-words whitespace-normal">
                      {row.subShort}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-gray-700 border-r border-gray-200 align-top break-words whitespace-normal leading-tight">
                      {row.roomNo}
                    </td>
                    <td className="py-2.5 px-2.5 text-[11px] text-gray-800 border-r border-gray-200 align-top">
                      <div className="flex flex-col gap-1">
                        {row.branchStatusList && row.branchStatusList.length > 0 ? (
                          row.branchStatusList.map((bs, bIdx) => (
                            <div key={bIdx} className="leading-snug flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{bs.branch}:</span>
                              <span className={bs.slots === 'Not Allotted' ? 'text-amber-700 font-semibold' : 'text-purple-900 font-mono text-[10.5px]'}>
                                {bs.slots}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="whitespace-pre-line leading-snug">{row.branches}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-1 text-center font-black text-gray-900 border-r border-gray-200 align-top">
                      {row.required}
                    </td>
                    <td className="py-2.5 px-1 text-center font-black text-emerald-700 border-r border-gray-200 align-top">
                      {row.allotted}
                    </td>
                    <td className={`py-2.5 px-1 text-center font-black border-r border-gray-200 align-top ${row.pending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {row.pending}
                    </td>
                    <td className="py-2.5 px-1 text-center text-gray-500 border-r border-gray-200 align-top">
                      {row.extra}
                    </td>
                    <td className="py-2.5 px-1 text-center text-gray-600 border-r border-gray-200 align-top">
                      {row.labHours}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[10.5px] font-semibold align-top break-words whitespace-normal">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${row.pending === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {row.pending === 0 ? 'All allotted' : `Pending: ${row.pending}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-700 font-black text-slate-900 text-[11.5px]">
                  <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider border-r border-slate-300">
                    Grand Total
                  </td>
                  <td className="py-3 px-1 text-center border-r border-slate-300 font-black text-slate-900">
                    {labSummaryTotals.required}
                  </td>
                  <td className="py-3 px-1 text-center border-r border-slate-300 font-black text-emerald-700">
                    {labSummaryTotals.allotted}
                  </td>
                  <td className="py-3 px-1 text-center border-r border-slate-300 font-black text-emerald-700">
                    {labSummaryTotals.pending}
                  </td>
                  <td className="py-3 px-1 text-center border-r border-slate-300 text-slate-600">
                    {labSummaryTotals.extra}
                  </td>
                  <td className="py-3 px-1 text-center border-r border-slate-300 text-slate-400">
                    —
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider">
                      {labSummaryTotals.pending === 0 ? '100% Done' : `Pending: ${labSummaryTotals.pending}`}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
