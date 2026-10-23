import React, { useState, useMemo, useEffect } from 'react';
import { days, periodSlots, getActiveDays } from '../data/mockData';
import { UserCheck, Filter, Users, Table, Printer, Calendar, LayoutGrid, Maximize2, X, ChevronLeft, ChevronRight, Search, Hash, BookOpen } from 'lucide-react';
import initialData from '../data/initialData.json';
import { getSubjectStyle } from '../utils/subjectColors';
import DepartmentTimetableGrid from './DepartmentTimetableGrid';
import PrintFormatToggle from './PrintFormatToggle';
import { triggerPrint, getPrintFormat, applyPrintFormat } from '../utils/printUtils';

/**
 * Helper to check if current slot and next slot should be merged horizontally (colSpan=2) for faculty
 */
function has2HourFacultyMerge(daySched, idx) {
  const currentSlot = periodSlots[idx]?.time;
  const nextSlot = periodSlots[idx + 1]?.time;
  if (!nextSlot || periodSlots[idx + 1]?.type === 'break') return false;

  const currentItems = daySched[currentSlot] || [];
  const nextItems = daySched[nextSlot] || [];

  if (currentItems.length === 0 || nextItems.length === 0) return false;

  // 1. Standard full merge (all items match across both hours)
  if (
    currentItems.length === nextItems.length &&
    currentItems.every((item, i) => nextItems[i] && nextItems[i].subject === item.subject && nextItems[i].branch === item.branch)
  ) {
    return true;
  }

  // 2. Partial continuing lab merge
  const hasContinuingLab = currentItems.some(item =>
    (item.isLab || item.subject?.includes('LAB') || item.subject?.includes('3DDA')) &&
    nextItems.some(nItem =>
      (nItem.isLab || nItem.isContinued || nItem.subject?.includes('LAB') || nItem.subject?.includes('3DDA')) &&
      nItem.subject === item.subject &&
      nItem.branch === item.branch
    )
  );

  return hasContinuingLab;
}

/**
 * Format branch name into concise abbreviations for compact table display
 */
function formatBranchName(branch) {
  if (!branch) return '';
  return branch
    .replace(/CSE\s*\(\s*CS\s*&\s*DS\s*\)/i, 'CS&DS')
    .replace(/CSE\s*\(\s*AI\s*&\s*ML\s*\)-1/i, 'AIML-1')
    .replace(/CSE\s*\(\s*AI\s*&\s*ML\s*\)-2/i, 'AIML-2')
    .replace(/MECH-ROBOTICS/i, 'M-ROB')
    .replace(/CHEMICAL/i, 'CHEM')
    .trim();
}

/**
 * Extracts branch-wise workload breakdown for theory, tutorial, and lab
 */
function extractWorkloadBreakdowns(assignmentsStr) {
  const theoryByBranch = {};
  const tutByBranch = {};
  const labByBranch = {};

  if (!assignmentsStr) return { theoryByBranch, tutByBranch, labByBranch };

  const lines = assignmentsStr.split('\n').map(l => l.trim()).filter(Boolean);
  lines.forEach(line => {
    const arrowParts = line.split('→').map(p => p.trim());
    if (arrowParts.length < 2) return;
    const branch = formatBranchName(arrowParts[0]);
    const rest = arrowParts[1];
    const dashParts = rest.split('–').map(p => p.trim());
    const loadDetail = dashParts[1] || '';

    const thMatch = loadDetail.match(/(\d+)\s*theory/i);
    const tutMatch = loadDetail.match(/(\d+)\s*tut/i);
    const labMatch = loadDetail.match(/(\d+)\s*lab/i);

    if (thMatch) {
      const hrs = parseInt(thMatch[1], 10);
      theoryByBranch[branch] = (theoryByBranch[branch] || 0) + hrs;
    }
    if (tutMatch) {
      const hrs = parseInt(tutMatch[1], 10);
      tutByBranch[branch] = (tutByBranch[branch] || 0) + hrs;
    }
    if (labMatch) {
      const hrs = parseInt(labMatch[1], 10);
      labByBranch[branch] = (labByBranch[branch] || 0) + hrs;
    }
  });

  return { theoryByBranch, tutByBranch, labByBranch };
}

/**
 * Single Faculty Timetable Card
 * - When showBreakdown is true (single faculty view), renders the Assigned Subjects Breakdown card.
 * - When showBreakdown is false (all faculty view), renders ONLY the timetable grid.
 */
