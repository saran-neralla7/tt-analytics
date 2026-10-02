import React from 'react';
import { periodSlots, getActiveDays } from '../data/mockData';
import { getFacultyShortName } from '../utils/facultyShortNames';
import initialData from '../data/initialData.json';

const DAY_DISPLAY_NAMES = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday'
};

const THEORY_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:15-12:15',
  '12:15-01:15',
  '02:15-03:15',
  '03:15-04:15'
];

const LAB_BLOCKS = [
  { id: 'b1', s1: '09:00-10:00', s2: '10:00-11:00', range: '09:00-11:00' },
  { id: 'b2', s1: '11:15-12:15', s2: '12:15-01:15', range: '11:15-01:15' },
  { id: 'b3', s1: '02:15-03:15', s2: '03:15-04:15', range: '02:15-04:15' }
];

// Helper to determine the group key for a lab session
function getLabGroupKey(item) {
  const sub = (item.subject || '').toUpperCase().trim();
  if (sub.includes('AITA LAB') || sub.includes('AI LAB')) {
    return 'AI LAB';
  }
  if (sub.includes('PSUC LAB') || sub === 'PSUC') {
    return 'PSUC LAB';
  }
  let b = item.branch || '';
  if (b === 'CSE(AI&ML)-1') b = 'CSM-1';
  else if (b === 'CSE(AI&ML)-2') b = 'CSM-2';
  else if (b === 'CSE (CS & DS)') b = 'CSE(CS&DS)';
  return `${b}__${sub}`;
}

// Helper to format the display title for a lab group
function formatLabGroupTitle(key, firstItem) {
  if (key === 'AI LAB') return 'AI Lab';
  if (key === 'PSUC LAB') return 'PSUC Lab';
  const parts = key.split('__');
  const b = parts[0] || '';
  const sub = parts[1] || '';
  if (sub.includes('PHY. LAB') || sub.includes('CHEM LAB') || sub.includes('CHEM. LAB')) {
    return b ? `${b} Lab` : sub;
  }
  return b ? `${b} ${firstItem?.subject || sub}` : (firstItem?.subject || sub);
}

