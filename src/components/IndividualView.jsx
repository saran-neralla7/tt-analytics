import React, { useState, useMemo } from 'react';
import { days, periodSlots } from '../data/mockData';
import { UserCheck, Clock, BookOpen, MapPin, Filter } from 'lucide-react';
import initialData from '../data/initialData.json';
import { getSubjectStyle } from '../utils/subjectColors';

export default function IndividualView({ timetableData, universityInfo, facultyList: propFacultyList, onSlotClick }) {
  // Master faculty list with full metadata
  const facultyMembers = useMemo(() => {
    if (propFacultyList && propFacultyList.length > 0) {
      return propFacultyList;
    }
    return initialData.facultyList || [];
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

  // Faculty selection state
  const [selectedFaculty, setSelectedFaculty] = useState(
    facultyMembers[0]?.fullName || 'Dr. S Padma'
  );

  // When department changes, update selected faculty if current selection is not in new department
  const handleDeptChange = (newDept) => {
    setSelectedDept(newDept);
    const newFiltered = newDept === 'ALL'
      ? facultyMembers
      : facultyMembers.filter(f => (f.dept?.trim() || 'General') === newDept);
    
    if (newFiltered.length > 0 && !newFiltered.some(f => f.fullName === selectedFaculty)) {
      setSelectedFaculty(newFiltered[0].fullName);
    }
  };

  const currentFacultyObj = useMemo(() => {
    return facultyMembers.find(f => f.fullName === selectedFaculty);
  }, [facultyMembers, selectedFaculty]);

  // Build weekly schedule matrix for the selected faculty
  const facultySchedule = useMemo(() => {
    const result = {};
    days.forEach(d => result[d] = {});

    Object.entries(timetableData).forEach(([branchKey, branchSched]) => {
      Object.entries(branchSched).forEach(([dayKey, daySched]) => {
        Object.entries(daySched).forEach(([slotTime, rawCell]) => {
          const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
          items.forEach(cell => {
            if (cell && cell.faculty && cell.faculty.includes(selectedFaculty)) {
              if (!result[dayKey]) result[dayKey] = {};
              if (!result[dayKey][slotTime]) result[dayKey][slotTime] = [];
              result[dayKey][slotTime].push({
                ...cell,
                branch: branchKey
              });
            }
          });
        });
      });
    });

    return result;
  }, [timetableData, selectedFaculty]);

  // Compute workload metrics
  let totalHours = 0;
  let totalLabs = 0;
  const taughtSubjects = new Set();

  days.forEach(day => {
    Object.values(facultySchedule[day] || {}).forEach(items => {
      items.forEach(cell => {
        totalHours += 1;
        if (cell.isLab) totalLabs += 1;
        if (cell.subject) taughtSubjects.add(cell.subject);
      });
    });
  });

  // Helper to check if current slot and next slot should be merged horizontally (colSpan=2) for faculty
  const has2HourFacultyMerge = (daySched, idx) => {
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Department Filter & Faculty Selector Bar */}
      <div className="no-print flex justify-center mb-6">
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-3 rounded-xl border border-gray-300 shadow-sm">
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

          {/* Dynamic Faculty Dropdown */}
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
        </div>
      </div>

      {/* Workload Stats Header */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Weekly Teaching Load</div>
            <div className="text-lg font-bold text-gray-900">{totalHours} Hours / Week</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Assigned Courses</div>
            <div className="text-lg font-bold text-gray-900">{taughtSubjects.size} Courses</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Practical / Lab Load</div>
            <div className="text-lg font-bold text-gray-900">{totalLabs} Lab Sessions</div>
          </div>
        </div>
      </div>

      {/* Faculty Individual Schedule Table */}
      <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-6">
        <div className="print-only text-center py-3 px-6 border-b border-gray-300 bg-gray-50/70">
          <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">
            {universityInfo.name}
          </h2>
          <h3 className="text-xs font-bold text-blue-800 mt-1 uppercase font-mono">
            INDIVIDUAL FACULTY TIMETABLE: <span className="underline decoration-blue-500">{selectedFaculty}</span>
            {currentFacultyObj?.shortName && (
              <span className="ml-1.5 text-blue-600">
                ({currentFacultyObj.shortName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim()})
              </span>
            )}
            {currentFacultyObj?.dept && (
              <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-sans font-semibold">
                Dept: {currentFacultyObj.dept}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            Academic Year {universityInfo.academicYear} | Total Load: {totalHours} Hrs/Wk
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1000px] border-2 border-slate-700">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-slate-700 uppercase tracking-wider">
                <th className="py-3 px-2 border-r border-gray-300 w-20 text-xs font-black text-slate-900">Day</th>
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
              {days.map((day) => {
                const daySched = facultySchedule[day] || {};
                const skipSlots = new Set();

                return (
                  <tr key={day} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                    {/* Day Column */}
                    <td className="py-4 px-3 font-extrabold text-gray-900 bg-gray-100/60 border-r border-gray-300 border-b-2 border-slate-600 uppercase tracking-wide align-middle">
                      {day}
                    </td>

                    {periodSlots.map((slot, sIdx) => {
                      if (skipSlots.has(slot.time)) {
                        return null; // Skip second hour of horizontally merged slot
                      }

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

                      const currentItems = daySched[slot.time] || [];

                      // Check horizontal colSpan merge
                      let colSpan = 1;
                      let isSplitMerge = false;
                      let nextSlotItems = [];
                      if (has2HourFacultyMerge(daySched, sIdx)) {
                        colSpan = 2;
                        const nextSlotTime = periodSlots[sIdx + 1]?.time;
                        skipSlots.add(nextSlotTime);
                        nextSlotItems = daySched[nextSlotTime] || [];

                        // Check if split merge (e.g. 2-hr lab merged below, 1-hr theory subject on top)
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
                            className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-middle bg-slate-50/30 text-center select-none h-full"
                            style={{ height: '1px' }}
                          >
                            <div className="flex items-center justify-center h-full min-h-[64px]">
                              <span className="text-gray-300 font-mono text-[13px]">—</span>
                            </div>
                          </td>
                        );
                      }

                      // 2. Split 2-Hour Merge: Theory on TOP in assigned hour, 2-Hour Lab MERGED BELOW spanning full width
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
                            onClick={() => onSlotClick && onSlotClick([...currentItems, ...nextSlotItems], day, `${slot.time} - ${periodSlots[sIdx + 1]?.time}`, selectedFaculty)}
                            className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-top transition-all cursor-pointer h-full"
                            style={{ height: '1px' }}
                            title="Click to view full course & schedule details"
                          >
                            <div className="flex flex-col h-full w-full divide-y divide-gray-300/90">
                              {/* Top Row: Theory Subjects in assigned hour (Hour 1 on left, Hour 2 on right) */}
                              <div className="flex-1 w-full flex divide-x divide-gray-300/90">
                                {/* Hour 1 Slot (Left) */}
                                <div className="w-1/2 flex flex-col justify-center items-center">
                                  {h1Others.length > 0 ? (
                                    h1Others.map((cellItem, iIdx) => {
                                      const style = getSubjectStyle(cellItem.subject, cellItem.isLab);
                                      return (
                                        <div 
                                          key={iIdx}
                                          className={`w-full h-full py-2 px-1.5 flex flex-col justify-center items-center text-center transition-all ${style.bg} hover:brightness-95`}
                                          style={style.inlineBg ? { backgroundColor: style.inlineBg } : undefined}
                                        >
                                          <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug ${style.text}`}>
                                            {cellItem.subject}
                                          </div>
                                          <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight">
                                            Section: {cellItem.branch}
                                          </div>
                                          {cellItem.room && (
                                            <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans">
                                              {cellItem.room}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="flex items-center justify-center w-full h-full min-h-[44px] bg-slate-50/40">
                                      <span className="text-gray-300 font-mono text-[12px]">—</span>
                                    </div>
                                  )}
                                </div>

                                {/* Hour 2 Slot (Right) */}
                                <div className="w-1/2 flex flex-col justify-center items-center">
                                  {h2Others.length > 0 ? (
                                    h2Others.map((cellItem, iIdx) => {
                                      const style = getSubjectStyle(cellItem.subject, cellItem.isLab);
                                      return (
                                        <div 
                                          key={iIdx}
                                          className={`w-full h-full py-2 px-1.5 flex flex-col justify-center items-center text-center transition-all ${style.bg} hover:brightness-95`}
                                          style={style.inlineBg ? { backgroundColor: style.inlineBg } : undefined}
                                        >
                                          <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug ${style.text}`}>
                                            {cellItem.subject}
                                          </div>
                                          <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight">
                                            Section: {cellItem.branch}
                                          </div>
                                          {cellItem.room && (
                                            <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans">
                                              {cellItem.room}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="flex items-center justify-center w-full h-full min-h-[44px] bg-slate-50/40">
                                      <span className="text-gray-300 font-mono text-[12px]">—</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Bottom Row: 2-Hour Merged Lab Session(s) spanning full 2-hour width */}
                              <div className="flex-1 w-full flex flex-col divide-y divide-gray-300/90">
                                {sharedLabs.map((labItem, lIdx) => {
                                  const labStyle = getSubjectStyle(labItem.subject, labItem.isLab);
                                  return (
                                    <div 
                                      key={lIdx}
                                      className={`flex-1 w-full py-2 px-2 flex flex-col justify-center items-center text-center transition-all ${labStyle.bg} hover:brightness-95`}
                                      style={labStyle.inlineBg ? { backgroundColor: labStyle.inlineBg } : undefined}
                                    >
                                      <div className={`font-black tracking-tight text-[12px] sm:text-[12.5px] leading-snug ${labStyle.text}`}>
                                        {labItem.subject}
                                      </div>
                                      <div className="text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight">
                                        Section: {labItem.branch}
                                      </div>
                                      {labItem.room && (
                                        <div className="mt-1 text-[11px] sm:text-[11.5px] font-black text-slate-800 tracking-normal font-sans">
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

                      // 3. Single Session Cell (Full-cell color edge-to-edge)
                      if (currentItems.length === 1) {
                        const cellItem = currentItems[0];
                        const style = getSubjectStyle(cellItem.subject, cellItem.isLab);

                        return (
                          <td 
                            key={slot.id} 
                            colSpan={colSpan}
                            onClick={() => onSlotClick && onSlotClick(currentItems, day, colSpan === 2 ? `${slot.time} - ${periodSlots[sIdx + 1]?.time}` : slot.time, selectedFaculty)}
                            className={`p-2 sm:p-2.5 border-r border-gray-300 border-b-2 border-slate-600 align-middle transition-all cursor-pointer h-full ${style.bg} hover:brightness-95`}
                            style={{
                              height: '1px',
                              ...(style.inlineBg ? { backgroundColor: style.inlineBg } : {})
                            }}
                            title="Click to view full course & schedule details"
                          >
                            <div className="flex flex-col justify-center items-center text-center h-full min-h-[58px]">
                              <div className={`font-black tracking-tight text-[12px] sm:text-[12.5px] leading-snug ${style.text}`}>
                                {cellItem.subject}
                              </div>

                              <div className="text-slate-800 font-semibold text-[10.5px] sm:text-[11px] mt-1 leading-tight">
                                Section: {cellItem.branch}
                              </div>

                              {cellItem.room && (
                                <div className="mt-1 text-xs sm:text-[12px] font-black text-slate-800 tracking-normal font-sans">
                                  {cellItem.room}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 4. Multi-Session Cell (Divided into distinct colors edge-to-edge)
                      return (
                        <td 
                          key={slot.id} 
                          colSpan={colSpan}
                          onClick={() => onSlotClick && onSlotClick(currentItems, day, colSpan === 2 ? `${slot.time} - ${periodSlots[sIdx + 1]?.time}` : slot.time, selectedFaculty)}
                          className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-top transition-all cursor-pointer h-full"
                          style={{ height: '1px' }}
                          title="Click to view full course & schedule details"
                        >
                          <div className="flex flex-col h-full w-full divide-y divide-gray-300/90">
                            {currentItems.map((cellItem, bIdx) => {
                              const itemStyle = getSubjectStyle(cellItem.subject, cellItem.isLab);

                              return (
                                <div 
                                  key={bIdx}
                                  className={`flex-1 w-full py-2 px-1.5 flex flex-col justify-center items-center text-center transition-all ${itemStyle.bg} hover:brightness-95`}
                                  style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                                >
                                  <div className={`font-black tracking-tight text-[11.5px] sm:text-[12px] leading-snug ${itemStyle.text}`}>
                                    {cellItem.subject}
                                  </div>

                                  <div className="text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight">
                                    Section: {cellItem.branch}
                                  </div>

                                  {cellItem.room && (
                                    <div className="mt-1 text-[11px] sm:text-[11.5px] font-black text-slate-800 tracking-normal font-sans">
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
    </div>
  );
}
