import React, { useState } from 'react';
import { days, periodSlots, getActiveDays } from '../data/mockData';
import { getSubjectStyle } from '../utils/subjectColors';
import { BookOpen, ChevronDown } from 'lucide-react';

// Helper to wrap long branch names into two clean stacked lines
export function renderBranchName(branch = '') {
  const b = (branch || '').trim();

  if (b.includes('MECH-ROBOTICS') || b.includes('MECH ROBOTICS')) {
    return (
      <span className="inline-flex flex-col items-center justify-center leading-tight">
        <span className="font-black">MECH</span>
        <span className="text-[10px] sm:text-[11px] font-black text-slate-800 tracking-tighter">ROBOTICS</span>
      </span>
    );
  }

  if (b.startsWith('CSE(AI&ML)') || b.startsWith('CSE (AI&ML)')) {
    const suffix = b.replace(/^CSE\s*\(AI&ML\)/i, '').trim(); // e.g. "-1" or "-2"
    return (
      <span className="inline-flex flex-col items-center justify-center leading-tight">
        <span className="font-black">CSE</span>
        <span className="text-[10px] sm:text-[10.5px] font-black tracking-tighter text-slate-800">
          (AI&ML){suffix}
        </span>
      </span>
    );
  }

  if (b.includes('CSE (CS & DS)') || b.includes('CSE(CS & DS)')) {
    return (
      <span className="inline-flex flex-col items-center justify-center leading-tight">
        <span className="font-black">CSE</span>
        <span className="text-[10px] sm:text-[10.5px] font-black tracking-tighter text-slate-800">
          (CS & DS)
        </span>
      </span>
    );
  }

  if (b.includes('-') && b.length > 8) {
    const parts = b.split('-');
    return (
      <span className="inline-flex flex-col items-center justify-center leading-tight">
        <span className="font-black">{parts[0]}</span>
        <span className="text-[10.5px] font-black text-slate-800">{parts.slice(1).join('-')}</span>
      </span>
    );
  }

  return <span className="font-black">{b}</span>;
}

