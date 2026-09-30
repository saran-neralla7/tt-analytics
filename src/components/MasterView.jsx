import React, { useState, useMemo } from 'react';
import TimetableGrid, { renderBranchName } from './TimetableGrid';
import { branches, days, periodSlots, getActiveDays } from '../data/mockData';
import { getSubjectStyle } from '../utils/subjectColors';
import { Layers, GraduationCap, Clock, Award, Calendar, Printer } from 'lucide-react';

export default function MasterView({ timetableData, branchLegends = {}, universityInfo, facultyList = [], onSlotClick }) {
  const availableBranchKeys = Object.keys(timetableData);
  const [selectedDay, setSelectedDay] = useState('ALL');

  // Detect active days dynamically: only include Saturday if Saturday has actual classes in the Excel sheet
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

  // Fallback if selectedDay is not available
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

  // Helper to check 2-hour merge in the single big day table
  const has2HourMerge = (daySched, idx) => {
    const currentSlot = periodSlots[idx]?.time;
    const nextSlot = periodSlots[idx + 1]?.time;
    if (!nextSlot || periodSlots[idx + 1]?.type === 'break') return false;

    const currentItems = daySched[currentSlot] || [];
    const nextItems = daySched[nextSlot] || [];

    if (currentItems.length === 0 || nextItems.length === 0) return false;

    if (currentItems.length === nextItems.length && 
        currentItems.every((item, i) => nextItems[i] && nextItems[i].subject === item.subject)) {
      return true;
    }
    return false;
  };

  const selectedDayLabel = dayOptions.find(d => d.id === currentDay)?.label || currentDay;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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
        {currentDay !== 'ALL' && (
          <div className="text-xs font-bold text-blue-900 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 flex items-center gap-2">
            <span>Unified Master Schedule for <strong>{selectedDayLabel}</strong> ({availableBranchKeys.length} Departments)</span>
            <button 
              onClick={() => setSelectedDay('ALL')}
              className="text-blue-600 hover:text-blue-800 underline font-black ml-1 cursor-pointer"
            >
              Reset to All Days
            </button>
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
          - If selectedDay !== 'ALL': SINGLE BIG TABLE FOR ALL BRANCHES
          - If selectedDay === 'ALL': SEPARATE TABLES FOR EACH BRANCH
      */}
      {currentDay !== 'ALL' ? (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-4 master-single-day-card">
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
                Unified view across all branches for {selectedDayLabel}
              </span>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-700" />
                Print {selectedDayLabel} Table
              </button>
            </div>
          </div>

          {/* Header for Print View */}
          <div className="print-only text-center py-3 px-6 border-b border-gray-300 bg-gray-50/70">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
              {universityInfo.name}
            </h2>
            <p className="text-xs text-gray-700 font-semibold mt-0.5 font-mono">
              {universityInfo.statusText}
            </p>
            <h3 className="text-xs font-bold text-gray-800 mt-1 font-mono">
              MASTER TIME TABLE • {selectedDayLabel.toUpperCase()} ({currentDay}) • ALL {availableBranchKeys.length} DEPARTMENTS • ACADEMIC YEAR {universityInfo.academicYear}
            </h3>
          </div>

          {/* SINGLE BIG TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1100px] border-2 border-slate-700">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-1 border-r border-gray-300 w-12 text-xs font-black text-slate-900">
                    S.No
                  </th>
                  <th className="py-3 px-1 border-r-2 border-slate-500 w-24 sm:w-28 text-xs sm:text-sm font-black text-slate-900">
                    Branch
                  </th>
                  {periodSlots.map((slot) => (
                    <th 
                      key={slot.id} 
                      className={`py-3 px-2 border-r border-gray-300 ${
                        slot.type === 'break' ? 'bg-amber-100/80 text-amber-950 font-black w-20' : 'text-slate-950'
                      }`}
                    >
                      <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block">
                        {slot.time}
                      </span>
                      {slot.label && (
                        <div className="text-[10px] sm:text-[10.5px] tracking-normal text-amber-900 font-black mt-0.5">
                          {slot.label}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-600">
                {availableBranchKeys.map((branchKey, bIdx) => {
                  const branchSched = timetableData[branchKey] || {};
                  const daySchedule = branchSched[currentDay] || {};
                  const skipSlots = new Set();

                  return (
                    <tr key={branchKey} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                      {/* S.No */}
                      <td className="py-2.5 px-1 font-bold text-gray-700 bg-gray-50/90 border-r border-gray-300 border-b-2 border-slate-600 font-mono text-center text-xs align-middle">
                        {bIdx + 1}
                      </td>

                      {/* Branch Name */}
                      <td className="py-2 px-1 font-black text-slate-900 bg-slate-100/90 border-r-2 border-slate-500 border-b-2 border-slate-600 font-sans text-xs uppercase align-middle text-center shadow-xs">
                        {renderBranchName(branchKey)}
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
                              className="py-3 px-2 bg-amber-100/70 text-amber-950 font-black text-[11px] border-r border-gray-300 border-b-2 border-slate-600 tracking-wider uppercase align-middle select-none text-center"
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
                              className="p-2 border-r border-gray-300 border-b-2 border-slate-600 align-middle text-center bg-white"
                            >
                              <span className="text-gray-300 font-mono text-sm">—</span>
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
                              className={`p-2 border-r border-gray-300 border-b-2 border-slate-600 align-middle transition-all cursor-pointer ${style.bg} hover:brightness-95`}
                              style={style.inlineBg ? { backgroundColor: style.inlineBg } : undefined}
                              title="Click to view course details"
                            >
                              <div className="flex flex-col justify-center items-center text-center">
                                <div className={`font-black tracking-tight text-[11.5px] sm:text-[12px] leading-snug ${style.text}`}>
                                  {cellItem.subject}
                                </div>
                                {cellItem.faculty && (
                                  <div className="text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight truncate max-w-[130px]">
                                    {cellItem.faculty}
                                  </div>
                                )}
                                {cellItem.room && (
                                  <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans">
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
                            className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-top transition-all cursor-pointer"
                            title="Click to view course details"
                          >
                            <div className="flex flex-col h-full w-full divide-y divide-gray-300/90">
                              {items.map((cellItem, bIdx) => {
                                const itemStyle = getSubjectStyle(cellItem.subject, cellItem.isLab);
                                return (
                                  <div 
                                    key={bIdx}
                                    className={`flex-1 w-full py-1.5 px-1.5 flex flex-col justify-center items-center text-center transition-all ${itemStyle.bg} hover:brightness-95`}
                                    style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                                  >
                                    <div className={`font-black tracking-tight text-[11px] leading-snug ${itemStyle.text}`}>
                                      {cellItem.subject}
                                    </div>
                                    {cellItem.faculty && (
                                      <div className="text-slate-800 font-semibold text-[9.5px] mt-0.5 leading-tight truncate max-w-[130px]">
                                        {cellItem.faculty}
                                      </div>
                                    )}
                                    {cellItem.room && (
                                      <div className="mt-0.5 text-[10px] font-black text-slate-800 tracking-normal font-sans">
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
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
