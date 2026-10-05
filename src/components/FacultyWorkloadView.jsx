import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserCheck, Search, Filter, Clock, Award, Briefcase, Users, BookOpen, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import initialData from '../data/initialData.json';
import FacultyAvailabilitySubtab from './FacultyAvailabilitySubtab';

export default function FacultyWorkloadView({ 
  universityInfo, 
  facultyList: propFacultyList,
  timetableData = {},
  onSlotClick
}) {
  // Subtabs: 'summary' (numbers only) | 'detailed' (older view with courses) | 'availability'
  const [activeSubtab, setActiveSubtab] = useState('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');

  const facultyList = useMemo(() => {
    const list = propFacultyList || initialData.allFacultyList || initialData.facultyList || [];
    return list;
  }, [propFacultyList]);

  // Authoritative calculation of workload directly from Timetable_Final (via masterFacultyTimetables)
  const facultyWorkloadMap = useMemo(() => {
    const master = initialData.masterFacultyTimetables || {};
    const map = {};

    facultyList.forEach(f => {
      const sched = master[f.fullName] || {};
      let theoryLoad = 0;
      let tutLoad = 0;
      let labLoad = 0;

      Object.values(sched).forEach(daySlots => {
        Object.values(daySlots || {}).forEach(items => {
          const itemList = Array.isArray(items) ? items : items ? [items] : [];
          itemList.forEach(it => {
            const subj = (it.subject || '').trim();
            const isLab = it.isLab || /lab/i.test(subj);
            const isTut = it.isTutorial || /tut/i.test(subj);
            if (isLab) {
              labLoad += 1;
            } else if (isTut) {
              tutLoad += 1;
            } else {
              theoryLoad += 1;
            }
          });
        });
      });

      map[f.fullName] = {
        theoryLoad,
        tutLoad,
        labLoad,
        totalLoad: theoryLoad + tutLoad + labLoad
      };
    });

    return map;
  }, [facultyList]);

  // Refs for synchronized horizontal scrollbars on detailed table
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const isSyncingTop = useRef(false);
  const isSyncingBottom = useRef(false);

  const handleTopScroll = () => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (bottomScrollRef.current && topScrollRef.current) {
      isSyncingBottom.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false;
      return;
    }
    if (topScrollRef.current && bottomScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set();
    facultyList.forEach(f => {
      const dept = f.dept?.trim() || 'General';
      if (dept && dept !== 'Not Specified') set.add(dept);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [facultyList]);

  // Faculty list belonging to the currently selected department
  const deptFacultyList = useMemo(() => {
    if (selectedDept === 'ALL') {
      return facultyList;
    }
    return facultyList.filter(f => (f.dept?.trim() || 'General') === selectedDept);
  }, [facultyList, selectedDept]);

  // Handle department change with reset to faculty dropdown
  const handleDeptChange = (newDept) => {
    setSelectedDept(newDept);
    setSelectedFaculty('ALL');
  };

  // Filtered faculty list
  const filteredFaculty = useMemo(() => {
    return facultyList.filter(f => {
      const cleanShort = (f.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      const matchesSearch = 
        f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cleanShort.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.dept && f.dept.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.assignments && f.assignments.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDept = selectedDept === 'ALL' || (f.dept?.trim() || 'General') === selectedDept;
      const matchesFaculty = selectedFaculty === 'ALL' || f.fullName === selectedFaculty;

      return matchesSearch && matchesDept && matchesFaculty;
    });
  }, [facultyList, searchTerm, selectedDept, selectedFaculty]);

  // Total column sort state: 'none' | 'desc' | 'asc'
  const [totalSortOrder, setTotalSortOrder] = useState('none');

  const handleTotalSortToggle = () => {
    setTotalSortOrder(prev => {
      if (prev === 'none') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'none';
    });
  };

  const displaySummaryFaculty = useMemo(() => {
    if (totalSortOrder === 'none') return filteredFaculty;
    return [...filteredFaculty].sort((a, b) => {
      const aTotal = facultyWorkloadMap[a.fullName]?.totalLoad ?? 0;
      const bTotal = facultyWorkloadMap[b.fullName]?.totalLoad ?? 0;
      if (totalSortOrder === 'desc') {
        return bTotal - aTotal;
      } else {
        return aTotal - bTotal;
      }
    });
  }, [filteredFaculty, totalSortOrder, facultyWorkloadMap]);

  // Measure and synchronize dimensions for detailed view
  useEffect(() => {
    if (activeSubtab !== 'detailed') return;
    const syncDimensions = () => {
      if (bottomScrollRef.current && tableRef.current) {
        const tableScrollWidth = tableRef.current.scrollWidth;
        const containerClientWidth = bottomScrollRef.current.clientWidth;
        setContentWidth(tableScrollWidth);
        setHasOverflow(tableScrollWidth > containerClientWidth + 2);
      }
    };

    syncDimensions();
    const ro = new ResizeObserver(syncDimensions);
    if (bottomScrollRef.current) ro.observe(bottomScrollRef.current);
    if (tableRef.current) ro.observe(tableRef.current);
    window.addEventListener('resize', syncDimensions);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncDimensions);
    };
  }, [filteredFaculty, activeSubtab]);

  // Calculate totals from Timetable_Final workload map
  const totalFacultyCount = filteredFaculty.length;
  const totalTheoryHours = useMemo(() => {
    return filteredFaculty.reduce((acc, f) => acc + (facultyWorkloadMap[f.fullName]?.theoryLoad || 0), 0);
  }, [filteredFaculty, facultyWorkloadMap]);

  const totalTutHours = useMemo(() => {
    return filteredFaculty.reduce((acc, f) => acc + (facultyWorkloadMap[f.fullName]?.tutLoad || 0), 0);
  }, [filteredFaculty, facultyWorkloadMap]);

  const totalLabHours = useMemo(() => {
    return filteredFaculty.reduce((acc, f) => acc + (facultyWorkloadMap[f.fullName]?.labLoad || 0), 0);
  }, [filteredFaculty, facultyWorkloadMap]);

  const totalHoursTaught = totalTheoryHours + totalTutHours + totalLabHours;
  const avgWorkload = totalFacultyCount > 0 ? (totalHoursTaught / totalFacultyCount).toFixed(1) : 0;

  return (
    <div className="w-full max-w-full px-2 sm:px-4 py-4">
      {/* 3 Subtabs: Faculty Workload Summary | Detailed Course Allocations | Faculty Availability */}
      <div className="no-print flex items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Subtab 1: Summary (Pure numbers from Timetable_Final) */}
          <button
            onClick={() => setActiveSubtab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeSubtab === 'summary'
                ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-600/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Faculty Workload Summary</span>
          </button>

          {/* Subtab 2: Detailed Course Allocations (Older View with full class strings) */}
          <button
            onClick={() => setActiveSubtab('detailed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeSubtab === 'detailed'
                ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-600/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Detailed Course Allocations</span>
          </button>

          {/* Subtab 3: Faculty Availability */}
          <button
            onClick={() => setActiveSubtab('availability')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeSubtab === 'availability'
                ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-600/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Faculty Availability (Free / Occupied)</span>
          </button>
        </div>
      </div>

      {activeSubtab === 'availability' ? (
        <FacultyAvailabilitySubtab
          facultyList={facultyList}
          timetableData={timetableData}
          universityInfo={universityInfo}
          onSlotClick={onSlotClick}
        />
      ) : activeSubtab === 'summary' ? (
        /* SUBTAB 1: FACULTY WORKLOAD SUMMARY (Numbers Only, Large Font, Timetable_Final) */
        <>
          {/* Header & Controls Bar */}
          <div className="no-print bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Faculty Workload Summary
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Numerical workload summary calculated strictly from <strong className="text-blue-900 font-bold">Timetable_Final</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, code, dept..."
                    className="w-full text-xs px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                </div>

                {/* 1. Department Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <select
                    value={selectedDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="ALL">All Departments ({facultyList.length})</option>
                    {departments.filter(d => d !== 'ALL').map(dept => {
                      const count = facultyList.filter(f => (f.dept?.trim() || 'General') === dept).length;
                      return (
                        <option key={dept} value={dept}>
                          {dept} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Cascading Faculty Member Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <select
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer max-w-[190px]"
                  >
                    <option value="ALL">All Faculty in Dept ({deptFacultyList.length})</option>
                    {deptFacultyList.map(f => {
                      const cleanShort = (f.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
                      return (
                        <option key={f.fullName} value={f.fullName}>
                          {f.fullName} {cleanShort ? `(${cleanShort})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50/70 p-3.5 rounded-lg border border-blue-100 flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-blue-700 font-medium">Faculty Members Listed</div>
                  <div className="text-base font-bold text-blue-950">{totalFacultyCount} Members</div>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-100 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-emerald-700 font-medium">Total Teaching Hours (Timetable_Final)</div>
                  <div className="text-base font-bold text-emerald-950">{totalHoursTaught} Hrs / Week</div>
                </div>
              </div>

              <div className="bg-purple-50/70 p-3.5 rounded-lg border border-purple-100 flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-purple-700 font-medium">Average Load / Faculty</div>
                  <div className="text-base font-bold text-purple-950">{avgWorkload} Hrs / Week</div>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Numerical Workload Table (Numbers Only, Increased Font, Timetable_Final) */}
          <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card dept-workload-card">
            {/* Header Banner */}
            <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
                  Faculty Workload Distribution • {selectedDept === 'ALL' ? 'All Departments' : `${selectedDept} Department`} ({filteredFaculty.length} Faculty)
                </h3>
              </div>
              <span className="text-[11px] text-slate-300 font-mono">
                Calculated strictly from Timetable_Final
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-xs sm:text-sm">
                    <th className="py-3 px-3 border-r border-gray-300 w-14 text-center">S.No</th>
                    <th className="py-3 px-4 border-r border-gray-300 text-left">Name of the Faculty</th>
                    {selectedDept === 'ALL' && (
                      <th className="py-3 px-3 border-r border-gray-300 text-left w-36">Department</th>
                    )}
                    <th className="py-3 px-3 border-r border-gray-300 text-left w-44">Designation</th>
                    <th className="py-3 px-4 border-r border-gray-300 bg-blue-50/70 text-blue-950 font-black text-center w-36 sm:w-40">
                      Theory Workload
                    </th>
                    <th className="py-3 px-4 border-r border-gray-300 bg-amber-50/70 text-amber-950 font-black text-center w-36 sm:w-40">
                      Tutorial Workload
                    </th>
                    <th className="py-3 px-4 border-r border-gray-300 bg-purple-50/70 text-purple-950 font-black text-center w-36 sm:w-40">
                      Lab Workload
                    </th>
                    <th 
                      onClick={handleTotalSortToggle}
                      className="py-3 px-4 w-32 bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-950 font-black text-center cursor-pointer select-none transition-colors border-l border-emerald-200"
                      title="Click to sort by Total Workload (Descending / Ascending / Default)"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Total</span>
                        {totalSortOrder === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-emerald-800" />
                        ) : totalSortOrder === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-emerald-800" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600/70" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displaySummaryFaculty.map((item, index) => {
                    const cleanShort = (item.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
                    const loadInfo = facultyWorkloadMap[item.fullName] || {
                      theoryLoad: 0,
                      labLoad: 0,
                      tutLoad: 0,
                      totalLoad: 0
                    };

                    return (
                      <tr 
                        key={item.fullName || index} 
                        className={`border-b border-gray-200 transition-colors ${
                          index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-gray-50/50 hover:bg-slate-50'
                        }`}
                      >
                        {/* S.No */}
                        <td className="py-3 px-3 border-r border-gray-200 font-mono text-center text-slate-600 font-bold align-middle text-xs sm:text-sm">
                          {index + 1}
                        </td>

                        {/* Name of Faculty with Short Code */}
                        <td className="py-3 px-4 border-r border-gray-200 text-left font-bold text-slate-900 align-middle text-sm sm:text-base leading-tight">
                          <span>{item.fullName}</span>
                          {cleanShort && (
                            <span className="ml-1.5 text-blue-700 font-mono font-bold text-xs sm:text-sm">
                              ({cleanShort})
                            </span>
                          )}
                        </td>

                        {/* Department (shown when viewing ALL) */}
                        {selectedDept === 'ALL' && (
                          <td className="py-3 px-3 border-r border-gray-200 text-left font-bold text-slate-800 align-middle text-xs sm:text-sm">
                            {item.dept || '—'}
                          </td>
                        )}

                        {/* Designation */}
                        <td className="py-3 px-3 border-r border-gray-200 text-left text-slate-700 font-semibold text-xs sm:text-sm align-middle leading-tight">
                          {item.designation || 'Assistant Professor'}
                        </td>

                        {/* Theory Workload (ONLY NUMBER) */}
                        <td className="py-3 px-4 border-r border-gray-200 text-center align-middle bg-blue-50/30">
                          {loadInfo.theoryLoad > 0 ? (
                            <span className="font-mono font-black text-blue-950 text-sm sm:text-base">
                              {loadInfo.theoryLoad}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-sm sm:text-base">0</span>
                          )}
                        </td>

                        {/* Tutorial Workload (ONLY NUMBER) */}
                        <td className="py-3 px-4 border-r border-gray-200 text-center align-middle bg-amber-50/30">
                          {loadInfo.tutLoad > 0 ? (
                            <span className="font-mono font-black text-amber-950 text-sm sm:text-base">
                              {loadInfo.tutLoad}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-sm sm:text-base">0</span>
                          )}
                        </td>

                        {/* Lab Workload (ONLY NUMBER) */}
                        <td className="py-3 px-4 border-r border-gray-200 text-center align-middle bg-purple-50/30">
                          {loadInfo.labLoad > 0 ? (
                            <span className="font-mono font-black text-purple-950 text-sm sm:text-base">
                              {loadInfo.labLoad}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-sm sm:text-base">0</span>
                          )}
                        </td>

                        {/* Total Teaching Hours (ONLY NUMBER) */}
                        <td className="py-3 px-4 text-center align-middle bg-emerald-50/40">
                          <span className="font-mono font-black text-emerald-950 text-base sm:text-lg">
                            {loadInfo.totalLoad}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Bottom Summary Row */}
                <tfoot>
                  <tr className="bg-gray-100 font-black border-t-2 border-slate-700 text-slate-900 text-xs sm:text-sm">
                    <td colSpan={selectedDept === 'ALL' ? 4 : 3} className="py-3 px-4 text-right uppercase tracking-wider font-sans font-black border-r border-gray-300">
                      TOTAL ({filteredFaculty.length} FACULTY):
                    </td>
                    <td className="py-3 px-4 border-r border-gray-300 text-center font-mono font-black text-blue-950 bg-blue-100/60 text-sm sm:text-base">
                      {totalTheoryHours}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-300 text-center font-mono font-black text-amber-950 bg-amber-100/60 text-sm sm:text-base">
                      {totalTutHours}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-300 text-center font-mono font-black text-purple-950 bg-purple-100/60 text-sm sm:text-base">
                      {totalLabHours}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-black text-emerald-950 bg-emerald-100/60 text-base sm:text-lg">
                      {totalHoursTaught}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* SUBTAB 2: DETAILED COURSE ALLOCATIONS (Older Detailed View with all course cards) */
        <>
          {/* Header & Controls Bar */}
          <div className="no-print bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Detailed Course Allocations
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete course allocations, assigned branches, and subject loads for Gayatri Vidya Parishad.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, code, course..."
                    className="w-full text-xs px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Department Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <select
                    value={selectedDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="ALL">All Departments ({facultyList.length})</option>
                    {departments.filter(d => d !== 'ALL').map(dept => {
                      const count = facultyList.filter(f => (f.dept?.trim() || 'General') === dept).length;
                      return (
                        <option key={dept} value={dept}>
                          {dept} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Faculty Member Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <select
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer max-w-[190px]"
                  >
                    <option value="ALL">All Faculty in Dept ({deptFacultyList.length})</option>
                    {deptFacultyList.map(f => {
                      const cleanShort = (f.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
                      return (
                        <option key={f.fullName} value={f.fullName}>
                          {f.fullName} {cleanShort ? `(${cleanShort})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50/70 p-3.5 rounded-lg border border-blue-100 flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-blue-700 font-medium">Faculty Members Listed</div>
                  <div className="text-base font-bold text-blue-950">{totalFacultyCount} Members</div>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-100 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-emerald-700 font-medium">Total Teaching Hours (Timetable_Final)</div>
                  <div className="text-base font-bold text-emerald-950">{totalHoursTaught} Hrs / Week</div>
                </div>
              </div>

              <div className="bg-purple-50/70 p-3.5 rounded-lg border border-purple-100 flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-purple-700 font-medium">Average Load / Faculty</div>
                  <div className="text-base font-bold text-purple-950">{avgWorkload} Hrs / Week</div>
                </div>
              </div>
            </div>
          </div>

          {/* Older Detailed Faculty Workload Table with Assigned Courses */}
          <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden workload-card">
            {/* Top Horizontal Scrollbar */}
            {hasOverflow && (
              <div 
                ref={topScrollRef}
                onScroll={handleTopScroll}
                className="no-print w-full overflow-x-auto overflow-y-hidden bg-slate-100/90 border-b border-slate-300"
                style={{ height: '14px' }}
                title="Scroll horizontally (Top)"
              >
                <div style={{ width: `${contentWidth}px`, height: '1px' }} />
              </div>
            )}

            {/* Table Container with Bottom Horizontal Scrollbar */}
            <div 
              ref={bottomScrollRef}
              onScroll={handleBottomScroll}
              className="w-full overflow-x-auto"
            >
              <table 
                ref={tableRef}
                className="w-full min-w-[1050px] text-xs text-left border-collapse workload-print-table border-2 border-slate-700 table-auto"
              >
                <thead>
                  <tr className="bg-gray-100 text-slate-900 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px] sm:text-xs">
                    <th className="py-3 px-2 border-r border-gray-300 w-10 text-center whitespace-nowrap">S.No</th>
                    <th className="py-3 px-2.5 border-r-2 border-slate-500 w-36 whitespace-nowrap">Faculty Name</th>
                    <th className="py-3 px-1.5 border-r border-gray-300 w-16 text-center whitespace-nowrap">Short Code</th>
                    <th className="py-3 px-2 border-r border-gray-300 w-24 whitespace-nowrap">Department</th>
                    <th className="py-3 px-2 border-r border-gray-300 w-28 whitespace-nowrap">Designation</th>
                    <th className="py-3 px-1 border-r border-gray-300 text-center w-14 whitespace-nowrap">Theory</th>
                    <th className="py-3 px-1 border-r border-gray-300 text-center w-14 whitespace-nowrap">Tut.</th>
                    <th className="py-3 px-1 border-r border-gray-300 text-center w-14 whitespace-nowrap">Lab</th>
                    <th className="py-3 px-1.5 border-r-2 border-slate-500 text-center w-16 bg-blue-100/60 text-blue-950 font-black whitespace-nowrap">Total</th>
                    <th className="py-3 px-3">Assigned Courses & Classes</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-600">
                  {filteredFaculty.map((item, index) => {
                    const loadInfo = facultyWorkloadMap[item.fullName] || {
                      theoryLoad: item.theoryLoad || 0,
                      tutLoad: item.tutLoad || 0,
                      labLoad: item.labLoad || 0,
                      totalLoad: item.totalLoad || 0
                    };

                    return (
                      <tr key={index} className="border-b-2 border-slate-600 hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-2 text-center font-bold text-slate-600 border-r border-gray-300 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                          {item.sno || index + 1}
                        </td>
                        <td className="py-2.5 px-2.5 font-black text-slate-950 border-r-2 border-slate-500 border-b-2 border-slate-600 text-xs sm:text-[13px] whitespace-nowrap">
                          {item.fullName}
                        </td>
                        <td className="py-2.5 px-1.5 text-center border-r border-gray-300 border-b-2 border-slate-600 whitespace-nowrap">
                          <span className="font-black text-slate-900 text-xs sm:text-[12.5px] tracking-normal">
                            {(item.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim() || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-slate-800 border-r border-gray-300 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                          {item.dept || '—'}
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-slate-700 border-r border-gray-300 border-b-2 border-slate-600 text-[11px] whitespace-nowrap">
                          {item.designation || 'Faculty'}
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-800 border-r border-gray-300 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                          {loadInfo.theoryLoad} hrs
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-amber-800 border-r border-gray-300 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                          {loadInfo.tutLoad || 0} hrs
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-purple-800 border-r border-gray-300 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                          {loadInfo.labLoad} hrs
                        </td>
                        <td className="py-2.5 px-1.5 text-center font-black text-blue-950 bg-blue-50/60 border-r-2 border-slate-500 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                          {loadInfo.totalLoad} hrs/wk
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 border-b-2 border-slate-600 text-xs leading-relaxed">
                          {item.assignments ? (
                            <div className="space-y-1">
                              {item.assignments.split('\n').filter(Boolean).map((line, lIdx) => (
                                <div 
                                  key={lIdx} 
                                  className="bg-slate-50/90 border border-slate-200 rounded px-2.5 py-1 text-slate-900 font-semibold whitespace-nowrap text-[11px] sm:text-[11.5px] leading-tight flex items-center shadow-2xs"
                                  title={line}
                                >
                                  {line}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No assigned classes listed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
