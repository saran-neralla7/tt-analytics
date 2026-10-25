import React, { useState, useMemo } from 'react';
import { days, periodSlots } from '../data/mockData';
import { BookOpen, Layers, Users, Building, Filter, Search, CheckCircle2, FlaskConical, GraduationCap } from 'lucide-react';
import initialData from '../data/initialData.json';

// Pre-defined subject groups requested by user
export const CORE_SUBJECT_CONFIGS = [
  {
    id: 'cal_la',
    title: 'Calculus & Linear Algebra',
    shortCode: 'CAL & LA',
    description: 'Theory Lectures + Tutorials',
    badges: ['Theory', 'Tutorial'],
    colorScheme: 'blue',
    matches: (subj) => {
      const s = (subj || '').trim();
      return /^CAL\s*&\s*LA/i.test(s) || /CALCULUS/i.test(s);
    }
  },
  {
    id: 'essential_english',
    title: 'Essential English',
    shortCode: 'ESS. ENG.',
    description: 'Theory Lectures + Tutorials + Labs',
    badges: ['Theory', 'Tutorial', 'Lab'],
    colorScheme: 'emerald',
    matches: (subj) => {
      const s = (subj || '').trim();
      if (/ENGG\.?\s*(CHEM|PHY)/i.test(s) || /SUS\.\s*ENGG/i.test(s)) return false;
      return /ESS\.?\s*ENG|ESSENTIAL\s*ENGLISH|ENGLISH/i.test(s);
    }
  },
  {
    id: 'ppstc',
    title: 'Programming for Problem Solving through C',
    shortCode: 'PPSTC',
    description: 'Theory Lectures + Laboratories',
    badges: ['Theory', 'Lab'],
    colorScheme: 'purple',
    matches: (subj) => {
      const s = (subj || '').trim();
      return /PPSTC|PROBLEM SOLVING.*C/i.test(s);
    }
  }
];

