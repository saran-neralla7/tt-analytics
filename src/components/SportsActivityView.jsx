import React, { useState, useMemo, useEffect } from 'react';
import { days, periodSlots } from '../data/mockData';
import { Clock, Layers, Users, Table, BookOpen, Filter, FileSpreadsheet, Printer, Calendar, LayoutGrid } from 'lucide-react';
import initialData from '../data/initialData.json';
import PrintFormatToggle from './PrintFormatToggle';
import { triggerPrint, getPrintFormat, applyPrintFormat } from '../utils/printUtils';

/**
 * Sports, Yoga & Counselling Activities View
 * Mirrors the Lab View with dedicated subtabs, statistics cards, and weekly allocation grids:
 * - Subtab 1: By Activity / Category (Sports & Yoga, Counselling, Library, All Activities)
 * - Subtab 2: By Branch (View non-academic timetable for any branch)
 * - Subtab 3: Master Activities Timetable (Consolidated matrix across all branches)
 * - Subtab 4: Activities Summary & Hours (Branch-wise breakdown and totals)
 */
export default function SportsActivityView({
  timetableData,
  activitiesData = {},
  universityInfo,
  onSlotClick,
  onNavigateToLab
}) {
  // Master data fallback
  const actData = useMemo(() => {
    return activitiesData.byActivity ? activitiesData : (initialData.activitiesData || {});
  }, [activitiesData]);

  const categories = useMemo(() => {
    return actData.categories || ['Sports & Yoga', 'Counselling', 'Library', 'All Activities'];
  }, [actData]);

  const branchStats = useMemo(() => {
    return actData.branchStats || [];
  }, [actData]);

  const branches = useMemo(() => {
    return initialData.knownBranches || [
      'CSE-1', 'CSE-2', 'CSE(AI&ML)-1', 'CSE(AI&ML)-2', 'CSE (CS & DS)',
      'ECE-1', 'ECE-2', 'ECE-3', 'MECH', 'EEE', 'CIVIL', 'CHEMICAL', 'MECH-ROBOTICS'
    ];
  }, []);

  // Subtab modes: 'activity' | 'branch' | 'master' | 'summary'
  const [viewMode, setViewMode] = useState('activity');
  const [selectedCategory, setSelectedCategory] = useState('Sports & Yoga');
  const [selectedBranch, setSelectedBranch] = useState(branches[0] || 'CSE-1');
  const [masterBranchFilter, setMasterBranchFilter] = useState('ALL');
  const [summarySearch, setSummarySearch] = useState('');
  const [printFormat, setPrintFormat] = useState('a4-landscape');

  // Handle dynamic print format
  useEffect(() => {
    applyPrintFormat(printFormat);
    return () => {
      const el = document.getElementById('dynamic-page-orientation-style');
      if (el) el.remove();
    };
  }, [printFormat]);

  // Compute stats based on current viewMode
  const stats = useMemo(() => {
    let totalSessions = 0;
    const activeBranchesSet = new Set();

    if (viewMode === 'activity') {
      const catSched = actData.byActivity?.[selectedCategory] || {};
      days.forEach(d => {
        const dSched = catSched[d] || {};
        Object.values(dSched).forEach(sessions => {
          totalSessions += sessions.length;
          sessions.forEach(s => activeBranchesSet.add(s.branch));
        });
      });
      return {
        sessions: totalSessions,
        branchesCount: activeBranchesSet.size,
        modeLabel: `${selectedCategory} Allocation`
      };
    } else if (viewMode === 'branch') {
      const bSched = actData.byBranch?.[selectedBranch] || {};
      days.forEach(d => {
        const dSched = bSched[d] || {};
        Object.values(dSched).forEach(sessions => {
          totalSessions += sessions.length;
        });
      });
      return {
        sessions: totalSessions,
        branchesCount: 1,
        modeLabel: `Branch: ${selectedBranch} Co-Curricular Schedule`
      };
    } else {
      // Master or Summary
      const tot = actData.totals?.totalSessions || 55;
      const actBr = actData.totals?.activeBranches || 13;
      return {
        sessions: tot,
        branchesCount: actBr,
        modeLabel: 'Consolidated College Activities'
      };
    }
  }, [actData, viewMode, selectedCategory, selectedBranch]);

  // Summary search filter
  const filteredSummary = useMemo(() => {
    if (!summarySearch.trim()) return branchStats;
    const q = summarySearch.toLowerCase().trim();
    return branchStats.filter(b => b.branch.toLowerCase().includes(q));
  }, [branchStats, summarySearch]);

  // Color & Badge style helper for activities
  const getActivityBadgeStyle = (label = '', isSports, isCounselling, isLibrary) => {
    const upper = label.toUpperCase();
    if (isSports || upper.includes('SPORT') || upper.includes('YOGA')) {
      return {
        bg: 'bg-emerald-50 hover:bg-emerald-100',
        text: 'text-emerald-950',
        border: 'border-emerald-300',
        pill: 'bg-emerald-600 text-white',
        icon: '🏃'
      };
    }
    if (isCounselling || upper.includes('COUNSEL')) {
      return {
        bg: 'bg-amber-50 hover:bg-amber-100',
        text: 'text-amber-950',
        border: 'border-amber-300',
        pill: 'bg-amber-600 text-white',
        icon: '💬'
      };
    }
    if (isLibrary || upper.includes('LIBRARY')) {
      return {
        bg: 'bg-indigo-50 hover:bg-indigo-100',
        text: 'text-indigo-950',
        border: 'border-indigo-300',
        pill: 'bg-indigo-600 text-white',
        icon: '📚'
      };
    }
    return {
      bg: 'bg-blue-50 hover:bg-blue-100',
      text: 'text-blue-950',
      border: 'border-blue-300',
      pill: 'bg-blue-600 text-white',
      icon: '✨'
    };
  };

  return (
    <div className="w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8 py-4">
      {/* 1. Subtab Navigation Pills (Mirrors Lab View) */}
      <div className="no-print flex justify-center mb-6">
        <div className="inline-flex flex-wrap p-1.5 bg-slate-200/90 rounded-2xl gap-2 shadow-inner border border-slate-300">
          <button
            onClick={() => setViewMode('activity')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              viewMode === 'activity'
                ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-900/30'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>By Activity / Category ({categories.length - 1})</span>
          </button>

          <button
            onClick={() => setViewMode('branch')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              viewMode === 'branch'
                ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-900/30'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>By Branch ({branches.length})</span>
          </button>

          <button
            onClick={() => setViewMode('master')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              viewMode === 'master'
                ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-900/30'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Master Activities Timetable</span>
          </button>

          <button
            onClick={() => setViewMode('summary')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              viewMode === 'summary'
                ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-900/30'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Activities Summary & Hours</span>
          </button>

          {onNavigateToLab && (
            <button
              onClick={onNavigateToLab}
              className="px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-300 shadow-xs"
              title="View Laboratory Timetable"
            >
              <span>🧪</span>
              <span>Laboratory Timetable →</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Filter Controls Bar */}
      <div className="no-print flex justify-center mb-6">
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-3.5 rounded-xl border-2 border-slate-700 shadow-sm w-full max-w-5xl">
          {viewMode === 'activity' && (
            <div className="flex items-center gap-2">
              <label htmlFor="cat-select" className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" /> Activity Category:
              </label>
              <select
                id="cat-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'branch' && (
            <div className="flex items-center gap-2">
              <label htmlFor="act-branch-select" className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" /> Branch:
              </label>
              <select
                id="act-branch-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'master' && (
            <div className="flex items-center gap-2">
              <label htmlFor="master-branch-select" className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Branch:
              </label>
              <select
                id="master-branch-select"
                value={masterBranchFilter}
                onChange={(e) => setMasterBranchFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer"
              >
                <option value="ALL">All Branches ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'summary' && (
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <label htmlFor="summary-search" className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" /> Search:
              </label>
              <input
                id="summary-search"
                type="text"
                placeholder="Search branch name..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-medium rounded-lg px-3 py-1.5 w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <span className="text-gray-300 hidden sm:inline">|</span>

          {/* Page Format Toggle */}
          <PrintFormatToggle
            selectedFormat={printFormat}
            onFormatChange={setPrintFormat}
            formats={['a4-portrait', 'a4-landscape', 'a3-landscape']}
          />

          {/* Print Button */}
          <button
            onClick={() => triggerPrint(printFormat, null, 80)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title={`Print Timetable in ${getPrintFormat(printFormat).label}`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print ({getPrintFormat(printFormat).shortLabel})</span>
          </button>
        </div>
      </div>

      {/* 3. Stats Strip (Identical to Lab View 3-Card Header) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-xs border-2 border-slate-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Occupied Activity Sessions</p>
            <p className="text-xl font-black text-slate-900 font-mono">
              {stats.sessions} Sessions <span className="text-xs font-sans text-slate-500">(1 hr each)</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border-2 border-slate-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Participating Branches</p>
            <p className="text-xl font-black text-slate-900 font-mono">
              {stats.branchesCount} Branches Active
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border-2 border-slate-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Schedule Mode</p>
            <p className="text-base sm:text-lg font-black text-slate-900 truncate">
              {stats.modeLabel}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Timetable Grids based on viewMode */}
      {viewMode === 'activity' && (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 print:border print:border-black print:rounded-none print:shadow-none overflow-hidden timetable-card my-4">
          {/* Header Banner */}
          <div className="text-center py-3 px-6 border-b-2 border-slate-700 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
              {universityInfo.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <h3 className="text-xs sm:text-sm font-black text-blue-900 uppercase font-mono">
                CO-CURRICULAR ACTIVITY ALLOCATION: <span className="underline decoration-blue-600 font-extrabold">{selectedCategory}</span>
              </h3>
            </div>
            <div className="text-xs text-gray-600 font-mono mt-0.5">
              Academic Year {universityInfo.academicYear} • Ground Truth from Timetable_Final
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse table-fixed min-w-[900px] border-2 border-slate-700 print:border-black">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2 border-r border-gray-300 w-20 text-xs font-black text-slate-900">Day</th>
                  {periodSlots.map((slot) => (
                    <th
                      key={slot.id}
                      className={`py-2 px-1 border-r border-gray-300 text-[11px] ${
                        slot.type === 'break' ? 'bg-amber-100/70 text-amber-950 font-black w-14' : 'text-slate-900'
                      }`}
                    >
                      <div className="leading-tight">
                        <span className="block font-black">{slot.time}</span>
                        <span className="text-[9.5px] text-slate-500 font-normal">{slot.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-600">
                {days.map((day, dayIdx) => {
                  const catDaySched = actData.byActivity?.[selectedCategory]?.[day] || {};

                  return (
                    <tr key={day} className={`hover:bg-blue-50/20 transition-colors ${dayIdx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                      <td className="py-3 px-2 font-black text-slate-900 border-r-2 border-slate-700 bg-gray-100 uppercase tracking-wider font-mono">
                        {day}
                      </td>

                      {periodSlots.map((slot) => {
                        if (slot.type === 'break') {
                          return (
                            <td key={slot.id} className="py-2 px-1 border-r border-gray-300 bg-amber-50/70 text-amber-900/60 font-black text-[10px]">
                              {slot.time.includes('01:15') ? 'LUNCH' : 'TEA'}
                            </td>
                          );
                        }

                        const sessions = catDaySched[slot.time] || [];
                        if (sessions.length === 0) {
                          return (
                            <td key={slot.id} className="py-2 px-1 border-r border-gray-200 text-slate-300 font-mono text-xs">
                              —
                            </td>
                          );
                        }

                        return (
                          <td key={slot.id} className="py-1.5 px-1 border-r border-gray-200 align-middle">
                            <div className="flex flex-col gap-1">
                              {sessions.map((sess, sIdx) => {
                                const style = getActivityBadgeStyle(sess.label, sess.isSports, sess.isCounselling, sess.isLibrary);
                                return (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([sess], day, slot.time, sess.branch)}
                                    className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all shadow-2xs hover:scale-[1.02] ${style.bg} ${style.border} ${style.text}`}
                                    title={`${sess.branch} • ${sess.label}`}
                                  >
                                    <div className="flex items-center justify-between gap-1 leading-tight">
                                      <span className="font-black text-xs font-mono">{sess.branch}</span>
                                      <span className="text-[10px]">{style.icon}</span>
                                    </div>
                                    <div className="text-[10.5px] font-bold opacity-90 truncate mt-0.5">
                                      {sess.label}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'branch' && (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 print:border print:border-black print:rounded-none print:shadow-none overflow-hidden timetable-card my-4">
          {/* Header Banner */}
          <div className="text-center py-3 px-6 border-b-2 border-slate-700 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
              {universityInfo.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <h3 className="text-xs sm:text-sm font-black text-blue-900 uppercase font-mono">
                CO-CURRICULAR & SPORTS SCHEDULE: <span className="underline decoration-blue-600 font-extrabold">{selectedBranch}</span>
              </h3>
            </div>
            <div className="text-xs text-gray-600 font-mono mt-0.5">
              Academic Year {universityInfo.academicYear} • Sports, Yoga, Library & Counselling Sessions
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse table-fixed min-w-[900px] border-2 border-slate-700 print:border-black">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2 border-r border-gray-300 w-20 text-xs font-black text-slate-900">Day</th>
                  {periodSlots.map((slot) => (
                    <th
                      key={slot.id}
                      className={`py-2 px-1 border-r border-gray-300 text-[11px] ${
                        slot.type === 'break' ? 'bg-amber-100/70 text-amber-950 font-black w-14' : 'text-slate-900'
                      }`}
                    >
                      <div className="leading-tight">
                        <span className="block font-black">{slot.time}</span>
                        <span className="text-[9.5px] text-slate-500 font-normal">{slot.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-600">
                {days.map((day, dayIdx) => {
                  const bDaySched = actData.byBranch?.[selectedBranch]?.[day] || {};

                  return (
                    <tr key={day} className={`hover:bg-blue-50/20 transition-colors ${dayIdx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                      <td className="py-3 px-2 font-black text-slate-900 border-r-2 border-slate-700 bg-gray-100 uppercase tracking-wider font-mono">
                        {day}
                      </td>

                      {periodSlots.map((slot) => {
                        if (slot.type === 'break') {
                          return (
                            <td key={slot.id} className="py-2 px-1 border-r border-gray-300 bg-amber-50/70 text-amber-900/60 font-black text-[10px]">
                              {slot.time.includes('01:15') ? 'LUNCH' : 'TEA'}
                            </td>
                          );
                        }

                        const sessions = bDaySched[slot.time] || [];
                        if (sessions.length === 0) {
                          return (
                            <td key={slot.id} className="py-2 px-1 border-r border-gray-200 text-slate-300 font-mono text-xs">
                              —
                            </td>
                          );
                        }

                        return (
                          <td key={slot.id} className="py-1.5 px-1 border-r border-gray-200 align-middle">
                            <div className="flex flex-col gap-1">
                              {sessions.map((sess, sIdx) => {
                                const style = getActivityBadgeStyle(sess.label, sess.isSports, sess.isCounselling, sess.isLibrary);
                                return (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([sess], day, slot.time, selectedBranch)}
                                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all shadow-2xs hover:scale-[1.02] ${style.bg} ${style.border} ${style.text}`}
                                  >
                                    <span className="text-base block mb-0.5">{style.icon}</span>
                                    <span className="font-black text-xs block leading-tight">{sess.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'master' && (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 print:border print:border-black print:rounded-none print:shadow-none overflow-hidden timetable-card my-4">
          {/* Header Banner */}
          <div className="text-center py-3 px-6 border-b-2 border-slate-700 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
              {universityInfo.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <h3 className="text-xs sm:text-sm font-black text-blue-900 uppercase font-mono">
                MASTER ACTIVITIES SCHEDULE (SPORTS, YOGA, LIBRARY & COUNSELLING)
              </h3>
            </div>
            <div className="text-xs text-gray-600 font-mono mt-0.5">
              Consolidated across all 13 Academic Branches
            </div>
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1000px] border-2 border-slate-700 print:border-black">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2 border-r border-gray-300 w-20 text-xs font-black text-slate-900">Day</th>
                  {periodSlots.map((slot) => (
                    <th
                      key={slot.id}
                      className={`py-2 px-1 border-r border-gray-300 text-[11px] ${
                        slot.type === 'break' ? 'bg-amber-100/70 text-amber-950 font-black w-14' : 'text-slate-900'
                      }`}
                    >
                      <div className="leading-tight">
                        <span className="block font-black">{slot.time}</span>
                        <span className="text-[9.5px] text-slate-500 font-normal">{slot.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-600">
                {days.map((day, dayIdx) => {
                  return (
                    <tr key={day} className={`hover:bg-blue-50/20 transition-colors ${dayIdx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                      <td className="py-3 px-2 font-black text-slate-900 border-r-2 border-slate-700 bg-gray-100 uppercase tracking-wider font-mono">
                        {day}
                      </td>

                      {periodSlots.map((slot) => {
                        if (slot.type === 'break') {
                          return (
                            <td key={slot.id} className="py-2 px-1 border-r border-gray-300 bg-amber-50/70 text-amber-900/60 font-black text-[10px]">
                              {slot.time.includes('01:15') ? 'LUNCH' : 'TEA'}
                            </td>
                          );
                        }

                        let sessions = actData.masterSchedule?.[day]?.[slot.time] || [];
                        if (masterBranchFilter !== 'ALL') {
                          sessions = sessions.filter(s => s.branch === masterBranchFilter);
                        }

                        if (sessions.length === 0) {
                          return (
                            <td key={slot.id} className="py-2 px-1 border-r border-gray-200 text-slate-300 font-mono text-xs">
                              —
                            </td>
                          );
                        }

                        return (
                          <td key={slot.id} className="py-1.5 px-1 border-r border-gray-200 align-middle">
                            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                              {sessions.map((sess, sIdx) => {
                                const style = getActivityBadgeStyle(sess.label, sess.isSports, sess.isCounselling, sess.isLibrary);
                                return (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([sess], day, slot.time, sess.branch)}
                                    className={`p-1 rounded border text-left cursor-pointer transition-all shadow-2xs hover:scale-[1.02] ${style.bg} ${style.border} ${style.text}`}
                                    title={`${sess.branch} • ${sess.label}`}
                                  >
                                    <div className="flex items-center justify-between gap-1 leading-tight">
                                      <span className="font-black text-[11px] font-mono">{sess.branch}</span>
                                      <span className="text-[10px]">{style.icon}</span>
                                    </div>
                                    <div className="text-[9.5px] font-bold opacity-90 truncate mt-0.5">
                                      {sess.label}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'summary' && (
        <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-4">
          <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded font-black text-xs bg-blue-600 text-white tracking-wider font-mono">
                ANALYTICS SUMMARY
              </span>
              <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
                Branch-wise Co-Curricular & Sports Allocation Table
              </h3>
            </div>
            <span className="text-xs text-slate-300 font-mono">
              Total Branches: <strong className="text-white">{filteredSummary.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse table-auto min-w-[900px] border-b border-slate-700">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2 border-r border-gray-300 text-left w-12">#</th>
                  <th className="py-2.5 px-3 border-r border-gray-300 text-left w-44">Branch Name</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 w-28 bg-emerald-50 text-emerald-950 font-black">
                    🏃 Sports & Yoga
                  </th>
                  <th className="py-2.5 px-2 border-r border-gray-300 w-28 bg-amber-50 text-amber-950 font-black">
                    💬 Counselling
                  </th>
                  <th className="py-2.5 px-2 border-r border-gray-300 w-28 bg-indigo-50 text-indigo-950 font-black">
                    📚 Library
                  </th>
                  <th className="py-2.5 px-2 border-r border-gray-300 w-28 bg-blue-50 text-blue-950 font-black">
                    Total Hours / Wk
                  </th>
                  <th className="py-2.5 px-3 text-left">Scheduled Days & Slots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredSummary.map((b, idx) => (
                  <tr key={b.branch} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}>
                    <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px] border-r border-gray-200">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-left font-black text-slate-900 border-r border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedBranch(b.branch);
                          setViewMode('branch');
                        }}
                        className="text-left font-bold text-blue-900 hover:text-blue-700 hover:underline cursor-pointer block leading-tight text-xs"
                      >
                        {b.branch}
                      </button>
                    </td>
                    <td className="py-2.5 px-2 border-r border-gray-200 font-mono font-black text-emerald-800 text-sm bg-emerald-50/30">
                      {b.sports} Hrs
                    </td>
                    <td className="py-2.5 px-2 border-r border-gray-200 font-mono font-black text-amber-800 text-sm bg-amber-50/30">
                      {b.counselling} Hrs
                    </td>
                    <td className="py-2.5 px-2 border-r border-gray-200 font-mono font-black text-indigo-800 text-sm bg-indigo-50/30">
                      {b.library} Hrs
                    </td>
                    <td className="py-2.5 px-2 border-r border-gray-200 font-mono font-black text-blue-950 text-sm bg-blue-50/40">
                      {b.total} Hrs
                    </td>
                    <td className="py-2.5 px-3 text-left text-slate-700 font-mono text-[11px]">
                      {b.sessions && b.sessions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {b.sessions.map((s, sIdx) => {
                            const style = getActivityBadgeStyle(s.label, s.isSports, s.isCounselling, s.isLibrary);
                            return (
                              <span
                                key={sIdx}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.border} ${style.text}`}
                              >
                                {s.day} {s.slot}: {s.label}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None scheduled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-700 font-black text-slate-900">
                  <td colSpan={2} className="py-2 px-3 text-right uppercase tracking-wider text-[11px] border-r border-gray-300">
                    College Totals ({filteredSummary.length} Branches):
                  </td>
                  <td className="py-2 px-2 border-r border-gray-300 font-mono text-sm text-emerald-950">
                    {filteredSummary.reduce((sum, b) => sum + b.sports, 0)} Hrs
                  </td>
                  <td className="py-2 px-2 border-r border-gray-300 font-mono text-sm text-amber-950">
                    {filteredSummary.reduce((sum, b) => sum + b.counselling, 0)} Hrs
                  </td>
                  <td className="py-2 px-2 border-r border-gray-300 font-mono text-sm text-indigo-950">
                    {filteredSummary.reduce((sum, b) => sum + b.library, 0)} Hrs
                  </td>
                  <td className="py-2 px-2 border-r border-gray-300 font-mono text-base text-blue-950">
                    {filteredSummary.reduce((sum, b) => sum + b.total, 0)} Hrs
                  </td>
                  <td className="py-2 px-3 text-left font-sans text-xs text-slate-600 font-semibold">
                    Total 55 Co-Curricular & Sports Sessions Conducted Weekly
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
