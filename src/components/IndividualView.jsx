import React, { useState, useMemo, useEffect } from 'react';
import { days, periodSlots, getActiveDays } from '../data/mockData';
import { UserCheck, Filter, Users, Table, Printer } from 'lucide-react';
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
  totalCount = 1 
}) {
  const facFull = facultyObj.fullName;
  const facShort = (facultyObj.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
  const facShortWithTitle = facultyObj.shortName?.trim();

  // Dynamic active days: exclude Saturday unless Saturday has classes
  const activeDays = useMemo(() => getActiveDays(timetableData), [timetableData]);

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

  // Compute workload metrics
  let totalHours = 0;
  activeDays.forEach(day => {
    Object.values(facultySchedule[day] || {}).forEach(items => {
      items.forEach(() => {
        totalHours += 1;
      });
    });
  });

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
          <h3 className="text-xs sm:text-sm font-black text-blue-900 uppercase font-mono">
            INDIVIDUAL FACULTY TIMETABLE: <span className="underline decoration-blue-600 font-extrabold">{facFull}</span>
            {facShort && (
              <span className="ml-1.5 text-blue-700">({facShort})</span>
            )}
          </h3>
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
        <p className="text-xs text-gray-600 mt-0.5 font-mono">
          Academic Year {universityInfo.academicYear} | Official Workload: <span className="font-bold text-slate-900">{facultyObj.totalLoad || totalHours} Hrs/Wk</span> (Theory: {facultyObj.theoryLoad || 0}, Lab: {facultyObj.labLoad || 0}, Tut: {facultyObj.tutLoad || 0})
        </p>
      </div>

      {/* Print-Only Header Strip */}
      <div className="print-only px-2 py-0.5 bg-gray-100 border-b-2 border-black font-sans text-xs print:text-[9pt] font-bold text-black flex justify-between items-center leading-tight">
        <div>
          <span className="font-black uppercase tracking-tight text-sm print:text-[10pt]">{facFull}</span>
          {facShort && <span className="ml-1 text-slate-800 print:text-black print:text-[9pt]">({facShort})</span>}
          <span className="mx-1 text-slate-400 print:text-black">|</span>
          <span className="font-bold text-slate-700 print:text-black print:text-[9pt]">Dept: {facultyObj.dept || 'General'}</span>
          {facultyObj.designation && <span className="ml-1 font-semibold text-slate-600 print:text-black print:text-[8.5pt]">({facultyObj.designation})</span>}
        </div>
        <div className="font-mono text-xs print:text-[8.5pt]">
          Workload: <span className="font-black text-black">{facultyObj.totalLoad || totalHours} Hrs/Wk</span> (Th: {facultyObj.theoryLoad || 0}, Lab: {facultyObj.labLoad || 0}, Tut: {facultyObj.tutLoad || 0})
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
                </tr>
              );
            })}
          </tbody>
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

  // Currently selected faculty object if single view
  const currentFacultyObj = useMemo(() => {
    if (selectedFaculty === 'ALL') return null;
    return facultyMembers.find(f => f.fullName === selectedFaculty) || filteredFacultyList[0];
  }, [facultyMembers, filteredFacultyList, selectedFaculty]);

  const isDeptPrint = printTarget === 'department';
  const isDeptConsolidatedMode = isDeptPrint;

  return (
    <div className={`w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8 py-4 ${isDeptPrint ? 'dept-consolidated-print-mode' : 'individual-print-mode'}`}>
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
            <span>Print Faculty Timetables ({getPrintFormat(printFormat).shortLabel})</span>
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

      {/* RENDER INDIVIDUAL TIMETABLES (Single or All-in-Department One by One) */}
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
            />
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            No faculty found matching the selection.
          </div>
        )
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
    </div>
  );
}
