import React, { useState } from 'react';
import TimetableGrid from './TimetableGrid';
import { branches as mockBranches } from '../data/mockData';
import { Printer } from 'lucide-react';

export default function BranchView({ 
  timetableData, 
  branchLegends = {},
  selectedBranch, 
  onBranchChange, 
  universityInfo,
  onSlotClick
}) {
  const [useShortNames, setUseShortNames] = useState(false);

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
    <div className="w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8">
      {/* Dynamic Branch Selector Dropdown & Print Controls */}
      <div className="no-print flex flex-wrap justify-center items-center gap-3 my-4">
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

        <button
          onClick={() => {
            let styleEl = document.getElementById('dynamic-page-orientation-style');
            if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = 'dynamic-page-orientation-style';
              document.head.appendChild(styleEl);
            }
            styleEl.innerHTML = `@page { size: A3 landscape !important; margin: 4mm 5mm !important; }`;
            setTimeout(() => window.print(), 50);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
          title={`Print ${activeBranchKey} timetable (A3 Full Page Landscape)`}
        >
          <Printer className="w-4 h-4 text-blue-200" />
          Print {activeBranchKey} (A3 Full Page)
        </button>

        <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs hover:bg-slate-50 transition-colors select-none">
          <input 
            type="checkbox" 
            checked={useShortNames} 
            onChange={(e) => setUseShortNames(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
          />
          <span>Use Faculty Short Names (Initials)</span>
        </label>
      </div>

      {/* Render Timetable Table */}
      <div className="branch-print-page">
        <TimetableGrid 
          timetableData={timetableData} 
          branchLegend={branchLegends[activeBranchKey]}
          selectedBranch={activeBranchKey} 
          branchInfo={currentBranchObj}
          universityInfo={universityInfo}
          onSlotClick={onSlotClick}
          useShortNames={useShortNames}
        />
      </div>
    </div>
  );
}
