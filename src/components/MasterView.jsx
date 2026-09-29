import React from 'react';
import TimetableGrid from './TimetableGrid';
import { branches } from '../data/mockData';
import { Layers, GraduationCap, Clock, Award } from 'lucide-react';

export default function MasterView({ timetableData, branchLegends = {}, universityInfo, facultyList = [], onSlotClick }) {
  const availableBranchKeys = Object.keys(timetableData);

  // Calculate master stats
  let totalClasses = 0;
  let totalLabs = 0;
  const uniqueFaculty = new Set();
  const uniqueLabs = new Set();
  const nonFacultyKeywords = ['COMP.', 'LAB-1', 'LAB-2', 'LAB-3', 'LAB-4', 'COUNSELLING', 'LIBRARY', 'SPORTS', 'YOGA'];

  availableBranchKeys.forEach((branchKey) => {
    const branchSched = timetableData[branchKey] || {};
    Object.keys(branchSched).forEach((day) => {
      Object.keys(branchSched[day]).forEach((slotTime) => {
        const rawCell = branchSched[day][slotTime];
        const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
        items.forEach(cell => {
          if (cell && cell.subject) {
            totalClasses++;
            if (cell.isLab) totalLabs++;
            if (cell.faculty) {
              cell.faculty.split(',').forEach(f => {
                const trimmed = f.trim();
                if (trimmed && !nonFacultyKeywords.includes(trimmed.toUpperCase())) {
                  uniqueFaculty.add(trimmed);
                }
              });
            }
            if (cell.room && cell.isLab) {
              uniqueLabs.add(cell.room.trim());
            }
          }
        });
      });
    });
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
