import React from 'react';
import { periodSlots, getActiveDays } from '../data/mockData';
import { getFacultyShortName } from '../utils/facultyShortNames';
import initialData from '../data/initialData.json';

const DAY_SHORT_NAMES = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat'
};

const BREAK_CHARS = ['B', 'R', 'E', 'A', 'K'];
const LUNCH_CHARS = ['L', 'U', 'N', 'C', 'H'];

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
  const branch = (item.branch || '').trim();
  const sub = (item.subject || 'Lab').split('\n')[0].trim();
  const room = (item.room || '').trim();
  return `${branch}__${sub}__${room}`;
}

// Helper to format the display title for a lab group
function formatLabGroupTitle(key, firstItem) {
  let branch = '';
  let sub = '';
  if (firstItem) {
    branch = (firstItem.branch || '').trim();
    sub = (firstItem.subject || 'Lab').split('\n')[0].trim();
  } else if (key) {
    const parts = key.split('__');
    branch = parts[0] || '';
    sub = parts[1] || 'Lab';
  }
  const branchPrefix = branch && !sub.toUpperCase().startsWith(branch.toUpperCase())
    ? `${branch} `
    : '';
  return `${branchPrefix}${sub}`;
}

// Helper to sort facultyList in the exact order specified in the timetable slot / uploaded Excel sheet
function sortFacultyByOriginalOrder(facultyList, orderStr) {
  if (!orderStr || !Array.isArray(facultyList) || facultyList.length <= 1) return facultyList;

  function getFacultyOrderIndex(f) {
    const sName = f.shortName || '';
    const fName = f.fullName || '';

    // 1. Try matching short initials as a token (e.g. "MRR" in "MRR, BSK")
    if (sName) {
      const sRegex = new RegExp(`(^|[^a-zA-Z0-9])${sName}([^a-zA-Z0-9]|$)`, 'i');
      const match = orderStr.match(sRegex);
      if (match && match.index !== undefined) {
        return match.index;
      }
    }
    // 2. Try matching full name
    if (fName) {
      const idx = orderStr.indexOf(fName);
      if (idx !== -1) return idx;
    }
    return 999;
  }

  return [...facultyList].sort((a, b) => getFacultyOrderIndex(a) - getFacultyOrderIndex(b));
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

  // Pre-calculate Day Data: Separated into Theory (with subject names) and Labs
  const formattedScheduleByDay = React.useMemo(() => {
    const result = {};

    activeDaysList.forEach(day => {
      const dayShortName = DAY_SHORT_NAMES[day] || day;

      // 1. Process Theory Slots (6 periods) - Grouped by Branch + Subject + Room
      const theorySlots = {};
      THEORY_SLOTS.forEach(slotTime => {
        const sessionMap = new Map();
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

              const branch = (it.branch || '').trim();
              const sub = (it.subject || 'Theory').trim();
              const room = (it.room || '').trim();
              const groupKey = `${branch}__${sub}__${room}`;

              if (!sessionMap.has(groupKey)) {
                sessionMap.set(groupKey, {
                  branch,
                  subject: sub,
                  room,
                  facultyList: []
                });
              }

              const grp = sessionMap.get(groupKey);
              if (!grp.facultyList.some(f => f.fullName === fac.fullName)) {
                grp.facultyList.push({
                  fullName: fac.fullName,
                  shortName: fac.shortName,
                  room,
                  branch,
                  clash: checkFacultyClash(fac.fullName, day, slotTime)
                });
              }
            });
          }
        });

        // Ensure faculty list order matches the uploaded Excel sheet
        sessionMap.forEach(grp => {
          const branchSched = timetableData?.[grp.branch]?.[day]?.[slotTime];
          const cellItems = Array.isArray(branchSched) ? branchSched : branchSched ? [branchSched] : [];
          const matchCell = cellItems.find(c => {
            if (!c) return false;
            const sNorm = (c.subject || '').trim().toUpperCase();
            const grpNorm = (grp.subject || '').trim().toUpperCase();
            return sNorm === grpNorm || sNorm.includes(grpNorm) || grpNorm.includes(sNorm);
          });
          const orderStr = matchCell?.rawFaculty || matchCell?.faculty || '';
          if (orderStr) {
            grp.facultyList = sortFacultyByOriginalOrder(grp.facultyList, orderStr);
          }
        });

        theorySlots[slotTime] = {
          groups: Array.from(sessionMap.values()),
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

        // Ensure faculty list order matches the uploaded Excel sheet
        labMap.forEach(grp => {
          const branchSched = timetableData?.[grp.branch]?.[day]?.[slotTime];
          const cellItems = Array.isArray(branchSched) ? branchSched : branchSched ? [branchSched] : [];
          const matchCell = cellItems.find(c => {
            if (!c) return false;
            const sNorm = (c.subject || '').trim().toUpperCase();
            const grpNorm = (grp.subject || '').trim().toUpperCase();
            return sNorm === grpNorm || sNorm.includes(grpNorm) || grpNorm.includes(sNorm);
          });
          const orderStr = matchCell?.rawFaculty || matchCell?.faculty || grp.firstItem?.rawFaculty || '';
          if (orderStr) {
            grp.facultyList = sortFacultyByOriginalOrder(grp.facultyList, orderStr);
          }
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
          const rawGroups = s1Data.groups.length > 0 ? s1Data.groups : s2Data.groups;
          // Ensure clash status highlights in both places if a clash occurs in either hour of the block
          const mergedGroups = rawGroups.map(grp => ({
            ...grp,
            facultyList: grp.facultyList.map(f => ({
              ...f,
              clash: checkFacultyClash(f.fullName, day, block.range) ||
                     checkFacultyClash(f.fullName, day, block.s1) ||
                     checkFacultyClash(f.fullName, day, block.s2)
            }))
          }));

          return {
            id: block.id,
            isMerged: true,
            range: block.range,
            groups: mergedGroups,
            rawItems: [...s1Data.rawItems, ...s2Data.rawItems]
          };
        } else {
          return {
            id: block.id,
            isMerged: false,
            s1: {
              slotTime: block.s1,
              groups: s1Data.groups.map(grp => ({
                ...grp,
                facultyList: grp.facultyList.map(f => ({
                  ...f,
                  clash: checkFacultyClash(f.fullName, day, block.s1)
                }))
              })),
              rawItems: s1Data.rawItems
            },
            s2: {
              slotTime: block.s2,
              groups: s2Data.groups.map(grp => ({
                ...grp,
                facultyList: grp.facultyList.map(f => ({
                  ...f,
                  clash: checkFacultyClash(f.fullName, day, block.s2)
                }))
              })),
              rawItems: s2Data.rawItems
            }
          };
        }
      });

      result[day] = {
        dayShortName,
        theorySlots,
        labBlocks
      };
    });

    return result;
  }, [activeDaysList, deptFacultyMap, checkFacultyClash]);

  // Helper to render a lab block group entry with increased legible font
  const renderLabGroupItem = (grp, day, slotRange) => {
    const sub = (grp.subject || grp.firstItem?.subject || 'Lab').split('\n')[0].trim();
    const branch = (grp.branch || grp.firstItem?.branch || '').trim();
    const branchPrefix = branch && !sub.toUpperCase().startsWith(branch.toUpperCase()) 
      ? `${branch} ` 
      : '';
    const title = `${branchPrefix}${sub}`;
    return (
      <div 
        key={grp.groupKey} 
        className="text-[12px] sm:text-xs print:text-[9.5pt] text-black font-sans leading-tight py-0.5 border-b border-gray-200 print:border-gray-300 last:border-none"
      >
        <span className="font-black text-black">{title}</span>
        {' ('}
        {grp.facultyList.map((f, fIdx) => (
          <React.Fragment key={fIdx}>
            {fIdx > 0 && ', '}
            {f.clash ? (
              <span 
                className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-1 py-0 print:border-black print:border print:bg-transparent print:text-black cursor-help"
                title={`⚠️ CLASH DETECTED:\n${f.fullName} (${f.shortName}) has multiple classes scheduled at ${day} ${slotRange}:\n${f.clash.details}`}
              >
                {f.shortName}*
              </span>
            ) : (
              <span className="font-extrabold text-black" title={f.fullName}>
                {f.shortName}
              </span>
            )}
          </React.Fragment>
        ))}
        {')'}
        {grp.room && (
          <span className="text-[10px] print:text-[8pt] text-slate-700 print:text-black font-semibold ml-1 whitespace-nowrap">
            [{grp.room}]
          </span>
        )}
      </div>
    );
  };

  // Helper to render a theory slot cell with branch name, subject, faculty initials, and room number
  const renderTheorySlotCell = (slotData, day, slotTime, dayShortName, isLastCol = false) => {
    const borderClass = isLastCol
      ? "border-b-2 border-slate-700 print:border-b-[1.5pt] print:border-black"
      : "border-r border-gray-300 print:border-black border-b-2 border-slate-700 print:border-b-[1.5pt] print:border-black";

    if (!slotData || slotData.groups.length === 0) {
      return (
        <td className={`p-1 ${borderClass} text-gray-400 font-mono text-center align-middle`}>
          <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
        </td>
      );
    }

    return (
      <td
        onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, slotTime, deptName)}
        className={`py-1 px-1.5 ${borderClass} align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white`}
        title="Click to view details"
      >
        <div className="flex flex-col items-center justify-center space-y-0.5">
          {slotData.groups.map((grp, gIdx) => {
            const branchPrefix = grp.branch && !grp.subject.toUpperCase().startsWith(grp.branch.toUpperCase()) 
              ? `${grp.branch} ` 
              : '';
            const displayTitle = `${branchPrefix}${grp.subject}`;

            return (
              <div 
                key={gIdx} 
                className="text-[12px] sm:text-xs print:text-[9.5pt] text-black font-sans leading-tight py-0.5 border-b border-gray-200 print:border-gray-300 last:border-none"
              >
                <span className="font-black text-black">{displayTitle}</span>
                {' ('}
                {grp.facultyList.map((f, fIdx) => (
                  <React.Fragment key={fIdx}>
                    {fIdx > 0 && ', '}
                    {f.clash ? (
                      <span 
                        className="font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs px-1 py-0 print:border-black print:border print:bg-transparent print:text-black cursor-help"
                        title={`⚠️ CLASH DETECTED:\n${f.fullName} (${f.shortName}) has multiple classes at ${dayShortName} ${slotTime}:\n${f.clash.details}`}
                      >
                        {f.shortName}*
                      </span>
                    ) : (
                      <span className="font-extrabold text-black" title={f.fullName}>
                        {f.shortName}
                      </span>
                    )}
                  </React.Fragment>
                ))}
                {')'}
                {grp.room && (
                  <span className="text-[10px] print:text-[8pt] text-slate-700 print:text-black font-semibold ml-1 whitespace-nowrap">
                    [{grp.room}]
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </td>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-900 overflow-hidden timetable-card print:border-black print:rounded-none print:shadow-none">
      {/* University Official Header: Strictly College Name, Larger Logo, and Department Name */}
      <div className="border-b-2 border-slate-900 print:border-black bg-white px-4 py-3 print:px-4 print:py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* University Crest Logo (Larger for crisp visibility in print) */}
          <div className="w-20 sm:w-24 print:w-20 flex-shrink-0 flex items-center justify-start">
            <img 
              src={universityInfo.logo || '/gvpihlr.png'} 
              alt="GVPIHLR Logo" 
              className="h-16 w-16 sm:h-20 sm:w-20 print:h-16 print:w-16 object-contain drop-shadow-xs"
            />
          </div>

          {/* College Name & Department Name */}
          <div className="text-center flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl print:text-[16pt] font-black uppercase font-serif tracking-wide text-black leading-tight">
              {universityInfo.name || 'GAYATRI VIDYA PARISHAD INSTITUTE OF HIGHER LEARNING AND RESEARCH'}
            </h1>
            <div className="text-base sm:text-lg md:text-xl print:text-[13pt] font-black uppercase font-sans tracking-wide text-blue-950 print:text-black mt-1">
              DEPARTMENT OF {deptName.toUpperCase()}
            </div>
          </div>

          {/* Symmetrical Spacer matching Logo */}
          <div className="w-20 sm:w-24 print:w-20 flex-shrink-0"></div>
        </div>
      </div>

      {/* Main Timetable Matrix: Exactly 2 Rows per Day (Theory & Labs Separated, Short Day Names) */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse table-fixed min-w-[950px] border-2 border-slate-900 print:min-w-0 print:border-black print:table-fixed">
          <thead>
            <tr className="bg-gray-100 print:bg-white text-gray-800 font-bold border-b-2 border-slate-900 print:border-black uppercase tracking-wider">
              {/* DAY Header */}
              <th className="py-2.5 px-2 border-r border-gray-300 print:border-black w-20 sm:w-24 print:w-18 text-xs sm:text-sm print:text-[11.5pt] font-black text-black align-middle text-center">
                DAY
              </th>

              {/* 09:00 - 10:00 */}
              <th className="py-2.5 px-1 border-r border-gray-300 print:border-black text-black align-middle text-center">
                <span className="font-black text-black text-xs sm:text-sm print:text-[11pt] tracking-tight block">
                  09:00–10:00
                </span>
              </th>

              {/* 10:00 - 11:00 */}
              <th className="py-2.5 px-1 border-r border-gray-300 print:border-black text-black align-middle text-center">
                <span className="font-black text-black text-xs sm:text-sm print:text-[11pt] tracking-tight block">
                  10:00–11:00
                </span>
              </th>

              {/* 11:00 - 11:15 */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black bg-gray-100 print:bg-white text-black font-black w-14 sm:w-16 print:w-14 text-center align-middle">
                <div className="flex flex-col items-center justify-center leading-tight">
                  <span className="font-black text-black text-[11px] sm:text-xs print:text-[10pt] tracking-tight block">
                    11:00–
                  </span>
                  <span className="font-black text-black text-[11px] sm:text-xs print:text-[10pt] tracking-tight block">
                    11:15
                  </span>
                </div>
              </th>

              {/* 11:15 - 12:15 */}
              <th className="py-2.5 px-1 border-r border-gray-300 print:border-black text-black align-middle text-center">
                <span className="font-black text-black text-xs sm:text-sm print:text-[11pt] tracking-tight block">
                  11:15–12:15
                </span>
              </th>

              {/* 12:15 - 01:15 */}
              <th className="py-2.5 px-1 border-r border-gray-300 print:border-black text-black align-middle text-center">
                <span className="font-black text-black text-xs sm:text-sm print:text-[11pt] tracking-tight block">
                  12:15–01:15
                </span>
              </th>

              {/* 01:15 - 02:15 */}
              <th className="py-2 px-1 border-r border-gray-300 print:border-black bg-gray-100 print:bg-white text-black font-black w-14 sm:w-16 print:w-14 text-center align-middle">
                <div className="flex flex-col items-center justify-center leading-tight">
                  <span className="font-black text-black text-[11px] sm:text-xs print:text-[10pt] tracking-tight block">
                    01:15–
                  </span>
                  <span className="font-black text-black text-[11px] sm:text-xs print:text-[10pt] tracking-tight block">
                    02:15
                  </span>
                </div>
              </th>

              {/* 02:15 - 03:15 */}
              <th className="py-2.5 px-1 border-r border-gray-300 print:border-black text-black align-middle text-center">
                <span className="font-black text-black text-xs sm:text-sm print:text-[11pt] tracking-tight block">
                  02:15–03:15
                </span>
              </th>

              {/* 03:15 - 04:15 */}
              <th className="py-2.5 px-1 border-gray-300 print:border-black text-black align-middle text-center">
                <span className="font-black text-black text-xs sm:text-sm print:text-[11pt] tracking-tight block">
                  03:15–04:15
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {activeDaysList.map((day, dayIdx) => {
              const dayData = formattedScheduleByDay[day] || {
                dayShortName: DAY_SHORT_NAMES[day] || day,
                theorySlots: {},
                labBlocks: []
              };
              const { dayShortName, theorySlots, labBlocks } = dayData;

              const breakChar = BREAK_CHARS[dayIdx] || '—';
              const lunchChar = LUNCH_CHARS[dayIdx] || '—';

              return (
                <React.Fragment key={day}>
                  {/* ROW 1: THEORY ROW (e.g. "Mon theory") */}
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    {/* Day Column: e.g. "Mon theory" */}
                    <td className="py-2 px-2 print:py-2 print:px-1 font-black text-black bg-gray-100 print:bg-white border-r border-gray-300 print:border-black border-b-2 border-slate-700 print:border-b-[1.5pt] print:border-black align-middle text-center font-sans">
                      <div className="leading-tight">
                        <span className="block font-black text-sm sm:text-base print:text-[12pt] uppercase tracking-wide">{dayShortName}</span>
                        <span className="block text-xs sm:text-[13px] print:text-[10pt] font-extrabold text-slate-700 print:text-black">Theory</span>
                      </div>
                    </td>

                    {/* Period 1: 09:00 - 10:00 */}
                    {renderTheorySlotCell(theorySlots['09:00-10:00'], day, '09:00-10:00', dayShortName)}

                    {/* Period 2: 10:00 - 11:00 */}
                    {renderTheorySlotCell(theorySlots['10:00-11:00'], day, '10:00-11:00', dayShortName)}

                    {/* BREAK Column: rowSpan=2 with large prominent character */}
                    <td 
                      rowSpan={2}
                      className="py-1 px-1 bg-gray-50 print:bg-white text-black font-black border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle select-none text-center"
                    >
                      <div className="flex items-center justify-center h-full w-full">
                        <span className="text-2xl sm:text-3xl print:text-[22pt] font-black font-serif text-black tracking-widest">
                          {breakChar}
                        </span>
                      </div>
                    </td>

                    {/* Period 3: 11:15 - 12:15 */}
                    {renderTheorySlotCell(theorySlots['11:15-12:15'], day, '11:15-12:15', dayShortName)}

                    {/* Period 4: 12:15 - 01:15 */}
                    {renderTheorySlotCell(theorySlots['12:15-01:15'], day, '12:15-01:15', dayShortName)}

                    {/* LUNCH Column: rowSpan=2 with large prominent character */}
                    <td 
                      rowSpan={2}
                      className="py-1 px-1 bg-gray-50 print:bg-white text-black font-black border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle select-none text-center"
                    >
                      <div className="flex items-center justify-center h-full w-full">
                        <span className="text-2xl sm:text-3xl print:text-[22pt] font-black font-serif text-black tracking-widest">
                          {lunchChar}
                        </span>
                      </div>
                    </td>

                    {/* Period 5: 02:15 - 03:15 */}
                    {renderTheorySlotCell(theorySlots['02:15-03:15'], day, '02:15-03:15', dayShortName)}

                    {/* Period 6: 03:15 - 04:15 */}
                    {renderTheorySlotCell(theorySlots['03:15-04:15'], day, '03:15-04:15', dayShortName, true)}
                  </tr>

                  {/* ROW 2: LABS ROW (e.g. "Mon Labs") - Ends with thick full dark line */}
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    {/* Day Column: e.g. "Mon Labs" */}
                    <td className="py-2 px-2 print:py-2 print:px-1 font-black text-black bg-gray-100 print:bg-white border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center font-sans">
                      <div className="leading-tight">
                        <span className="block font-black text-sm sm:text-base print:text-[12pt] uppercase tracking-wide">{dayShortName}</span>
                        <span className="block text-xs sm:text-[13px] print:text-[10pt] font-extrabold text-slate-700 print:text-black">Labs</span>
                      </div>
                    </td>

                    {/* Block 1: 09:00 - 11:00 */}
                    {(() => {
                      const block = labBlocks[0];
                      if (!block) return null;
                      if (block.isMerged) {
                        if (block.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(block.rawItems, day, block.range, deptName)}
                            className="py-1 px-2 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {block.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.range))}
                            </div>
                          </td>
                        );
                      } else {
                        // Split into s1 and s2
                        return (
                          <React.Fragment>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s1.rawItems, day, block.s1.slotTime, deptName)}
                              className="py-1 px-1.5 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s1.groups.length > 0 ? (
                                  block.s1.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.s1.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                                )}
                              </div>
                            </td>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s2.rawItems, day, block.s2.slotTime, deptName)}
                              className="py-1 px-1.5 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s2.groups.length > 0 ? (
                                  block.s2.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.s2.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                                )}
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      }
                    })()}

                    {/* (BREAK Column is spanning vertically rowSpan=2 from ROW 1) */}

                    {/* Block 2: 11:15 - 01:15 */}
                    {(() => {
                      const block = labBlocks[1];
                      if (!block) return null;
                      if (block.isMerged) {
                        if (block.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(block.rawItems, day, block.range, deptName)}
                            className="py-1 px-2 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {block.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.range))}
                            </div>
                          </td>
                        );
                      } else {
                        // Split into s1 and s2
                        return (
                          <React.Fragment>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s1.rawItems, day, block.s1.slotTime, deptName)}
                              className="py-1 px-1.5 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s1.groups.length > 0 ? (
                                  block.s1.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.s1.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                                )}
                              </div>
                            </td>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s2.rawItems, day, block.s2.slotTime, deptName)}
                              className="py-1 px-1.5 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s2.groups.length > 0 ? (
                                  block.s2.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.s2.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                                )}
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      }
                    })()}

                    {/* (LUNCH Column is spanning vertically rowSpan=2 from ROW 1) */}

                    {/* Block 3: 02:15 - 04:15 */}
                    {(() => {
                      const block = labBlocks[2];
                      if (!block) return null;
                      if (block.isMerged) {
                        if (block.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(block.rawItems, day, block.range, deptName)}
                            className="py-1 px-2 border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {block.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.range))}
                            </div>
                          </td>
                        );
                      } else {
                        // Split into s1 and s2
                        return (
                          <React.Fragment>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s1.rawItems, day, block.s1.slotTime, deptName)}
                              className="py-1 px-1.5 border-r border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s1.groups.length > 0 ? (
                                  block.s1.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.s1.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
                                )}
                              </div>
                            </td>
                            <td
                              onClick={() => onSlotClick && onSlotClick(block.s2.rawItems, day, block.s2.slotTime, deptName)}
                              className="py-1 px-1.5 border-gray-300 print:border-black border-b-4 border-slate-900 print:border-b-[2.5pt] print:border-black align-middle text-center transition-all cursor-pointer hover:bg-slate-50 bg-white"
                              title="Click to view details"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                {block.s2.groups.length > 0 ? (
                                  block.s2.groups.map(grp => renderLabGroupItem(grp, dayShortName, block.s2.slotTime))
                                ) : (
                                  <span className="text-gray-400 print:text-black font-bold select-none text-base sm:text-lg print:text-[14pt]">—</span>
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
