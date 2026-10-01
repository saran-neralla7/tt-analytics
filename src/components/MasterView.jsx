import React, { useState, useMemo } from 'react';
import TimetableGrid, { renderBranchName } from './TimetableGrid';
import { branches, days, periodSlots, getActiveDays } from '../data/mockData';
import { getSubjectStyle } from '../utils/subjectColors';
import { Layers, GraduationCap, Clock, Award, Calendar, Printer } from 'lucide-react';

// Official classroom assignments per branch from institute records
export const branchClassrooms = {
  'CSE(AI&ML)-1': 'G-302',
  'CSE(AI&ML)-2': 'G-303',
  'CSE-1': 'G-304',
  'CSE-2': 'G-305',
  'ECE-1': 'G-402',
  'ECE-2': 'G-403',
  'MECH': 'G-404',
  'CSE (CS & DS)': 'G-405',
  'MECH-ROBOTICS': 'E-408',
  'EEE': 'E-409',
  'CIVIL': 'E-410',
  'CHEMICAL': 'E-411',
  'ECE-3': 'E-412'
};

// Preferred branch order matching the official university timetable document
export const preferredBranchOrder = [
  'CSE(AI&ML)-1',
  'CSE(AI&ML)-2',
  'CSE-1',
  'CSE-2',
  'ECE-1',
  'ECE-2',
  'MECH',
  'CSE (CS & DS)',
  'MECH-ROBOTICS',
  'EEE',
  'CIVIL',
  'CHEMICAL',
  'ECE-3'
];

