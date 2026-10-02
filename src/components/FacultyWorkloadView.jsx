import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserCheck, Search, Filter, Clock, Award, Briefcase, Users } from 'lucide-react';
import initialData from '../data/initialData.json';
import FacultyAvailabilitySubtab from './FacultyAvailabilitySubtab';

// Helper to abbreviate branch names cleanly for workload distribution column
function formatBranchShort(b) {
  if (!b) return '';
  if (b === 'CSE (CS & DS)') return 'CS&DS';
  if (b === 'CSE(AI&ML)-1') return 'AIML-1';
  if (b === 'CSE(AI&ML)-2') return 'AIML-2';
  if (b === 'MECH-ROBOTICS') return 'M-ROB';
  if (b === 'CHEMICAL') return 'CHEM';
  return b;
}

export default function FacultyWorkloadView({ 
  universityInfo, 
  facultyList: propFacultyList,
  timetableData = {},
  onSlotClick
}) {
  const [activeSubtab, setActiveSubtab] = useState('summary'); // 'summary' | 'availability'
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
      const theoryByBranch = {};
      const labByBranch = {};
      let theoryLoad = 0;
      let labLoad = 0;

      Object.values(sched).forEach(daySlots => {
        Object.values(daySlots || {}).forEach(items => {
          const itemList = Array.isArray(items) ? items : items ? [items] : [];
          itemList.forEach(it => {
            const isLab = it.isLab || (it.subject && it.subject.toLowerCase().includes('lab'));
            const b = formatBranchShort(it.branch || 'Other');
            if (isLab) {
              labByBranch[b] = (labByBranch[b] || 0) + 1;
              labLoad += 1;
            } else {
              theoryByBranch[b] = (theoryByBranch[b] || 0) + 1;
              theoryLoad += 1;
            }
          });
        });
      });

      map[f.fullName] = {
        theoryLoad,
        labLoad,
        tutLoad: 0,
        totalLoad: theoryLoad + labLoad,
        theoryByBranch,
        labByBranch
      };
    });

    return map;
  }, [facultyList]);

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
        (f.dept && f.dept.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDept = selectedDept === 'ALL' || (f.dept?.trim() || 'General') === selectedDept;
      const matchesFaculty = selectedFaculty === 'ALL' || f.fullName === selectedFaculty;

      return matchesSearch && matchesDept && matchesFaculty;
    });
  }, [facultyList, searchTerm, selectedDept, selectedFaculty]);

  // Calculate totals from Timetable_Final workload map
  const totalFacultyCount = filteredFaculty.length;
  const totalTheoryHours = useMemo(() => {
    return filteredFaculty.reduce((acc, f) => acc + (facultyWorkloadMap[f.fullName]?.theoryLoad || 0), 0);
  }, [filteredFaculty, facultyWorkloadMap]);

  const totalLabHours = useMemo(() => {
    return filteredFaculty.reduce((acc, f) => acc + (facultyWorkloadMap[f.fullName]?.labLoad || 0), 0);
  }, [filteredFaculty, facultyWorkloadMap]);

  const totalHoursTaught = totalTheoryHours + totalLabHours;
  const avgWorkload = totalFacultyCount > 0 ? (totalHoursTaught / totalFacultyCount).toFixed(1) : 0;

  return (
    <div className="w-full max-w-full px-2 sm:px-4 py-4">
      {/* Subtab Navigation: "Faculty Workload Summary" & "Faculty Availability (Free / Occupied)" */}
      <div className="no-print flex items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
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
      ) : (
        <>
          {/* Header & Controls Bar */}
          <div className="no-print bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Faculty Workload Summary
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Authoritative faculty teaching loads calculated strictly from the <strong className="text-blue-900 font-bold">Timetable_Final</strong> sheet.
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

          {/* Faculty Workload Table (Clean, Numerical Breakdown strictly from Timetable_Final, No Subject Names) */}
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
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px] sm:text-xs">
                    <th className="py-2.5 px-2 border-r border-gray-300 w-12 text-center">S.No</th>
                    <th className="py-2.5 px-3 border-r border-gray-300 text-left w-52 sm:w-60">Name of the Faculty</th>
                    {selectedDept === 'ALL' && (
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-left w-28">Department</th>
                    )}
                    <th className="py-2.5 px-2.5 border-r border-gray-300 text-left w-36 sm:w-40">Designation</th>
                    <th className="py-2.5 px-3 border-r border-gray-300 bg-blue-50/60 text-blue-950 font-black text-left">
                      Theory Workload
                    </th>
                    <th className="py-2.5 px-3 border-r border-gray-300 bg-amber-50/60 text-amber-950 font-black text-left w-28">
                      Tutorial Workload
                    </th>
                    <th className="py-2.5 px-3 border-r border-gray-300 bg-purple-50/60 text-purple-950 font-black text-left">
                      Lab Workload
                    </th>
                    <th className="py-2.5 px-3 w-20 bg-emerald-50/60 text-emerald-950 font-black text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFaculty.map((item, index) => {
                    const cleanShort = (item.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
                    const loadInfo = facultyWorkloadMap[item.fullName] || {
                      theoryLoad: 0,
                      labLoad: 0,
                      tutLoad: 0,
                      totalLoad: 0,
                      theoryByBranch: {},
                      labByBranch: {}
                    };

                    return (
                      <tr 
                        key={item.fullName || index} 
                        className={`border-b border-gray-200 transition-colors ${
                          index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-gray-50/50 hover:bg-slate-50'
                        }`}
                      >
                        {/* S.No */}
                        <td className="py-2.5 px-2 border-r border-gray-200 font-mono text-center text-slate-600 font-bold align-middle text-[11px]">
                          {index + 1}
                        </td>

                        {/* Name of the Faculty with Short Code */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-left font-bold text-slate-900 align-middle text-[11.5px] leading-tight">
                          <span>{item.fullName}</span>
                          {cleanShort && (
                            <span className="ml-1 text-blue-700 font-mono font-bold text-[11px]">
                              ({cleanShort})
                            </span>
                          )}
                        </td>

                        {/* Department (shown when viewing ALL) */}
                        {selectedDept === 'ALL' && (
                          <td className="py-2.5 px-2.5 border-r border-gray-200 text-left font-semibold text-slate-800 align-middle text-[11px]">
                            {item.dept || '—'}
                          </td>
                        )}

                        {/* Designation */}
                        <td className="py-2.5 px-2.5 border-r border-gray-200 text-left text-slate-700 font-medium text-[11px] align-middle leading-tight">
                          {item.designation || 'Assistant Professor'}
                        </td>

                        {/* Theory Workload (Numerical breakdown by branch, strictly from Timetable_Final) */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-left align-middle text-[11.5px] bg-blue-50/30">
                          {loadInfo.theoryLoad > 0 ? (
                            <div className="flex flex-wrap items-baseline gap-1">
                              <span className="font-mono font-black text-blue-900 text-xs sm:text-[13px]">
                                {loadInfo.theoryLoad}
                              </span>
                              <span className="text-slate-600 text-[11px] font-medium">
                                ({Object.entries(loadInfo.theoryByBranch).map(([b, hrs]) => `${b}: ${hrs}`).join(', ')})
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-xs">0</span>
                          )}
                        </td>

                        {/* Tutorial Workload */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-left align-middle text-[11.5px] bg-amber-50/30">
                          <span className="font-mono font-bold text-slate-400 text-xs">0</span>
                        </td>

                        {/* Lab Workload (Numerical breakdown by branch, strictly from Timetable_Final) */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-left align-middle text-[11.5px] bg-purple-50/30">
                          {loadInfo.labLoad > 0 ? (
                            <div className="flex flex-wrap items-baseline gap-1">
                              <span className="font-mono font-black text-purple-900 text-xs sm:text-[13px]">
                                {loadInfo.labLoad}
                              </span>
                              <span className="text-slate-600 text-[11px] font-medium">
                                ({Object.entries(loadInfo.labByBranch).map(([b, hrs]) => `${b}: ${hrs}`).join(', ')})
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-slate-400 text-xs">0</span>
                          )}
                        </td>

                        {/* Total Teaching Hours */}
                        <td className="py-2.5 px-3 text-center align-middle bg-emerald-50/40 font-mono font-black text-emerald-950 text-xs sm:text-sm">
                          {loadInfo.totalLoad}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Bottom Summary Row */}
                <tfoot>
                  <tr className="bg-gray-100 font-black border-t-2 border-slate-700 text-slate-900 text-[11.5px]">
                    <td colSpan={selectedDept === 'ALL' ? 4 : 3} className="py-3 px-3 text-right uppercase tracking-wider font-sans font-black border-r border-gray-300">
                      TOTAL ({filteredFaculty.length} FACULTY):
                    </td>
                    <td className="py-3 px-3 border-r border-gray-300 text-left font-mono font-black text-blue-950 bg-blue-100/60">
                      {totalTheoryHours} (Theory Hrs)
                    </td>
                    <td className="py-3 px-3 border-r border-gray-300 text-left font-mono font-black text-amber-950 bg-amber-100/60">
                      0 (Tut Hrs)
                    </td>
                    <td className="py-3 px-3 border-r border-gray-300 text-left font-mono font-black text-purple-950 bg-purple-100/60">
                      {totalLabHours} (Lab Hrs)
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-100/60 text-sm">
                      {totalHoursTaught}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
