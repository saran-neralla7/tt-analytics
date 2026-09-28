import React from 'react';

export default function ViewTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'master', label: 'Master' },
    { id: 'branch', label: 'Branch' },
    { id: 'individual', label: 'Individual' },
    { id: 'lab', label: 'Lab' },
    { id: 'workload', label: 'Faculty Workload' },
  ];

  return (
    <div className="no-print flex justify-center items-center py-4 bg-slate-100/70 border-b border-slate-200 overflow-x-auto px-4">
      <div className="inline-flex p-1.5 bg-slate-200/90 rounded-xl gap-2 shadow-inner border border-slate-300/60">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-6 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all duration-150 whitespace-nowrap shadow-xs ${
                isActive
                  ? 'bg-blue-700 text-white shadow-md hover:bg-blue-800'
                  : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
