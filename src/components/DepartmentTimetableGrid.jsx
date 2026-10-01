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

  // Aggregate schedule matrix by [day][slot] -> array of groups
  const aggregatedSchedule = React.useMemo(() => {
    const grid = {};
    activeDaysList.forEach(day => {
      grid[day] = {};
      periodSlots.forEach(slot => {
        if (slot.type === 'break') return;

        const rawItems = [];
        const groupMap = new Map();

        deptFacultyMap.forEach(fac => {
          const daySlots = fac.schedule[day] || {};
          const items = daySlots[slot.time] || [];

          items.forEach(item => {
            rawItems.push({ ...item, faculty: fac.fullName, facultyShort: fac.shortName });

            const groupKey = `${item.branch || ''}||${item.subject || ''}||${item.room || ''}`;
            if (!groupMap.has(groupKey)) {
              groupMap.set(groupKey, {
                branch: item.branch,
                subject: item.subject,
                room: item.room,
                isLab: item.isLab,
                faculty: []
              });
            }
            const grp = groupMap.get(groupKey);
            if (!grp.faculty.includes(fac.shortName)) {
              grp.faculty.push(fac.shortName);
            }
          });
        });

        grid[day][slot.time] = {
          rawItems,
          groups: Array.from(groupMap.values())
        };
      });
    });
    return grid;
  }, [activeDaysList, deptFacultyMap]);

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
            <div className="text-[9.5pt] font-black text-blue-950 font-sans tracking-tight">
              DEPARTMENT OF {deptName.toUpperCase()} — WEEKLY FACULTY SCHEDULE
            </div>
            <div className="text-[7.5pt] font-extrabold text-slate-700 mt-0.5 print:text-[7pt]">
              Faculty ({facultyList.length}): {facultyList.map(f => f.shortName || getFacultyShortName(f.fullName)).join(', ')}
            </div>
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
              <th className="py-2.5 px-2 border-r border-gray-300 print:border-black w-16 print:w-14 text-xs print:text-[9.5pt] font-black text-slate-900">
                Day
              </th>
              {periodSlots.map((slot) => (
                <th 
                  key={slot.id} 
                  className={`py-2.5 px-1 border-r border-gray-300 print:border-black ${
                    slot.type === 'break' 
                      ? 'bg-amber-100/80 text-amber-950 font-black w-16 print:w-12 text-center' 
                      : 'text-slate-950'
                  }`}
                >
                  <span className="font-black text-slate-950 text-xs sm:text-[13px] print:text-[8.5pt] tracking-tight block">
                    {slot.time}
                  </span>
                  {slot.label && (
                    <div className="text-[10px] sm:text-[10.5px] print:text-[7.5pt] tracking-normal text-amber-900 font-black mt-0.5 print:hidden">
                      {slot.label}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-600 print:divide-black">
            {activeDaysList.map((day, dayIdx) => {
              const dayGrid = aggregatedSchedule[day] || {};

              return (
                <tr key={day} className="border-b-2 border-slate-600 print:border-b print:border-black hover:bg-gray-50/80 transition-colors">
                  {/* Day Header Column */}
                  <td className="py-3 px-2 print:py-2 print:px-1 font-black text-gray-900 bg-gray-100/60 border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b uppercase tracking-wide align-middle print:text-[10pt] font-sans">
                    {day}
                  </td>

                  {/* Period Slots */}
                  {periodSlots.map((slot) => {
                    if (slot.type === 'break') {
                      if (dayIdx === 0) {
                        return (
                          <td 
                            key={slot.id} 
                            rowSpan={activeDaysList.length}
                            className="py-2 px-1 bg-amber-50/80 text-amber-950 font-black border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle select-none text-center"
                          >
                            <div className="flex flex-col items-center justify-center font-black tracking-widest leading-loose py-2 select-none uppercase font-serif">
                              {(slot.label || '').split('').map((char, cIdx) => (
                                <span key={cIdx} className="my-0.5 sm:my-1 text-[13px] sm:text-base print:text-[15pt] font-black">
                                  {char}
                                </span>
                              ))}
                            </div>
                          </td>
                        );
                      }
                      return null; // Handled by rowSpan on first row
                    }

                    const slotData = dayGrid[slot.time] || { groups: [], rawItems: [] };
                    const groups = slotData.groups;

                    if (groups.length === 0) {
                      return (
                        <td 
                          key={slot.id} 
                          className="p-1 border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b text-gray-400 font-mono text-center align-middle"
                        >
                          <span className="text-gray-300 font-light select-none text-xs">-</span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={slot.id}
                        onClick={() => onSlotClick && onSlotClick(slotData.rawItems, day, slot.time, deptName)}
                        className="p-1 border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle transition-all cursor-pointer hover:bg-blue-50/40"
                        title="Click to view details"
                      >
                        <div className="flex flex-col h-full w-full justify-center gap-1">
                          {groups.map((grp, gIdx) => {
                            const itemStyle = getSubjectStyle(grp.subject, grp.isLab);
                            return (
                              <div
                                key={gIdx}
                                className={`rounded px-1.5 py-0.5 border border-slate-400 print:border-slate-800 shadow-2xs text-left ${itemStyle.bg || 'bg-white'}`}
                                style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                              >
                                <div className="flex items-center justify-between gap-1 leading-tight">
                                  <span className="font-black text-[9px] sm:text-[9.5px] print:text-[7pt] text-slate-900 bg-white/90 print:bg-white px-1 rounded border border-slate-300 print:border-slate-700 uppercase">
                                    {grp.branch}
                                  </span>
                                  {grp.room && (
                                    <span className="text-[8.5px] sm:text-[9px] print:text-[6.5pt] font-black text-slate-800 print:text-black font-mono truncate">
                                      {grp.room}
                                    </span>
                                  )}
                                </div>
                                <div className="font-black text-[9.5px] sm:text-[10px] print:text-[7.5pt] leading-tight mt-0.5 truncate text-slate-950 print:text-black">
                                  {grp.subject}
                                </div>
                                <div className="text-[9px] sm:text-[9.5px] print:text-[7pt] font-black text-blue-900 print:text-black leading-tight mt-0.5">
                                  {grp.faculty.join(', ')}
                                </div>
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
  );
}