export default function TimetableGrid({ 
  timetableData, 
  branchLegend = null,
  isCollapsibleLegend = false,
  defaultLegendOpen = true,
  selectedBranch, 
  branchInfo, 
  universityInfo,
  highlightFaculty = null,
  highlightLab = null,
  onSlotClick,
  selectedDay = 'ALL'
}) {
  const [isLegendOpen, setIsLegendOpen] = useState(defaultLegendOpen);
  const branchSchedule = timetableData[selectedBranch] || {};
  const activeDaysList = getActiveDays(timetableData);
  const visibleDays = selectedDay && selectedDay !== 'ALL' ? [selectedDay] : activeDaysList;

  // Helper to check if current slot and next slot should be merged horizontally (colSpan=2)
  const has2HourMerge = (daySched, idx) => {
    const currentSlot = periodSlots[idx]?.time;
    const nextSlot = periodSlots[idx + 1]?.time;
    if (!nextSlot || periodSlots[idx + 1]?.type === 'break') return false;

    const currentItems = daySched[currentSlot] || [];
    const nextItems = daySched[nextSlot] || [];

    if (currentItems.length === 0 || nextItems.length === 0) return false;

    // 1. Standard full merge (all items match across both hours)
    if (nextItems.length > 0 && 
        currentItems.length === nextItems.length && 
        currentItems.every((item, i) => nextItems[i] && nextItems[i].subject === item.subject)) {
      return true;
    }

    // 2. Partial lab merge (e.g. AITA LAB spans 2 hours for Batch A while Batch B has 2 1-hour tutorials)
    const hasContinuedLab = currentItems.some(item => 
      (item.isLab || item.subject?.includes('LAB') || item.subject?.includes('3DDA')) && 
      nextItems.some(nItem => (nItem.isContinued || nItem.subject === item.subject) && nItem.subject === item.subject)
    );
    if (hasContinuedLab) return true;

    // 3. Trailing slot in Excel is empty: 2-hour lab or sports/counselling/library session automatically spans colSpan=2
    const isNextEmpty = nextItems.length === 0 || nextItems.every(it => !it.subject || it.subject === '-' || it.subject === '');
    if (isNextEmpty) {
      const is2HourBlock = currentItems.some(item => {
        const s = (item.subject || '').toUpperCase();
        return item.isLab || s.includes('LAB') || s.includes('3DDA') || s.includes('SPORTS') || s.includes('YOGA') || s.includes('LIBRARY') || s.includes('COUNSELLING');
      });
      if (is2HourBlock) {
        return true;
      }
    }

    return false;
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-6">
      {/* Sub-header inside view - ONLY FOR PRINT! Hidden on screen because main website header is above */}
      <div className="print-only text-center py-3 px-6 border-b border-gray-300 bg-gray-50/70">
        <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
          {universityInfo.name}
        </h2>
        <p className="text-xs text-gray-700 font-semibold mt-0.5">
          {universityInfo.statusText}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          {universityInfo.address}
        </p>
        <h3 className="text-xs font-bold text-gray-800 mt-2 font-mono">
          {selectedDay && selectedDay !== 'ALL' ? `${selectedDay} TIME TABLE` : 'TENTATIVE TIME TABLE'} FOR THE ACADEMIC YEAR {universityInfo.academicYear}, B.Tech 1st Sem ({branchInfo?.fullName || selectedBranch})
        </h3>
      </div>

      {/* Main Table with Darker Borders & Vertically Centered Cells */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1000px] border-2 border-slate-700">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-slate-700 uppercase tracking-wider">
              <th className="py-3 px-2 border-r border-gray-300 w-16 text-xs font-black text-slate-900">Day</th>
              <th className="py-3 px-1 border-r-2 border-slate-500 w-24 sm:w-28 text-xs sm:text-sm font-black text-slate-900">Branch</th>
              {periodSlots.map((slot) => (
                <th 
                  key={slot.id} 
                  className={`py-3 px-2 border-r border-gray-300 ${
                    slot.type === 'break' ? 'bg-amber-100/80 text-amber-950 font-black w-20' : 'text-slate-950'
                  }`}
                >
                  <span className="font-black text-slate-950 text-xs sm:text-[13px] tracking-tight block">
                    {slot.time}
                  </span>
                  {slot.label && (
                    <div className="text-[10px] sm:text-[10.5px] tracking-normal text-amber-900 font-black mt-0.5">
                      {slot.label}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-600">
            {visibleDays.map((day) => {
              const daySchedule = branchSchedule[day] || {};
              const skipSlots = new Set();

              return (
                <tr key={day} className="border-b-2 border-slate-600 hover:bg-gray-50/80 transition-colors">
                  {/* Day Header Column */}
                  <td className="py-4 px-3 font-extrabold text-gray-900 bg-gray-100/60 border-r border-gray-300 border-b-2 border-slate-600 uppercase tracking-wide align-middle">
                    {day}
                  </td>
                  
                  {/* Branch Column - Wrapped Cleanly (e.g. MECH \n ROBOTICS, CSE \n (AI&ML)-1) */}
                  <td className="py-3 px-1 font-black text-slate-900 bg-slate-100/90 border-r-2 border-slate-500 border-b-2 border-slate-600 font-sans text-xs sm:text-[13px] uppercase align-middle text-center shadow-xs">
                    {renderBranchName(selectedBranch)}
                  </td>

                  {/* Period Slots with Full-Cell Tint & Distinct Multi-Lab Division */}
                  {periodSlots.map((slot, sIdx) => {
                    if (skipSlots.has(slot.time)) {
                      return null; // Skip second hour of merged cell
                    }

                    if (slot.type === 'break') {
                      return (
                        <td 
                          key={slot.id} 
                          className="py-4 px-2 bg-amber-100/70 text-amber-950 font-black text-[11px] border-r border-gray-300 border-b-2 border-slate-600 tracking-wider uppercase align-middle select-none text-center"
                        >
                          {slot.label}
                        </td>
                      );
                    }

                    const rawCell = daySchedule[slot.time];
                    const items = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
                    
                    // Check horizontal colSpan merge
                    let colSpan = 1;
                    let isSplitMerge = false;
                    let nextSlotItems = [];
                    if (has2HourMerge(daySchedule, sIdx)) {
                      colSpan = 2;
                      const nextSlotTime = periodSlots[sIdx + 1]?.time;
                      skipSlots.add(nextSlotTime);
                      const rawNext = daySchedule[nextSlotTime];
                      nextSlotItems = Array.isArray(rawNext) ? rawNext : rawNext ? [rawNext] : [];

                      // If not all items match across both hours, it's a split merge (e.g. 2-hr lab on top, two 1-hr tutorials below)
                      if (items.length !== nextSlotItems.length || !items.every((it, i) => nextSlotItems[i]?.subject === it.subject)) {
                        isSplitMerge = true;
                      }
                    }

                    // 1. Empty Cell
                    if (items.length === 0) {
                      return (
                        <td 
                          key={slot.id} 
                          colSpan={colSpan}
                          className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-middle bg-slate-50/30 text-center select-none h-full"
                          style={{ height: '1px' }}
                        >
                          <div className="flex items-center justify-center h-full min-h-[64px]">
                            <span className="text-gray-300 font-mono text-[13px]">—</span>
                          </div>
                        </td>
                      );
                    }

                    // 1b. Split 2-Hour Merge Cell (2-Hour Lab on top, two 1-Hour Tutorials side-by-side below)
                    if (isSplitMerge) {
                      const sharedLab = items.find(it => nextSlotItems.some(n => n.subject === it.subject));
                      const h1Item = items.find(it => it !== sharedLab);
                      const h2Item = nextSlotItems.find(it => it.subject !== sharedLab?.subject);

                      const sharedStyle = sharedLab ? getSubjectStyle(sharedLab.subject, sharedLab.isLab) : null;
                      const h1Style = h1Item ? getSubjectStyle(h1Item.subject, h1Item.isLab) : null;
                      const h2Style = h2Item ? getSubjectStyle(h2Item.subject, h2Item.isLab) : null;

                      const isSharedHighlight = sharedLab && ((highlightFaculty && sharedLab.faculty?.includes(highlightFaculty)) || (highlightLab && sharedLab.room?.includes(highlightLab)));
                      const isH1Highlight = h1Item && ((highlightFaculty && h1Item.faculty?.includes(highlightFaculty)) || (highlightLab && h1Item.room?.includes(highlightLab)));
                      const isH2Highlight = h2Item && ((highlightFaculty && h2Item.faculty?.includes(highlightFaculty)) || (highlightLab && h2Item.room?.includes(highlightLab)));

                      return (
                        <td 
                          key={slot.id} 
                          colSpan={colSpan}
                          onClick={() => onSlotClick && onSlotClick([sharedLab, h1Item, h2Item].filter(Boolean), day, `${slot.time} - ${periodSlots[sIdx + 1]?.time}`, selectedBranch)}
                          className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-top transition-all cursor-pointer h-full"
                          style={{ height: '1px' }}
                          title="Click to view full course & faculty details (2-Hour Merged Lab Session)"
                        >
                          <div className="flex flex-col h-full w-full divide-y divide-gray-300/90">
                            {/* Top: 2-Hour Merged Lab Session spanning entire 2-hour width */}
                            {sharedLab && (
                              <div 
                                className={`flex-1 w-full py-2 px-2 flex flex-col justify-center items-center text-center transition-all ${sharedStyle.bg} hover:brightness-95 ${
                                  isSharedHighlight ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                }`}
                                style={sharedStyle.inlineBg ? { backgroundColor: sharedStyle.inlineBg } : undefined}
                              >
                                <div className={`font-black tracking-tight text-[12px] sm:text-[12.5px] leading-snug ${sharedStyle.text}`}>
                                  {sharedLab.subject}
                                </div>

                                {sharedLab.faculty && (
                                  <div className="text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight">
                                    {sharedLab.faculty}
                                  </div>
                                )}

                                {sharedLab.room && (
                                  <div className="mt-1 text-[11px] sm:text-[11.5px] font-black text-slate-800 tracking-normal font-sans">
                                    {sharedLab.room}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bottom: Split Tutorial Sessions side-by-side (Hour 1 on left, Hour 2 on right) */}
                            <div className="flex-1 w-full flex divide-x divide-gray-300/90">
                              {h1Item && (
                                <div 
                                  className={`w-1/2 py-2 px-1.5 flex flex-col justify-center items-center text-center transition-all ${h1Style.bg} hover:brightness-95 ${
                                    isH1Highlight ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                  }`}
                                  style={h1Style.inlineBg ? { backgroundColor: h1Style.inlineBg } : undefined}
                                >
                                  <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug ${h1Style.text}`}>
                                    {h1Item.subject}
                                  </div>
                                  {h1Item.faculty && (
                                    <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight">
                                      {h1Item.faculty}
                                    </div>
                                  )}
                                  {h1Item.room && (
                                    <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans">
                                      {h1Item.room}
                                    </div>
                                  )}
                                </div>
                              )}

                              {h2Item && (
                                <div 
                                  className={`w-1/2 py-2 px-1.5 flex flex-col justify-center items-center text-center transition-all ${h2Style.bg} hover:brightness-95 ${
                                    isH2Highlight ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                  }`}
                                  style={h2Style.inlineBg ? { backgroundColor: h2Style.inlineBg } : undefined}
                                >
                                  <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] leading-snug ${h2Style.text}`}>
                                    {h2Item.subject}
                                  </div>
                                  {h2Item.faculty && (
                                    <div className="text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight">
                                      {h2Item.faculty}
                                    </div>
                                  )}
                                  {h2Item.room && (
                                    <div className="mt-0.5 text-[10.5px] sm:text-[11px] font-black text-slate-800 tracking-normal font-sans">
                                      {h2Item.room}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    }

                    // 2. Single Session Cell (Whole cell filled with subject color edge-to-edge)
                    if (items.length === 1) {
                      const cellItem = items[0];
                      const isFacultyMatch = highlightFaculty && cellItem.faculty?.includes(highlightFaculty);
                      const isLabMatch = highlightLab && cellItem.room?.includes(highlightLab);
                      const isHighlighted = isFacultyMatch || isLabMatch;
                      const style = getSubjectStyle(cellItem.subject, cellItem.isLab);

                      return (
                        <td 
                          key={slot.id} 
                          colSpan={colSpan}
                          onClick={() => onSlotClick && onSlotClick(items, day, slot.time, selectedBranch)}
                          className={`p-2 sm:p-2.5 border-r border-gray-300 border-b-2 border-slate-600 align-middle transition-all cursor-pointer h-full ${style.bg} hover:brightness-95 ${
                            isHighlighted ? 'ring-2 ring-blue-600 ring-inset shadow-inner font-bold' : ''
                          }`}
                          style={{
                            height: '1px',
                            ...(style.inlineBg ? { backgroundColor: style.inlineBg } : {})
                          }}
                          title="Click to view full course & faculty details"
                        >
                          <div className="flex flex-col justify-center items-center text-center h-full min-h-[58px]">
                            <div className={`font-black tracking-tight text-[12px] sm:text-[12.5px] leading-snug ${style.text}`}>
                              {cellItem.subject}
                            </div>

                            {cellItem.faculty && (
                              <div className="text-slate-800 font-semibold text-[10.5px] sm:text-[11px] mt-1 leading-tight">
                                {cellItem.faculty}
                              </div>
                            )}

                            {cellItem.room && (
                              <div className="mt-1 text-xs sm:text-[12px] font-black text-slate-800 tracking-normal font-sans">
                                {cellItem.room}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // 3. Multi-Session / Multi-Lab Cell (Divided into distinct unique colors edge-to-edge, zero white gaps)
                    return (
                      <td 
                        key={slot.id} 
                        colSpan={colSpan}
                        onClick={() => onSlotClick && onSlotClick(items, day, slot.time, selectedBranch)}
                        className="p-0 border-r border-gray-300 border-b-2 border-slate-600 align-top transition-all cursor-pointer h-full"
                        style={{ height: '1px' }}
                        title="Click to view full course & faculty details"
                      >
                        <div className="flex flex-col h-full w-full divide-y divide-gray-300/90">
                          {items.map((cellItem, bIdx) => {
                            const itemStyle = getSubjectStyle(cellItem.subject, cellItem.isLab);
                            const isFacultyMatch = highlightFaculty && cellItem.faculty?.includes(highlightFaculty);
                            const isLabMatch = highlightLab && cellItem.room?.includes(highlightLab);
                            const isHighlighted = isFacultyMatch || isLabMatch;

                            return (
                              <div 
                                key={bIdx}
                                className={`flex-1 w-full py-2 px-1.5 flex flex-col justify-center items-center text-center transition-all ${itemStyle.bg} hover:brightness-95 ${
                                  isHighlighted ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                }`}
                                style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                              >
                                <div className={`font-black tracking-tight text-[11.5px] sm:text-[12px] leading-snug ${itemStyle.text}`}>
                                  {cellItem.subject}
                                </div>

                                {cellItem.faculty && (
                                  <div className="text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight">
                                    {cellItem.faculty}
                                  </div>
                                )}

                                {cellItem.room && (
                                  <div className="mt-1 text-[11px] sm:text-[11.5px] font-black text-slate-800 tracking-normal font-sans">
                                    {cellItem.room}
                                  </div>
                                )}
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

      {/* Course & Faculty Allocation Legend for this Branch (Matching Excel sheet bottom table) */}
      {branchLegend && branchLegend.length > 0 && (
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t-2 border-slate-300">
          <div 
            onClick={isCollapsibleLegend ? () => setIsLegendOpen(!isLegendOpen) : undefined}
            className={`flex flex-wrap items-center justify-between gap-2 ${
              isCollapsibleLegend ? 'cursor-pointer select-none group' : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                Course & Faculty Allocation Details ({branchInfo?.fullName || selectedBranch})
              </h4>
              {isCollapsibleLegend && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLegendOpen(!isLegendOpen);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-200/90 px-3 py-0.5 rounded-full border border-blue-300 transition-colors ml-1 shadow-2xs cursor-pointer"
                >
                  {isLegendOpen ? 'Hide ▲' : 'View Subjects & Faculty ▼'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                Total Courses & Labs: {branchLegend.length}
              </span>
              {isCollapsibleLegend && (
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                  isLegendOpen ? 'rotate-180 text-blue-600' : ''
                }`} />
              )}
            </div>
          </div>

          <div className={`overflow-x-auto mt-3 transition-all ${
            isCollapsibleLegend && !isLegendOpen ? 'hidden print:block' : 'block'
          }`}>
            <table className="w-full text-left text-xs border border-slate-300 bg-white rounded-lg shadow-2xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px] uppercase tracking-wider">
                  <th className="py-2 px-3 w-12 border-r border-slate-300 text-center">S.No</th>
                  <th className="py-2 px-3 w-32 border-r border-slate-300">Course Code</th>
                  <th className="py-2 px-3 min-w-[220px] border-r border-slate-300">Full Course / Lab Name</th>
                  <th className="py-2 px-3 w-28 border-r border-slate-300 text-center">Type</th>
                  <th className="py-2 px-3 min-w-[520px]">Assigned Faculty Name(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11.5px]">
                {branchLegend.map((item, idx) => {
                  const style = getSubjectStyle(item.subjectShort, item.isLab);
                  const facultyList = item.facultyFullName ? item.facultyFullName.split('\n').filter(Boolean) : [];
                  const shortList = item.facultyShort ? item.facultyShort.split('\n').filter(Boolean).map(s => s.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim()) : [];

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-mono text-center text-slate-500 border-r border-slate-200 font-semibold">
                        {item.sno || idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <span className={`inline-block px-2.5 py-1 rounded-md font-mono font-black text-[11px] border ${style.bg} ${style.border} ${style.text} shadow-2xs`}>
                          {item.subjectShort}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                        {item.subjectFullName}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isLab 
                            ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {item.isLab ? 'Practical / Lab' : 'Theory'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {facultyList.length > 0 ? (
                          facultyList.length > 3 ? (
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                              {facultyList.map((fac, fIdx) => (
                                <span 
                                  key={fIdx} 
                                  className="inline-flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-slate-100/90 text-slate-800 border border-slate-200 font-medium text-[11px] shadow-2xs"
                                  title={`${fac.trim()}${shortList[fIdx] ? ` (${shortList[fIdx].trim()})` : ''}`}
                                >
                                  <span className="font-semibold text-slate-900 truncate">
                                    {fac.trim()}
                                  </span>
                                  {shortList[fIdx] && (
                                    <span className="text-slate-800 font-black text-[11.5px] sm:text-xs shrink-0 font-sans">
                                      ({shortList[fIdx].trim()})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {facultyList.map((fac, fIdx) => (
                                <span 
                                  key={fIdx} 
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100/90 text-slate-800 border border-slate-200 font-medium text-[11px] shadow-2xs"
                                >
                                  <span className="font-semibold text-slate-900">{fac.trim()}</span>
                                  {shortList[fIdx] && (
                                    <span className="text-slate-800 font-black text-[11.5px] sm:text-xs font-sans">
                                      ({shortList[fIdx].trim()})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