export default function SubjectIntegratedView({
  timetableData = {},
  universityInfo = {},
  onSlotClick
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('cal_la');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL' | 'theory' | 'tutorial' | 'lab'
  const [searchTerm, setSearchTerm] = useState('');
  const [showFacultyNames, setShowFacultyNames] = useState(true);

  // Active subject configuration
  const currentConfig = useMemo(() => {
    return CORE_SUBJECT_CONFIGS.find(c => c.id === selectedSubjectId) || CORE_SUBJECT_CONFIGS[0];
  }, [selectedSubjectId]);

  // All branches present in timetableData
  const branchList = useMemo(() => {
    const keys = Object.keys(timetableData);
    if (keys.length > 0) return keys;
    return initialData.knownBranches || [
      'CSE-1', 'CSE-2', 'CSE(AI&ML)-1', 'CSE(AI&ML)-2', 'CSE (CS & DS)',
      'ECE-1', 'ECE-2', 'ECE-3', 'MECH', 'EEE', 'CIVIL', 'CHEMICAL', 'MECH-ROBOTICS'
    ];
  }, [timetableData]);

  // Extract all sessions matching this subject across all branches
  const subjectSessions = useMemo(() => {
    const list = [];
    const matcher = currentConfig.matches;

    Object.entries(timetableData).forEach(([branch, daysObj]) => {
      Object.entries(daysObj || {}).forEach(([day, slotsObj]) => {
        Object.entries(slotsObj || {}).forEach(([timeSlot, items]) => {
          const arr = Array.isArray(items) ? items : items ? [items] : [];
          arr.forEach(it => {
            if (matcher(it.subject)) {
              const subj = (it.subject || '').trim();
              const isTut = Boolean(it.isTutorial || /tut/i.test(subj));
              const isLab = !isTut && Boolean(it.isLab || /lab/i.test(subj));
              const type = isTut ? 'tutorial' : (isLab ? 'lab' : 'theory');

              list.push({
                branch,
                day,
                timeSlot,
                subject: it.subject,
                faculty: it.faculty || it.rawFaculty || '',
                rawFaculty: it.rawFaculty || '',
                room: it.room || '',
                isLab,
                isTutorial: isTut,
                isContinued: Boolean(it.isContinued),
                type
              });
            }
          });
        });
      });
    });

    return list;
  }, [timetableData, currentConfig]);

  // Aggregate stats
  const stats = useMemo(() => {
    let theoryHours = 0;
    let tutHours = 0;
    let labHours = 0;
    const branchesSet = new Set();
    const facultySet = new Set();

    subjectSessions.forEach(s => {
      branchesSet.add(s.branch);
      if (s.faculty) {
        s.faculty.split(/[,;\n]/).forEach(f => {
          const trimmed = f.trim();
          if (trimmed) facultySet.add(trimmed);
        });
      }

      if (s.type === 'tutorial') {
        tutHours += 1;
      } else if (s.type === 'lab') {
        labHours += 1;
      } else {
        theoryHours += 1;
      }
    });

    return {
      totalHours: theoryHours + tutHours + labHours,
      theoryHours,
      tutHours,
      labHours,
      branchCount: branchesSet.size,
      facultyCount: facultySet.size
    };
  }, [subjectSessions]);

  // Filtered sessions for the matrix table
  const filteredSessions = useMemo(() => {
    return subjectSessions.filter(s => {
      if (selectedBranch !== 'ALL' && s.branch !== selectedBranch) return false;
      if (selectedType !== 'ALL' && s.type !== selectedType) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesBranch = (s.branch || '').toLowerCase().includes(q);
        const matchesFaculty = (s.faculty || '').toLowerCase().includes(q);
        const matchesRoom = (s.room || '').toLowerCase().includes(q);
        const matchesSubject = (s.subject || '').toLowerCase().includes(q);
        if (!matchesBranch && !matchesFaculty && !matchesRoom && !matchesSubject) return false;
      }
      return true;
    });
  }, [subjectSessions, selectedBranch, selectedType, searchTerm]);

  // Matrix indexed by [day][timeSlot] = array of sessions
  const matrixMap = useMemo(() => {
    const map = {};
    days.forEach(d => {
      map[d] = {};
    });

    filteredSessions.forEach(s => {
      if (!map[s.day]) map[s.day] = {};
      if (!map[s.day][s.timeSlot]) map[s.day][s.timeSlot] = [];
      map[s.day][s.timeSlot].push(s);
    });

    return map;
  }, [filteredSessions]);

  // Branch-wise summary table for this subject
  const branchSummary = useMemo(() => {
    const map = {};
    branchList.forEach(b => {
      map[b] = {
        branch: b,
        theory: 0,
        tutorial: 0,
        lab: 0,
        total: 0,
        facultyList: new Set(),
        rooms: new Set()
      };
    });

    subjectSessions.forEach(s => {
      if (!map[s.branch]) {
        map[s.branch] = {
          branch: s.branch,
          theory: 0,
          tutorial: 0,
          lab: 0,
          total: 0,
          facultyList: new Set(),
          rooms: new Set()
        };
      }
      const bObj = map[s.branch];
      if (s.type === 'tutorial') bObj.tutorial += 1;
      else if (s.type === 'lab') bObj.lab += 1;
      else bObj.theory += 1;
      bObj.total += 1;

      if (s.faculty) bObj.facultyList.add(s.faculty);
      if (s.room) bObj.rooms.add(s.room);
    });

    return Object.values(map).filter(b => b.total > 0);
  }, [branchList, subjectSessions]);

  return (
    <div className="w-full max-w-[1750px] mx-auto px-3 sm:px-6 2xl:px-8 py-4">
      {/* 1. Subject Selector Pills */}
      <div className="no-print flex justify-center mb-5">
        <div className="inline-flex p-1.5 bg-gray-200/90 rounded-2xl border border-gray-300 shadow-sm gap-2 flex-wrap justify-center">
          {CORE_SUBJECT_CONFIGS.map(cfg => {
            const isSelected = cfg.id === selectedSubjectId;
            return (
              <button
                key={cfg.id}
                onClick={() => {
                  setSelectedSubjectId(cfg.id);
                  setSelectedType('ALL');
                }}
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  isSelected
                    ? 'bg-blue-800 text-white shadow-md scale-102'
                    : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-300/70'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <div className="text-left">
                  <div className="leading-tight">{cfg.title}</div>
                  <div className={`text-[10px] font-mono font-normal ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                    {cfg.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="no-print flex justify-center mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-300 shadow-sm w-full max-w-5xl">
          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="branch-filter" className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Branch:
            </label>
            <select
              id="branch-filter"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer font-mono"
            >
              <option value="ALL">All Branches ({branchList.length})</option>
              {branchList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Component Type Filter (Theory, Tutorial, Lab) */}
          <div className="flex items-center gap-2">
            <label htmlFor="type-filter" className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> Type:
            </label>
            <select
              id="type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 cursor-pointer"
            >
              <option value="ALL">All Components ({currentConfig.badges.join(' + ')})</option>
              {currentConfig.badges.includes('Theory') && <option value="theory">Theory Lectures Only</option>}
              {currentConfig.badges.includes('Tutorial') && <option value="tutorial">Tutorial Sessions Only</option>}
              {currentConfig.badges.includes('Lab') && <option value="lab">Laboratories Only</option>}
            </select>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search faculty, room, section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-gray-400 hover:text-gray-700 font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle Include Faculty Names */}
          <label className="flex items-center gap-2 cursor-pointer bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-900 transition-colors select-none">
            <input
              type="checkbox"
              checked={showFacultyNames}
              onChange={(e) => setShowFacultyNames(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <span>Include Faculty Names</span>
          </label>
        </div>
      </div>

      {/* 3. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-3 rounded-xl border border-gray-300 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Scheduled</div>
            <div className="text-lg font-black text-blue-950 font-mono">{stats.totalHours} Hrs / Wk</div>
          </div>
        </div>

        {currentConfig.badges.includes('Theory') && (
          <div className="bg-white p-3 rounded-xl border border-gray-300 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-800 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Theory Hours</div>
              <div className="text-lg font-black text-sky-950 font-mono">{stats.theoryHours} Hrs</div>
            </div>
          </div>
        )}

        {currentConfig.badges.includes('Tutorial') && (
          <div className="bg-white p-3 rounded-xl border border-gray-300 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Tutorial Hours</div>
              <div className="text-lg font-black text-amber-950 font-mono">{stats.tutHours} Hrs</div>
            </div>
          </div>
        )}

        {currentConfig.badges.includes('Lab') && (
          <div className="bg-white p-3 rounded-xl border border-gray-300 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Lab Hours</div>
              <div className="text-lg font-black text-purple-950 font-mono">{stats.labHours} Hrs</div>
            </div>
          </div>
        )}

        <div className="bg-white p-3 rounded-xl border border-gray-300 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Branches & Faculty</div>
            <div className="text-sm font-black text-emerald-950 font-mono">
              {stats.branchCount} Sec • {stats.facultyCount} Fac
            </div>
          </div>
        </div>
      </div>

      {/* 4. Master Weekly Detailed Grid for this Subject */}
      <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card mb-8">
        {/* Table Banner Header */}
        <div className="text-center py-3.5 px-6 border-b-2 border-slate-700 bg-gray-50/95">
          <h2 className="text-xs sm:text-sm font-bold text-gray-900 tracking-wide uppercase font-serif">
            {universityInfo.name || 'GAYATRI VIDYA PARISHAD INSTITUTE OF HIGHER LEARNING AND RESEARCH'}
          </h2>
          <h3 className="text-sm sm:text-base font-black text-blue-900 mt-1 uppercase font-mono tracking-tight">
            CONSOLIDATED SUBJECT SCHEDULE: <span className="underline decoration-blue-600">{currentConfig.title} ({currentConfig.shortCode})</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            Weekly Hours Across All Branches • {currentConfig.description} • Academic Year {universityInfo.academicYear || '2026-27'}
          </p>
        </div>

        {/* Timetable Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse table-fixed min-w-[950px] border-2 border-slate-700">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider text-[11.5px]">
                <th className="py-3 px-3 border-r border-gray-300 w-24">Day</th>
                {periodSlots.map((slot) => (
                  <th 
                    key={slot.id} 
                    className={`py-3 px-2 border-r border-gray-300 ${
                      slot.type === 'break' ? 'bg-amber-100/80 text-amber-950 font-black w-20' : 'text-slate-950 w-44'
                    }`}
                  >
                    {slot.type === 'break' ? (
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="block font-black text-[11px]">{slot.label}</span>
                        <span className="block font-mono text-[9px] text-amber-900">{slot.time}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="block font-black text-xs sm:text-[12.5px]">{slot.time}</span>
                        <span className="block font-mono text-[9.5px] text-slate-500 uppercase">{slot.id.toUpperCase()}</span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-600">
              {days.map((day) => {
                const daySessions = matrixMap[day] || {};

                return (
                  <tr key={day} className="border-b-2 border-slate-600 hover:bg-gray-50/60 transition-colors">
                    {/* Day Column */}
                    <td className="py-4 px-3 font-extrabold text-gray-900 bg-gray-100/70 border-r border-gray-300 uppercase tracking-wide align-middle">
                      {day}
                    </td>

                    {/* Period Columns */}
                    {periodSlots.map((slot) => {
                      if (slot.type === 'break') {
                        return (
                          <td 
                            key={slot.id} 
                            className="py-4 px-1 bg-amber-100/70 text-amber-950 font-black text-[10.5px] border-r border-gray-300 tracking-wider uppercase align-middle text-center"
                          >
                            {slot.label}
                          </td>
                        );
                      }

                      const sessionsInSlot = daySessions[slot.time] || [];

                      return (
                        <td 
                          key={slot.id}
                          className={`p-2 border-r border-gray-300 align-top ${
                            sessionsInSlot.length > 0 ? 'bg-blue-50/30' : 'bg-slate-50/20'
                          }`}
                        >
                          {sessionsInSlot.length > 0 ? (
                            <div className="flex flex-col gap-2 justify-center items-center">
                              {sessionsInSlot.map((sess, sIdx) => {
                                const isTut = sess.type === 'tutorial';
                                const isLab = sess.type === 'lab';
                                const borderClass = isLab ? 'border-purple-300 hover:bg-purple-50' : (isTut ? 'border-amber-300 hover:bg-amber-50' : 'border-blue-300 hover:bg-blue-50');
                                const badgeClass = isLab ? 'bg-purple-100 text-purple-900 border-purple-200' : (isTut ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-blue-100 text-blue-900 border-blue-200');

                                return (
                                  <div
                                    key={sIdx}
                                    onClick={() => onSlotClick && onSlotClick([sess], day, slot.time, sess.branch)}
                                    className={`w-full py-1.5 px-2 rounded-lg bg-white border ${borderClass} shadow-xs flex flex-col justify-center items-center cursor-pointer transition-all hover:scale-[1.01]`}
                                    title="Click to view full slot timetable details"
                                  >
                                    {/* Top Row: Section & Type Badge */}
                                    <div className="flex items-center justify-between gap-1 w-full pb-1 border-b border-gray-100">
                                      <span className="font-black text-slate-900 text-xs">
                                        Sec: <span className="text-blue-900">{sess.branch}</span>
                                      </span>
                                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeClass}`}>
                                        {isLab ? (sess.isContinued ? 'Lab Cont.' : 'Lab (2h)') : (isTut ? 'Tutorial' : 'Theory')}
                                      </span>
                                    </div>

                                    {/* Subject & Room */}
                                    <div className="flex items-center justify-between gap-1 w-full mt-1 text-[10.5px]">
                                      <span className="font-semibold text-slate-700 truncate max-w-[100px]" title={sess.subject}>
                                        {sess.subject}
                                      </span>
                                      {sess.room && (
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-1 rounded border border-indigo-200 text-[10px]">
                                          {sess.room}
                                        </span>
                                      )}
                                    </div>

                                    {/* Faculty Name (if toggled) */}
                                    {showFacultyNames && sess.faculty && (
                                      <div className="text-[10px] font-sans font-semibold text-slate-800 mt-1 pt-1 border-t border-dashed border-gray-200 text-center w-full leading-tight">
                                        <span className="text-slate-500">Fac: </span>
                                        <span className="font-bold text-slate-900">{sess.faculty}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center min-h-[48px]">
                              <span className="text-gray-300 font-mono text-xs">—</span>
                            </div>
                          )}
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

      {/* 5. Branch-Wise Distribution Table */}
      <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card mb-8">
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between border-b-2 border-slate-700">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">
              Branch-Wise Workload & Room Allocations • {currentConfig.title} ({branchSummary.length} Branches Enrolled)
            </h3>
          </div>
          <span className="text-[11px] text-slate-300 font-mono">
            Ground-Truth Timetable_Final
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-black border-b-2 border-slate-700 uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-gray-300 text-center w-14">S.No</th>
                <th className="py-2.5 px-4 border-r border-gray-300 text-left w-36">Branch / Section</th>
                {currentConfig.badges.includes('Theory') && (
                  <th className="py-2.5 px-3 border-r border-gray-300 text-center bg-sky-50/70 text-sky-950 font-black w-28">
                    Theory (Hrs)
                  </th>
                )}
                {currentConfig.badges.includes('Tutorial') && (
                  <th className="py-2.5 px-3 border-r border-gray-300 text-center bg-amber-50/70 text-amber-950 font-black w-28">
                    Tutorial (Hrs)
                  </th>
                )}
                {currentConfig.badges.includes('Lab') && (
                  <th className="py-2.5 px-3 border-r border-gray-300 text-center bg-purple-50/70 text-purple-950 font-black w-28">
                    Lab (Hrs)
                  </th>
                )}
                <th className="py-2.5 px-3 border-r border-gray-300 text-center bg-emerald-50/80 text-emerald-950 font-black w-28">
                  Total (Hrs)
                </th>
                <th className="py-2.5 px-4 border-r border-gray-300 text-left">Assigned Faculty</th>
                <th className="py-2.5 px-4 text-left w-44">Allocated Rooms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branchSummary.map((b, idx) => (
                <tr 
                  key={b.branch} 
                  className={`border-b border-gray-200 transition-colors ${
                    idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-gray-50/50 hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-center text-slate-600 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 border-r border-gray-200 font-black text-slate-900">
                    {b.branch}
                  </td>
                  {currentConfig.badges.includes('Theory') && (
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-sky-950 bg-sky-50/30">
                      {b.theory}
                    </td>
                  )}
                  {currentConfig.badges.includes('Tutorial') && (
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-amber-950 bg-amber-50/30">
                      {b.tutorial}
                    </td>
                  )}
                  {currentConfig.badges.includes('Lab') && (
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-purple-950 bg-purple-50/30">
                      {b.lab}
                    </td>
                  )}
                  <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-black text-emerald-950 bg-emerald-50/50">
                    {b.total}
                  </td>
                  <td className="py-2.5 px-4 border-r border-gray-200 text-slate-900 font-semibold text-xs leading-snug">
                    {Array.from(b.facultyList).join(', ') || '—'}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-purple-900 text-xs">
                    {Array.from(b.rooms).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-black border-t-2 border-slate-700 text-slate-900">
                <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider border-r border-gray-300 font-black">
                  Total Across All Branches:
                </td>
                {currentConfig.badges.includes('Theory') && (
                  <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-black text-sky-950 bg-sky-100/60">
                    {branchSummary.reduce((acc, curr) => acc + curr.theory, 0)}
                  </td>
                )}
                {currentConfig.badges.includes('Tutorial') && (
                  <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-black text-amber-950 bg-amber-100/60">
                    {branchSummary.reduce((acc, curr) => acc + curr.tutorial, 0)}
                  </td>
                )}
                {currentConfig.badges.includes('Lab') && (
                  <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-black text-purple-950 bg-purple-100/60">
                    {branchSummary.reduce((acc, curr) => acc + curr.lab, 0)}
                  </td>
                )}
                <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-black text-emerald-950 bg-emerald-100/70">
                  {branchSummary.reduce((acc, curr) => acc + curr.total, 0)}
                </td>
                <td colSpan={2} className="py-3 px-4 text-left font-mono text-xs text-slate-600">
                  {stats.facultyCount} Unique Faculty Members Engaged
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
