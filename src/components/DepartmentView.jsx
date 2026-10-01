import React, { useState, useMemo } from 'react';
import DepartmentTimetableGrid from './DepartmentTimetableGrid';
import { getFacultyShortName } from '../utils/facultyShortNames';
import initialData from '../data/initialData.json';
import { Printer, Building2, Users, Layers, Award } from 'lucide-react';

const DEPARTMENT_ORDER = [
  'Chemistry',
  'Physics',
  'Mathematics',
  'CSE',
  'ECE',
  'Mechanical',
  'CIVIL',
  'English',
  'EEE',
  'IT',
  'Chemical'
];

export default function DepartmentView({
  timetableData = {},
  universityInfo = {},
  facultyList = [],
  onSlotClick
}) {
  const masterFacultyList = useMemo(() => {
    return (facultyList && facultyList.length > 0)
      ? facultyList
      : initialData.facultyList || [];
  }, [facultyList]);

  // Group faculty by department
  const departmentGroups = useMemo(() => {
    const map = new Map();

    // Initialize preferred order
    DEPARTMENT_ORDER.forEach(dept => {
      map.set(dept, []);
    });

    masterFacultyList.forEach(fac => {
      const d = fac.dept?.trim() || 'General';
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d).push(fac);
    });

    // Remove empty departments or 'Not Specified' unless it has faculty
    const result = {};
    for (const [dept, list] of map.entries()) {
      if (list.length > 0 && dept !== 'Not Specified') {
        result[dept] = list;
      }
    }
    return result;
  }, [masterFacultyList]);

  const departmentNames = useMemo(() => Object.keys(departmentGroups), [departmentGroups]);

  const [selectedDept, setSelectedDept] = useState(() => {
    return departmentNames.includes('Chemistry') ? 'Chemistry' : departmentNames[0] || '';
  });

  const [viewAll, setViewAll] = useState(false);

  // Active faculty list for currently selected department
  const activeDeptFaculty = useMemo(() => {
    return departmentGroups[selectedDept] || [];
  }, [departmentGroups, selectedDept]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-gray-300 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" />
            <label htmlFor="dept-select" className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Department:
            </label>
            <select
              id="dept-select"
              value={viewAll ? 'ALL' : selectedDept}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL') {
                  setViewAll(true);
                } else {
                  setViewAll(false);
                  setSelectedDept(val);
                }
              }}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer uppercase font-sans"
            >
              {departmentNames.map((dept) => {
                const count = departmentGroups[dept]?.length || 0;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count} Faculty)
                  </option>
                );
              })}
              <option value="ALL">All Departments ({departmentNames.length} Departments)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>{viewAll ? 'All Departments' : `${activeDeptFaculty.length} Faculty Members`}</span>
          </div>
        </div>

        {/* Print Buttons */}
        <div className="flex items-center gap-2">
          {!viewAll && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title={`Print ${selectedDept} department timetable (Strictly 1 Page Landscape)`}
            >
              <Printer className="w-4 h-4 text-blue-200" />
              Print {selectedDept} (1 Page Landscape)
            </button>
          )}

          <button
            onClick={() => {
              setViewAll(true);
              setTimeout(() => {
                window.print();
              }, 150);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            title="Print all departments, each strictly on 1 landscape page"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            Print All Departments (1 Page Each)
          </button>
        </div>
      </div>

      {/* RENDER TIMETABLES */}
      {viewAll ? (
        /* ALL DEPARTMENTS PRINT CONTAINER */
        <div className="space-y-8 master-print-container">
          {departmentNames.map((dept) => (
            <div key={dept} className="dept-print-page">
              <DepartmentTimetableGrid
                deptName={dept}
                facultyList={departmentGroups[dept] || []}
                timetableData={timetableData}
                universityInfo={universityInfo}
                onSlotClick={onSlotClick}
              />
            </div>
          ))}
        </div>
      ) : (
        /* SINGLE DEPARTMENT TIMETABLE */
        <div className="dept-print-page">
          <DepartmentTimetableGrid
            deptName={selectedDept}
            facultyList={activeDeptFaculty}
            timetableData={timetableData}
            universityInfo={universityInfo}
            onSlotClick={onSlotClick}
          />
        </div>
      )}
    </div>
  );
}
