import React from 'react';
import { periodSlots, getActiveDays } from '../data/mockData';
import { getSubjectStyle } from '../utils/subjectColors';
import { getFacultyShortName } from '../utils/facultyShortNames';
import initialData from '../data/initialData.json';

export default function DepartmentTimetableGrid({
  deptName,
  facultyList = [],
  timetableData = {},
  universityInfo = {},
  onSlotClick
}) {
  const activeDaysList = getActiveDays(timetableData);

  // Map each faculty's schedule from masterFacultyTimetables with dynamic fallback reconstruction
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

  // Aggregate schedule matrix: single-hour sessions vs 2-hour merged blocks
  const dayScheduleData = React.useMemo(() => {
    const blocksConfig = [
      { id: 'b1', s1: '09:00-10:00', s2: '10:00-11:00', timeRange: '09:00-11:00' },
      { id: 'b2', s1: '11:15-12:15', s2: '12:15-01:15', timeRange: '11:15-01:15' },
      { id: 'b3', s1: '02:15-03:15', s2: '03:15-04:15', timeRange: '02:15-04:15' }
    ];

    const result = {};

    activeDaysList.forEach(day => {
      const singleRaw = {
        '09:00-10:00': [],
        '10:00-11:00': [],
        '11:15-12:15': [],
        '12:15-01:15': [],
        '02:15-03:15': [],
        '03:15-04:15': []
      };

      const doubleRaw = {
        b1: [],
        b2: [],
        b3: []
      };

      deptFacultyMap.forEach(fac => {
        const daySlots = fac.schedule[day] || {};

        blocksConfig.forEach(block => {
          const items1 = [...(daySlots[block.s1] || [])];
          const items2 = [...(daySlots[block.s2] || [])];

          const matched1 = new Set();
          const matched2 = new Set();

          items1.forEach((it1, idx1) => {
            const idx2 = items2.findIndex((it2, i2) => 
              !matched2.has(i2) &&
              it2.branch === it1.branch &&
              it2.subject === it1.subject
            );

            if (idx2 !== -1) {
              matched1.add(idx1);
              matched2.add(idx2);
              doubleRaw[block.id].push({
                ...it1,
                timeRange: block.timeRange,
                faculty: fac.fullName,
                facultyShort: fac.shortName
              });
            }
          });

          // Unmatched in s1 are single sessions
          items1.forEach((it1, idx1) => {
            if (!matched1.has(idx1)) {
              singleRaw[block.s1].push({
                ...it1,
                timeRange: block.s1,
                faculty: fac.fullName,
                facultyShort: fac.shortName
              });
            }
          });

          // Unmatched in s2 are single sessions
          items2.forEach((it2, idx2) => {
            if (!matched2.has(idx2)) {
              singleRaw[block.s2].push({
                ...it2,
                timeRange: block.s2,
                faculty: fac.fullName,
                facultyShort: fac.shortName
              });
            }
          });
        });
      });

      // Group single sessions by branch/subject/room
      const singleSlots = {};
      Object.entries(singleRaw).forEach(([time, rawItems]) => {
        const groupMap = new Map();
        rawItems.forEach(item => {
          const groupKey = `${item.branch || ''}||${item.subject || ''}||${item.room || ''}`;
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              branch: item.branch,
              subject: item.subject,
              room: item.room,
              isLab: item.isLab,
              facultyDetails: []
            });
          }
          const grp = groupMap.get(groupKey);
          if (!grp.facultyDetails.some(f => f.fullName === item.faculty)) {
            grp.facultyDetails.push({
              fullName: item.faculty,
              shortName: item.facultyShort
            });
          }
        });
        singleSlots[time] = {
          rawItems,
          groups: Array.from(groupMap.values())
        };
      });

      // Group double sessions by branch/subject/room
      const doubleBlocks = {};
      blocksConfig.forEach(block => {
        const rawItems = doubleRaw[block.id];
        const groupMap = new Map();
        rawItems.forEach(item => {
          const groupKey = `${item.branch || ''}||${item.subject || ''}||${item.room || ''}`;
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              branch: item.branch,
              subject: item.subject,
              room: item.room,
              isLab: item.isLab,
              facultyDetails: []
            });
          }
          const grp = groupMap.get(groupKey);
          if (!grp.facultyDetails.some(f => f.fullName === item.faculty)) {
            grp.facultyDetails.push({
              fullName: item.faculty,
              shortName: item.facultyShort
            });
          }
        });
        doubleBlocks[block.id] = {
          rawItems,
          groups: Array.from(groupMap.values()),
          timeRange: block.timeRange
        };
      });

      const hasDouble = blocksConfig.some(b => doubleBlocks[b.id].groups.length > 0);

      result[day] = {
        singleSlots,
        doubleBlocks,
        hasDouble,
        numRows: hasDouble ? 2 : 1
      };
    });

    return result;
  }, [activeDaysList, deptFacultyMap]);

  const totalTableRows = React.useMemo(() => {
    return activeDaysList.reduce((acc, day) => {
      const dayInfo = dayScheduleData[day];
      return acc + (dayInfo ? dayInfo.numRows : 1);
    }, 0);
  }, [activeDaysList, dayScheduleData]);

  // Helper to check if a specific faculty member has a timetable clash (more than 1 class assigned)
  const checkFacultyClash = React.useCallback((facFullName, day, timeSlot, isDouble = false) => {
    const facObj = deptFacultyMap.find(f => f.fullName === facFullName);
    const sched = facObj?.schedule || (initialData.masterFacultyTimetables && initialData.masterFacultyTimetables[facFullName]) || {};
    const daySched = sched[day] || {};

    if (!isDouble) {
      const items = daySched[timeSlot] || [];
      if (items.length <= 1) return null;
      return {
        count: items.length,
        branches: items.map(it => `${it.branch} (${it.subject})`),
        details: items.map(it => `• ${it.branch}: ${it.subject}${it.room ? ` in ${it.room}` : ''}`).join('\n')
      };
    } else {
      // For double 2-hour blocks: check s1 and s2
      const [s1, s2] = timeSlot === '09:00-11:00' 
        ? ['09:00-10:00', '10:00-11:00'] 
        : timeSlot === '11:15-01:15'
          ? ['11:15-12:15', '12:15-01:15']
          : ['02:15-03:15', '03:15-04:15'];

      const items1 = daySched[s1] || [];
      const items2 = daySched[s2] || [];
      const hasClash1 = items1.length > 1;
      const hasClash2 = items2.length > 1;

      if (!hasClash1 && !hasClash2) return null;

      const detailsList = [];
      const branchList = [];
      if (hasClash1) {
        branchList.push(`${s1}: ${items1.map(it => `${it.branch} (${it.subject})`).join(' & ')}`);
        detailsList.push(`At ${s1}:\n` + items1.map(it => `  • ${it.branch}: ${it.subject}${it.room ? ` in ${it.room}` : ''}`).join('\n'));
      }
      if (hasClash2) {
        branchList.push(`${s2}: ${items2.map(it => `${it.branch} (${it.subject})`).join(' & ')}`);
        detailsList.push(`At ${s2}:\n` + items2.map(it => `  • ${it.branch}: ${it.subject}${it.room ? ` in ${it.room}` : ''}`).join('\n'));
      }

      return {
        count: (hasClash1 ? items1.length : 0) + (hasClash2 ? items2.length : 0),
        branches: branchList,
        details: detailsList.join('\n\n')
      };
    }
  }, [deptFacultyMap]);

  // Aggregate all schedule clashes for this department
  const departmentClashes = React.useMemo(() => {
    const clashes = [];
    const slots = ['09:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-01:15', '02:15-03:15', '03:15-04:15'];

    deptFacultyMap.forEach(fac => {
      const sched = fac.schedule || (initialData.masterFacultyTimetables && initialData.masterFacultyTimetables[fac.fullName]) || {};
      activeDaysList.forEach(day => {
        const daySched = sched[day] || {};
        slots.forEach(slot => {
          const items = daySched[slot] || [];
          if (items.length > 1) {
            clashes.push({
              faculty: fac.fullName,
              shortName: fac.shortName,
              day,
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

  const renderSessionEntry = (grp, gIdx, day, timeSlot, isDouble = false) => {
    return (
      <div 
        key={gIdx} 
        className="leading-tight text-[10.5px] sm:text-[11px] print:text-[8.2pt] print:leading-[1.2] text-black font-sans pb-0.5 border-b border-gray-100 print:border-gray-200 last:border-none"
      >
        {grp.branch && (
          <span className="font-black text-black uppercase">{grp.branch}: </span>
        )}
        <span className="font-bold text-black">{grp.subject}</span>
        {grp.facultyDetails && grp.facultyDetails.length > 0 && (
          <span className="font-black text-black">
            {' ['}
            {grp.facultyDetails.map((f, fIdx) => {
              const short = f.shortName || getFacultyShortName(f.fullName) || f.fullName;
              const clash = checkFacultyClash(f.fullName, day, timeSlot, isDouble);

              if (!clash) {
                return (
                  <React.Fragment key={fIdx}>
                    {fIdx > 0 && ', '}
                    <span className="font-black text-black" title={f.fullName}>{short}</span>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={fIdx}>
                  {fIdx > 0 && ', '}
                  <span 
                    className="inline-flex items-center gap-0.5 px-0.5 py-0 text-[10px] print:text-[8pt] font-black text-red-700 bg-red-100/90 border border-red-500 rounded-xs print:rounded-none print:border-black print:border-2 print:bg-gray-200 print:text-black cursor-help"
                    title={`⚠️ CLASH DETECTED:\n${f.fullName} (${short}) is simultaneously assigned to multiple classes at ${day} ${timeSlot}:\n${clash.details}`}
                  >
                    <span className="print:hidden text-[9px]">⚠️</span>
                    <span className="underline decoration-red-500 print:no-underline font-black">{short}*</span>
                  </span>
                </React.Fragment>
              );
            })}
            {']'}
          </span>
        )}
        {grp.room && (
          <span className="text-[9.5px] print:text-[7.6pt] font-mono text-slate-700 print:text-black font-bold"> ({grp.room})</span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card print:border-black print:rounded-none">
      {/* Official University Header */}
      <div className="border-b-2 border-slate-700 print:border-black bg-white px-4 py-2 print:px-2 print:py-1">
        <div className="flex items-center justify-between gap-2">
          {/* Crest Logo */}
          <div className="w-20 flex-shrink-0 flex items-center justify-start">
            <img 
              src={universityInfo.logo || '/gvpihlr.png'} 
              alt="GVPIHLR Logo" 
              className="h-20 w-20 object-contain drop-shadow-xs"
            />
          </div>

          {/* Institution Title & Details */}
          <div className="text-center flex-1">
            <h1 className="text-[12.5pt] font-black uppercase font-serif tracking-tight text-black leading-tight">
              {universityInfo.name || 'GAYATRI VIDYA PARISHAD'}
            </h1>
            <p className="text-[7.5pt] text-black font-semibold leading-tight mt-0.5">
              {universityInfo.statusText || 'INSTITUTE OF HIGHER LEARNING AND RESEARCH'}
            </p>
            <p className="text-[7pt] text-black leading-tight">
              {universityInfo.address || 'Kommadi, Madhurawada, Visakhapatnam - 530 048, Andhra Pradesh'}
            </p>
            <div className="mt-0.5 flex items-center justify-center gap-3">
              <span className="text-[8.5pt] font-black text-black uppercase tracking-wide font-sans">
                TENTATIVE TIME TABLE FOR THE ACADEMIC YEAR {universityInfo.academicYear || '2026-2027'}
              </span>
            </div>
            <div className="text-[10pt] font-black text-blue-950 font-sans tracking-tight">
              DEPARTMENT OF {deptName.toUpperCase()} — WEEKLY FACULTY SCHEDULE
            </div>
            <div className="text-[7.5pt] font-extrabold text-slate-700 mt-0.5 print:text-[8pt] print:text-black">
              Faculty ({facultyList.length}):{' '}
              {facultyList.length <= 10
                ? facultyList.map(f => `${f.shortName || getFacultyShortName(f.fullName)}: ${f.fullName}`).join(' • ')
                : facultyList.map(f => f.shortName || getFacultyShortName(f.fullName)).join(', ')
              }
            </div>

            {/* Department Clash Indicator Banner */}
            {departmentClashes.length > 0 ? (
              <div className="mt-1 px-2.5 py-1 bg-red-50 print:bg-gray-100 border border-red-300 print:border-black rounded-md print:rounded-none text-left flex flex-wrap items-center justify-between gap-1 text-[8pt] print:text-[7.5pt] leading-tight">
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
                  [* Marked in grid]
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-[7pt] print:text-[7pt] font-bold text-emerald-700 print:text-black">
                ✓ No schedule conflicts or overlapping periods detected for this department.
              </div>
            )}
          </div>

          {/* Empty spacer for perfect center symmetry */}
          <div className="w-20 flex-shrink-0"></div>
        </div>
      </div>

      {/* Main Table with Darker Borders & Vertically Centered Cells */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1000px] border-2 border-slate-700 print:min-w-0 print:border-black">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-slate-700 print:border-black uppercase tracking-wider">
              <th className="py-2.5 px-2 border-r border-gray-300 print:border-black w-16 print:w-14 text-xs print:text-[10pt] font-black text-black">
                Day
              </th>
              {periodSlots.map((slot) => (
                <th 
                  key={slot.id} 
                  className={`py-2.5 px-1 border-r border-gray-300 print:border-black ${
                    slot.type === 'break' 
                      ? 'bg-gray-100 print:bg-white text-black font-black w-16 print:w-12 text-center' 
                      : 'text-black'
                  }`}
                >
                  <span className="font-black text-black text-xs sm:text-[13px] print:text-[9.5pt] tracking-tight block">
                    {slot.time}
                  </span>
                  {slot.label && (
                    <div className="text-[10px] sm:text-[10.5px] print:text-[8pt] tracking-normal text-slate-800 print:text-black font-black mt-0.5 print:hidden">
                      {slot.label}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-600 print:divide-black">
            {activeDaysList.map((day, dayIdx) => {
              const dayInfo = dayScheduleData[day] || {
                singleSlots: {},
                doubleBlocks: {},
                hasDouble: false,
                numRows: 1
              };
              const { singleSlots, doubleBlocks, hasDouble, numRows } = dayInfo;

              return (
                <React.Fragment key={day}>
                  {/* Row 1: Single-Hour Faculty Sessions (Theory / 1-Hour) */}
                  <tr className={`${hasDouble ? 'border-b border-slate-300 print:border-black' : 'border-b-2 border-slate-600 print:border-black'} hover:bg-gray-50/80 transition-colors`}>
                    {/* Day Column spanning numRows */}
                    <td 
                      rowSpan={numRows}
                      className="py-2 px-2 print:py-1 print:px-1 font-black text-black bg-gray-100 print:bg-white border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b uppercase tracking-wide align-middle print:text-[11pt] font-sans"
                    >
                      {day}
                    </td>

                    {/* 09:00 - 10:00 */}
                    {(() => {
                      const slotData = singleSlots['09:00-10:00'] || { groups: [], rawItems: [] };
                      if (slotData.groups.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-300 font-light select-none text-xs">-</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '09:00-10:00', deptName)}
                          className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                            {slotData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '09:00-10:00', false))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* 10:00 - 11:00 */}
                    {(() => {
                      const slotData = singleSlots['10:00-11:00'] || { groups: [], rawItems: [] };
                      if (slotData.groups.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-300 font-light select-none text-xs">-</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '10:00-11:00', deptName)}
                          className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                            {slotData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '10:00-11:00', false))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* BREAK: rendered only once spanning all table rows */}
                    {dayIdx === 0 && (
                      <td 
                        rowSpan={totalTableRows}
                        className="py-2 px-1 bg-gray-50 print:bg-white text-black font-black border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle select-none text-center"
                      >
                        <div className="flex flex-col items-center justify-center font-black tracking-widest leading-loose py-2 select-none uppercase font-serif">
                          {'BREAK'.split('').map((char, cIdx) => (
                            <span key={cIdx} className="my-0.5 sm:my-1 text-[13px] sm:text-base print:text-[14pt] font-black text-black">
                              {char}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* 11:15 - 12:15 */}
                    {(() => {
                      const slotData = singleSlots['11:15-12:15'] || { groups: [], rawItems: [] };
                      if (slotData.groups.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-300 font-light select-none text-xs">-</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '11:15-12:15', deptName)}
                          className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                            {slotData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '11:15-12:15', false))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* 12:15 - 01:15 */}
                    {(() => {
                      const slotData = singleSlots['12:15-01:15'] || { groups: [], rawItems: [] };
                      if (slotData.groups.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-300 font-light select-none text-xs">-</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '12:15-01:15', deptName)}
                          className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                            {slotData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '12:15-01:15', false))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* LUNCH: rendered only once spanning all table rows */}
                    {dayIdx === 0 && (
                      <td 
                        rowSpan={totalTableRows}
                        className="py-2 px-1 bg-gray-50 print:bg-white text-black font-black border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle select-none text-center"
                      >
                        <div className="flex flex-col items-center justify-center font-black tracking-widest leading-loose py-2 select-none uppercase font-serif">
                          {'LUNCH'.split('').map((char, cIdx) => (
                            <span key={cIdx} className="my-0.5 sm:my-1 text-[13px] sm:text-base print:text-[14pt] font-black text-black">
                              {char}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* 02:15 - 03:15 */}
                    {(() => {
                      const slotData = singleSlots['02:15-03:15'] || { groups: [], rawItems: [] };
                      if (slotData.groups.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-300 font-light select-none text-xs">-</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '02:15-03:15', deptName)}
                          className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                            {slotData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '02:15-03:15', false))}
                          </div>
                        </td>
                      );
                    })()}

                    {/* 03:15 - 04:15 */}
                    {(() => {
                      const slotData = singleSlots['03:15-04:15'] || { groups: [], rawItems: [] };
                      if (slotData.groups.length === 0) {
                        return (
                          <td className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                            <span className="text-gray-300 font-light select-none text-xs">-</span>
                          </td>
                        );
                      }
                      return (
                        <td
                          onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, '03:15-04:15', deptName)}
                          className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                          title="Click to view details"
                        >
                          <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                            {slotData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '03:15-04:15', false))}
                          </div>
                        </td>
                      );
                    })()}
                  </tr>

                  {/* Row 2: Merged 2-Hour Faculty Sessions (Labs / 2-Hour Practicals) */}
                  {hasDouble && (
                    <tr className="border-b-2 border-slate-600 print:border-b-2 print:border-black hover:bg-gray-50/80 transition-colors">
                      {/* Block 1: 09:00 - 11:00 (colSpan=2) */}
                      {(() => {
                        const blockData = doubleBlocks['b1'] || { groups: [], rawItems: [] };
                        if (blockData.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-300 font-light select-none text-xs">-</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(blockData.rawItems, day, '09:00-11:00', deptName)}
                            className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                              {blockData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '09:00-11:00', true))}
                            </div>
                          </td>
                        );
                      })()}

                      {/* Block 2: 11:15 - 01:15 (colSpan=2) */}
                      {(() => {
                        const blockData = doubleBlocks['b2'] || { groups: [], rawItems: [] };
                        if (blockData.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-300 font-light select-none text-xs">-</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(blockData.rawItems, day, '11:15-01:15', deptName)}
                            className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                              {blockData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '11:15-01:15', true))}
                            </div>
                          </td>
                        );
                      })()}

                      {/* Block 3: 02:15 - 04:15 (colSpan=2) */}
                      {(() => {
                        const blockData = doubleBlocks['b3'] || { groups: [], rawItems: [] };
                        if (blockData.groups.length === 0) {
                          return (
                            <td colSpan={2} className="p-1 border-r border-gray-300 print:border-black text-gray-400 font-mono text-center align-middle">
                              <span className="text-gray-300 font-light select-none text-xs">-</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            colSpan={2}
                            onClick={() => onSlotClick && onSlotClick(blockData.rawItems, day, '02:15-04:15', deptName)}
                            className="py-1 px-1.5 border-r border-gray-300 print:border-black align-top text-left transition-all cursor-pointer hover:bg-slate-50 bg-white"
                            title="Click to view details"
                          >
                            <div className="flex flex-col h-full w-full justify-start space-y-0.5">
                              {blockData.groups.map((grp, gIdx) => renderSessionEntry(grp, gIdx, day, '02:15-04:15', true))}
                            </div>
                          </td>
                        );
                      })()}
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Conflict Legend */}
      <div className="px-3 py-1 bg-gray-50 print:bg-white border-t border-slate-300 print:border-black flex flex-wrap items-center justify-between text-[7.5pt] print:text-[7pt] text-slate-700 print:text-black font-medium">
        <div>
          <span className="font-black text-black">* Conflict Marker [*]: </span>
          <span>Faculty short names marked with an asterisk inside a box (e.g. <strong>[ DAK* ]</strong>) are simultaneously scheduled in more than one class during that period.</span>
        </div>
        <div className="font-bold text-slate-500 print:hidden text-[7pt]">
          Hover over marked faculty to inspect conflicting classes
        </div>
      </div>
    </div>
  );
}
