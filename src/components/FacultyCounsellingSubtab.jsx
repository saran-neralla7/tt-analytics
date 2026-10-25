import React, { useState, useMemo } from 'react';
import { Users, Search, Filter, Calendar, Clock, Award, Building, CheckCircle2, HeartHandshake } from 'lucide-react';
import { days } from '../data/mockData';

export default function FacultyCounsellingSubtab({
  counsellingFaculty = [],
  universityInfo = {},
  onSlotClick
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL');

  // Extract unique departments among counselling faculty
  const departments = useMemo(() => {
    const set = new Set();
    counsellingFaculty.forEach(f => {
      const d = f.dept?.trim() || 'General';
      if (d) set.add(d);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [counsellingFaculty]);

  // Filtered list of counselling faculty
  const filteredList = useMemo(() => {
    return counsellingFaculty.filter(f => {
      if (selectedDept !== 'ALL' && (f.dept?.trim() || 'General') !== selectedDept) return false;
      if (selectedDay !== 'ALL') {
        const hasDay = (f.counsellingSessions || []).some(s => s.day === selectedDay);
        if (!hasDay) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = f.fullName.toLowerCase().includes(q);
        const matchesShort = (f.shortName || '').toLowerCase().includes(q);
        const matchesDept = (f.dept || '').toLowerCase().includes(q);
        const matchesSession = (f.counsellingSessions || []).some(s =>
          (s.branch || '').toLowerCase().includes(q) ||
          (s.room || '').toLowerCase().includes(q) ||
          (s.day || '').toLowerCase().includes(q) ||
          (s.slot || '').toLowerCase().includes(q)
        );
        if (!matchesName && !matchesShort && !matchesDept && !matchesSession) return false;
      }
      return true;
    });
  }, [counsellingFaculty, selectedDept, selectedDay, searchTerm]);

  // Aggregate metrics
  const totalCounsellingHours = useMemo(() => {
    return filteredList.reduce((acc, f) => acc + (f.counsellingLoad || 0), 0);
  }, [filteredList]);

  const uniqueBranches = useMemo(() => {
    const set = new Set();
    counsellingFaculty.forEach(f => {
      (f.counsellingSessions || []).forEach(s => {
        if (s.branch) set.add(s.branch);
      });
    });
    return Array.from(set);
  }, [counsellingFaculty]);

  return (
    <div className="w-full">
      {/* Header & Controls Bar */}
      <div className="no-print bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Faculty Counselling Workload
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Dedicated tracking for faculty members with student mentorship and counselling hours allotted in <strong className="text-indigo-900 font-bold">Timetable_Final</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search faculty, branch, room..."
                className="w-full text-xs px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-xs text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer max-w-[160px]"
              >
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Depts' : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Day Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">All Days</option>
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-indigo-50/70 p-3.5 rounded-lg border border-indigo-100 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-indigo-700 font-medium">Faculty with Counselling</div>
              <div className="text-base font-bold text-indigo-950 font-mono">{filteredList.length} Faculty Members</div>
            </div>
          </div>

          <div className="bg-purple-50/70 p-3.5 rounded-lg border border-purple-100 flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-purple-700 font-medium">Total Counselling Load</div>
              <div className="text-base font-bold text-purple-950 font-mono">{totalCounsellingHours} Hours / Week</div>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-100 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-emerald-700 font-medium">Branches Covered</div>
              <div className="text-base font-bold text-emerald-950 font-mono">{uniqueBranches.length} Branches</div>
            </div>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-lg border border-amber-100 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-amber-700 font-medium">Workload Representation</div>
              <div className="text-sm font-bold text-amber-950 font-mono">
                Teaching + Counselling
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table for Counselling Faculty */}
      <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card mb-8">
        <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-700">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
              Faculty Mentorship & Counselling Directory ({filteredList.length} Faculty Listed)
            </h3>
          </div>
          <span className="text-[11px] text-slate-300 font-mono">
            Ground-Truth Timetable_Final (Only faculty with counselling shown)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3 border-r border-gray-300 w-14 text-center">S.No</th>
                <th className="py-3 px-4 border-r border-gray-300 text-left">Faculty Name</th>
                <th className="py-3 px-3 border-r border-gray-300 text-left w-36">Department</th>
                <th className="py-3 px-3 border-r border-gray-300 text-left w-44">Designation</th>
                <th className="py-3 px-3 border-r border-gray-300 text-center bg-blue-50/70 text-blue-950 font-black w-32">
                  Teaching Load
                </th>
                <th className="py-3 px-3 border-r border-gray-300 text-center bg-indigo-50/70 text-indigo-950 font-black w-32">
                  Counselling
                </th>
                <th className="py-3 px-4 border-r border-gray-300 text-center bg-emerald-50/70 text-emerald-950 font-black w-36">
                  Total Workload
                </th>
                <th className="py-3 px-4 border-r border-gray-300 text-left">Assigned Branch & Room</th>
                <th className="py-3 px-4 text-center w-36">Scheduled Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredList.map((item, index) => {
                const cleanShort = (item.shortName || '').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
                const sessions = item.counsellingSessions || [];

                return (
                  <tr
                    key={item.fullName || index}
                    className={`border-b border-gray-200 transition-colors ${
                      index % 2 === 0 ? 'bg-white hover:bg-indigo-50/40' : 'bg-gray-50/50 hover:bg-indigo-50/40'
                    }`}
                  >
                    {/* S.No */}
                    <td className="py-3 px-3 border-r border-gray-200 font-mono text-center text-slate-600 font-bold align-middle">
                      {index + 1}
                    </td>

                    {/* Faculty Name */}
                    <td className="py-3 px-4 border-r border-gray-200 text-left font-bold text-slate-900 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span>{item.fullName}</span>
                        {cleanShort && (
                          <span className="text-indigo-700 font-mono font-bold text-xs">
                            ({cleanShort})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-3 border-r border-gray-200 text-left font-bold text-slate-800 align-middle text-xs">
                      {item.dept || '—'}
                    </td>

                    {/* Designation */}
                    <td className="py-3 px-3 border-r border-gray-200 text-left text-slate-700 font-semibold text-xs align-middle">
                      {item.designation || 'Assistant Professor'}
                    </td>

                    {/* Teaching Load */}
                    <td className="py-3 px-3 border-r border-gray-200 text-center align-middle bg-blue-50/20">
                      <span className="font-mono font-black text-blue-950 text-sm">
                        {item.teachingLoad}
                      </span>
                    </td>

                    {/* Counselling Load */}
                    <td className="py-3 px-3 border-r border-gray-200 text-center align-middle bg-indigo-50/30">
                      <span className="font-mono font-black text-indigo-900 bg-indigo-100/90 px-2 py-0.5 rounded border border-indigo-200 text-sm">
                        +{item.counsellingLoad}
                      </span>
                    </td>

                    {/* Total Workload (Teaching + Counselling, e.g. 13 + 2) */}
                    <td className="py-3 px-4 border-r border-gray-200 text-center align-middle bg-emerald-50/30">
                      <div className="inline-flex items-center justify-center gap-1 font-mono">
                        <span className="font-black text-emerald-950 text-base">
                          {item.teachingLoad}
                        </span>
                        <span className="text-indigo-600 font-black text-sm">+</span>
                        <span
                          className="font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-sm cursor-help"
                          title={`${item.teachingLoad} Teaching + ${item.counsellingLoad} Counselling Hours`}
                        >
                          {item.counsellingLoad}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Branch & Room */}
                    <td className="py-3 px-4 border-r border-gray-200 text-left align-middle">
                      {sessions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sessions.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              onClick={() => onSlotClick && onSlotClick([s], s.day, s.slot, s.branch)}
                              className="inline-flex items-center gap-1 bg-white border border-indigo-200 px-2 py-0.5 rounded text-xs font-semibold text-slate-800 shadow-2xs hover:bg-indigo-50 cursor-pointer"
                            >
                              <span className="font-bold text-indigo-900">{s.branch}</span>
                              {s.room && (
                                <span className="text-slate-500 font-mono text-[10.5px]">({s.room})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not assigned</span>
                      )}
                    </td>

                    {/* Scheduled Slot */}
                    <td className="py-3 px-4 text-center align-middle">
                      {sessions.length > 0 ? (
                        <div className="flex flex-col gap-1 items-center">
                          {sessions.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="font-mono text-xs font-bold text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded whitespace-nowrap"
                            >
                              {s.day} • {s.slot}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-black border-t-2 border-slate-700 text-slate-900">
                <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider border-r border-gray-300 font-black">
                  Total for Filtered Mentors ({filteredList.length}):
                </td>
                <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-black text-blue-950 bg-blue-100/60">
                  {filteredList.reduce((acc, f) => acc + (f.teachingLoad || 0), 0)}
                </td>
                <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-black text-indigo-950 bg-indigo-100/70">
                  {totalCounsellingHours}
                </td>
                <td className="py-3 px-4 border-r border-gray-300 text-center font-mono font-black text-emerald-950 bg-emerald-100/70">
                  {filteredList.reduce((acc, f) => acc + (f.teachingLoad || 0), 0)} + {totalCounsellingHours}
                </td>
                <td colSpan={2} className="py-3 px-4 text-left font-mono text-xs text-slate-600">
                  Strictly calculated from Timetable_Final counselling slots
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
