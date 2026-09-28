import React from 'react';
import { CheckCircle2, Layers, Users, FlaskConical, ArrowRight, X } from 'lucide-react';

export default function UploadSuccessModal({ isOpen, onClose, summaryStats, availableBranches = [], onViewBranch }) {
  if (!isOpen || !summaryStats) return null;

  const handleStartExploring = (branchName) => {
    onViewBranch(branchName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-emerald-100 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Workbook Uploaded Successfully!</h3>
            <p className="text-xs text-gray-500 font-mono">
              File: {summaryStats.fileName}
            </p>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-3 gap-3 my-5">
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60 text-center">
            <Layers className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
            <div className="text-lg font-extrabold text-emerald-900">{summaryStats.branchCount}</div>
            <div className="text-[11px] font-semibold text-emerald-700">Academic Branches</div>
          </div>

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/60 text-center">
            <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <div className="text-lg font-extrabold text-blue-900">{summaryStats.facultyCount}</div>
            <div className="text-[11px] font-semibold text-blue-700">Faculty Members</div>
          </div>

          <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200/60 text-center">
            <FlaskConical className="w-5 h-5 mx-auto text-purple-600 mb-1" />
            <div className="text-lg font-extrabold text-purple-900">{summaryStats.labCount || 19}</div>
            <div className="text-[11px] font-semibold text-purple-700">Lab Rooms</div>
          </div>
        </div>

        {/* Imported Branches Badges */}
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Imported Academic Sections ({availableBranches.length}):
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
            {availableBranches.map((branch) => (
              <button
                key={branch}
                onClick={() => handleStartExploring(branch)}
                className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-gray-300 text-gray-800 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 transition-colors shadow-sm"
              >
                {branch}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={() => handleStartExploring(availableBranches[0] || 'CSE-1')}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-colors"
          >
            Explore Timetables Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