function FacultyTimetableCard({ 
  facultyObj, 
  timetableData, 
  universityInfo, 
  onSlotClick, 
  showBreakdown = true,
  isMultiView = false, 
  index = 1, 
  totalCount = 1,
  selectedDay = 'ALL',
  contentMode = 'subjects',
  onOpenModal = null
}) {
  const facFull = facultyObj.fullName;
  const facShort = (facultyObj.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
  const facShortWithTitle = facultyObj.shortName?.trim();

  // Dynamic active days: exclude Saturday unless Saturday has classes, or filter to selectedDay
  const activeDays = useMemo(() => {
    const allActive = getActiveDays(timetableData);
    if (selectedDay && selectedDay !== 'ALL') {
      return allActive.filter(d => d === selectedDay);
    }
    return allActive;
  }, [timetableData, selectedDay]);

  // Build weekly schedule matrix for this faculty
  const facultySchedule = useMemo(() => {
    if (initialData.masterFacultyTimetables && initialData.masterFacultyTimetables[facFull]) {
      return initialData.masterFacultyTimetables[facFull];
    }

    // Dynamic fallback reconstruction from timetableData
    const result = {};
    activeDays.forEach(d => result[d] = {});

    const matchesFaculty = (cell) => {
      if (!cell || !cell.faculty) return false;
      if (cell.faculty.includes(facFull)) return true;
      if (facShort && new RegExp(`\\b${facShort}\\b`, 'i').test(cell.faculty)) return true;
      if (facShortWithTitle && cell.faculty.includes(facShortWithTitle)) return true;
      return false;
    };

    Object.entries(timetableData || {}).forEach(([branchKey, branchSched]) => {
      Object.entries(branchSched).forEach(([dayKey, daySched]) => {
        Object.entries(daySched).forEach(([slotTime, rawCell]) => {
          const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
          items.forEach(cell => {
            if (matchesFaculty(cell)) {
              if (!result[dayKey]) result[dayKey] = {};
              if (!result[dayKey][slotTime]) result[dayKey][slotTime] = [];
              const alreadyExists = result[dayKey][slotTime].some(
                existing => existing.branch === branchKey && existing.subject === cell.subject
              );
              if (!alreadyExists) {
                result[dayKey][slotTime].push({
                  ...cell,
                  branch: branchKey
                });
              }
            }
          });
        });
      });
    });

    return result;
  }, [facFull, facShort, facShortWithTitle, timetableData]);

  // Parse course assignments with scheduled slots (only when breakdown is needed)
  const parsedAssignments = useMemo(() => {
    if (!showBreakdown) return [];

    if (facultyObj.assignedCourses && facultyObj.assignedCourses.length > 0) {
      return facultyObj.assignedCourses.map(course => {
        const branch = course.branch;
        const name = course.subject;
        const code = course.code;
        const room = course.room;
        const isLab = course.type === 'lab';
        const isTutorial = course.type === 'tutorial';
        const loadDetail = course.loadDetail || `${course.hours} ${course.type} = ${course.hours} periods`;
        const periods = course.hours || 0;

        const scheduledSlots = [];
        activeDays.forEach(day => {
          Object.entries(facultySchedule[day] || {}).forEach(([slot, items]) => {
            items.forEach(item => {
              if (item.branch === branch) {
                const isItemLab = Boolean(item.isLab || item.subject?.toUpperCase().includes('LAB') || item.subject?.toUpperCase().includes('3DDA'));
                if (isLab !== isItemLab) return;

                const sSubj = (item.subject || '').toUpperCase();
                const isItemTutorial = sSubj.includes('TUT');
                if (isTutorial !== isItemTutorial) return;

                const matchCode = (code || '').toUpperCase();
                const matchName = (name || '').toUpperCase();
                if (
                  (matchCode && (sSubj.includes(matchCode) || matchCode.includes(sSubj))) ||
                  (matchName && (sSubj.includes(matchName) || matchName.includes(sSubj)))
                ) {
                  if (!scheduledSlots.some(s => s.day === day && s.slot === slot)) {
                    scheduledSlots.push({ day, slot, room: item.room || room });
                  }
                }
              }
            });
          });
        });

        return {
          branch,
          name,
          code,
          room,
          loadDetail,
          periods,
          isLab,
          isTutorial,
          scheduledSlots
        };
      });
    }

    if (!facultyObj.assignments) return [];
    return facultyObj.assignments
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('→');
        const branch = parts[0]?.trim() || '';
        const rest = parts[1]?.trim() || '';
        const codeMatch = rest.match(/\(([^)]+)\)/);
        const code = codeMatch ? codeMatch[1].trim() : '';
        const nameMatch = rest.match(/^(.*?)(?:–|\()/);
        const name = nameMatch ? nameMatch[1].trim() : '';
        const loadMatch = rest.match(/–\s*(.*?)\s*=\s*(\d+)\s*periods/i);
        const loadDetail = loadMatch ? loadMatch[1].trim() : '';
        const periods = loadMatch ? Number(loadMatch[2]) || 0 : 0;
        const isLab = line.toLowerCase().includes('lab');
        const isTutorial = line.toLowerCase().includes('tutorial') || line.toLowerCase().includes('tut');

        const scheduledSlots = [];
        activeDays.forEach(day => {
          Object.entries(facultySchedule[day] || {}).forEach(([slot, items]) => {
            items.forEach(item => {
              if (item.branch === branch) {
                const isItemLab = Boolean(item.isLab || item.subject?.toUpperCase().includes('LAB') || item.subject?.toUpperCase().includes('3DDA'));
                if (isLab !== isItemLab) return;

                const sSubj = (item.subject || '').toUpperCase();
                const isItemTutorial = sSubj.includes('TUT');
                if (isTutorial !== isItemTutorial) return;

                const matchCode = code.toUpperCase();
                const matchName = name.toUpperCase();
                if (
                  (matchCode && (sSubj.includes(matchCode) || matchCode.includes(sSubj))) ||
                  (matchName && (sSubj.includes(matchName) || matchName.includes(sSubj)))
                ) {
                  if (!scheduledSlots.some(s => s.day === day && s.slot === slot)) {
                    scheduledSlots.push({ day, slot, room: item.room });
                  }
                }
              }
            });
          });
        });

        return {
          branch,
          name,
          code,
          room: '',
          loadDetail: loadDetail || (isLab ? 'Lab' : isTutorial ? 'Tutorial' : 'Theory'),
          periods,
          isLab,
          isTutorial,
          scheduledSlots
        };
      });
  }, [facultyObj, facultySchedule, showBreakdown]);

  // Compute workload metrics (academic teaching hours)
  let totalHours = 0;
  activeDays.forEach(day => {
    Object.values(facultySchedule[day] || {}).forEach(items => {
      items.forEach((it) => {
        if (!it.isNonAcademic && !it.subject?.toUpperCase().includes('COUNSEL') && !it.subject?.toUpperCase().includes('LIBRARY') && !it.subject?.toUpperCase().includes('SPORT') && !it.subject?.toUpperCase().includes('YOGA')) {
          totalHours += 1;
        }
      });
    });
  });

  // Calculate day-specific workload helper
  const getDayLoad = (dayKey) => {
    const daySched = facultySchedule[dayKey] || {};
    let dayTh = 0, dayLab = 0, dayTut = 0;
    Object.values(daySched).forEach(items => {
      items.forEach(it => {
        if (it.isNonAcademic || it.subject?.toUpperCase().includes('COUNSEL') || it.subject?.toUpperCase().includes('LIBRARY') || it.subject?.toUpperCase().includes('SPORT') || it.subject?.toUpperCase().includes('YOGA')) {
          return;
        }
        if (it.isLab || it.subject?.toUpperCase().includes('LAB') || it.subject?.toUpperCase().includes('3DDA')) dayLab++;
        else if (it.isTutorial || it.subject?.toUpperCase().includes('TUT')) dayTut++;
        else dayTh++;
      });
    });
    return { theory: dayTh, lab: dayLab, tut: dayTut, total: dayTh + dayLab + dayTut };
  };

  // Calculate day-specific workload when a specific day is selected
  const dayLoad = useMemo(() => {
    if (selectedDay === 'ALL') return null;
    return getDayLoad(selectedDay);
  }, [facultySchedule, selectedDay]);

  const dayLabel = selectedDay === 'MON' ? 'Monday' : selectedDay === 'TUE' ? 'Tuesday' : selectedDay === 'WED' ? 'Wednesday' : selectedDay === 'THU' ? 'Thursday' : selectedDay === 'FRI' ? 'Friday' : selectedDay;

  return (
    <div 
      id={`faculty-${facShort || facultyObj.sno}`}
      className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 print:border print:border-black print:rounded-none print:shadow-none overflow-hidden timetable-card my-4 print:my-0.5 faculty-print-page transition-all"
    >
      {/* Faculty Card Header Banner - Screen Only */}
      <div className="no-print text-center py-3 px-6 border-b-2 border-slate-700 bg-gray-50/90 faculty-card-header">
        <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
          {universityInfo.name}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <h3 className="text-xs sm:text-sm font-black text-blue-900 uppercase font-mono flex items-center gap-1.5">
            <span>INDIVIDUAL FACULTY TIMETABLE:</span>
            {onOpenModal ? (
              <button
                onClick={() => onOpenModal(facultyObj)}
                className="underline decoration-blue-600 font-extrabold text-blue-900 hover:text-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-all cursor-pointer inline-flex items-center gap-1 text-left"
                title="Click to open Fullscreen Modal Timetable"
              >
                <span>{facFull}</span>
                {facShort && (
                  <span className="text-blue-700">({facShort})</span>
                )}
                <Maximize2 className="w-3.5 h-3.5 text-blue-600 ml-0.5 inline opacity-80 hover:opacity-100" />
              </button>
            ) : (
              <span className="underline decoration-blue-600 font-extrabold">
                {facFull} {facShort && <span className="ml-1 text-blue-700">({facShort})</span>}
              </span>
            )}
          </h3>
          {onOpenModal && (
            <button
              onClick={() => onOpenModal(facultyObj)}
              className="no-print inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer ml-1"
              title="Open Fullscreen Modal Timetable"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fullscreen</span>
            </button>
          )}
          {selectedDay !== 'ALL' && (
            <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-blue-700 text-white shadow-xs uppercase tracking-wider font-mono">
              📅 {dayLabel.toUpperCase()}
            </span>
          )}
          {facultyObj.dept && (
            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-100 text-blue-950 border border-blue-300">
              Dept: {facultyObj.dept}
            </span>
          )}
          {facultyObj.designation && (
            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-gray-200 text-gray-800 border border-gray-300">
              {facultyObj.designation}
            </span>
          )}
          {isMultiView && (
            <span className="no-print px-2 py-0.5 rounded text-[10.5px] font-black bg-purple-100 text-purple-900 border border-purple-300">
              #{index} of {totalCount}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-xs text-gray-600 font-mono">
          <span>Academic Year {universityInfo.academicYear}</span>
          <span>•</span>
          {selectedDay !== 'ALL' && dayLoad ? (
            <span>
              <strong className="text-slate-900">{dayLabel} Load:</strong>{' '}
              <span className="font-black text-blue-900">{dayLoad.total} Hrs</span>
              {dayLoad.total > 0 && (
                <span className="text-slate-500 text-[11px] ml-1">
                  ({dayLoad.theory > 0 ? `${dayLoad.theory} Theory` : ''}
                  {dayLoad.theory > 0 && dayLoad.lab > 0 ? ', ' : ''}
                  {dayLoad.lab > 0 ? `${dayLoad.lab} Lab` : ''}
                  {(dayLoad.theory > 0 || dayLoad.lab > 0) && dayLoad.tut > 0 ? ', ' : ''}
                  {dayLoad.tut > 0 ? `${dayLoad.tut} Tut` : ''})
                </span>
              )}
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-500">Weekly Total: <strong className="text-slate-800">{facultyObj.totalLoad || totalHours} Hrs/Wk</strong></span>
            </span>
          ) : (
            <span>
              Official Workload: <span className="font-bold text-slate-900">{facultyObj.totalLoad || totalHours} Hrs/Wk</span> (Theory: {facultyObj.theoryLoad || 0}, Lab: {facultyObj.labLoad || 0}, Tut: {facultyObj.tutLoad || 0})
            </span>
          )}
        </div>
      </div>

      {/* Free Day Alert Badge if 0 hours scheduled on this day */}
      {selectedDay !== 'ALL' && dayLoad?.total === 0 && (
        <div className="no-print bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>
            Free Day on {dayLabel} • No Teaching Lectures or Labs Scheduled
          </span>
        </div>
      )}

      {/* Print-Only Header Strip */}
      <div className="print-only px-2 py-0.5 bg-gray-100 border-b-2 border-black font-sans text-xs print:text-[9pt] font-bold text-black flex justify-between items-center leading-tight">
        <div>
          <span className="font-black uppercase tracking-tight text-sm print:text-[10pt]">{facFull}</span>
          {facShort && <span className="ml-1 text-slate-800 print:text-black print:text-[9pt]">({facShort})</span>}
          {selectedDay !== 'ALL' && <span className="ml-1 font-black text-black print:text-[9pt]">• {dayLabel.toUpperCase()}</span>}
          <span className="mx-1 text-slate-400 print:text-black">|</span>
          <span className="font-bold text-slate-700 print:text-black print:text-[9pt]">Dept: {facultyObj.dept || 'General'}</span>
          {facultyObj.designation && <span className="ml-1 font-semibold text-slate-600 print:text-black print:text-[8.5pt]">({facultyObj.designation})</span>}
        </div>
        <div className="font-mono text-xs print:text-[8.5pt]">
          {selectedDay !== 'ALL' && dayLoad ? (
            <span>{dayLabel}: <span className="font-black text-black">{dayLoad.total} Hrs</span> (Weekly: {facultyObj.totalLoad || totalHours} Hrs)</span>
          ) : (
            <span>Workload: <span className="font-black text-black">{facultyObj.totalLoad || totalHours} Hrs/Wk</span> (Th: {facultyObj.theoryLoad || 0}, Lab: {facultyObj.labLoad || 0}, Tut: {facultyObj.tutLoad || 0})</span>
          )}
        </div>
      </div>

      {/* Timetable Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse table-fixed min-w-[900px] print:min-w-0 border-2 border-slate-700 print:border-black">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 print:border-black uppercase tracking-wider text-[11.5px] print:text-[7.5pt]">
              <th className="py-2.5 px-2 border-r border-gray-300 print:border-black w-16 sm:w-20 print:w-[9%] text-xs font-black text-slate-900 print:py-0.5 print:px-0.5 print:text-[8.5pt] print:bg-gray-100">Day</th>
              {periodSlots.map((slot) => (
                <th 
                  key={slot.id} 
                  className={`py-2.5 px-1 border-r border-gray-300 print:border-black print:py-0.5 print:px-0.5 ${
                    slot.type === 'break' ? 'bg-amber-100/80 text-amber-950 font-black w-14 sm:w-16 print:w-[5.25%] print:bg-gray-100' : 'text-slate-950 print:w-[13.5%]'
                  }`}
                >
                  {slot.type === 'break' && slot.time.includes('-') ? (
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block print:text-[6.8pt] print:leading-tight">
                        {slot.time.split('-')[0]}–
                      </span>
                      <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block print:text-[6.8pt] print:leading-tight">
                        {slot.time.split('-')[1]}
                      </span>
                    </div>
                  ) : (
                    <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block print:text-[7.2pt] print:leading-tight">
                      {slot.time}
                    </span>
                  )}
                </th>
              ))}
              <th className="py-2.5 px-2 border-l-2 border-slate-700 print:border-black bg-blue-100/90 text-blue-950 font-black w-16 sm:w-20 print:w-[9%] text-xs print:text-[8.5pt] uppercase tracking-wide">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-600 print:divide-black">
            {activeDays.map((day, dayIdx) => {
              const daySched = facultySchedule[day] || {};
              const skipSlots = new Set();

              return (
                <tr key={day} className="border-b-2 border-slate-600 print:border-black hover:bg-gray-50/80 transition-colors">
                  {/* Day Column */}
                  <td className="py-2.5 px-2 font-black text-gray-900 bg-gray-100/60 border-r border-gray-300 border-b-2 border-slate-600 print:border-black uppercase tracking-wide align-middle print:py-0.5 print:px-0.5 print:text-[9pt] print:bg-white font-sans">
                    {day}
                  </td>

                  {periodSlots.map((slot, sIdx) => {
                    if (skipSlots.has(slot.time)) {
                      return null;
                    }

                    if (slot.type === 'break') {
                      const letters = (slot.label || '').toUpperCase().split('');
                      const char = letters[dayIdx] || (slot.label || '');

                      return (
                        <td 
                          key={slot.id} 
                          className="py-2 px-1 bg-amber-100/70 text-amber-950 font-black border-r border-gray-300 border-b-2 border-slate-600 print:border-black tracking-wider uppercase align-middle select-none text-center print:py-0.5 print:px-0.5 print:bg-white font-sans"
                        >
                          <div className="flex items-center justify-center min-h-[44px] print:min-h-[35px]">
                            <span className="text-base sm:text-lg print:text-[13pt] font-black uppercase font-serif">
                              {char}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    const currentItems = daySched[slot.time] || [];

                    let colSpan = 1;
                    let isSplitMerge = false;
                    let nextSlotItems = [];
                    if (has2HourFacultyMerge(daySched, sIdx)) {
                      colSpan = 2;
                      const nextSlotTime = periodSlots[sIdx + 1]?.time;
                      skipSlots.add(nextSlotTime);
                      nextSlotItems = daySched[nextSlotTime] || [];

                      if (
                        currentItems.length !== nextSlotItems.length ||
                        !currentItems.every((it, i) => nextSlotItems[i]?.subject === it.subject && nextSlotItems[i]?.branch === it.branch)
                      ) {
                        isSplitMerge = true;
                      }
                    }

                    // 1. Empty Cell
                    if (currentItems.length === 0) {
                      return (
                        <td 
                          key={slot.id} 
                          colSpan={colSpan}
                          className="p-0 border-r border-gray-300 border-b-2 border-slate-600 print:border-black align-middle bg-slate-50/50 print:bg-white text-center select-none"
                        >
                          <div className="flex items-center justify-center min-h-[44px] print:min-h-[35px]">
                            <span className="text-slate-400 font-mono text-[14px] font-bold print:text-[13pt] print:text-black">—</span>
                          </div>
                        </td>
                      );
                    }

                    // 2. Split 2-Hour Merge
                    if (isSplitMerge) {
                      const sharedLabs = currentItems.filter(it => 
                        (it.isLab || it.subject?.includes('LAB')) && 
                        nextSlotItems.some(n => 
                          (n.isLab || n.isContinued || n.subject?.includes('LAB')) && 
                          n.subject === it.subject && 
                          n.branch === it.branch
                        )
                      );

                      const h1Others = currentItems.filter(it => 
                        !sharedLabs.some(sl => sl.subject === it.subject && sl.branch === it.branch)
                      );

                      const h2Others = nextSlotItems.filter(it => 
                        !sharedLabs.some(sl => sl.subject === it.subject && sl.branch === it.branch)
                      );

                      return (
                        <td 
                          key={slot.id} 
                          colSpan={colSpan}
                          onClick={() => onSlotClick && onSlotClick([...currentItems, ...nextSlotItems], day, `${slot.time} - ${periodSlots[sIdx + 1]?.time}`, facFull)}
                          className="p-0 border-r border-gray-300 border-b-2 border-slate-600 print:border-black align-top transition-all cursor-pointer print:bg-white"
                          style={{ height: '1px' }}
                          title="Click to view course details"
                        >
                          <div className="flex flex-col h-full w-full min-h-[76px] divide-y divide-gray-300/90 print:divide-black">
                            <div className="flex-1 w-full flex divide-x divide-gray-300/90 print:divide-black">
                              <div className="w-1/2 flex flex-col justify-center items-center print:min-h-0">
                                {h1Others.length > 0 ? (
                                  h1Others.map((cellItem, iIdx) => {
                                    const style = getSubjectStyle(cellItem.subject, cellItem.isLab);
                                    if (contentMode === 'numbers') {
                                      return (
                                        <div 
                                          key={iIdx}
                                          className={`w-full h-full py-1.5 px-1 flex flex-col justify-center items-center text-center transition-all ${style.bg} print:bg-white`}
                                          style={style.inlineBg ? { backgroundColor: style.inlineBg } : undefined}
                                        >
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-700 text-white font-black text-xs font-mono shadow-xs">
                                            1
                                          </span>
                                          <div className="font-black text-[10px] text-slate-900 mt-0.5 truncate max-w-[80px]">
                                            {cellItem.subject}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div 
                                        key={iIdx}
                                        className={`w-full h-full py-1.5 px-1 print:py-0.5 print:px-0.5 flex flex-col justify-center items-center text-center transition-all ${style.bg} hover:brightness-95 print:bg-white print:min-h-0`}
                                        style={style.inlineBg ? { backgroundColor: style.inlineBg } : undefined}
                                      >
                                        <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug print:text-[10pt] print:leading-tight print:font-black ${style.text}`}>
                                          {cellItem.subject}
                                        </div>
                                        <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight print:text-[8.5pt] print:leading-tight print:font-bold print:text-black">
                                          Section: {cellItem.branch}
                                        </div>
                                        {cellItem.room && (
                                          <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans print:text-[9pt] print:leading-tight print:font-black print:text-black">
                                            {cellItem.room}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full min-h-[44px] print:min-h-0 bg-slate-50/40 print:bg-white">
                                    <span className="text-gray-300 font-mono text-[12px] print:text-[12pt] print:font-bold print:text-black">—</span>
                                  </div>
                                )}
                              </div>

                              <div className="w-1/2 flex flex-col justify-center items-center print:min-h-0">
                                {h2Others.length > 0 ? (
                                  h2Others.map((cellItem, iIdx) => {
                                    const style = getSubjectStyle(cellItem.subject, cellItem.isLab);
                                    if (contentMode === 'numbers') {
                                      return (
                                        <div 
                                          key={iIdx}
                                          className={`w-full h-full py-1.5 px-1 flex flex-col justify-center items-center text-center transition-all ${style.bg} print:bg-white`}
                                          style={style.inlineBg ? { backgroundColor: style.inlineBg } : undefined}
                                        >
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-700 text-white font-black text-xs font-mono shadow-xs">
                                            1
                                          </span>
                                          <div className="font-black text-[10px] text-slate-900 mt-0.5 truncate max-w-[80px]">
                                            {cellItem.subject}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div 
                                        key={iIdx}
                                        className={`w-full h-full py-1.5 px-1 print:py-0.5 print:px-0.5 flex flex-col justify-center items-center text-center transition-all ${style.bg} hover:brightness-95 print:bg-white print:min-h-0`}
                                        style={style.inlineBg ? { backgroundColor: style.inlineBg } : undefined}
                                      >
                                        <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug print:text-[10pt] print:leading-tight print:font-black ${style.text}`}>
                                          {cellItem.subject}
                                        </div>
                                        <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight print:text-[8.5pt] print:leading-tight print:font-bold print:text-black">
                                          Section: {cellItem.branch}
                                        </div>
                                        {cellItem.room && (
                                          <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans print:text-[9pt] print:leading-tight print:font-black print:text-black">
                                            {cellItem.room}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full min-h-[44px] print:min-h-0 bg-slate-50/40 print:bg-white">
                                    <span className="text-gray-300 font-mono text-[12px] print:text-[12pt] print:font-bold print:text-black">—</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 w-full flex flex-col divide-y divide-gray-300/90 print:divide-black">
                              {sharedLabs.map((labItem, lIdx) => {
                                const labStyle = getSubjectStyle(labItem.subject, labItem.isLab);
                                if (contentMode === 'numbers') {
                                  return (
                                    <div 
                                      key={lIdx}
                                      className={`flex-1 w-full py-1.5 px-1 flex flex-col justify-center items-center text-center transition-all ${labStyle.bg} print:bg-white`}
                                      style={labStyle.inlineBg ? { backgroundColor: labStyle.inlineBg } : undefined}
                                    >
                                      <div className="flex items-center gap-1 font-mono font-black">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-700 text-white text-sm shadow-xs">
                                          2
                                        </span>
                                        <span className="text-[10px] font-bold text-purple-950">(1+1)</span>
                                      </div>
                                      <div className="font-black text-[10.5px] text-slate-900 mt-0.5 truncate max-w-[120px]">
                                        {labItem.subject}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div 
                                    key={lIdx}
                                    className={`flex-1 w-full py-1.5 px-1 print:py-0.5 print:px-0.5 flex flex-col justify-center items-center text-center transition-all ${labStyle.bg} hover:brightness-95 print:bg-white print:min-h-0`}
                                    style={labStyle.inlineBg ? { backgroundColor: labStyle.inlineBg } : undefined}
                                  >
                                    <div className={`font-black tracking-tight text-[11.5px] sm:text-[12px] leading-snug print:text-[10pt] print:leading-tight print:font-black ${labStyle.text}`}>
                                      {labItem.subject}
                                    </div>
                                    <div className="text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight print:text-[8.5pt] print:leading-tight print:font-bold print:text-black">
                                      Section: {labItem.branch}
                                    </div>
                                    {labItem.room && (
                                      <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans print:text-[9pt] print:leading-tight print:font-black print:text-black">
                                        {labItem.room}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      );
                    }

                    // 3. Single Session Cell
                    if (currentItems.length === 1) {
                      const cellItem = currentItems[0];
                      const style = getSubjectStyle(cellItem.subject, cellItem.isLab);
                      const isLab = Boolean(cellItem.isLab || cellItem.subject?.toUpperCase().includes('LAB') || cellItem.subject?.toUpperCase().includes('3DDA'));
                      const countVal = (colSpan === 2 && isLab) ? 2 : 1;

                      if (contentMode === 'numbers') {
                        return (
                          <td 
                            key={slot.id} 
                            colSpan={colSpan}
                            onClick={() => onSlotClick && onSlotClick(currentItems, day, colSpan === 2 ? `${slot.time} - ${periodSlots[sIdx + 1]?.time}` : slot.time, facFull)}
                            className={`p-1.5 sm:p-2 border-r border-gray-300 border-b-2 border-slate-600 print:border-black align-middle transition-all cursor-pointer ${style.bg} hover:brightness-95 print:p-0.5 print:bg-white`}
                            style={{
                              height: '1px',
                              ...(style.inlineBg ? { backgroundColor: style.inlineBg } : {})
                            }}
                            title={`${cellItem.subject} • ${isLab ? 'Lab: 2 Periods (1+1)' : 'Theory: 1 Period'}`}
                          >
                            <div className="flex flex-col justify-center items-center text-center min-h-[44px] print:min-h-[35px]">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center justify-center ${countVal === 2 ? 'w-8 h-8 text-base bg-purple-700' : 'w-7 h-7 text-sm bg-blue-700'} rounded-full text-white font-black shadow-xs font-mono`}>
                                  {countVal}
                                </span>
                                {countVal === 2 && (
                                  <span className="text-[11px] font-black text-purple-950 font-mono">(1+1)</span>
                                )}
                              </div>
                              <div className="text-[11px] font-black uppercase tracking-tight text-slate-900 mt-1 truncate max-w-[140px]">
                                {cellItem.subject}
                              </div>
                              <div className="text-[9.5px] text-slate-700 font-semibold truncate max-w-[140px]">
                                {isLab ? `Lab (${cellItem.branch})` : `Sec: ${cellItem.branch}`}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td 
                          key={slot.id} 
                          colSpan={colSpan}
                          onClick={() => onSlotClick && onSlotClick(currentItems, day, colSpan === 2 ? `${slot.time} - ${periodSlots[sIdx + 1]?.time}` : slot.time, facFull)}
                          className={`p-1.5 sm:p-2 border-r border-gray-300 border-b-2 border-slate-600 print:border-black align-middle transition-all cursor-pointer ${style.bg} hover:brightness-95 print:p-0.5 print:bg-white`}
                          style={{
                            height: '1px',
                            ...(style.inlineBg ? { backgroundColor: style.inlineBg } : {})
                          }}
                          title="Click to view course details"
                        >
                          <div className="flex flex-col justify-center items-center text-center min-h-[44px] print:min-h-[35px]">
                            <div className={`font-black tracking-tight text-[12px] sm:text-[12.5px] leading-snug print:text-[8pt] print:leading-tight print:font-black ${style.text}`}>
                              {cellItem.subject}
                            </div>
                            <div className="text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight print:text-[7pt] print:leading-tight print:font-bold print:text-black">
                              Section: {cellItem.branch}
                            </div>
                            {cellItem.room && (
                              <div className="mt-0.5 text-xs sm:text-[11.5px] font-black text-slate-800 tracking-normal font-sans print:text-[7.5pt] print:leading-tight print:font-black print:text-black">
                                {cellItem.room}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // 4. Multi-Session Cell
                    return (
                      <td 
                        key={slot.id} 
                        colSpan={colSpan}
                        onClick={() => onSlotClick && onSlotClick(currentItems, day, colSpan === 2 ? `${slot.time} - ${periodSlots[sIdx + 1]?.time}` : slot.time, facFull)}
                        className="p-0 border-r border-gray-300 border-b-2 border-slate-600 print:border-black align-top transition-all cursor-pointer print:bg-white"
                        style={{ height: '1px' }}
                        title="Click to view course details"
                      >
                        <div className="flex flex-col h-full min-h-full w-full min-h-[48px] divide-y divide-gray-300/90 print:divide-black">
                          {currentItems.map((cellItem, bIdx) => {
                            const itemStyle = getSubjectStyle(cellItem.subject, cellItem.isLab);
                            const isItemLab = Boolean(cellItem.isLab || cellItem.subject?.toUpperCase().includes('LAB') || cellItem.subject?.toUpperCase().includes('3DDA'));
                            const count = isItemLab ? 2 : 1;

                            if (contentMode === 'numbers') {
                              return (
                                <div 
                                  key={bIdx} 
                                  className={`flex-1 shrink-0 min-h-fit w-full py-1.5 px-1 flex flex-col justify-center items-center text-center transition-all ${itemStyle.bg} print:bg-white`}
                                  style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                                >
                                  <div className="flex items-center gap-1 font-mono font-black">
                                    <span className={`inline-flex items-center justify-center ${isItemLab ? 'w-5 h-5 bg-purple-700' : 'w-5 h-5 bg-blue-700'} text-white rounded-full text-[10px]`}>
                                      {count}
                                    </span>
                                    {isItemLab && <span className="text-[9px] text-purple-950 font-bold">(1+1)</span>}
                                  </div>
                                  <div className="text-[10px] font-black uppercase tracking-tight text-slate-900 mt-0.5 truncate max-w-[120px]">
                                    {cellItem.subject}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={bIdx} 
                                className={`flex-1 shrink-0 min-h-fit w-full py-1.5 px-1 print:py-0.5 print:px-0.5 flex flex-col justify-center items-center text-center transition-all ${itemStyle.bg} hover:brightness-95 print:bg-white`}
                                style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                              >
                                <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug print:text-[7.5pt] print:leading-tight print:font-black ${itemStyle.text}`}>
                                  {cellItem.subject}
                                </div>
                                <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight print:text-[6.8pt] print:leading-tight print:font-bold print:text-black">
                                  Section: {cellItem.branch}
                                </div>
                                {cellItem.room && (
                                  <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans print:text-[7pt] print:leading-tight print:font-black print:text-black">
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

                  {/* Day Total Count Column */}
                  {(() => {
                    const rowLoad = getDayLoad(day);
                    return (
                      <td className="py-2 px-1 font-mono font-black text-center border-l-2 border-slate-700 border-b-2 border-slate-600 print:border-black bg-blue-50/70 align-middle print:py-0.5 print:px-0.5">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-black text-xs sm:text-sm font-mono shadow-xs ${
                            rowLoad.total > 0
                              ? 'bg-blue-700 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {rowLoad.total}
                          </span>
                          {rowLoad.total > 0 && (
                            <span className="text-[9.5px] font-bold text-slate-600 mt-0.5 whitespace-nowrap print:text-[7pt]">
                              {rowLoad.theory > 0 ? `${rowLoad.theory}Th` : ''}
                              {rowLoad.theory > 0 && rowLoad.lab > 0 ? ' ' : ''}
                              {rowLoad.lab > 0 ? `${rowLoad.lab}Lab` : ''}
                              {(rowLoad.theory > 0 || rowLoad.lab > 0) && rowLoad.tut > 0 ? ' ' : ''}
                              {rowLoad.tut > 0 ? `${rowLoad.tut}Tut` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
          {activeDays.length > 1 && (
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-700 print:border-black text-xs">
                <td colSpan={periodSlots.length + 1} className="py-2 px-3 text-right uppercase tracking-wider text-[11px] font-bold">
                  Weekly Teaching Total:
                </td>
                <td className="py-2 px-1 text-center font-mono font-black text-emerald-900 bg-emerald-100/60 border-l-2 border-slate-700 text-sm">
                  {facultyObj.totalLoad || totalHours} Hrs
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Assigned Subjects & Workload Breakdown: SHOWN ONLY WHEN SINGLE FACULTY IS SELECTED */}
      {showBreakdown && (
        <div className="bg-slate-50 border-t-2 border-slate-700">
          <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold tracking-wide uppercase font-serif">
                Assigned Subjects & Workload Breakdown ({facFull})
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded text-[11px]">
                Theory: {facultyObj.theoryLoad || 0} Hrs
              </span>
              <span className="bg-purple-600 text-white px-2.5 py-0.5 rounded text-[11px]">
                Lab: {facultyObj.labLoad || 0} Hrs
              </span>
              <span className="bg-amber-600 text-white px-2.5 py-0.5 rounded text-[11px]">
                Tut: {facultyObj.tutLoad || 0} Hrs
              </span>
              <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
                Total: {facultyObj.totalLoad || totalHours} Hrs/Wk
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {parsedAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {parsedAssignments.map((asgn, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-300 bg-white hover:border-blue-400 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-slate-800 text-white tracking-wider">
                          {asgn.branch}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          asgn.isLab 
                            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                            : asgn.isTutorial 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {asgn.isLab ? 'Laboratory' : asgn.isTutorial ? 'Tutorial' : 'Theory'}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                        {asgn.name || asgn.code}
                      </div>

                      {asgn.code && asgn.code !== asgn.name && (
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          Code: <span className="font-mono text-slate-700 font-bold">{asgn.code}</span>
                        </div>
                      )}

                      {asgn.room && (
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          Assigned Room: <span className="font-mono text-slate-800 font-bold">{asgn.room}</span>
                        </div>
                      )}

                      <div className="text-[11px] font-medium text-slate-600 mt-1">
                        Load: <span className="font-bold text-slate-800">{asgn.loadDetail || `${asgn.periods} periods`}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center justify-between">
                        <span>Timetable Slots:</span>
                        <span className="text-emerald-700 font-bold">
                          {asgn.scheduledSlots.length} Active {asgn.scheduledSlots.length === 1 ? 'Slot' : 'Slots'}
                        </span>
                      </div>
                      {asgn.scheduledSlots.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {asgn.scheduledSlots.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono"
                            >
                              {s.day} {s.slot} {s.room ? `• ${s.room}` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10.5px] italic text-slate-400">
                          Pre-assigned in master workload
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 text-xs italic">
                No specific course assignments recorded in the Master Workload Summary for this faculty.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to get a faculty member's schedule for a specific day
 */
function getFacultyDaySchedule(facObj, day, timetableData) {
  const facFull = facObj.fullName;
  if (initialData.masterFacultyTimetables && initialData.masterFacultyTimetables[facFull]) {
    return initialData.masterFacultyTimetables[facFull][day] || {};
  }
  const facShort = (facObj.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
  const facShortWithTitle = facObj.shortName?.trim();
  const matchesFaculty = (cell) => {
    if (!cell || !cell.faculty) return false;
    if (cell.faculty.includes(facFull)) return true;
    if (facShort && new RegExp(`\\b${facShort}\\b`, 'i').test(cell.faculty)) return true;
    if (facShortWithTitle && cell.faculty.includes(facShortWithTitle)) return true;
    return false;
  };
  const result = {};
  Object.entries(timetableData || {}).forEach(([branchKey, branchSched]) => {
    const daySched = branchSched[day] || {};
    Object.entries(daySched).forEach(([slotTime, rawCell]) => {
      const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
      items.forEach(cell => {
        if (matchesFaculty(cell)) {
          if (!result[slotTime]) result[slotTime] = [];
          if (!result[slotTime].some(existing => existing.branch === branchKey && existing.subject === cell.subject)) {
            result[slotTime].push({ ...cell, branch: branchKey });
          }
        }
      });
    });
  });
  return result;
}

/**
 * Daily Faculty Matrix Component
 * Displays a single, dense table view of all faculty schedules for a specific day (e.g. Monday).
 */
function DailyFacultyMatrix({ day, facultyList, timetableData, onSlotClick, onSelectFaculty, contentMode = 'subjects', onOpenModal = null }) {
  const dayName = day === 'MON' ? 'Monday' : day === 'TUE' ? 'Tuesday' : day === 'WED' ? 'Wednesday' : day === 'THU' ? 'Thursday' : day === 'FRI' ? 'Friday' : day;

  return (
    <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-4">
      <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded font-black text-xs bg-blue-600 text-white tracking-wider font-mono">
            📅 {dayName.toUpperCase()} MASTER MATRIX
          </span>
          <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
            Faculty Teaching Schedule Matrix
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 font-mono">
            Mode: <strong className="text-blue-300 uppercase">{contentMode}</strong>
          </span>
          <span className="text-xs text-slate-300 font-mono">
            Total Faculty: <strong className="text-white">{facultyList.length}</strong>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse table-auto min-w-[1000px] border-b border-slate-700">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-2 border-r border-gray-300 text-left w-10">#</th>
              <th className="py-2.5 px-3 border-r border-gray-300 text-left w-52">Faculty Member</th>
              <th className="py-2.5 px-2 border-r border-gray-300 w-24">Dept</th>
              {periodSlots.map((slot) => (
                <th
                  key={slot.id}
                  className={`py-2 px-1 border-r border-gray-300 text-[11px] ${
                    slot.type === 'break' ? 'bg-amber-100/70 text-amber-950 font-black w-14' : 'text-slate-900'
                  }`}
                >
                  <div className="leading-tight">
                    <span className="block font-black">{slot.time}</span>
                    <span className="text-[9.5px] text-slate-500 font-normal">{slot.label}</span>
                  </div>
                </th>
              ))}
              <th className="py-2.5 px-2 w-16 bg-blue-50 text-blue-950 font-black">Day Hrs</th>
              <th className="py-2.5 px-2 w-16 bg-emerald-50 text-emerald-950 font-black">Wk Hrs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {facultyList.map((fac, idx) => {
              const sched = getFacultyDaySchedule(fac, day, timetableData);
              let dayHours = 0;
              Object.values(sched).forEach(items => { dayHours += items.length; });
              const isFreeToday = dayHours === 0;

              return (
                <tr 
                  key={fac.fullName} 
                  className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                >
                  <td className="py-2 px-1 text-slate-500 font-mono text-[11px] border-r border-gray-200">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 text-left border-r border-gray-200">
                    <button
                      onClick={() => {
                        if (onOpenModal) onOpenModal(fac);
                        else if (onSelectFaculty) onSelectFaculty(fac.fullName);
                      }}
                      className="text-left font-bold text-blue-900 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1 group leading-tight text-xs"
                      title="Click to open full-screen modal timetable"
                    >
                      <span>{fac.fullName}</span>
                      <Maximize2 className="w-3 h-3 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                    {fac.shortName && (
                      <span className="text-[10px] text-slate-500 font-mono">({fac.shortName})</span>
                    )}
                  </td>
                  <td className="py-2 px-1.5 border-r border-gray-200 text-[11px] font-semibold text-slate-700">
                    {fac.dept || '—'}
                  </td>

                  {periodSlots.map((slot) => {
                    if (slot.type === 'break') {
                      return (
                        <td key={slot.id} className="py-1 px-1 border-r border-gray-200 bg-amber-50/50 text-amber-900/60 font-black text-[10px]">
                          {slot.time.includes('01:15') ? 'LUNCH' : 'TEA'}
                        </td>
                      );
                    }

                    const items = sched[slot.time] || [];
                    if (items.length === 0) {
                      return (
                        <td key={slot.id} className="py-1 px-1 border-r border-gray-200 text-slate-300 font-mono text-xs">
                          —
                        </td>
                      );
                    }

                    return (
                      <td 
                        key={slot.id} 
                        className="py-1 px-1 border-r border-gray-200 align-middle"
                      >
                        {items.map((item, iIdx) => {
                          const isLab = Boolean(item.isLab || item.subject?.toUpperCase().includes('LAB') || item.subject?.toUpperCase().includes('3DDA'));
                          const style = getSubjectStyle(item.subject, isLab);

                          if (contentMode === 'numbers') {
                            return (
                              <div
                                key={iIdx}
                                onClick={() => onSlotClick && onSlotClick({ ...item, day, slot: slot.time })}
                                className={`p-1 rounded text-center cursor-pointer shadow-2xs border ${style.bg} ${style.border} hover:scale-105 transition-transform my-0.5`}
                                title={`${item.subject} • ${item.branch}${item.room ? ` • Room ${item.room}` : ''}`}
                              >
                                <span className={`inline-flex items-center justify-center font-mono font-black text-[11px] px-1.5 py-0.5 rounded ${
                                  isLab ? 'bg-purple-700 text-white' : 'bg-blue-700 text-white'
                                }`}>
                                  {isLab ? '2 (1+1)' : '1'}
                                </span>
                                <div className="text-[9.5px] font-bold text-slate-900 truncate mt-0.5 max-w-[80px] mx-auto">
                                  {item.branch}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={iIdx}
                              onClick={() => onSlotClick && onSlotClick({ ...item, day, slot: slot.time })}
                              className={`p-1 rounded text-[10.5px] font-bold leading-tight cursor-pointer shadow-2xs border ${style.bg} ${style.text} ${style.border} hover:scale-[1.02] transition-transform my-0.5`}
                              title={`${item.subject} • ${item.branch}${item.room ? ` • Room ${item.room}` : ''}`}
                            >
                              <div className="font-black truncate text-[11px]">
                                {item.branch}
                              </div>
                              <div className="truncate text-[10px] opacity-90">
                                {item.subject}
                              </div>
                              {item.room && (
                                <div className="text-[9px] font-mono opacity-80">
                                  Rm: {item.room}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}

                  <td className="py-2 px-1.5 border-r border-gray-200 font-mono font-black text-xs text-center bg-blue-50/30">
                    {isFreeToday ? (
                      <span className="text-emerald-700 font-bold text-[10.5px]">Free</span>
                    ) : (
                      <span className="text-blue-900">{dayHours}h</span>
                    )}
                  </td>
                  <td className="py-2 px-1.5 font-mono font-bold text-xs text-center text-slate-800 bg-emerald-50/30">
                    {fac.totalLoad || 0}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Faculty Directory Grid Component
 * Displays a clean, searchable list/cards of all faculty members with department, designation, workload pills, and course tags.
 * Clicking a faculty card opens the Full-Screen Modal Timetable.
 */
function FacultyDirectoryGrid({ facultyList, onOpenModal }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    let list = facultyList;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(f => 
        (f.fullName && f.fullName.toLowerCase().includes(q)) ||
        (f.shortName && f.shortName.toLowerCase().includes(q)) ||
        (f.dept && f.dept.toLowerCase().includes(q)) ||
        (f.designation && f.designation.toLowerCase().includes(q)) ||
        (f.assignedCourses && f.assignedCourses.some(c => 
          (c.subject && c.subject.toLowerCase().includes(q)) || 
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.branch && c.branch.toLowerCase().includes(q))
        ))
      );
    }
    return list;
  }, [facultyList, searchTerm]);

  return (
    <div className="w-full space-y-4">
      {/* Search & Stats Bar */}
      <div className="bg-white rounded-xl border-2 border-slate-700 p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search faculty by name, code, designation, subject..."
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-600">
            Showing <strong className="text-blue-900 font-black">{filtered.length}</strong> of {facultyList.length} Faculty
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 hidden sm:inline text-[11px]">
            💡 Click any faculty name or card to open full-screen interactive timetable
          </span>
        </div>
      </div>

      {/* Grid of Faculty Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-sm">
          No faculty members found matching "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((f) => {
            const cleanShort = (f.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
            const courses = f.assignedCourses || [];

            return (
              <div
                key={f.fullName}
                onClick={() => onOpenModal && onOpenModal(f)}
                className="group bg-white rounded-xl border-2 border-slate-700 hover:border-blue-600 hover:shadow-lg transition-all p-4 cursor-pointer flex flex-col justify-between relative overflow-hidden text-left"
              >
                {/* Top Accent Strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 group-hover:h-1.5 transition-all" />

                <div>
                  {/* Department & Short Code Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white">
                      {f.dept || 'General'}
                    </span>
                    {cleanShort && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {cleanShort}
                      </span>
                    )}
                  </div>

                  {/* Faculty Full Name */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif font-black text-slate-900 text-sm sm:text-base leading-snug group-hover:text-blue-700 transition-colors">
                      {f.fullName}
                    </h3>
                    <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5 transition-colors" />
                  </div>

                  {/* Designation */}
                  {f.designation && (
                    <div className="text-xs font-semibold text-slate-600 mt-0.5">
                      {f.designation}
                    </div>
                  )}

                  {/* Workload Breakdown Pills */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold" title="Theory Load">
                      Th: {f.theoryLoad || 0}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 font-bold" title="Lab Load">
                      Lab: {f.labLoad || 0}
                    </span>
                    {f.tutLoad > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold" title="Tutorial Load">
                        Tut: {f.tutLoad || 0}
                      </span>
                    )}
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px]">
                      {f.totalLoad || 0}h
                    </span>
                  </div>

                  {/* Assigned Subjects Chips */}
                  {courses.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Assigned Courses ({courses.length}):
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                        {courses.slice(0, 3).map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-[170px] ${
                              c.type === 'lab'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                            title={`${c.subject} (${c.branch})`}
                          >
                            <span className="font-mono text-slate-900 font-black">{c.branch}</span>: {c.subject}
                          </span>
                        ))}
                        {courses.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                            +{courses.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-900">
                  <span className="flex items-center gap-1">
                    <span>View Timetable</span>
                    <span className="text-base leading-none">→</span>
                  </span>
                  <span className="text-[10.5px] font-mono text-slate-400">Modal Popup</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Faculty Fullscreen Modal Popup Component
 * Opens an interactive, full-screen overlay displaying the selected faculty's complete timetable,
 * with day tabs, prev/next navigation between faculty, subjects/numbers toggle, and print trigger.
 */
function FacultyModalPopup({
  isOpen,
  facultyObj,
  onClose,
  allFaculty = [],
  onSelectFaculty,
  timetableData,
  universityInfo,
  onSlotClick,
  initialDay = 'ALL',
  initialContentMode = 'subjects'
}) {
  const [modalDay, setModalDay] = useState(initialDay);
  const [modalContentMode, setModalContentMode] = useState(initialContentMode);

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setModalDay(initialDay);
      setModalContentMode(initialContentMode);
    }
  }, [isOpen, initialDay, initialContentMode]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, facultyObj, allFaculty]);

  if (!isOpen || !facultyObj) return null;

  // Prev / Next faculty index
  const currentIndex = allFaculty.findIndex(f => f.fullName === facultyObj.fullName);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allFaculty.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectFaculty) {
      onSelectFaculty(allFaculty[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectFaculty) {
      onSelectFaculty(allFaculty[currentIndex + 1]);
    }
  };

  const dayTabs = [
    { id: 'ALL', label: 'Full Week' },
    { id: 'MON', label: 'Mon' },
    { id: 'TUE', label: 'Tue' },
    { id: 'WED', label: 'Wed' },
    { id: 'THU', label: 'Thu' },
    { id: 'FRI', label: 'Fri' },
    ...(getActiveDays(timetableData).includes('SAT') ? [{ id: 'SAT', label: 'Sat' }] : [])
  ];

  const cleanShort = (facultyObj.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Modal Container */}
      <div 
        className="w-full max-w-[1500px] max-h-[96vh] bg-slate-100 rounded-2xl shadow-2xl border-2 border-slate-700 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700 shrink-0">
          {/* Faculty Title & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`p-1.5 rounded-lg border border-slate-700 transition-colors ${
                hasPrev ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer' : 'opacity-30 cursor-not-allowed text-slate-500'
              }`}
              title="Previous Faculty (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className={`p-1.5 rounded-lg border border-slate-700 transition-colors ${
                hasNext ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer' : 'opacity-30 cursor-not-allowed text-slate-500'
              }`}
              title="Next Faculty (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-serif font-black text-white tracking-wide">
                  {facultyObj.fullName}
                </h2>
                {cleanShort && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-900/80 text-blue-200 border border-blue-700">
                    {cleanShort}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                  {facultyObj.dept || 'General'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>{facultyObj.designation || 'Faculty'}</span>
                <span>•</span>
                <span>Workload: <strong className="text-emerald-400">{facultyObj.totalLoad || 0} Hrs/Wk</strong></span>
                {allFaculty.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500">{currentIndex + 1} of {allFaculty.length}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controls: Day Tabs + Content Mode Toggle + Close */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Day Selector Pills */}
            <div className="inline-flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 gap-1">
              {dayTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalDay(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalDay === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Toggle Subjects vs Numbers */}
            <div className="inline-flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 gap-1">
              <button
                onClick={() => setModalContentMode('subjects')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalContentMode === 'subjects'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Show subject names"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Subjects</span>
              </button>
              <button
                onClick={() => setModalContentMode('numbers')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalContentMode === 'numbers'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Show period counts: 1 for Theory, 2 (1+1) for Lab"
              >
                <Hash className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Numbers (1/2)</span>
              </button>
            </div>

            {/* Print Modal Timetable */}
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Print Timetable"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow-xs ml-1"
              title="Close (Escape)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1">
          <FacultyTimetableCard
            facultyObj={facultyObj}
            timetableData={timetableData}
            universityInfo={universityInfo}
            onSlotClick={onSlotClick}
            showBreakdown={true}
            isMultiView={false}
            selectedDay={modalDay}
            contentMode={modalContentMode}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Main IndividualView Component
 */
export default function IndividualView({ timetableData, universityInfo, facultyList: propFacultyList, onSlotClick }) {
  // Master faculty list with full metadata (only faculty with assigned workload)
  const facultyMembers = useMemo(() => {
    const list = (propFacultyList && propFacultyList.length > 0)
      ? propFacultyList
      : initialData.facultyList || [];
    return list.filter(f => (f.totalLoad || 0) > 0 || (f.assignedCourses && f.assignedCourses.length > 0));
  }, [propFacultyList]);

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set();
    facultyMembers.forEach(f => {
      const dept = f.dept?.trim() || 'General';
      if (dept) set.add(dept);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [facultyMembers]);

  // Department filter state
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Filtered faculty list based on department selection
  const filteredFacultyList = useMemo(() => {
    if (selectedDept === 'ALL') {
      return facultyMembers;
    }
    return facultyMembers.filter(f => (f.dept?.trim() || 'General') === selectedDept);
  }, [facultyMembers, selectedDept]);

  // Faculty selection state ('ALL' or faculty fullName)
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');

  // Day tab filter state: 'ALL' (Full Week) or 'MON', 'TUE', 'WED', 'THU', 'FRI', ('SAT')
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [dayViewMode, setDayViewMode] = useState('cards'); // 'cards' | 'matrix'

  // Full week view mode: 'directory' (faculty names list) | 'cards' (full timetable cards stack)
  const [fullWeekViewMode, setFullWeekViewMode] = useState('directory');

  // Day view content mode: 'subjects' (show subject name) | 'numbers' (show counts: 1 for theory, 2 for lab)
  const [dayContentMode, setDayContentMode] = useState('subjects');

  // Modal faculty for full-screen timetable popup
  const [modalFaculty, setModalFaculty] = useState(null);

  // Dynamic available days list
  const availableDays = useMemo(() => {
    const active = getActiveDays(timetableData);
    const base = [
      { id: 'ALL', label: 'Full Week', short: 'All' },
      { id: 'MON', label: 'Monday', short: 'Mon' },
      { id: 'TUE', label: 'Tuesday', short: 'Tue' },
      { id: 'WED', label: 'Wednesday', short: 'Wed' },
      { id: 'THU', label: 'Thursday', short: 'Thu' },
      { id: 'FRI', label: 'Friday', short: 'Fri' },
    ];
    if (active.includes('SAT')) {
      base.push({ id: 'SAT', label: 'Saturday', short: 'Sat' });
    }
    return base;
  }, [timetableData]);

  const activeDayObj = availableDays.find(d => d.id === selectedDay) || availableDays[0];

  // Print Target: 'individual' (A4 portrait, 2 per page) vs 'department' (1-Page landscape department timetable)
  const [printTarget, setPrintTarget] = useState('individual');
  const [printFormat, setPrintFormat] = useState('a4-portrait');

  // Print controls: whether to include department stats & workload table in print
  const [includeStatsInPrint, setIncludeStatsInPrint] = useState(false);

  // Dynamically set @page orientation in document head so browser print preview initializes accurately
  useEffect(() => {
    applyPrintFormat(printFormat);

    return () => {
      const el = document.getElementById('dynamic-page-orientation-style');
      if (el) el.remove();
    };
  }, [printFormat]);

  // When department changes, update selected faculty
  const handleDeptChange = (newDept) => {
    setSelectedDept(newDept);
    if (selectedFaculty !== 'ALL') {
      const newFiltered = newDept === 'ALL'
        ? facultyMembers
        : facultyMembers.filter(f => (f.dept?.trim() || 'General') === newDept);
      if (!newFiltered.some(f => f.fullName === selectedFaculty)) {
        setSelectedFaculty('ALL');
      }
    }
  };

  // Compute department statistics for any department
  const computeDeptStats = (deptName) => {
    const list = deptName === 'ALL' 
      ? facultyMembers 
      : facultyMembers.filter(f => (f.dept?.trim() || 'General') === deptName);
    
    let prof = 0, assoc = 0, asst = 0, other = 0;
    let th = 0, lab = 0, tut = 0, tot = 0;
    list.forEach(f => {
      const d = (f.designation || '').toLowerCase();
      if (d.includes('associate')) assoc++;
      else if (d.includes('assistant')) asst++;
      else if (d.includes('prof')) prof++;
      else other++;

      th += f.theoryLoad || 0;
      lab += f.labLoad || 0;
      tut += f.tutLoad || 0;
      tot += f.totalLoad || 0;
    });

    return {
      department: deptName === 'ALL' ? 'All Departments' : deptName,
      facultyCount: list.length,
      prof,
      assoc,
      asst,
      other,
      theoryWorkload: th,
      labWorkload: lab,
      tutorialWorkload: tut,
      totalWorkload: tot
    };
  };

  // Active department stats row
  const activeDeptStats = useMemo(() => {
    return computeDeptStats(selectedDept);
  }, [facultyMembers, selectedDept]);

  // Total period counts scheduled on the currently selected day
  const daySummaryStats = useMemo(() => {
    if (selectedDay === 'ALL') return null;
    let totalPeriods = 0, totalTh = 0, totalLab = 0, totalTut = 0, activeFacultyCount = 0;
    const targetList = (selectedFaculty !== 'ALL' && currentFacultyObj) ? [currentFacultyObj] : filteredFacultyList;
    targetList.forEach(fac => {
      const sched = getFacultyDaySchedule(fac, selectedDay, timetableData);
      let facDayPeriods = 0;
      Object.values(sched).forEach(items => {
        items.forEach(it => {
          if (it.isNonAcademic || it.subject?.toUpperCase().includes('COUNSEL') || it.subject?.toUpperCase().includes('LIBRARY') || it.subject?.toUpperCase().includes('SPORT') || it.subject?.toUpperCase().includes('YOGA')) {
            return;
          }
          if (it.isLab || it.subject?.toUpperCase().includes('LAB') || it.subject?.toUpperCase().includes('3DDA')) {
            totalLab++;
            facDayPeriods++;
          } else if (it.isTutorial || it.subject?.toUpperCase().includes('TUT')) {
            totalTut++;
            facDayPeriods++;
          } else {
            totalTh++;
            facDayPeriods++;
          }
        });
      });
      if (facDayPeriods > 0) activeFacultyCount++;
    });
    totalPeriods = totalTh + totalLab + totalTut;
    return { totalPeriods, totalTh, totalLab, totalTut, activeFacultyCount };
  }, [selectedFaculty, currentFacultyObj, filteredFacultyList, selectedDay, timetableData]);

  // Currently selected faculty object if single view
  const currentFacultyObj = useMemo(() => {
    if (selectedFaculty === 'ALL') return null;
    return facultyMembers.find(f => f.fullName === selectedFaculty) || filteredFacultyList[0];
  }, [facultyMembers, filteredFacultyList, selectedFaculty]);

  const isDeptPrint = printTarget === 'department';
  const isDeptConsolidatedMode = isDeptPrint;

  return (
    <div className={`w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8 py-4 ${isDeptPrint ? 'dept-consolidated-print-mode' : 'individual-print-mode'}`}>
      {/* Day-by-Day Tab Selector Subtab Bar */}
      <div className="no-print flex justify-center mb-4">
        <div className="inline-flex flex-wrap items-center justify-center p-1.5 bg-slate-200/90 rounded-2xl border-2 border-slate-700 shadow-sm gap-1 sm:gap-1.5">
          {availableDays.map((d) => {
            const isActive = selectedDay === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 tracking-wide ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-md scale-100 ring-2 ring-blue-900/40'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isActive ? 'text-blue-200' : 'text-slate-500'}`} />
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Department Filter & Faculty Selector Controls Bar */}
      <div className="no-print flex justify-center mb-6">
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-3.5 rounded-xl border-2 border-slate-700 shadow-sm">
          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="dept-select" className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Department:
            </label>
            <select
              id="dept-select"
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer"
            >
              <option value="ALL">All Departments ({facultyMembers.length})</option>
              {departments.filter(d => d !== 'ALL').map((dept) => {
                const count = facultyMembers.filter(f => (f.dept?.trim() || 'General') === dept).length;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-gray-300 hidden sm:inline">|</span>

          {/* Dynamic Faculty Dropdown (with ALL option) */}
          <div className="flex items-center gap-2">
            <label htmlFor="faculty-select" className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Faculty Member:
            </label>
            <select
              id="faculty-select"
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer max-w-xs sm:max-w-md"
            >
              <option value="ALL">
                All Faculty in {selectedDept === 'ALL' ? 'College' : selectedDept} ({filteredFacultyList.length})
              </option>
              {filteredFacultyList.map((f) => {
                const cleanShort = (f.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
                return (
                  <option key={f.fullName} value={f.fullName}>
                    {f.fullName} {cleanShort ? `(${cleanShort})` : ''} {selectedDept === 'ALL' && f.dept ? `• [${f.dept}]` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedDay === 'ALL' && selectedFaculty === 'ALL' && (
            <>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-300">
                <button
                  onClick={() => setFullWeekViewMode('directory')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    fullWeekViewMode === 'directory'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="View faculty names directory with modal popups"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Faculty Names</span>
                </button>
                <button
                  onClick={() => setFullWeekViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    fullWeekViewMode === 'cards'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="View full timetable cards stacked"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Full Timetables</span>
                </button>
              </div>
            </>
          )}

          {selectedDay !== 'ALL' && selectedFaculty === 'ALL' && (
            <>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-300">
                <button
                  onClick={() => setDayViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    dayViewMode === 'cards'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  onClick={() => setDayViewMode('matrix')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    dayViewMode === 'matrix'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Matrix Grid</span>
                </button>
              </div>
            </>
          )}

          {selectedDay !== 'ALL' && (
            <>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-300" title="Toggle between Subject Names and Period Count Numbers (1 for Theory, 2 for Lab)">
                <button
                  onClick={() => setDayContentMode('subjects')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    dayContentMode === 'subjects'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Subjects</span>
                </button>
                <button
                  onClick={() => setDayContentMode('numbers')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    dayContentMode === 'numbers'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Numbers (1/2)</span>
                </button>
              </div>
            </>
          )}

          <span className="text-gray-300 hidden sm:inline">|</span>

          {/* In-App Page Format & Orientation Toggle */}
          <PrintFormatToggle 
            selectedFormat={printFormat}
            onFormatChange={setPrintFormat}
            formats={['a4-portrait', 'a4-landscape', 'a3-landscape']}
          />

          {/* Dedicated Print Button for Faculty Timetables */}
          <button
            onClick={() => {
              setPrintTarget('individual');
              triggerPrint(printFormat, () => setPrintTarget('individual'), 80);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title={`Print Faculty Timetables in ${getPrintFormat(printFormat).label}`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {selectedDay !== 'ALL'
                ? `Print ${activeDayObj.label} (${getPrintFormat(printFormat).shortLabel})`
                : `Print Faculty Timetables (${getPrintFormat(printFormat).shortLabel})`}
            </span>
          </button>

          {/* Dedicated Print Button for 1-Page Weekly Department Timetable */}
          {selectedDept !== 'ALL' && (
            <button
              onClick={() => {
                setPrintTarget('department');
                triggerPrint(printFormat, () => setPrintTarget('department'), 80);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title={`Print ${selectedDept} Department Timetable in ${getPrintFormat(printFormat).label}`}
            >
              <Printer className="w-3.5 h-3.5 text-blue-300" />
              <span>Print {selectedDept} ({getPrintFormat(printFormat).shortLabel})</span>
            </button>
          )}

          {/* Optional Toggle for Dept Stats */}
          {selectedDept !== 'ALL' && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer ml-1 select-none">
              <input
                type="checkbox"
                checked={includeStatsInPrint}
                onChange={(e) => setIncludeStatsInPrint(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600">Include Stats in Print</span>
            </label>
          )}
        </div>
      </div>

      {/* DEPARTMENT WORKLOAD STATISTICS & FACULTY TABLE - ONLY SHOWN WHEN A SPECIFIC DEPARTMENT IS SELECTED */}
      {selectedDept !== 'ALL' && (
        <div className={`space-y-6 mb-6 ${includeStatsInPrint && !isDeptPrint ? '' : 'print:hidden'}`}>
          {/* 1. Department Summary Row with Big Bold Numbers */}
          <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card dept-stats-card">
            <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded font-black text-xs bg-blue-600 text-white tracking-wider">
                  STATISTICS
                </span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
                  Workload Summary • <span className="text-blue-300 underline decoration-blue-400">{selectedDept}</span>
                </h3>
              </div>
              <span className="text-[11px] text-slate-300 font-mono">
                Faculty Count: <span className="font-bold text-white">{activeDeptStats.facultyCount}</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse table-auto sm:table-fixed">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[10.5px] sm:text-[11px]">
                    <th className="py-2 px-2 border-r border-gray-300 text-left w-28 sm:w-36">Department</th>
                    <th className="py-2 px-1.5 border-r border-gray-300 w-16 sm:w-20">Faculty</th>
                    <th className="py-2 px-1 border-r border-gray-300 w-14 sm:w-16">Prof</th>
                    <th className="py-2 px-1 border-r border-gray-300 w-16 sm:w-20">Assoc</th>
                    <th className="py-2 px-1 border-r border-gray-300 w-16 sm:w-20">Asst</th>
                    <th className="py-2 px-1 border-r border-gray-300 w-12 sm:w-14">Other</th>
                    <th className="py-2 px-2 border-r border-gray-300 w-20 sm:w-24 bg-blue-50/60 text-blue-950 font-black">Theory</th>
                    <th className="py-2 px-2 border-r border-gray-300 w-20 sm:w-24 bg-amber-50/60 text-amber-950 font-black">Tutorial</th>
                    <th className="py-2 px-2 border-r border-gray-300 w-20 sm:w-24 bg-purple-50/60 text-purple-950 font-black">Lab</th>
                    <th className="py-2 px-2 w-20 sm:w-24 bg-emerald-50/60 text-emerald-950 font-black">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-2 border-slate-700 bg-white">
                    <td className="py-3 px-2 text-left font-black text-xs sm:text-sm text-slate-900 border-r border-gray-300 font-serif">
                      {activeDeptStats.department}
                    </td>
                    <td className="py-3 px-1.5 font-black text-lg sm:text-xl text-slate-900 border-r border-gray-300 font-mono">
                      {activeDeptStats.facultyCount}
                    </td>
                    <td className="py-3 px-1 font-black text-lg sm:text-xl text-blue-900 border-r border-gray-300 font-mono">
                      {activeDeptStats.prof}
                    </td>
                    <td className="py-3 px-1 font-black text-lg sm:text-xl text-blue-900 border-r border-gray-300 font-mono">
                      {activeDeptStats.assoc}
                    </td>
                    <td className="py-3 px-1 font-black text-lg sm:text-xl text-blue-900 border-r border-gray-300 font-mono">
                      {activeDeptStats.asst}
                    </td>
                    <td className="py-3 px-1 font-black text-lg sm:text-xl text-slate-400 border-r border-gray-300 font-mono">
                      {activeDeptStats.other}
                    </td>
                    <td className="py-3 px-2 font-black text-lg sm:text-xl text-blue-700 bg-blue-50/40 border-r border-gray-300 font-mono">
                      {activeDeptStats.theoryWorkload}
                    </td>
                    <td className="py-3 px-2 font-black text-lg sm:text-xl text-amber-700 bg-amber-50/40 border-r border-gray-300 font-mono">
                      {activeDeptStats.tutorialWorkload}
                    </td>
                    <td className="py-3 px-2 font-black text-lg sm:text-xl text-purple-700 bg-purple-50/40 border-r border-gray-300 font-mono">
                      {activeDeptStats.labWorkload}
                    </td>
                    <td className="py-3 px-2 font-black text-lg sm:text-xl text-emerald-700 bg-emerald-50/40 font-mono">
                      {activeDeptStats.totalWorkload}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Department Faculty Table: S.No, Name of the Faculty, Designation, Theory, Tutorial, Lab, Total Workload */}
          <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card dept-workload-card">
            <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
                  Faculty Workload Distribution • {selectedDept} Department ({filteredFacultyList.length} Faculty)
                </h3>
              </div>
              <span className="text-[11px] text-slate-300 font-mono">
                Click a faculty to view timetable
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[10.5px] sm:text-[11px]">
                    <th className="py-2 px-2 border-r border-gray-300 w-10 text-center">S.No</th>
                    <th className="py-2 px-2.5 border-r border-gray-300 text-left w-48 sm:w-52">Name of the Faculty</th>
                    <th className="py-2 px-2 border-r border-gray-300 text-left w-32 sm:w-36">Designation</th>
                    <th className="py-2 px-2.5 border-r border-gray-300 bg-blue-50/60 text-blue-950 font-black text-left">
                      Theory Workload
                    </th>
                    <th className="py-2 px-2.5 border-r border-gray-300 bg-amber-50/60 text-amber-950 font-black text-left">
                      Tutorial Workload
                    </th>
                    <th className="py-2 px-2.5 border-r border-gray-300 bg-purple-50/60 text-purple-950 font-black text-left">
                      Lab Workload
                    </th>
                    <th className="py-2 px-2 w-16 sm:w-20 bg-emerald-50/60 text-emerald-950 font-black text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFacultyList.map((f, idx) => {
                    const cleanShort = (f.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
                    const isSelected = selectedFaculty === f.fullName;
                    const breakdowns = extractWorkloadBreakdowns(f.assignments);

                    return (
                      <tr
                        key={f.fullName}
                        onClick={() => setSelectedFaculty(f.fullName)}
                        className={`border-b border-gray-200 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-100/90 font-bold' : idx % 2 === 0 ? 'bg-white hover:bg-slate-100/80' : 'bg-gray-50/60 hover:bg-slate-100/80'
                        }`}
                        title="Click to select this faculty member"
                      >
                        <td className="py-2 px-2 border-r border-gray-200 font-mono text-center text-slate-600 font-bold align-middle text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 border-r border-gray-200 text-left font-bold text-slate-900 align-middle text-[11px] leading-tight">
                          <span>{f.fullName}</span>
                          {cleanShort && (
                            <span className="ml-1 text-blue-700 font-mono font-bold text-[10.5px]">
                              ({cleanShort})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 border-r border-gray-200 text-left text-slate-700 font-medium text-[11px] align-middle leading-tight">
                          {f.designation || 'Assistant Professor'}
                        </td>
                        
                        {/* Theory Workload: single-line text */}
                        <td className="py-2 px-2.5 border-r border-gray-200 text-left align-middle text-[11px]">
                          {f.theoryLoad > 0 ? (
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono font-black text-blue-900 text-xs">
                                {f.theoryLoad}
                              </span>
                              <span className="text-slate-600 text-[10.5px] font-medium">
                                ({Object.entries(breakdowns.theoryByBranch).map(([b, hrs]) => `${b}: ${hrs}`).join(', ')})
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-xs">0</span>
                          )}
                        </td>

                        {/* Tutorial Workload: single-line text */}
                        <td className="py-2 px-2.5 border-r border-gray-200 text-left align-middle text-[11px]">
                          {f.tutLoad > 0 ? (
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono font-black text-amber-900 text-xs">
                                {f.tutLoad}
                              </span>
                              <span className="text-slate-600 text-[10.5px] font-medium">
                                ({Object.entries(breakdowns.tutByBranch).map(([b, hrs]) => `${b}: ${hrs}`).join(', ')})
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-xs">0</span>
                          )}
                        </td>

                        {/* Lab Workload: single-line text */}
                        <td className="py-2 px-2.5 border-r border-gray-200 text-left align-middle text-[11px]">
                          {f.labLoad > 0 ? (
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono font-black text-purple-900 text-xs">
                                {f.labLoad}
                              </span>
                              <span className="text-slate-600 text-[10.5px] font-medium">
                                ({Object.entries(breakdowns.labByBranch).map(([b, hrs]) => `${b}: ${hrs}`).join(', ')})
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-xs">0</span>
                          )}
                        </td>

                        {/* Total Workload */}
                        <td className="py-2 px-2 font-mono font-black text-emerald-800 text-sm text-center align-middle">
                          {f.totalLoad || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-700 font-black text-slate-900">
                    <td colSpan={3} className="py-2 px-2.5 text-right uppercase tracking-wider text-[11px] border-r border-gray-300">
                      Total ({filteredFacultyList.length} Faculty):
                    </td>
                    <td className="py-2 px-2.5 border-r border-gray-300 font-mono text-sm text-blue-900 text-left">
                      <span className="font-black">{activeDeptStats.theoryWorkload}</span>
                      <span className="ml-1 text-[10.5px] font-sans text-blue-800 font-semibold">(Theory Hrs)</span>
                    </td>
                    <td className="py-2 px-2.5 border-r border-gray-300 font-mono text-sm text-amber-900 text-left">
                      <span className="font-black">{activeDeptStats.tutorialWorkload}</span>
                      <span className="ml-1 text-[10.5px] font-sans text-amber-800 font-semibold">(Tut Hrs)</span>
                    </td>
                    <td className="py-2 px-2.5 border-r border-gray-300 font-mono text-sm text-purple-900 text-left">
                      <span className="font-black">{activeDeptStats.labWorkload}</span>
                      <span className="ml-1 text-[10.5px] font-sans text-purple-800 font-semibold">(Lab Hrs)</span>
                    </td>
                    <td className="py-2 px-2 font-mono text-base text-emerald-900 text-center">
                      {activeDeptStats.totalWorkload}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Day Overview Banner when a specific day is selected */}
      {selectedDay !== 'ALL' && (
        <div className="no-print mb-4 p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-blue-900 uppercase font-mono tracking-wide">
              Showing {activeDayObj.label} Timetables
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-700">
              Department: <strong className="text-slate-900">{selectedDept === 'ALL' ? 'All Departments' : selectedDept}</strong>
            </span>
            {selectedFaculty !== 'ALL' && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-700">
                  Faculty: <strong className="text-slate-900">{selectedFaculty}</strong>
                </span>
              </>
            )}
            {daySummaryStats && (
              <>
                <span className="text-slate-400">•</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-700 text-white font-mono font-black text-xs shadow-xs">
                  <span>{activeDayObj.label} Total:</span>
                  <span>{daySummaryStats.totalPeriods} Periods</span>
                </span>
                <span className="text-slate-600 font-semibold text-[11px]">
                  ({daySummaryStats.totalTh} Theory, {daySummaryStats.totalLab} Lab{daySummaryStats.totalTut > 0 ? `, ${daySummaryStats.totalTut} Tut` : ''})
                </span>
              </>
            )}
          </div>
          <div className="text-slate-600 font-mono text-[11px]">
            {selectedFaculty === 'ALL' 
              ? `${filteredFacultyList.length} faculty in view (${daySummaryStats?.activeFacultyCount || 0} active today)` 
              : '1 faculty in view'}
          </div>
        </div>
      )}

      {/* RENDER INDIVIDUAL TIMETABLES (Single or All-in-Department One by One or Daily Matrix or Faculty Directory Grid) */}
      {selectedFaculty !== 'ALL' ? (
        currentFacultyObj ? (
          <div className={printTarget === 'department' ? 'print:hidden' : ''}>
            <FacultyTimetableCard
              facultyObj={currentFacultyObj}
              timetableData={timetableData}
              universityInfo={universityInfo}
              onSlotClick={onSlotClick}
              showBreakdown={true}
              isMultiView={false}
              selectedDay={selectedDay}
              contentMode={selectedDay !== 'ALL' ? dayContentMode : 'subjects'}
              onOpenModal={(fac) => setModalFaculty(fac)}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            No faculty found matching the selection.
          </div>
        )
      ) : selectedDay === 'ALL' && fullWeekViewMode === 'directory' ? (
        <div className={printTarget === 'department' ? 'print:hidden' : ''}>
          <FacultyDirectoryGrid
            facultyList={filteredFacultyList}
            onOpenModal={(fac) => setModalFaculty(fac)}
          />
        </div>
      ) : dayViewMode === 'matrix' && selectedDay !== 'ALL' ? (
        <div className={printTarget === 'department' ? 'print:hidden' : ''}>
          <DailyFacultyMatrix
            day={selectedDay}
            facultyList={filteredFacultyList}
            timetableData={timetableData}
            onSlotClick={onSlotClick}
            onSelectFaculty={(name) => {
              const fObj = filteredFacultyList.find(f => f.fullName === name);
              if (fObj) setModalFaculty(fObj);
              else setSelectedFaculty(name);
            }}
            contentMode={dayContentMode}
            onOpenModal={(fac) => setModalFaculty(fac)}
          />
        </div>
      ) : (
        <div className={`space-y-8 print:space-y-0.5 faculty-grid-container ${printTarget === 'department' ? 'print:hidden' : ''}`}>
          {filteredFacultyList.map((facObj, idx) => (
            <FacultyTimetableCard
              key={facObj.fullName}
              facultyObj={facObj}
              timetableData={timetableData}
              universityInfo={universityInfo}
              onSlotClick={onSlotClick}
              showBreakdown={false}
              isMultiView={true}
              index={idx + 1}
              totalCount={filteredFacultyList.length}
              selectedDay={selectedDay}
              contentMode={selectedDay !== 'ALL' ? dayContentMode : 'subjects'}
              onOpenModal={(fac) => setModalFaculty(fac)}
            />
          ))}
        </div>
      )}

      {/* DEPARTMENT CONSOLIDATED TIMETABLE (ONLY RENDERED FOR PRINT WHEN REQUESTED) */}
      {selectedDept !== 'ALL' && (
        <div className={printTarget === 'department' ? 'hidden print:block dept-print-page' : 'hidden'}>
          <DepartmentTimetableGrid
            deptName={selectedDept}
            facultyList={filteredFacultyList}
            timetableData={timetableData}
            universityInfo={universityInfo}
            onSlotClick={onSlotClick}
          />
        </div>
      )}

      {/* FULL-SCREEN MODAL POPUP FOR FACULTY TIMETABLE */}
      <FacultyModalPopup
        isOpen={Boolean(modalFaculty)}
        facultyObj={modalFaculty}
        onClose={() => setModalFaculty(null)}
        allFaculty={filteredFacultyList}
        onSelectFaculty={(fac) => setModalFaculty(fac)}
        timetableData={timetableData}
        universityInfo={universityInfo}
        onSlotClick={onSlotClick}
        initialDay={selectedDay}
        initialContentMode={dayContentMode}
      />
    </div>
  );
}
