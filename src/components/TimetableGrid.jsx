import React, { useState } from 'react';
import { days, periodSlots, getActiveDays } from '../data/mockData';
import { getSubjectStyle } from '../utils/subjectColors';
import { getFacultyShortNames } from '../utils/facultyShortNames';
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
  selectedDay = 'ALL',
  useShortNames = false
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

    if (currentItems.length === 0) return false;

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
    <div className="w-full bg-white rounded-xl shadow-md border-2 border-slate-700 overflow-hidden timetable-card my-6 print:my-0 print:border-black print:rounded-none">
      {/* Official University Header - ONLY FOR PRINT! Exact Match to Photo */}
      <div className="print-only w-full py-1.5 px-4 border-b-2 border-black bg-white mb-2">
        <div className="flex items-center justify-between gap-4">
          {/* Official Crest Logo - Larger as requested */}
          <div className="w-20 flex-shrink-0 flex items-center justify-start">
            <img 
              src={universityInfo.logo || '/gvpihlr.png'} 
              alt="GVPIHLR Logo" 
              className="h-20 w-20 object-contain drop-shadow-xs"
            />
          </div>

          {/* Institution Title & Details */}
          <div className="text-center flex-1">
            <h1 className="text-[12.5pt] font-black uppercase font-serif tracking-tight text-black leading-tight">
              {universityInfo.name}
            </h1>
            <p className="text-[7.5pt] text-black font-semibold leading-tight mt-0.5">
              {universityInfo.statusText}
            </p>
            <p className="text-[7pt] text-black leading-tight">
              {universityInfo.address}
            </p>
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="text-[8.5pt] font-black text-black uppercase tracking-wide font-sans">
                TENTATIVE TIME TABLE FOR THE ACADEMIC YEAR {universityInfo.academicYear}
              </span>
            </div>
            <div className="text-[9.5pt] font-black text-blue-950 font-sans tracking-tight">
              {universityInfo.semester || 'B.Tech 1st Sem'} — {branchInfo?.fullName || selectedBranch} 
              {branchLegend?.[0]?.room ? ` (Classroom: ${branchLegend[0].room})` : ''}
            </div>
          </div>

          {/* Empty spacer for perfect center symmetry (right box with branch name removed) */}
          <div className="w-20 flex-shrink-0"></div>
        </div>
      </div>

      {/* Main Table with Darker Borders & Vertically Centered Cells */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse table-fixed min-w-[1000px] border-2 border-slate-700 print:min-w-0 print:border-black branch-main-timetable">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-slate-700 print:border-b-2 print:border-black uppercase tracking-wider">
              <th className="col-day py-2.5 px-2 border-r-2 border-slate-700 print:border-r-[2.5pt] print:border-black w-16 print:w-14 text-xs print:text-[10pt] font-black text-slate-900 print:text-black">Day</th>
              <th className="py-2.5 px-1 border-r-2 border-slate-500 print:border-black w-24 sm:w-28 text-xs sm:text-sm font-black text-slate-900 print:hidden">Branch</th>
              {periodSlots.map((slot) => (
                <th 
                  key={slot.id} 
                  className={`py-2.5 px-1 border-r border-gray-300 print:border-black ${
                    slot.type === 'break' 
                      ? 'bg-amber-100/80 text-amber-950 font-black w-16 print:w-12 text-center' 
                      : 'text-slate-950'
                  }`}
                >
                  {slot.type === 'break' && slot.time.includes('-') ? (
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className="font-black text-slate-950 text-xs sm:text-[13px] print:text-[8.5pt] tracking-tight block">
                        {slot.time.split('-')[0]}–
                      </span>
                      <span className="font-black text-slate-950 text-xs sm:text-[13px] print:text-[8.5pt] tracking-tight block">
                        {slot.time.split('-')[1]}
                      </span>
                    </div>
                  ) : (
                    <span className="font-black text-slate-950 text-xs sm:text-[13px] print:text-[8.5pt] tracking-tight block">
                      {slot.time}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-600 print:divide-black">
            {visibleDays.map((day, dayIdx) => {
              const daySchedule = branchSchedule[day] || {};
              const skipSlots = new Set();

              return (
                <tr key={day} className="border-b-2 border-slate-600 print:border-b print:border-black hover:bg-gray-50/80 transition-colors">
                  {/* Day Header Column - Short name MON, TUE, WED, THU, FRI with Full Dark Line After */}
                  <td className="col-day py-3 px-2 print:py-2 print:px-1 font-black text-gray-900 print:text-black bg-gray-100/60 print:bg-white border-r-2 border-slate-700 print:border-r-[2.5pt] print:border-black border-b-2 border-slate-600 print:border-b print:border-black uppercase tracking-wide align-middle print:text-[10pt] font-sans">
                    {day}
                  </td>
                  
                  {/* Branch Column - Hidden in print as Department is in Header */}
                  <td className="py-3 px-1 font-black text-slate-900 bg-slate-100/90 border-r-2 border-slate-500 border-b-2 border-slate-600 font-sans text-xs sm:text-[13px] uppercase align-middle text-center shadow-xs print:hidden">
                    {renderBranchName(selectedBranch)}
                  </td>

                  {/* Period Slots */}
                  {periodSlots.map((slot, sIdx) => {
                    if (skipSlots.has(slot.time)) {
                      return null; // Skip second hour of merged cell
                    }

                    if (slot.type === 'break') {
                      const letters = (slot.label || '').toUpperCase().split('');
                      const char = letters[dayIdx] || (slot.label || '');

                      return (
                        <td 
                          key={slot.id} 
                          className="p-1 font-black border-r border-gray-300 print:border-r print:border-black border-b-2 border-slate-600 print:border-b print:border-black align-middle select-none text-center bg-amber-50/70 text-amber-950 print:bg-white print:text-black"
                        >
                          <div className="flex items-center justify-center min-h-[52px] print:min-h-[44px]">
                            <span className="text-base sm:text-lg print:text-[14pt] font-black uppercase tracking-wider font-serif">
                              {char}
                            </span>
                          </div>
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
                          style={{ height: '1px' }}
                          className="p-0 border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle bg-slate-50/50 text-center select-none"
                        >
                          <div className="flex items-center justify-center min-h-[52px] print:min-h-[40px]">
                            <span className="text-slate-400 font-mono text-[14px] font-bold">—</span>
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
                          className="p-0 border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-top transition-all cursor-pointer"
                          style={{ height: '1px' }}
                          title="Click to view full course & faculty details (2-Hour Merged Lab Session)"
                        >
                          <div className="flex flex-col h-full min-h-full w-full min-h-[70px] print:min-h-[54px] divide-y divide-gray-300/90 print:divide-black">
                            {/* Top: 2-Hour Merged Lab Session spanning entire 2-hour width */}
                            {sharedLab && (
                              <div 
                                className={`flex-1 shrink-0 min-h-fit w-full py-1.5 px-1.5 flex flex-col justify-center items-center text-center transition-all ${sharedStyle.bg} hover:brightness-95 ${
                                  isSharedHighlight ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                }`}
                                style={sharedStyle.inlineBg ? { backgroundColor: sharedStyle.inlineBg } : undefined}
                              >
                                <div className={`font-black tracking-tight text-[11.5px] print:text-[8.5pt] leading-snug ${sharedStyle.text}`}>
                                  {sharedLab.subject}
                                </div>

                                {sharedLab.faculty && (
                                  <>
                                    <div className="no-print text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight">
                                      {useShortNames ? `(${getFacultyShortNames(sharedLab.faculty)})` : sharedLab.faculty}
                                    </div>
                                    <div className="print-only font-bold text-[7.5pt] mt-0.5 leading-tight text-slate-900">
                                      ({getFacultyShortNames(sharedLab.faculty)})
                                    </div>
                                  </>
                                )}

                                {sharedLab.room && (
                                  <div className="mt-0.5 text-[10px] print:text-[7pt] font-black text-slate-800 tracking-normal font-sans">
                                    {sharedLab.room}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bottom: Split Tutorial Sessions side-by-side (Hour 1 on left, Hour 2 on right) */}
                            <div className="flex-1 shrink-0 min-h-fit w-full flex divide-x divide-gray-300/90 print:divide-black">
                              {h1Item && (
                                <div 
                                  className={`flex-1 shrink-0 min-h-fit py-1.5 px-1 flex flex-col justify-center items-center text-center transition-all ${h1Style.bg} hover:brightness-95 ${
                                    isH1Highlight ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                  }`}
                                  style={h1Style.inlineBg ? { backgroundColor: h1Style.inlineBg } : undefined}
                                >
                                  <div className={`font-black tracking-tight text-[11px] print:text-[8pt] leading-snug ${h1Style.text}`}>
                                    {h1Item.subject}
                                  </div>
                                  {h1Item.faculty && (
                                    <>
                                      <div className="no-print text-slate-800 font-semibold text-[9px] mt-0.5 leading-tight">
                                        {useShortNames ? `(${getFacultyShortNames(h1Item.faculty)})` : h1Item.faculty}
                                      </div>
                                      <div className="print-only font-bold text-[7pt] mt-0.5 leading-tight text-slate-900">
                                        ({getFacultyShortNames(h1Item.faculty)})
                                      </div>
                                    </>
                                  )}
                                  {h1Item.room && (
                                    <div className="mt-0.5 text-[9.5px] print:text-[7pt] font-black text-slate-800 tracking-normal font-sans">
                                      {h1Item.room}
                                    </div>
                                  )}
                                </div>
                              )}

                              {h2Item && (
                                <div 
                                  className={`flex-1 shrink-0 min-h-fit py-1.5 px-1 flex flex-col justify-center items-center text-center transition-all ${h2Style.bg} hover:brightness-95 ${
                                    isH2Highlight ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                  }`}
                                  style={h2Style.inlineBg ? { backgroundColor: h2Style.inlineBg } : undefined}
                                >
                                  <div className={`font-black tracking-tight text-[11px] print:text-[8pt] leading-snug ${h2Style.text}`}>
                                    {h2Item.subject}
                                  </div>
                                  {h2Item.faculty && (
                                    <>
                                      <div className="no-print text-slate-800 font-semibold text-[9px] mt-0.5 leading-tight">
                                        {useShortNames ? `(${getFacultyShortNames(h2Item.faculty)})` : h2Item.faculty}
                                      </div>
                                      <div className="print-only font-bold text-[7pt] mt-0.5 leading-tight text-slate-900">
                                        ({getFacultyShortNames(h2Item.faculty)})
                                      </div>
                                    </>
                                  )}
                                  {h2Item.room && (
                                    <div className="mt-0.5 text-[9.5px] print:text-[7pt] font-black text-slate-800 tracking-normal font-sans">
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
                          className={`p-1.5 sm:p-2 print:p-1 border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-middle transition-all cursor-pointer ${style.bg} hover:brightness-95 ${
                            isHighlighted ? 'ring-2 ring-blue-600 ring-inset shadow-inner font-bold' : ''
                          }`}
                          style={{
                            height: '1px',
                            ...(style.inlineBg ? { backgroundColor: style.inlineBg } : {})
                          }}
                          title="Click to view full course & faculty details"
                        >
                          <div className="flex flex-col justify-center items-center text-center min-h-[52px] print:min-h-[40px] py-0.5">
                            <div className={`font-black tracking-tight text-[12px] sm:text-[12.5px] print:text-[9.5pt] leading-snug cell-subject ${style.text}`}>
                              {cellItem.subject}
                            </div>

                            {cellItem.faculty && (
                              <>
                                <div className="no-print text-slate-800 font-semibold text-[10px] sm:text-[10.5px] mt-0.5 leading-tight cell-faculty">
                                  {useShortNames ? `(${getFacultyShortNames(cellItem.faculty)})` : cellItem.faculty}
                                </div>
                                <div className="print-only font-bold text-[8pt] mt-0.5 leading-tight text-slate-900 cell-faculty-print">
                                  ({getFacultyShortNames(cellItem.faculty)})
                                </div>
                              </>
                            )}

                            {cellItem.room && (
                              <div className="mt-0.5 text-[10px] sm:text-[10.5px] print:text-[7.5pt] font-black text-slate-800 tracking-normal font-sans cell-room">
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
                        className="p-0 border-r border-gray-300 print:border-black border-b-2 border-slate-600 print:border-b align-top transition-all cursor-pointer"
                        style={{ height: '1px' }}
                        title="Click to view full course & faculty details"
                      >
                        <div className="flex flex-col h-full min-h-full w-full divide-y divide-gray-300/90 print:divide-black">
                          {items.map((cellItem, bIdx) => {
                            const itemStyle = getSubjectStyle(cellItem.subject, cellItem.isLab);
                            const isFacultyMatch = highlightFaculty && cellItem.faculty?.includes(highlightFaculty);
                            const isLabMatch = highlightLab && cellItem.room?.includes(highlightLab);
                            const isHighlighted = isFacultyMatch || isLabMatch;

                            return (
                              <div 
                                key={bIdx}
                                className={`flex-1 shrink-0 min-h-fit w-full py-1.5 px-1.5 flex flex-col justify-center items-center text-center transition-all ${itemStyle.bg} hover:brightness-95 ${
                                  isHighlighted ? 'ring-2 ring-blue-600 ring-inset font-bold z-10' : ''
                                }`}
                                style={itemStyle.inlineBg ? { backgroundColor: itemStyle.inlineBg } : undefined}
                              >
                                <div className={`font-black tracking-tight text-[11px] sm:text-[11.5px] print:text-[8pt] leading-snug cell-subject ${itemStyle.text}`}>
                                  {cellItem.subject}
                                </div>

                                {cellItem.faculty && (
                                  <>
                                    <div className="no-print text-slate-800 font-semibold text-[9.5px] sm:text-[10px] mt-0.5 leading-tight cell-faculty">
                                      {useShortNames ? `(${getFacultyShortNames(cellItem.faculty)})` : cellItem.faculty}
                                    </div>
                                    <div className="print-only font-bold text-[7pt] mt-0.5 leading-tight text-slate-900 cell-faculty-print">
                                      ({getFacultyShortNames(cellItem.faculty)})
                                    </div>
                                  </>
                                )}

                                {cellItem.room && (
                                  <div className="mt-0.5 text-[9.5px] sm:text-[10px] print:text-[6.8pt] font-black text-slate-800 tracking-normal font-sans cell-room">
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

      {/* Course & Faculty Allocation Details for this Branch (Matching Excel sheet bottom table) */}
      {/* Course & Faculty Allocation Details for this Branch (Matching Excel sheet bottom table) */}
      {branchLegend && branchLegend.length > 0 && (
        (() => {
          const legendCount = branchLegend.length;
          const legendSizeClass = legendCount <= 11 ? 'legend-rows-11' : legendCount <= 12 ? 'legend-rows-12' : 'legend-rows-13';

          return (
            <div className={`branch-legend-card p-3 sm:p-5 bg-slate-50/80 border-t-2 border-slate-700 print:bg-white print:border-t-2 print:border-black print:p-0 print:mt-1 ${legendSizeClass}`}>
              <div 
                onClick={isCollapsibleLegend ? () => setIsLegendOpen(!isLegendOpen) : undefined}
                className={`flex flex-wrap items-center justify-between gap-2 ${
                  isCollapsibleLegend ? 'cursor-pointer select-none group' : ''
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600 print:hidden" />
                  <h4 className="text-xs sm:text-sm print:text-[9.5pt] font-black text-slate-900 print:text-black uppercase tracking-wider font-sans">
                    Course & Faculty Allocation Details ({branchInfo?.fullName || selectedBranch})
                  </h4>
                  {isCollapsibleLegend && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLegendOpen(!isLegendOpen);
                      }}
                      className="no-print inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-200/90 px-3 py-0.5 rounded-full border border-blue-300 transition-colors ml-1 shadow-2xs cursor-pointer"
                    >
                      {isLegendOpen ? 'Hide ▲' : 'View Subjects & Faculty ▼'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 print:hidden">
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

              <div className={`overflow-x-auto mt-2.5 print:mt-0.5 transition-all ${
                isCollapsibleLegend && !isLegendOpen ? 'hidden print:block' : 'block'
              }`}>
                <table className={`w-full text-left text-xs border border-slate-300 print:border-black bg-white rounded-lg print:rounded-none shadow-2xs print:shadow-none branch-legend-table ${legendSizeClass}`}>
                  <thead>
                    <tr className="bg-slate-100 print:bg-white text-slate-900 print:text-black font-black border-b border-slate-300 print:border-black text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-2.5 print:py-1.5 print:px-2 w-12 print:w-8 border-r border-slate-300 print:border-black text-center">S.No</th>
                      <th className="py-2 px-2.5 print:py-1.5 print:px-2 w-28 print:w-24 border-r border-slate-300 print:border-black text-center">Subject Short Name</th>
                      <th className="py-2 px-2.5 print:py-1.5 print:px-2 min-w-[180px] print:w-64 border-r border-slate-300 print:border-black">Subject Name</th>
                      <th className="py-2 px-2.5 print:py-1.5 print:px-2 w-28 print:w-26 border-r border-slate-300 print:border-black text-center">Faculty Short Name</th>
                      <th className="py-2 px-2.5 print:py-1.5 print:px-2 min-w-[220px] print:w-64 border-r border-slate-300 print:border-black">Faculty Name</th>
                      <th className="py-2 px-2.5 print:py-1.5 print:px-2 w-20 print:w-16 border-r border-slate-300 print:border-black text-center">Room No</th>
                      <th className="py-2 px-2.5 print:py-1.5 print:px-2 w-20 print:w-16 text-center">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-black text-[11px]">
                    {branchLegend.map((item, idx) => {
                      const style = getSubjectStyle(item.subjectShort, item.isLab);
                      const facultyList = item.facultyFullName ? item.facultyFullName.split('\n').map(s => s.trim()).filter(Boolean) : [];
                      const shortList = item.facultyShort ? item.facultyShort.split('\n').map(s => s.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim()).filter(Boolean) : [];
                      
                      const displayShorts = shortList.length > 0 
                        ? shortList.join(', ') 
                        : facultyList.map(f => getFacultyShortNames(f)).filter(Boolean).join(', ');
                      
                      const displayFulls = facultyList.length > 0
                        ? facultyList.join(', ')
                        : (item.facultyFullName || '—');

                      const tutFacultyList = item.tutorialFullName ? item.tutorialFullName.split('\n').map(s => s.trim()).filter(Boolean) : [];
                      const tutShortList = item.tutorialShort ? item.tutorialShort.split('\n').map(s => s.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim()).filter(Boolean) : [];
                      const tutDisplayShorts = tutShortList.length > 0
                        ? tutShortList.join(', ')
                        : tutFacultyList.map(f => getFacultyShortNames(f)).filter(Boolean).join(', ');
                      const tutDisplayFulls = tutFacultyList.length > 0 ? tutFacultyList.join(', ') : '';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 print:hover:bg-white transition-colors">
                          <td className="py-1.5 px-2.5 print:py-1.5 print:px-2 font-mono text-center text-slate-700 print:text-black border-r border-slate-200 print:border-black font-bold">
                            {item.sno || idx + 1}
                          </td>
                          <td className="py-1.5 px-2.5 print:py-1.5 print:px-2 border-r border-slate-200 print:border-black font-bold text-center">
                            <span className={`inline-block px-2 py-0.5 rounded font-mono font-black text-[11px] print:p-0 print:border-0 print:bg-white print:text-black border ${style.bg} ${style.border} ${style.text}`}>
                              {item.subjectShort}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 print:py-1.5 print:px-2 font-bold text-slate-900 print:text-black border-r border-slate-200 print:border-black">
                            {item.subjectFullName}
                          </td>
                          <td className="py-1.5 px-2.5 print:py-1.5 print:px-2 border-r border-slate-200 print:border-black text-center">
                            <span className="font-mono font-bold text-slate-900 print:text-black text-[11px]">
                              {displayShorts || '—'}
                            </span>
                            {tutDisplayShorts && (
                              <div className="tut-text text-[10px] text-slate-600 print:text-black font-semibold mt-0.5">
                                <span className="font-bold">Tut:</span> {tutDisplayShorts}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 print:py-1.5 print:px-2 border-r border-slate-200 print:border-black">
                            <span className="font-semibold text-slate-900 print:text-black">
                              {displayFulls}
                            </span>
                            {tutDisplayFulls && (
                              <div className="tut-text text-[10px] text-slate-600 print:text-black mt-0.5">
                                <span className="font-bold">Tut:</span> {tutDisplayFulls}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 print:py-1.5 print:px-2 border-r border-slate-200 print:border-black font-mono font-bold text-slate-800 print:text-black text-center">
                            {item.room || '—'}
                          </td>
                          <td className="py-1.5 px-2.5 print:py-1.5 print:px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] print:p-0 print:border-0 print:bg-white print:text-black font-bold ${
                              item.isLab 
                                ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}>
                              {item.isLab ? 'Lab' : 'Theory'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
