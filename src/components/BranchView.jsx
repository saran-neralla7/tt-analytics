import React from 'react';
import TimetableGrid from './TimetableGrid';
import { branches as mockBranches } from '../data/mockData';

export default function BranchView({ 
  timetableData, 
  branchLegends = {},
  selectedBranch, 
  onBranchChange, 
  universityInfo,
  onSlotClick
}) {
  const availableBranchKeys = Object.keys(timetableData).length > 0 
    ? Object.keys(timetableData) 
    : mockBranches.map(b => b.name);

  const activeBranchKey = availableBranchKeys.includes(selectedBranch)
    ? selectedBranch
    : availableBranchKeys[0] || 'CHEMICAL';

  const currentBranchObj = mockBranches.find(b => b.name === activeBranchKey) || {
    id: activeBranchKey,
    name: activeBranchKey,
    fullName: activeBranchKey
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      {/* Dynamic Branch Selector Dropdown */}
      <div className="no-print flex justify-center my-4">
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-300 shadow-sm">
          <label htmlFor="branch-select" className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Select Branch / Section:
          </label>
          <select
            id="branch-select"
            value={activeBranchKey}
            onChange={(e) => onBranchChange(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm font-bold rounded-md focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 cursor-pointer uppercase font-sans"
          >
            {availableBranchKeys.map((branchKey) => {
              const info = mockBranches.find(b => b.name === branchKey);
              return (
                <option key={branchKey} value={branchKey}>
                  {branchKey} {info ? `- ${info.fullName}` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Render Timetable Table */}
      <TimetableGrid 
        timetableData={timetableData} 
        branchLegend={branchLegends[activeBranchKey]}
        selectedBranch={activeBranchKey} 
        branchInfo={currentBranchObj}
        universityInfo={universityInfo}
        onSlotClick={onSlotClick}
      />
    </div>
  );
}
