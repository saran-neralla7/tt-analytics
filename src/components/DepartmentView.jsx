import React, { useState, useMemo } from 'react';
import DepartmentTimetableGrid from './DepartmentTimetableGrid';
import { getFacultyShortName } from '../utils/facultyShortNames';
import initialData from '../data/initialData.json';
import { Printer, Building2, Users, Layers, Award, AlertTriangle } from 'lucide-react';
import PrintFormatToggle from './PrintFormatToggle';
import { triggerPrint, getPrintFormat } from '../utils/printUtils';

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
  'CSE and IT',
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

    // Populate combined 'CSE and IT' department with faculty from both CSE and IT
    const cseFac = map.get('CSE') || [];
    const itFac = map.get('IT') || [];
    if (cseFac.length > 0 || itFac.length > 0) {
      map.set('CSE and IT', [...cseFac, ...itFac]);
    }

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
  const [printFormat, setPrintFormat] = useState('a3-landscape');

  // Active faculty list for currently selected department
  const activeDeptFaculty = useMemo(() => {
    return departmentGroups[selectedDept] || [];
  }, [departmentGroups, selectedDept]);

  // Calculate schedule clashes per department
  const deptClashCounts = useMemo(() => {
    const counts = {};
    const slots = ['09:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-01:15', '02:15-03:15', '03:15-04:15'];
    const master = initialData.masterFacultyTimetables || {};

    Object.entries(departmentGroups).forEach(([dept, facs]) => {
      let count = 0;
      facs.forEach(f => {
        const sched = master[f.fullName] || {};
        ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(day => {
          const daySched = sched[day] || {};
          slots.forEach(slot => {
            if ((daySched[slot] || []).length > 1) {
              count += 1;
            }
          });
        });
      });
      counts[dept] = count;
    });
    return counts;
  }, [departmentGroups]);

  const totalAllClashes = useMemo(() => {
    return Object.values(deptClashCounts).reduce((acc, c) => acc + c, 0);
  }, [deptClashCounts]);

  const currentDeptClashes = deptClashCounts[selectedDept] || 0;

  return (
    <div className="w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8 py-4">
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
                const clashes = deptClashCounts[dept] || 0;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count} Faculty{clashes > 0 ? ` • ⚠️ ${clashes} Clashes` : ''})
                  </option>
                );
              })}
              <option value="ALL">All Departments ({departmentNames.length} Departments{totalAllClashes > 0 ? ` • ⚠️ ${totalAllClashes} Clashes` : ''})</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>{viewAll ? 'All Departments' : `${activeDeptFaculty.length} Faculty Members`}</span>
          </div>

          {/* Conflict Badge in Toolbar */}
          {!viewAll && (
            currentDeptClashes > 0 ? (
              <div className="flex items-center gap-1.5 bg-red-100 text-red-800 px-2.5 py-1 rounded-md text-xs font-bold border border-red-300" title={`${currentDeptClashes} period conflicts detected in ${selectedDept}`}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{currentDeptClashes} Clashing Periods</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-300">
                <span>✓ 0 Clashes</span>
              </div>
            )
          )}
        </div>

        {/* Print Buttons & In-App Format Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <PrintFormatToggle 
            selectedFormat={printFormat}
            onFormatChange={setPrintFormat}
          />

          {!viewAll && (
            <button
              onClick={() => triggerPrint(printFormat)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title={`Print ${selectedDept} department timetable in ${getPrintFormat(printFormat).label}`}
            >
              <Printer className="w-4 h-4 text-blue-200" />
              Print {selectedDept} ({getPrintFormat(printFormat).shortLabel})
            </button>
          )}

          <button
            onClick={() => {
              setViewAll(true);
              triggerPrint(printFormat, null, 150);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            title={`Print all departments in ${getPrintFormat(printFormat).label}`}
          >
            <Printer className="w-4 h-4 text-slate-300" />
            Print All Departments ({getPrintFormat(printFormat).shortLabel})
          </button>
        </div>
      </div>

      {/* Print Instructions Helper Banner */}
      <div className="no-print mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900 font-medium">
        <span>💡 <strong>Orientation & Page Size:</strong> Use the toggle above to choose <strong>A4 Portrait</strong>, <strong>A4 Landscape</strong>, or <strong>A3 Landscape</strong>. The print layout instantly configures to your selection.</span>
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
