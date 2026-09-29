import React, { useState, useMemo } from 'react';
import { days, periodSlots } from '../data/mockData';
import { FlaskConical, Clock, Layers, Users } from 'lucide-react';

export default function LabView({ timetableData, labSheetsData = {}, universityInfo, onSlotClick }) {
  // Available dedicated lab room sheets from Excel
  const dedicatedRooms = useMemo(() => {
    const keys = Object.keys(labSheetsData || {});
    if (keys.length > 0) return keys;
    return [
      'COMP. LAB-1', 'COMP. LAB-2', 'COMP. LAB-3', 'COMP. LAB-4',
      'CHEM. LAB.', 'PHY LAB', 'A-406', 'A-301,302', 'A-303,304', 'C-208',
      'E-319', 'G-302', 'G-303', 'G-304', 'G-305', 'G-405',
      'GVPCE CHEM. LAB.', 'GVPCE MECH. LAB', 'GVPCE SUR. LAB'
    ];
  }, [labSheetsData]);

  const [selectedLab, setSelectedLab] = useState(dedicatedRooms[0] || 'COMP. LAB-1');

  // Time slot columns used in the dedicated lab sheets
  const labTimeSlots = [
    { id: 's1', time: '09:00-11:00' },
    { id: 'b1', time: '11:00-11:15', isBreak: true, label: 'BREAK' },
    { id: 's2', time: '11:15-01:15' },
    { id: 'b2', time: '01:15-02:15', isBreak: true, label: 'LUNCH' },
    { id: 's3', time: '02:15-04:15' }
  ];

  const currentLabData = labSheetsData[selectedLab] || { schedule: {}, labDetails: [] };
  const currentSchedule = currentLabData.schedule || {};
  const labDetailsList = currentLabData.labDetails || [];

  // Compute total occupied sessions
  let occupiedSessions = 0;
  const branchesHosted = new Set();

  days.forEach(day => {
    const dSched = currentSchedule[day] || {};
    ['09:00-11:00', '11:15-01:15', '02:15-04:15'].forEach(slot => {
      const item = dSched[slot];
      if (item && item.raw) {
        occupiedSessions += 1;
        if (item.branch) branchesHosted.add(item.branch);
      }
    });
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Lab Selector Bar */}
      <div className="no-print flex justify-center mb-6">
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm">
          <label htmlFor="lab-select" className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-purple-600" /> Select Laboratory Room Sheet:
          </label>
          <select
            id="lab-select"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm font-bold rounded-md focus:ring-purple-500 focus:border-purple-500 block px-3 py-1.5 cursor-pointer uppercase font-mono"
          >
            {dedicatedRooms.map((lab) => (
              <option key={lab} value={lab}>
                {lab}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lab Utilization Stats Header */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Occupied Lab Sessions</div>
            <div className="text-lg font-bold text-gray-900">{occupiedSessions} Sessions (2 hrs each)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Allocated Branches</div>
            <div className="text-lg font-bold text-gray-900">{branchesHosted.size} Branches Hosted</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Room Status</div>
            <div className="text-lg font-bold text-emerald-700">Dedicated Lab Sheet Active</div>
          </div>
        </div>
      </div>

      {/* Lab Timetable Table matching Dedicated Excel Sheets */}
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden timetable-card">
        <div className="print-only text-center py-3 px-6 border-b border-gray-300 bg-gray-50/70">
          <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
            {universityInfo.name}
          </h2>
          <h3 className="text-xs font-bold text-purple-900 mt-1 uppercase font-mono">
            LABORATORY ALLOCATION TIMETABLE: <span className="underline decoration-purple-500 font-extrabold">{selectedLab}</span>
          </h3>
          <p className="text-xs text-gray-600 mt-0.5 font-mono">
            Academic Year {universityInfo.academicYear} | Room Sheet: {selectedLab}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse table-fixed min-w-[750px] border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 border-r border-gray-300 w-24">Day</th>
                {labTimeSlots.map((slot) => (
                  <th 
                    key={slot.id} 
                    className={`py-3 px-3 border-r border-gray-300 ${
                      slot.isBreak ? 'bg-amber-50/90 text-amber-900 font-extrabold w-20' : ''
                    }`}
                  >
                    {slot.time}
                    {slot.label && <div className="text-[10px] tracking-normal text-amber-800 font-bold">{slot.label}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {days.map((day) => {
                const daySched = currentSchedule[day] || {};

                return (
                  <tr key={day} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-3 font-extrabold text-gray-900 bg-gray-100/60 border-r border-gray-300 uppercase tracking-wide align-middle">
                      {day}
                    </td>

                    {labTimeSlots.map((slot) => {
                      if (slot.isBreak) {
                        return (
                          <td key={slot.id} className="py-4 px-2 bg-amber-50/60 text-amber-900 font-extrabold text-[10px] border-r border-gray-300 tracking-wider uppercase align-middle">
                            {slot.label}
                          </td>
                        );
                      }

                      const item = daySched[slot.time];

                      return (
                        <td 
                          key={slot.id} 
                          onClick={() => item && onSlotClick && onSlotClick([{
                            subject: item.subject,
                            branch: item.branch,
                            room: selectedLab
                          }], day, slot.time, selectedLab)}
                          className={`py-3 px-3 border-r border-gray-300 align-middle ${
                            item && item.raw ? 'bg-purple-50/90 font-semibold cursor-pointer hover:bg-purple-100 transition-colors' : ''
                          }`}
                          title={item ? "Click to view details" : ""}
                        >
                          {item && item.raw ? (
                            <div className="flex flex-col justify-center items-center gap-1.5 min-h-[50px]">
                              <div className="font-extrabold text-purple-950 text-xs">
                                {item.subject}
                              </div>
                              <div className="inline-flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  {item.branch}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center min-h-[50px]">
                              <span className="text-gray-300 font-mono text-[11px]">—</span>
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

        {/* LAB DETAILS Legend matching the Excel sheet */}
        {labDetailsList.length > 0 && (
          <div className="p-4 bg-gray-50/60 border-t border-gray-300">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-purple-600" /> Lab Details ({selectedLab})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-300 bg-white rounded">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 text-[10.5px]">
                    <th className="py-1.5 px-3 w-12 border-r border-gray-200 text-center">S.No</th>
                    <th className="py-1.5 px-3 w-32 border-r border-gray-200">Lab Short Name</th>
                    <th className="py-1.5 px-3">Full Lab Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-[11px]">
                  {labDetailsList.map((detail, dIdx) => (
                    <tr key={dIdx} className="hover:bg-gray-50">
                      <td className="py-1.5 px-3 font-mono text-center text-gray-500 border-r border-gray-200">
                        {detail.sno || dIdx + 1}
                      </td>
                      <td className="py-1.5 px-3 font-mono font-bold text-purple-900 border-r border-gray-200">
                        {detail.shortName}
                      </td>
                      <td className="py-1.5 px-3 text-gray-800 font-medium">
                        {detail.fullName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
