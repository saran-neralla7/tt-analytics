import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserCheck, Search, Filter, BookOpen, Clock, Award, Briefcase } from 'lucide-react';
import initialData from '../data/initialData.json';

export default function FacultyWorkloadView({ universityInfo, facultyList: propFacultyList }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');

  const facultyList = useMemo(() => {
    const list = propFacultyList || initialData.facultyList || [];
    return list.filter(f => (f.totalLoad || 0) > 0 || (f.assignedCourses && f.assignedCourses.length > 0));
  }, [propFacultyList]);

  // Refs for synchronized dual horizontal scrollbars (top & bottom)
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const isSyncingTop = useRef(false);
  const isSyncingBottom = useRef(false);

  // Synchronize scroll positions between top and bottom bars
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
      if (dept) set.add(dept);
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

  // Filtered list
  const filteredFaculty = useMemo(() => {
    return facultyList.filter(f => {
      const matchesSearch = 
        f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.assignments && f.assignments.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDept = selectedDept === 'ALL' || (f.dept?.trim() || 'General') === selectedDept;
      const matchesFaculty = selectedFaculty === 'ALL' || f.fullName === selectedFaculty;

      return matchesSearch && matchesDept && matchesFaculty;
    });
  }, [facultyList, searchTerm, selectedDept, selectedFaculty]);

  // Measure and synchronize dimensions
  useEffect(() => {
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
  }, [filteredFaculty]);

  // Calculate totals
  const totalFacultyCount = filteredFaculty.length;
  const totalHoursTaught = filteredFaculty.reduce((acc, f) => acc + (f.totalLoad || 0), 0);
  const avgWorkload = totalFacultyCount > 0 ? (totalHoursTaught / totalFacultyCount).toFixed(1) : 0;

  return (
    <div className="w-full max-w-full px-2 sm:px-4 py-4">
      {/* Header & Controls Bar */}
      <div className="no-print bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Faculty Directory & Workload Summary
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Complete teaching load analysis and department allocations for Gayatri Vidya Parishad.
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
              <div className="text-xs text-emerald-700 font-medium">Total Teaching Hours</div>
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

      {/* Faculty Workload Table */}
      <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden workload-card">
        <div className="print-only text-center py-3 px-6 border-b border-gray-300 bg-gray-50/70">
          <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">
            {universityInfo.name}
          </h2>
          <h3 className="text-xs font-bold text-blue-800 mt-1 uppercase font-mono">
            OFFICIAL FACULTY WORKLOAD SUMMARY SHEET (ACADEMIC YEAR {universityInfo.academicYear})
          </h3>
        </div>

        {/* Synchronized Top Horizontal Scrollbar (Automatically appears if needed on smaller screens) */}
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
                <th className="py-3 px-1 border-r border-gray-300 text-center w-14 whitespace-nowrap">Lab</th>
                <th className="py-3 px-1.5 border-r-2 border-slate-500 text-center w-16 bg-blue-100/60 text-blue-950 font-black whitespace-nowrap">Total</th>
                <th className="py-3 px-3">Assigned Courses & Classes</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-600">
              {filteredFaculty.map((item, index) => (
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
                    {item.theoryLoad} hrs
                  </td>
                  <td className="py-2.5 px-1 text-center font-bold text-purple-800 border-r border-gray-300 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                    {item.labLoad} hrs
                  </td>
                  <td className="py-2.5 px-1.5 text-center font-black text-blue-950 bg-blue-50/60 border-r-2 border-slate-500 border-b-2 border-slate-600 text-xs whitespace-nowrap">
                    {item.totalLoad} hrs/wk
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