export default function MasterView({ timetableData, branchLegends = {}, universityInfo, facultyList = [], onSlotClick }) {
  const rawBranchKeys = Object.keys(timetableData);
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [useShortNames, setUseShortNames] = useState(false);

  // Sort branches matching official order
  const availableBranchKeys = useMemo(() => {
    return [...rawBranchKeys].sort((a, b) => {
      const idxA = preferredBranchOrder.indexOf(a);
      const idxB = preferredBranchOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [rawBranchKeys]);

  // Dynamic active days: exclude Saturday unless Saturday has classes in timetableData
  const activeDaysList = useMemo(() => getActiveDays(timetableData), [timetableData]);

  const dayOptions = useMemo(() => {
    const opts = [{ id: 'ALL', label: 'All Days' }];
    const nameMap = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday'
    };
    activeDaysList.forEach((d) => {
      opts.push({ id: d, label: nameMap[d] || d });
    });
    return opts;
  }, [activeDaysList]);

  const currentDay = selectedDay !== 'ALL' && !activeDaysList.includes(selectedDay) ? 'ALL' : selectedDay;

  // Calculate master stats dynamically based on selectedDay
  const { totalClasses, totalLabs, uniqueFaculty } = useMemo(() => {
    let classes = 0;
    let labs = 0;
    const facSet = new Set();
    const nonFacultyKeywords = ['COMP.', 'LAB-1', 'LAB-2', 'LAB-3', 'LAB-4', 'COUNSELLING', 'LIBRARY', 'SPORTS', 'YOGA'];
    const activeDays = currentDay === 'ALL' ? activeDaysList : [currentDay];

    availableBranchKeys.forEach((branchKey) => {
      const branchSched = timetableData[branchKey] || {};
      activeDays.forEach((day) => {
        Object.keys(branchSched[day] || {}).forEach((slotTime) => {
          const rawCell = branchSched[day][slotTime];
          const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
          items.forEach(cell => {
            if (cell && cell.subject) {
              classes++;
              if (cell.isLab) labs++;
              if (cell.faculty) {
                cell.faculty.split(',').forEach(f => {
                  const trimmed = f.trim();
                  if (trimmed && !nonFacultyKeywords.includes(trimmed.toUpperCase())) {
                    facSet.add(trimmed);
                  }
                });
              }
            }
          });
        });
      });
    });

    return { totalClasses: classes, totalLabs: labs, uniqueFaculty: facSet };
  }, [availableBranchKeys, currentDay, activeDaysList, timetableData]);

  // Robust horizontal merge helper (prevents gaps when second slot is blank in Excel)
  const has2HourMerge = (daySched, idx) => {
    const currentSlot = periodSlots[idx]?.time;
    const nextSlot = periodSlots[idx + 1]?.time;
    if (!nextSlot || periodSlots[idx + 1]?.type === 'break') return false;

    const currentItems = daySched[currentSlot] || [];
    const nextItems = daySched[nextSlot] || [];

    if (currentItems.length === 0 || currentItems.every(it => !it.subject || it.subject === '-' || it.subject === '')) {
      return false;
    }

    // 1. Next slot has identical subjects
    if (nextItems.length > 0 && 
        currentItems.length === nextItems.length && 
        currentItems.every((item, i) => nextItems[i] && nextItems[i].subject === item.subject)) {
      return true;
    }

    // 2. Both slots have matching lab sessions (even if continued)
    const hasContinuedLab = currentItems.some(item => 
      (item.isLab || item.subject?.includes('LAB') || item.subject?.includes('3DDA')) && 
      nextItems.some(nItem => (nItem.isContinued || nItem.subject === item.subject) && nItem.subject === item.subject)
    );
    if (hasContinuedLab) return true;

    // 3. Trailing slot in Excel is empty: 2-hour lab or sports/counselling/library session automatically spans colSpan=2
    const isNextEmpty = nextItems.length === 0 || nextItems.every(it => !it.subject || it.subject === '-' || it.subject === '');
    if (isNextEmpty) {
      const is2HourBlock = currentItems.some(item => {
        const s = (item.subject || '').toUpperCase();
        return item.isLab || s.includes('LAB') || s.includes('3DDA') || s.includes('SPORTS') || s.includes('YOGA') || s.includes('LIBRARY') || s.includes('COUNSELLING');
      });
      if (is2HourBlock) {
        return true;
      }
    }

    return false;
  };

  const selectedDayLabel = dayOptions.find(d => d.id === currentDay)?.label || currentDay;

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 ${currentDay !== 'ALL' ? 'daywise-print-mode' : ''}`}>
      {/* Day-Wise Filter Pills */}
      <div className="no-print flex flex-col items-center justify-center mb-6 gap-2">
        <div className="inline-flex p-1.5 bg-slate-200/90 rounded-xl gap-1.5 shadow-inner border border-slate-300 flex-wrap justify-center">
          {dayOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedDay(opt.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black rounded-lg transition-all ${
                currentDay === opt.id
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
        {currentDay !== 'ALL' ? (
          <div className="text-xs font-bold text-blue-900 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 flex items-center gap-2">
            <span>Unified Master Schedule for <strong>{selectedDayLabel}</strong> ({availableBranchKeys.length} Departments)</span>
            <button 
              onClick={() => setSelectedDay('ALL')}
              className="text-blue-600 hover:text-blue-800 underline font-black ml-1 cursor-pointer"
            >
              Reset to All Days
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="Print all departments, each strictly formatted to 1 single landscape page"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              Print All Departments (1 Page Each)
            </button>

            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs hover:bg-slate-50 transition-colors select-none">
              <input 
                type="checkbox" 
                checked={useShortNames} 
                onChange={(e) => setUseShortNames(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Use Faculty Short Names (Initials)</span>
            </label>
          </div>
        )}
      </div>

      {/* Analytics Summary Header */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Active Branches</div>
            <div className="text-lg font-bold text-gray-900">{availableBranchKeys.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">
              {currentDay === 'ALL' ? 'Total Period Slots' : `${selectedDayLabel} Slots`}
            </div>
            <div className="text-lg font-bold text-gray-900">{totalClasses}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Faculty (With Workload)</div>
            <div className="text-lg font-bold text-gray-900">
              {facultyList && facultyList.length > 0 
                ? facultyList.filter(f => (f.totalLoad || 0) > 0 || (f.assignedCourses && f.assignedCourses.length > 0)).length || facultyList.length 
                : (uniqueFaculty.size || 77)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">
              {currentDay === 'ALL' ? 'Practical / Labs' : `${selectedDayLabel} Labs`}
            </div>
            <div className="text-lg font-bold text-gray-900">{totalLabs} Sessions</div>
          </div>
        </div>
      </div>

      {/* CONDITIONAL RENDERING BASED ON DAY SELECTION:
          - If selectedDay !== 'ALL': SINGLE BIG TABLE FOR ALL BRANCHES (PORTRAIT 1-PAGE PRINT FORMAT)
          - If selectedDay === 'ALL': SEPARATE TABLES FOR EACH BRANCH
      */}
      {currentDay !== 'ALL' ? (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-4 master-single-day-card daywise-single-page-print">
          {/* Header for Screen */}
          <div className="no-print bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded font-black text-xs bg-blue-600 text-white tracking-wider">
                MASTER SCHEDULE
              </span>
              <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
                {selectedDayLabel} • All {availableBranchKeys.length} Departments
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 font-mono hidden sm:inline">
                Unified single-page portrait schedule
              </span>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-700" />
                Print {selectedDayLabel} Schedule (1 Page Landscape)
              </button>
            </div>
          </div>

          {/* OFFICIAL HEADER FOR PRINT VIEW - EXACT MATCH TO SECOND SCREENSHOT */}
          <div className="print-only w-full py-2 px-3 border-b border-black bg-white">
            <div className="flex items-center justify-between gap-2">
              {/* Official Crest Logo */}
              <div className="w-16 flex-shrink-0 flex items-center justify-center">
                <img 
                  src={universityInfo.logo || '/gvpihlr.png'} 
                  alt="GVPIHLR Logo" 
                  className="h-14 w-14 object-contain"
                />
              </div>

              {/* Institution Title & Details */}
              <div className="text-center flex-1 px-2">
                <h1 className="text-[11pt] font-extrabold uppercase font-serif tracking-tight text-black leading-tight">
                  {universityInfo.name}
                </h1>
                <p className="text-[6.8pt] text-black font-semibold leading-tight mt-0.5">
                  {universityInfo.statusText}
                </p>
                <p className="text-[6.5pt] text-black leading-tight">
                  {universityInfo.address}
                </p>
                <h2 className="text-[7.8pt] font-bold text-black uppercase mt-1 tracking-wide font-sans leading-tight">
                  TENTATIVE TIME TABLE FOR THE ACADEMIC YEAR {universityInfo.academicYear}
                </h2>
                <h3 className="text-[7.5pt] font-black text-black font-sans leading-tight">
                  {universityInfo.semester || 'B.Tech. 1st Sem'}
                </h3>
              </div>

              {/* Date & Day Block (Top Right) */}
              <div className="w-24 flex-shrink-0 text-right flex flex-col justify-center">
                <div className="text-[8.5pt] font-bold text-black font-mono leading-tight">
                  {new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}
                </div>
                <div className="text-[9.5pt] font-black text-black uppercase tracking-wider font-sans leading-tight mt-0.5">
                  {selectedDayLabel.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* SINGLE BIG TABLE - INCLUDES ROOM NO COLUMN MATCHING OFFICIAL DOCUMENT */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1050px] print:min-w-0 border-2 border-slate-700 master-day-table">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-slate-700 uppercase tracking-wider">
                  <th className="py-2 px-1 border-r border-gray-300 w-24 sm:w-28 text-xs font-black text-slate-900 col-branch">
                    Branch
                  </th>
                  <th className="py-2 px-1 border-r-2 border-slate-500 w-16 sm:w-20 text-xs font-black text-slate-900 col-room">
                    Room No
                  </th>
                  {periodSlots.map((slot) => (
                    <th 
                      key={slot.id} 
                      className={`py-2 px-1 border-r border-gray-300 ${
                        slot.type === 'break' ? 'bg-amber-100/80 text-amber-950 font-black w-14 sm:w-16' : 'text-slate-950'
                      }`}
                    >
                      <span className="font-black text-slate-950 text-xs sm:text-[12px] tracking-tight block">
                        {slot.time}
                      </span>
                      {slot.label && (
                        <div className="text-[9.5pt] sm:text-[10pt] tracking-normal text-amber-900 font-black mt-0.5">
                          {slot.label}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-600">
                {availableBranchKeys.map((branchKey) => {
                  const branchSched = timetableData[branchKey] || {};
                  const daySchedule = branchSched[currentDay] || {};
                  const skipSlots = new Set();
                  const assignedClassroom = branchClassrooms[branchKey] || '';

                  return (
                    <tr key={branchKey} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                      {/* Branch Name Column */}
                      <td className="py-2 px-1 font-black text-slate-900 bg-slate-100/90 border-r border-gray-300 border-b-2 border-slate-600 font-sans text-xs uppercase align-middle text-center col-branch">
                        {renderBranchName(branchKey)}
                      </td>

                      {/* Designated Room No Column */}
                      <td className="py-2 px-1 font-black text-blue-900 bg-blue-50/60 border-r-2 border-slate-500 border-b-2 border-slate-600 font-mono text-xs sm:text-[12.5px] uppercase align-middle text-center col-room">
                        {assignedClassroom || '—'}
                      </td>

                      {/* Period Slots */}
                      {periodSlots.map((slot, sIdx) => {
                        if (skipSlots.has(slot.time)) {
                          return null;
                        }

                        if (slot.type === 'break') {
                          return (
                            <td 
                              key={slot.id} 
                              className="py-2 px-0.5 bg-amber-100/70 text-amber-950 font-black text-[10pt] border-r border-gray-300 border-b-2 border-slate-600 tracking-wider uppercase align-middle select-none text-center cell-break"
                            >
                              {slot.label}
                            </td>
                          );
                        }

                        const rawCell = daySchedule[slot.time];
                        const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];

                        let colSpan = 1;
                        if (has2HourMerge(daySchedule, sIdx)) {
                          colSpan = 2;
                          skipSlots.add(periodSlots[sIdx + 1]?.time);
                        }

                        // Empty slot
                        if (items.length === 0 || items.every(it => !it.subject || it.subject === '-' || it.subject === '')) {
                          return (
                            <td 
                              key={slot.id} 
                              colSpan={colSpan}
                              className="p-1 border-r border-gray-300 border-b-2 border-slate-600 align-middle text-center bg-slate-50/50"
                              style={{ height: '1px' }}
                            >
                              <span className="text-slate-400 font-mono text-sm font-bold">—</span>
                            </td>
                          );
                        }

                        // Single Course/Lab Slot
                        if (items.length === 1) {
                          const cellItem = items[0];
                          const style = getSubjectStyle(cellItem.subject, cellItem.isLab);

                          return (
                            <td
                              key={slot.id}
                              colSpan={colSpan}
                              onClick={() => onSlotClick && onSlotClick(items, currentDay, colSpan === 2 ? `${slot.time} - ${periodSlots[sIdx + 1]?.time}` : slot.time, branchKey)}
                              className={`p-1.5 border-r border-gray-300 border-b-2 border-slate-600 align-middle transition-all cursor-pointer ${style.bg} hover:brightness-95 cell-course`}
                              style={{
                                height: '1px',
                                ...(style.inlineBg ? { backgroundColor: style.inlineBg } : {})
                              }}
                              title="Click to view course details"
                            >
                              <div className="flex flex-col justify-center items-center text-center h-full min-h-[52px]">
                                <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug cell-subject ${style.text}`}>
                                  {cellItem.subject}
                                </div>
                                {cellItem.faculty && (
                                  <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight truncate max-w-[140px] cell-faculty">
                                    {cellItem.faculty}
                                  </div>
                                )}
                                {cellItem.room && (
                                  <div className="mt-0.5 text-[10px] sm:text-[10.5px] font-black text-slate-800 tracking-normal font-sans cell-room">
                                    {cellItem.room}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // Multi-Session / Parallel Batches (e.g. Lab Batches)
                        return (
                          <td
                            key={slot.id}
                            colSpan={colSpan}
                            onClick={() => onSlotClick && onSlotClick(items, currentDay, colSpan === 2 ? `${slot.time} - ${periodSlots[sIdx + 1]?.time}` : slot.time, branchKey)}
                            className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-top transition-all cursor-pointer cell-course"
                            style={{ height: '1px' }}
                            title="Click to view course details"
                          >
                            <div className="flex flex-col h-full w-full min-h-[64px] divide-y divide-gray-300/90">
                              {items.map((cellItem, bIdx) => {
                                const itemStyle = getSubjectStyle(cellItem.subject, cellItem.isLab);
                                return (
                                  <div 
                                    key={bIdx}
                                    className={`flex-1 min-h-[36px] w-full py-1 px-1 flex flex-col justify-center items-center text-center transition-all ${itemStyle.bg} hover:brightness-95`}
                                    style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                                  >
                                    <div className={`font-black tracking-tight text-[10.5px] leading-snug cell-subject ${itemStyle.text}`}>
                                      {cellItem.subject}
                                    </div>
                                    {cellItem.faculty && (
                                      <div className="text-slate-800 font-semibold text-[9pt] mt-0.5 leading-tight truncate max-w-[140px] cell-faculty">
                                        {cellItem.faculty}
                                      </div>
                                    )}
                                    {cellItem.room && (
                                      <div className="mt-0.5 text-[9.5pt] font-black text-slate-800 tracking-normal font-sans cell-room">
                                        {cellItem.room}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
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
      ) : (
        /* If ALL days are selected: RENDER SEPARATE TABLES FOR EACH BRANCH AS REQUESTED */
        <div className="space-y-8 master-print-container">
          {availableBranchKeys.map((branchKey) => {
            const branchObj = branches.find(b => b.name === branchKey) || { name: branchKey, fullName: branchKey };
            return (
              <div key={branchKey} className="branch-print-page">
                <TimetableGrid 
                  timetableData={timetableData} 
                  branchLegend={branchLegends[branchKey]}
                  isCollapsibleLegend={true}
                  defaultLegendOpen={false}
                  selectedBranch={branchKey} 
                  branchInfo={branchObj}
                  universityInfo={universityInfo}
                  onSlotClick={onSlotClick}
                  selectedDay="ALL"
                  useShortNames={useShortNames}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
