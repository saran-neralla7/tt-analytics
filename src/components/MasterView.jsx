import React, { useState, useMemo } from 'react';
import TimetableGrid from './TimetableGrid';
import { branches, days } from '../data/mockData';
import { Layers, GraduationCap, Clock, Award, Calendar, Filter } from 'lucide-react';

export default function MasterView({ timetableData, branchLegends = {}, universityInfo, facultyList = [], onSlotClick }) {
  const availableBranchKeys = Object.keys(timetableData);
  const [selectedDay, setSelectedDay] = useState('ALL');

  const dayOptions = [
    { id: 'ALL', label: 'All Days' },
    { id: 'MON', label: 'Monday' },
    { id: 'TUE', label: 'Tuesday' },
    { id: 'WED', label: 'Wednesday' },
    { id: 'THU', label: 'Thursday' },
    { id: 'FRI', label: 'Friday' },
    { id: 'SAT', label: 'Saturday' }
  ];

  // Calculate master stats dynamically based on selectedDay
  const { totalClasses, totalLabs, uniqueFaculty } = useMemo(() => {
    let classes = 0;
    let labs = 0;
    const facSet = new Set();
    const nonFacultyKeywords = ['COMP.', 'LAB-1', 'LAB-2', 'LAB-3', 'LAB-4', 'COUNSELLING', 'LIBRARY', 'SPORTS', 'YOGA'];
    const activeDays = selectedDay === 'ALL' ? days : [selectedDay];

    availableBranchKeys.forEach((branchKey) => {
      const branchSched = timetableData[branchKey] || {};
      activeDays.forEach((day) => {
        Object.keys(branchSched[day] || {}).forEach((slotTime) => {
          const rawCell = branchSched[day][slotTime];
          const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
          items.forEach(cell => {
            if (cell && cell.subject) {
              classes++;
              if (cell.isLab) labs++;
              if (cell.faculty) {
                cell.faculty.split(',').forEach(f => {
                  const trimmed = f.trim();
                  if (trimmed && !nonFacultyKeywords.includes(trimmed.toUpperCase())) {
                    facSet.add(trimmed);
                  }
                });
              }
            }
          });
        });
      });
    });

    return { totalClasses: classes, totalLabs: labs, uniqueFaculty: facSet };
  }, [availableBranchKeys, selectedDay, timetableData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Day-Wise Filter Pills */}
      <div className="no-print flex flex-col items-center justify-center mb-6 gap-2">
        <div className="inline-flex p-1.5 bg-slate-200/90 rounded-xl gap-1.5 shadow-inner border border-slate-300 flex-wrap justify-center">
          {dayOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedDay(opt.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black rounded-lg transition-all ${
                selectedDay === opt.id
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
        {selectedDay !== 'ALL' && (
          <div className="text-xs font-bold text-blue-900 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 flex items-center gap-2">
            <span>Filtering all {availableBranchKeys.length} departments for <strong>{dayOptions.find(d => d.id === selectedDay)?.label}</strong></span>
            <button 
              onClick={() => setSelectedDay('ALL')}
              className="text-blue-600 hover:text-blue-800 underline font-black ml-1"
            >
              Reset to All Days
            </button>
          </div>
        )}
      </div>
      {/* Analytics Summary Header */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Active Branches</div>
            <div className="text-lg font-bold text-gray-900">{availableBranchKeys.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Total Period Slots</div>
            <div className="text-lg font-bold text-gray-900">{totalClasses}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Faculty (With Workload)</div>
            <div className="text-lg font-bold text-gray-900">{facultyList && facultyList.length > 0 ? facultyList.filter(f => (f.totalLoad || 0) > 0 || (f.assignedCourses && f.assignedCourses.length > 0)).length || facultyList.length : (uniqueFaculty.size || 77)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Practical / Labs</div>
            <div className="text-lg font-bold text-gray-900">{totalLabs} Sessions</div>
          </div>
        </div>
      </div>

      {/* Render All Branch Timetables - Single page per branch in print */}
      <div className="space-y-8 master-print-container">
        {availableBranchKeys.map((branchKey) => {
          const branchObj = branches.find(b => b.name === branchKey) || { name: branchKey, fullName: branchKey };
          return (
            <div key={branchKey} className="branch-print-page">
              <TimetableGrid 
                timetableData={timetableData} 
                branchLegend={branchLegends[branchKey]}
                isCollapsibleLegend={true}
                defaultLegendOpen={false}
                selectedBranch={branchKey} 
                branchInfo={branchObj}
                universityInfo={universityInfo}
                onSlotClick={onSlotClick}
                selectedDay={selectedDay}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