export default function DepartmentTimetableGrid({
  deptName,
  facultyList = [],
  timetableData = {},
  universityInfo = {},
  onSlotClick
}) {
  const activeDaysList = getActiveDays(timetableData);

  // Map each faculty's schedule directly from masterFacultyTimetables (populated from Timetable_Final)
  const deptFacultyMap = React.useMemo(() => {
    return facultyList.map(f => {
      const facFull = f.fullName;
      const short = f.shortName || getFacultyShortName(facFull);
      let schedule = (initialData.masterFacultyTimetables && initialData.masterFacultyTimetables[facFull]) || {};

      // Fallback: If faculty schedule is empty in masterFacultyTimetables, scan timetableData directly
      const hasEntries = Object.values(schedule).some(d => Object.keys(d || {}).length > 0);
      if (!hasEntries && timetableData) {
        schedule = {};
        activeDaysList.forEach(d => schedule[d] = {});

        const matchesFaculty = (cell) => {
          if (!cell || !cell.faculty) return false;
          if (cell.faculty.includes(facFull)) return true;
          if (short && new RegExp(`\\b${short}\\b`, 'i').test(cell.faculty)) return true;
          return false;
        };

        Object.entries(timetableData).forEach(([branchKey, branchSched]) => {
          Object.entries(branchSched || {}).forEach(([dayKey, daySched]) => {
            Object.entries(daySched || {}).forEach(([slotTime, rawCell]) => {
              const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
              items.forEach(cell => {
                if (matchesFaculty(cell)) {
                  if (!schedule[dayKey]) schedule[dayKey] = {};
                  if (!schedule[dayKey][slotTime]) schedule[dayKey][slotTime] = [];
                  schedule[dayKey][slotTime].push({
                    ...cell,
                    branch: branchKey
                  });
                }
              });
            });
          });
        });
      }

      return {
        fullName: facFull,
        shortName: short,
        schedule
      };
    });
  }, [facultyList, timetableData, activeDaysList]);

  // Helper to check if a specific faculty member has a timetable clash (more than 1 class assigned)
  const checkFacultyClash = React.useCallback((facFullName, day, timeSlot) => {
    const facObj = deptFacultyMap.find(f => f.fullName === facFullName);
    const sched = facObj?.schedule || (initialData.masterFacultyTimetables && initialData.masterFacultyTimetables[facFullName]) || {};
    const daySched = sched[day] || {};

    // Standard 1-hour slot check
    if (THEORY_SLOTS.includes(timeSlot)) {
      const items = daySched[timeSlot] || [];
      if (items.length <= 1) return null;
      return {
        count: items.length,
        branches: items.map(it => `${it.branch} (${it.subject})`),
        details: items.map(it => `• ${it.branch}: ${it.subject}${it.room ? ` in ${it.room}` : ''}`).join('\n')
      };
    }

    // 2-hour lab block check
    const block = LAB_BLOCKS.find(b => b.range === timeSlot || b.id === timeSlot);
    if (block) {
      const items1 = daySched[block.s1] || [];
      const items2 = daySched[block.s2] || [];
      const hasClash1 = items1.length > 1;
      const hasClash2 = items2.length > 1;

      if (!hasClash1 && !hasClash2) return null;

      const detailsList = [];
      const branchList = [];
      if (hasClash1) {
        branchList.push(`${block.s1}: ${items1.map(it => `${it.branch} (${it.subject})`).join(' & ')}`);
        detailsList.push(`At ${block.s1}:\n` + items1.map(it => `  • ${it.branch}: ${it.subject}${it.room ? ` in ${it.room}` : ''}`).join('\n'));
      }
      if (hasClash2) {
        branchList.push(`${block.s2}: ${items2.map(it => `${it.branch} (${it.subject})`).join(' & ')}`);
        detailsList.push(`At ${block.s2}:\n` + items2.map(it => `  • ${it.branch}: ${it.subject}${it.room ? ` in ${it.room}` : ''}`).join('\n'));
      }

      return {
        count: (hasClash1 ? items1.length : 0) + (hasClash2 ? items2.length : 0),
        branches: branchList,
        details: detailsList.join('\n\n')
      };
    }

    return null;
  }, [deptFacultyMap]);

  // Aggregate all schedule clashes for this department
  const departmentClashes = React.useMemo(() => {
    const clashes = [];
    deptFacultyMap.forEach(fac => {
      const sched = fac.schedule || (initialData.masterFacultyTimetables && initialData.masterFacultyTimetables[fac.fullName]) || {};
      activeDaysList.forEach(day => {
        const daySched = sched[day] || {};
        THEORY_SLOTS.forEach(slot => {
          const items = daySched[slot] || [];
          if (items.length > 1) {
            clashes.push({
              faculty: fac.fullName,
              shortName: fac.shortName,
              day: DAY_DISPLAY_NAMES[day] || day,
              slot,
              count: items.length,
              branches: items.map(it => `${it.branch} (${it.subject})`),
              details: items.map(it => `${it.branch}: ${it.subject}`).join(' & ')
            });
          }
        });
      });
    });

    return clashes;
  }, [deptFacultyMap, activeDaysList]);

  // Pre-calculate Day Data: Separated into Theory and Labs
  const formattedScheduleByDay = React.useMemo(() => {
    const result = {};

    activeDaysList.forEach(day => {
      const dayDisplayName = DAY_DISPLAY_NAMES[day] || day;

      // 1. Process Theory Slots (6 periods)
      const theorySlots = {};
      THEORY_SLOTS.forEach(slotTime => {
        const facultyEntries = [];
        const rawItems = [];

        deptFacultyMap.forEach(fac => {
          const items = fac.schedule[day]?.[slotTime] || [];
          const theoryItems = items.filter(it => !it.isLab && !(it.subject && it.subject.toLowerCase().includes('lab')));
          if (theoryItems.length > 0) {
            theoryItems.forEach(it => {
              rawItems.push({
                ...it,
                faculty: fac.fullName,
                facultyShort: fac.shortName
              });
            });

            facultyEntries.push({
              fullName: fac.fullName,
              shortName: fac.shortName,
              items: theoryItems,
              clash: checkFacultyClash(fac.fullName, day, slotTime)
            });
          }
        });

        theorySlots[slotTime] = {
          facultyEntries,
          rawItems
        };
      });

      // 2. Process Lab Blocks (3 blocks)
      const collectSlotLabs = (slotTime) => {
        const labMap = new Map();
        const rawItems = [];

        deptFacultyMap.forEach(fac => {
          const items = fac.schedule[day]?.[slotTime] || [];
          const labItems = items.filter(it => it.isLab || (it.subject && it.subject.toLowerCase().includes('lab')));
          labItems.forEach(it => {
            rawItems.push({
              ...it,
              faculty: fac.fullName,
              facultyShort: fac.shortName
            });

            const groupKey = getLabGroupKey(it);
            if (!labMap.has(groupKey)) {
              labMap.set(groupKey, {
                groupKey,
                branch: it.branch,
                subject: it.subject,
                room: it.room,
                firstItem: it,
                facultyList: []
              });
            }

            const grp = labMap.get(groupKey);
            if (!grp.facultyList.some(f => f.fullName === fac.fullName)) {
              grp.facultyList.push({
                fullName: fac.fullName,
                shortName: fac.shortName,
                clash: checkFacultyClash(fac.fullName, day, slotTime)
              });
            }
          });
        });

        return {
          groups: Array.from(labMap.values()),
          rawItems
        };
      };

      const labBlocks = LAB_BLOCKS.map(block => {
        const s1Data = collectSlotLabs(block.s1);
        const s2Data = collectSlotLabs(block.s2);

        const s1Keys = s1Data.groups.map(g => `${g.groupKey}__${g.facultyList.map(f => f.shortName).sort().join(',')}`).sort().join(';;');
        const s2Keys = s2Data.groups.map(g => `${g.groupKey}__${g.facultyList.map(f => f.shortName).sort().join(',')}`).sort().join(';;');

        // Check if both hours have the same lab sessions (standard 2-hour lab)
        const isMerged = (s1Data.groups.length === 0 && s2Data.groups.length === 0) || (s1Keys === s2Keys);

        if (isMerged) {
          return {
            id: block.id,
            isMerged: true,
            range: block.range,
            groups: s1Data.groups.length > 0 ? s1Data.groups : s2Data.groups,
            rawItems: [...s1Data.rawItems, ...s2Data.rawItems]
          };
        } else {
          return {
            id: block.id,
            isMerged: false,
            s1: {
              slotTime: block.s1,
              groups: s1Data.groups,
              rawItems: s1Data.rawItems
            },
            s2: {
              slotTime: block.s2,
              groups: s2Data.groups,
              rawItems: s2Data.rawItems
            }
          };
        }
      });

      result[day] = {
        dayDisplayName,
        theorySlots,
        labBlocks
      };
    });

    return result;
  }, [activeDaysList, deptFacultyMap, checkFacultyClash]);

  const totalTableRows = activeDaysList.length * 2;

  // Helper to render a lab block group entry
  const renderLabGroupItem = (grp, day, slotRange) => {
    const title = formatLabGroupTitle(grp.groupKey, grp.firstItem);
    return (
      <div 
        key={grp.groupKey} 
        className="text-[10px] sm:text-[10.5px] print:text-[8pt] text-black font-sans leading-tight py-0.5 border-b border-gray-100 print:border-gray-200 last:border-none"
      >
        <span className="font-bold text-black">{title}</span>
        {' ('}
        {grp.facultyList.map((f, fIdx) => (
          <React.Fragment key={fIdx}>
            {fIdx > 0 && ', '}
            {f.clash ? (
              <span 
                className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-0.5 py-0 print:border-black print:border print:bg-transparent print:text-black cursor-help"
                title={`⚠️ CLASH DETECTED:\n${f.fullName} (${f.shortName}) has multiple classes scheduled at ${day} ${slotRange}:\n${f.clash.details}`}
              >
                {f.shortName}*
              </span>
            ) : (
              <span className="font-black text-black" title={f.fullName}>
                {f.shortName}
              </span>
            )}
          </React.Fragment>
        ))}
        {')'}
        {grp.room && (
          <span className="text-[9px] print:text-[7pt] text-slate-600 print:text-black font-semibold ml-0.5 print:hidden">
            [{grp.room}]
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card print:border-black print:rounded-none print:shadow-none">
      {/* University Official Header */}
      <div className="border-b-2 border-slate-700 print:border-black bg-white px-4 py-2 print:px-2 print:py-1">
        <div className="flex items-center justify-between gap-2">
          {/* University Crest */}
          <div className="w-16 sm:w-20 flex-shrink-0 flex items-center justify-start">
            <img 
              src={universityInfo.logo || '/gvpihlr.png'} 
              alt="GVPIHLR Logo" 
              className="h-16 w-16 sm:h-20 sm:w-20 print:h-12 print:w-12 object-contain drop-shadow-xs"
            />
          </div>

          {/* Institution & Timetable Title */}
          <div className="text-center flex-1">
            <h1 className="text-[12pt] sm:text-[13pt] print:text-[11.5pt] font-black uppercase font-serif tracking-tight text-black leading-tight">
              {universityInfo.name || 'GAYATRI VIDYA PARISHAD'}
            </h1>
            <p className="text-[7.5pt] sm:text-[8pt] print:text-[7pt] text-black font-semibold leading-tight mt-0.5">
              {universityInfo.statusText || 'INSTITUTE OF HIGHER LEARNING AND RESEARCH'}
            </p>
            <p className="text-[7pt] print:text-[6.5pt] text-black leading-tight">
              {universityInfo.address || 'Kommadi, Madhurawada, Visakhapatnam - 530 048, Andhra Pradesh'}
            </p>
            <div className="mt-0.5 flex items-center justify-center gap-3">
              <span className="text-[8.5pt] sm:text-[9pt] print:text-[8pt] font-black text-black uppercase tracking-wide font-sans">
                Faculty theory / Lab Timetable AY: {universityInfo.academicYear || '2026-27'} SEM 1
              </span>
            </div>
            <div className="text-[9.5pt] sm:text-[10pt] print:text-[9pt] font-black text-blue-950 print:text-black font-sans tracking-tight">
              DEPARTMENT OF {deptName.toUpperCase()}
            </div>
            <div className="text-[7pt] sm:text-[7.5pt] font-extrabold text-slate-700 mt-0.5 print:text-[7pt] print:text-black">
              Faculty ({facultyList.length}):{' '}
              {facultyList.length <= 13
                ? facultyList.map(f => `${f.shortName || getFacultyShortName(f.fullName)}: ${f.fullName}`).join(' • ')
                : facultyList.map(f => f.shortName || getFacultyShortName(f.fullName)).join(', ')
              }
            </div>

            {/* Clash Alert Indicator Banner */}
            {departmentClashes.length > 0 ? (
              <div className="mt-1 px-2 py-0.5 bg-red-50 print:bg-white border border-red-300 print:border-black rounded-sm print:rounded-none text-left flex flex-wrap items-center justify-between gap-1 text-[7.5pt] print:text-[7pt] leading-tight">
                <div>
                  <span className="font-black text-red-700 print:text-black uppercase tracking-wide">
                    ⚠️ Schedule Conflicts ({departmentClashes.length} Periods with Overlaps):{' '}
                  </span>
                  <span className="text-red-900 print:text-black font-semibold">
                    {departmentClashes.map((c, i) => (
                      <span key={i} className="inline-block mr-2">
                        <strong className="font-black">{c.shortName}</strong> ({c.day} {c.slot}: {c.branches.join(' & ')}){i < departmentClashes.length - 1 ? ' •' : ''}
                      </span>
                    ))}
                  </span>
                </div>
                <span className="font-extrabold text-red-700 print:text-black text-[7pt] print:text-[6.5pt] uppercase whitespace-nowrap">
                  [* Marked in red with asterisk]
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-[7pt] print:text-[6.5pt] font-bold text-emerald-700 print:text-black">
                ✓ No schedule conflicts or overlapping periods detected for this department.
              </div>
            )}
          </div>

          {/* Spacer for symmetrical alignment */}
          <div className="w-16 sm:w-20 flex-shrink-0"></div>
        </div>
      </div>

      {/* Main Timetable Matrix: Exactly 2 Rows per Day (Theory & Labs Separated) */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse table-fixed min-w-[950px] border-2 border-slate-700 print:min-w-0 print:border-black print:table-fixed">
          <thead>
            <tr className="bg-gray-100 print:bg-white text-gray-800 font-bold border-b-2 border-slate-700 print:border-black uppercase tracking-wider">
              {/* DAY Header */}
              <th className="py-2 px-2 border-r border-gray-300 print:border-black w-24 sm:w-28 print:w-20 text-xs print:text-[8.5pt] font-black text-black">
                DAY
              </th>

              {/* 09:00 - 10:00 */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black text-black">
                <span className="font-black text-black text-xs sm:text-[12.5px] print:text-[8.5pt] tracking-tight block">
                  09:00–10:00
                </span>
              </th>

              {/* 10:00 - 11:00 */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black text-black">
                <span className="font-black text-black text-xs sm:text-[12.5px] print:text-[8.5pt] tracking-tight block">
                  10:00–11:00
                </span>
              </th>

              {/* BREAK Column (11:00 - 11:15) */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black bg-gray-100 print:bg-white text-black font-black w-14 sm:w-16 print:w-11 text-center">
                <span className="font-black text-black text-xs sm:text-[11px] print:text-[8pt] tracking-tight block">
                  11:00–11:15
                </span>
                <div className="text-[10px] print:text-[7pt] tracking-normal text-slate-800 print:text-black font-black mt-0.5">
                  BREAK
                </div>
              </th>

              {/* 11:15 - 12:15 */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black text-black">
                <span className="font-black text-black text-xs sm:text-[12.5px] print:text-[8.5pt] tracking-tight block">
                  11:15–12:15
                </span>
              </th>

              {/* 12:15 - 01:15 */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black text-black">
                <span className="font-black text-black text-xs sm:text-[12.5px] print:text-[8.5pt] tracking-tight block">
                  12:15–01:15
                </span>
              </th>

              {/* LUNCH Column (01:15 - 02:15) */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black bg-gray-100 print:bg-white text-black font-black w-14 sm:w-16 print:w-11 text-center">
                <span className="font-black text-black text-xs sm:text-[11px] print:text-[8pt] tracking-tight block">
                  01:15–02:15
                </span>
                <div className="text-[10px] print:text-[7pt] tracking-normal text-slate-800 print:text-black font-black mt-0.5">
                  LUNCH
                </div>
              </th>

              {/* 02:15 - 03:15 */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black text-black">
                <span className="font-black text-black text-xs sm:text-[12.5px] print:text-[8.5pt] tracking-tight block">
                  02:15–03:15
                </span>
              </th>

              {/* 03:15 - 04:15 */}
              <th className="py-2 px-1 border-gray-300 print:border-black text-black">
                <span className="font-black text-black text-xs sm:text-[12.5px] print:text-[8.5pt] tracking-tight block">
                  03:15–04:15
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y-2 divide-slate-600 print:divide-black">
            {activeDaysList.map((day, dayIdx) => {
              const dayData = formattedScheduleByDay[day] || {
                dayDisplayName: DAY_DISPLAY_NAMES[day] || day,
                theorySlots: {},
                labBlocks: []
              };
              const { dayDisplayName, theorySlots, labBlocks } = dayData;

              return (
                <React.Fragment key={day}>
                  {/* ROW 1: THEORY ROW (e.g. "Monday theory") */}
                  <tr className="border-b border-slate-300 print:border-black hover:bg-gray-50/80 transition-colors">
                    {/* Day Column: e.g. "Monday theory" */}
                    <td className="py-1.5 px-2 print:py-1 print:px-1 font-black text-black bg-gray-100 print:bg-white border-r border-gray-300 print:border-black align-middle text-center print:text-[8pt] font-sans">
                      <div className="leading-tight">
                        <span className="block font-bold">{dayDisplayName}</span>
                        <span className="block text-[10px] print:text-[7pt] font-semibold text-slate-600 print:text-black">theory</span>
                      </div>
                    </td>

                    {/* Period 1: 09:00 - 10:00 */}
                    {(() => {
                      const slotData = theorySlots['09:00-10:00'] || { facultyEntries: [], rawItems: [] };
                      if (slotData.facultyEntries.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '09:00-10:00', deptName)}
                          className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            {slotData.facultyEntries.map((fe, feIdx) => (
                              <div key={feIdx} className="leading-tight">
                                {fe.clash ? (
                                  <span 
                                    className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-0.5 py-0 text-[10.5px] print:text-[8pt] print:border-black print:border print:bg-transparent print:text-black cursor-help"
                                    title={`⚠️ CLASH: ${fe.fullName} (${fe.shortName}) has multiple classes at ${dayDisplayName} 09:00-10:00:\n${fe.clash.details}`}
                                  >
                                    {fe.shortName}*
                                  </span>
                                ) : (
                                  <span 
                                    className="font-bold text-black text-[11px] print:text-[8.2pt]"
                                    title={`${fe.fullName}: ${fe.items.map(it => `${it.branch} (${it.subject})${it.room ? ` in ${it.room}` : ''}`).join(', ')}`}
                                  >
                                    {fe.shortName}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* Period 2: 10:00 - 11:00 */}
                    {(() => {
                      const slotData = theorySlots['10:00-11:00'] || { facultyEntries: [], rawItems: [] };
                      if (slotData.facultyEntries.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '10:00-11:00', deptName)}
                          className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            {slotData.facultyEntries.map((fe, feIdx) => (
                              <div key={feIdx} className="leading-tight">
                                {fe.clash ? (
                                  <span 
                                    className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-0.5 py-0 text-[10.5px] print:text-[8pt] print:border-black print:border print:bg-transparent print:text-black cursor-help"
                                    title={`⚠️ CLASH: ${fe.fullName} (${fe.shortName}) has multiple classes at ${dayDisplayName} 10:00-11:00:\n${fe.clash.details}`}
                                  >
                                    {fe.shortName}*
                                  </span>
                                ) : (
                                  <span 
                                    className="font-bold text-black text-[11px] print:text-[8.2pt]"
                                    title={`${fe.fullName}: ${fe.items.map(it => `${it.branch} (${it.subject})${it.room ? ` in ${it.room}` : ''}`).join(', ')}`}
                                  >
                                    {fe.shortName}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* BREAK Column (Rendered only on row 0, spans all 10 rows) */}
                    {dayIdx === 0 && (
                      <td 
                        rowSpan={totalTableRows}
                        className="py-2 px-1 bg-gray-50 print:bg-white text-black font-black border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle select-none text-center"
                      >
                        <div className="flex flex-col items-center justify-center font-black tracking-widest leading-loose py-2 select-none uppercase font-serif">
                          {'BREAK'.split('').map((char, cIdx) => (
                            <span key={cIdx} className="my-0.5 sm:my-1 text-[13px] sm:text-base print:text-[11pt] font-black text-black">
                              {char}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* Period 3: 11:15 - 12:15 */}
                    {(() => {
                      const slotData = theorySlots['11:15-12:15'] || { facultyEntries: [], rawItems: [] };
                      if (slotData.facultyEntries.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '11:15-12:15', deptName)}
                          className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            {slotData.facultyEntries.map((fe, feIdx) => (
                              <div key={feIdx} className="leading-tight">
                                {fe.clash ? (
                                  <span 
                                    className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-0.5 py-0 text-[10.5px] print:text-[8pt] print:border-black print:border print:bg-transparent print:text-black cursor-help"
                                    title={`⚠️ CLASH: ${fe.fullName} (${fe.shortName}) has multiple classes at ${dayDisplayName} 11:15-12:15:\n${fe.clash.details}`}
                                  >
                                    {fe.shortName}*
                                  </span>
                                ) : (
                                  <span 
                                    className="font-bold text-black text-[11px] print:text-[8.2pt]"
                                    title={`${fe.fullName}: ${fe.items.map(it => `${it.branch} (${it.subject})${it.room ? ` in ${it.room}` : ''}`).join(', ')}`}
                                  >
                                    {fe.shortName}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* Period 4: 12:15 - 01:15 */}
                    {(() => {
                      const slotData = theorySlots['12:15-01:15'] || { facultyEntries: [], rawItems: [] };
                      if (slotData.facultyEntries.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '12:15-01:15', deptName)}
                          className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            {slotData.facultyEntries.map((fe, feIdx) => (
                              <div key={feIdx} className="leading-tight">
                                {fe.clash ? (
                                  <span 
                                    className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-0.5 py-0 text-[10.5px] print:text-[8pt] print:border-black print:border print:bg-transparent print:text-black cursor-help"
                                    title={`⚠️ CLASH: ${fe.fullName} (${fe.shortName}) has multiple classes at ${dayDisplayName} 12:15-01:15:\n${fe.clash.details}`}
                                  >
                                    {fe.shortName}*
                                  </span>
                                ) : (
                                  <span 
                                    className="font-bold text-black text-[11px] print:text-[8.2pt]"
                                    title={`${fe.fullName}: ${fe.items.map(it => `${it.branch} (${it.subject})${it.room ? ` in ${it.room}` : ''}`).join(', ')}`}
                                  >
                                    {fe.shortName}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* LUNCH Column (Rendered only on row 0, spans all 10 rows) */}
                    {dayIdx === 0 && (
                      <td 
                        rowSpan={totalTableRows}
                        className="py-2 px-1 bg-gray-50 print:bg-white text-black font-black border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle select-none text-center"
                      >
                        <div className="flex flex-col items-center justify-center font-black tracking-widest leading-loose py-2 select-none uppercase font-serif">
                          {'LUNCH'.split('').map((char, cIdx) => (
                            <span key={cIdx} className="my-0.5 sm:my-1 text-[13px] sm:text-base print:text-[11pt] font-black text-black">
                              {char}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* Period 5: 02:15 - 03:15 */}
                    {(() => {
                      const slotData = theorySlots['02:15-03:15'] || { facultyEntries: [], rawItems: [] };
                      if (slotData.facultyEntries.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '02:15-03:15', deptName)}
                          className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            {slotData.facultyEntries.map((fe, feIdx) => (
                              <div key={feIdx} className="leading-tight">
                                {fe.clash ? (
                                  <span 
                                    className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-0.5 py-0 text-[10.5px] print:text-[8pt] print:border-black print:border print:bg-transparent print:text-black cursor-help"
                                    title={`⚠️ CLASH: ${fe.fullName} (${fe.shortName}) has multiple classes at ${dayDisplayName} 02:15-03:15:\n${fe.clash.details}`}
                                  >
                                    {fe.shortName}*
                                  </span>
                                ) : (
                                  <span 
                                    className="font-bold text-black text-[11px] print:text-[8.2pt]"
                                    title={`${fe.fullName}: ${fe.items.map(it => `${it.branch} (${it.subject})${it.room ? ` in ${it.room}` : ''}`).join(', ')}`}
                                  >
                                    {fe.shortName}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* Period 6: 03:15 - 04:15 */}
                    {(() => {
                      const slotData = theorySlots['03:15-04:15'] || { facultyEntries: [], rawItems: [] };
                      if (slotData.facultyEntries.length === 0) {
                        return (
                          <td className="p-1 border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '03:15-04:15', deptName)}
                          className="py-1 px-1 border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            {slotData.facultyEntries.map((fe, feIdx) => (
                              <div key={feIdx} className="leading-tight">
                                {fe.clash ? (
                                  <span 
                                    className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-0.5 py-0 text-[10.5px] print:text-[8pt] print:border-black print:border print:bg-transparent print:text-black cursor-help"
                                    title={`⚠️ CLASH: ${fe.fullName} (${fe.shortName}) has multiple classes at ${dayDisplayName} 03:15-04:15:\n${fe.clash.details}`}
                                  >
                                    {fe.shortName}*
                                  </span>
                                ) : (
                                  <span 
                                    className="font-bold text-black text-[11px] print:text-[8.2pt]"
                                    title={`${fe.fullName}: ${fe.items.map(it => `${it.branch} (${it.subject})${it.room ? ` in ${it.room}` : ''}`).join(', ')}`}
                                  >
                                    {fe.shortName}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })()}
                  </tr>

                  {/* ROW 2: LABS ROW (e.g. "Monday Labs") */}
                  <tr className="border-b-2 border-slate-600 print:border-b-2 print:border-black hover:bg-gray-50/80 transition-colors">
                    {/* Day Column: e.g. "Monday Labs" */}
                    <td className="py-1.5 px-2 print:py-1 print:px-1 font-black text-black bg-gray-100 print:bg-white border-r border-gray-300 print:border-black align-middle text-center print:text-[8pt] font-sans">
                      <div className="leading-tight">
                        <span className="block font-bold">{dayDisplayName}</span>
                        <span className="block text-[10px] print:text-[7pt] font-semibold text-slate-600 print:text-black">Labs</span>
                      </div>
                    </td>

                    {/* Block 1: 09:00 - 11:00 */}
                    {(() => {
                      const block = labBlocks[0];
                      if (!block) return null;
                      if (block.isMerged) {
                        if (block.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(block.rawItems, day, block.range, deptName)}
                            className="py-1 px-1.5 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {block.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.range))}
                            </div>
                          </td>
                        );
                      } else {
                        // Split into s1 and s2
                        return (
                          <React.Fragment>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s1.rawItems, day, block.s1.slotTime, deptName)}
                              className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s1.groups.length > 0 ? (
                                  block.s1.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.s1.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                                )}
                              </div>
                            </td>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s2.rawItems, day, block.s2.slotTime, deptName)}
                              className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s2.groups.length > 0 ? (
                                  block.s2.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.s2.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                                )}
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      }
                    })()}

                    {/* (BREAK Column is spanning vertically from row 0) */}

                    {/* Block 2: 11:15 - 01:15 */}
                    {(() => {
                      const block = labBlocks[1];
                      if (!block) return null;
                      if (block.isMerged) {
                        if (block.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(block.rawItems, day, block.range, deptName)}
                            className="py-1 px-1.5 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {block.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.range))}
                            </div>
                          </td>
                        );
                      } else {
                        // Split into s1 and s2
                        return (
                          <React.Fragment>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s1.rawItems, day, block.s1.slotTime, deptName)}
                              className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s1.groups.length > 0 ? (
                                  block.s1.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.s1.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                                )}
                              </div>
                            </td>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s2.rawItems, day, block.s2.slotTime, deptName)}
                              className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s2.groups.length > 0 ? (
                                  block.s2.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.s2.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                                )}
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      }
                    })()}

                    {/* (LUNCH Column is spanning vertically from row 0) */}

                    {/* Block 3: 02:15 - 04:15 */}
                    {(() => {
                      const block = labBlocks[2];
                      if (!block) return null;
                      if (block.isMerged) {
                        if (block.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(block.rawItems, day, block.range, deptName)}
                            className="py-1 px-1.5 border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {block.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.range))}
                            </div>
                          </td>
                        );
                      } else {
                        // Split into s1 and s2
                        return (
                          <React.Fragment>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s1.rawItems, day, block.s1.slotTime, deptName)}
                              className="py-1 px-1 border-r border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s1.groups.length > 0 ? (
                                  block.s1.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.s1.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                                )}
                              </div>
                            </td>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s2.rawItems, day, block.s2.slotTime, deptName)}
                              className="py-1 px-1 border-gray-300 print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s2.groups.length > 0 ? (
                                  block.s2.groups.map(grp => renderLabGroupItem(grp, dayDisplayName, block.s2.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-light select-none text-xs print:text-[8pt]">—</span>
                                )}
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      }
                    })()}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Conflict Legend / Indicator Footer */}
      <div className="px-3 py-1 bg-gray-50 print:bg-white border-t border-slate-300 print:border-black flex flex-wrap items-center justify-between text-[7.5pt] print:text-[7pt] text-slate-700 print:text-black font-medium">
        <div>
          <span className="font-black text-black">* Conflict Marker [*]: </span>
          <span>Faculty short names marked with an asterisk inside a red badge (e.g. <strong>[ VSJ* ]</strong>) are simultaneously scheduled in more than one class during that period.</span>
        </div>
        <div className="font-bold text-slate-500 print:hidden text-[7pt]">
          Hover over faculty / cells to inspect details, or click a cell to open full class info
        </div>
      </div>
    </div>
  );
}
