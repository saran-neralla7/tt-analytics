import * as XLSX from 'xlsx';

const timeSlotOrder = [
  '09:00-10:00', '10:00-11:00', '11:00-11:15',
  '11:15-12:15', '12:15-01:15', '01:15-02:15',
  '02:15-03:15', '03:15-04:15'
];

/**
 * Advanced Excel parser specifically optimized for Gayatri Vidya Parishad Timetable Workbooks
 * Handles 50+ sheets, dynamic header locations, faculty mappings, multiline cells, parallel lab batches, and 2-hour lab slot expansion.
 * 
 * @param {File} file 
 * @returns {Promise<{
 *   timetableData: Object, 
 *   labData: Object,
 *   facultyMap: Object, 
 *   summaryStats: { branchCount: number, facultyCount: number, labCount: number, fileName: string }
 * }>}
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const timetableData = {};
        const labData = {};
        const facultyMap = {}; // shortName -> { fullName, dept, designation, totalLoad }

        // 1. Extract Master Faculty List if Faculty_Workload_Summary exists
        const facultyList = [];
        if (workbook.Sheets['Faculty_Workload_Summary']) {
          const fwSheet = workbook.Sheets['Faculty_Workload_Summary'];
          const fwRows = XLSX.utils.sheet_to_json(fwSheet, { header: 1, defval: '' });
          for (let r = 1; r < fwRows.length; r++) {
            const row = fwRows[r];
            const sno = row[0] ? String(row[0]).trim() : '';
            const fullName = row[1] ? String(row[1]).trim() : '';
            const shortName = row[2] ? String(row[2]).trim() : '';
            const dept = row[3] ? String(row[3]).trim() : '';
            const designation = row[4] ? String(row[4]).trim() : '';
            const theoryLoad = row[5] ? Number(row[5]) || 0 : 0;
            const labLoad = row[6] ? Number(row[6]) || 0 : 0;
            const totalLoad = row[8] ? Number(row[8]) || 0 : 0;
            const assignments = row[10] ? String(row[10]).trim() : '';

            if (shortName && fullName) {
              const clean = shortName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
              const facObj = { fullName, dept, designation, theoryLoad, labLoad, totalLoad, assignments };
              facultyMap[shortName] = facObj;
              facultyMap[clean] = facObj;
              facultyMap[`Dr. ${clean}`] = facObj;
              facultyMap[`Dr.${clean}`] = facObj;
              facultyMap[`Mr. ${clean}`] = facObj;
              facultyMap[`Mrs. ${clean}`] = facObj;
              facultyMap[`Ms. ${clean}`] = facObj;
              facultyList.push({
                sno,
                fullName,
                shortName,
                dept,
                designation,
                theoryLoad,
                labLoad,
                totalLoad,
                assignments
              });
            }
          }
        } else if (workbook.Sheets['Sheet3']) {
          const s3Sheet = workbook.Sheets['Sheet3'];
          const s3Rows = XLSX.utils.sheet_to_json(s3Sheet, { header: 1, defval: '' });
          for (let r = 1; r < s3Rows.length; r++) {
            const row = s3Rows[r];
            const sno = row[0] ? String(row[0]).trim() : '';
            const fullName = row[1] ? String(row[1]).trim() : '';
            const shortName = row[2] ? String(row[2]).trim() : '';
            const dept = row[3] ? String(row[3]).trim() : '';
            const designation = row[4] ? String(row[4]).trim() : '';

            if (shortName && fullName && !facultyMap[shortName]) {
              const clean = shortName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
              const facObj = { fullName, dept, designation, theoryLoad: 0, labLoad: 0, totalLoad: 0, assignments: '' };
              facultyMap[shortName] = facObj;
              facultyMap[clean] = facObj;
              facultyMap[`Dr. ${clean}`] = facObj;
              facultyMap[`Dr.${clean}`] = facObj;
              facultyMap[`Mr. ${clean}`] = facObj;
              facultyMap[`Mrs. ${clean}`] = facObj;
              facultyMap[`Ms. ${clean}`] = facObj;
              facultyList.push({
                sno,
                fullName,
                shortName,
                dept,
                designation,
                theoryLoad: 0,
                labLoad: 0,
                totalLoad: 0,
                assignments: ''
              });
            }
          }
        }

        // List of recognized academic branches
        const knownBranches = [
          'CHEMICAL', 'CIVIL', 'EEE', 'MECH', 'MECH-ROBOTICS',
          'ECE-1', 'ECE-2', 'ECE-3', 'CSE-1', 'CSE-2',
          'CSE(AI&ML)-1', 'CSE(AI&ML)-2', 'CSE (CS & DS)'
        ];

        // 2. Iterate through all sheets in workbook
        workbook.SheetNames.forEach((sheetName) => {
          const cleanSheetName = sheetName.trim();
          const upperSheetName = cleanSheetName.toUpperCase();

          // Skip non-data summary or meta sheets
          if (
            upperSheetName.includes('HOME') ||
            upperSheetName.includes('SUMMARY') ||
            upperSheetName.includes('SHEET1') ||
            upperSheetName.includes('SHEET2') ||
            upperSheetName.includes('SHEET3') ||
            upperSheetName.includes('COPY OF') ||
            upperSheetName.includes('TIMETABLE_FINAL')
          ) {
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length < 2) return;

          // Find row containing 'Day'
          let headerRowIdx = -1;
          for (let r = 0; r < Math.min(15, rawRows.length); r++) {
            if (rawRows[r] && rawRows[r][0] && String(rawRows[r][0]).trim().toUpperCase() === 'DAY') {
              headerRowIdx = r;
              break;
            }
          }

          if (headerRowIdx === -1) return;

          const headerRow = rawRows[headerRowIdx].map(c => String(c).trim());
          const isTabularMaster = (headerRow[0].toUpperCase() === 'DAY' && headerRow[1].toUpperCase() === 'BRANCH');

          if (isTabularMaster) {
            // Master Timetable Sheet
            let currentDay = '';
            let currentBranch = '';

            for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
              const row = rawRows[r];
              if (!row || row.length === 0) continue;

              let day = row[0] ? String(row[0]).trim().toUpperCase() : '';
              if (day && ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].some(d => day.startsWith(d))) {
                currentDay = day.substring(0, 3);
              } else if (!day) {
                day = currentDay;
              }

              let branch = row[1] ? String(row[1]).trim().toUpperCase() : '';
              if (branch) {
                currentBranch = branch;
              } else {
                branch = currentBranch;
              }

              if (!day || !branch || day === 'SUBJECT NAME' || day === 'LAB DETAILS') break;

              if (!timetableData[branch]) timetableData[branch] = {};
              if (!timetableData[branch][day]) timetableData[branch][day] = {};

              for (let c = 2; c < headerRow.length; c++) {
                const timeSlot = normalizeTimeSlot(headerRow[c]);
                const cellVal = row[c] ? String(row[c]).trim() : '';

                if (timeSlot && cellVal && cellVal.toUpperCase() !== 'BREAK' && cellVal.toUpperCase() !== 'LUNCH') {
                  const parsed = parseCellContent(cellVal, facultyMap);
                  const parsedList = Array.isArray(parsed) ? parsed : [parsed];
                  if (!timetableData[branch][day][timeSlot]) {
                    timetableData[branch][day][timeSlot] = [];
                  }
                  parsedList.forEach(p => timetableData[branch][day][timeSlot].push(p));
                }
              }
            }
          } else {
            // Individual Branch sheet or Lab sheet
            const isAcademicBranch = knownBranches.some(b => b === upperSheetName) || 
                                     upperSheetName.startsWith('CSE') || 
                                     upperSheetName.startsWith('ECE') || 
                                     upperSheetName.startsWith('MECH') || 
                                     upperSheetName.startsWith('CIVIL') || 
                                     upperSheetName.startsWith('EEE') || 
                                     upperSheetName.startsWith('CHEMICAL');

            const targetStore = isAcademicBranch ? timetableData : labData;
            const storeKey = cleanSheetName;

            if (!targetStore[storeKey]) targetStore[storeKey] = {};

            let currentDay = '';
            for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
              const row = rawRows[r];
              if (!row || row.length === 0) continue;

              let day = row[0] ? String(row[0]).trim().toUpperCase() : '';
              if (day && ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].some(d => day.startsWith(d))) {
                currentDay = day.substring(0, 3);
              } else if (!day) {
                day = currentDay;
              }

              if (!day || day === 'SUBJECT NAME' || day === 'LAB DETAILS') break;
              if (!targetStore[storeKey][day]) targetStore[storeKey][day] = {};

              for (let c = 1; c < headerRow.length; c++) {
                const timeSlot = normalizeTimeSlot(headerRow[c]);
                const cellVal = row[c] ? String(row[c]).trim() : '';

                if (timeSlot && cellVal && cellVal.toUpperCase() !== 'BREAK' && cellVal.toUpperCase() !== 'LUNCH') {
                  const parsed = parseCellContent(cellVal, facultyMap);
                  const parsedList = Array.isArray(parsed) ? parsed : [parsed];
                  if (!targetStore[storeKey][day][timeSlot]) {
                    targetStore[storeKey][day][timeSlot] = [];
                  }
                  parsedList.forEach(p => targetStore[storeKey][day][timeSlot].push(p));
                }
              }
            }
          }
        });

        // 3. Perform 2-Hour Lab Slot Expansion across all branches
        expandTwoHourLabSlots(timetableData);
        expandTwoHourLabSlots(labData);

        const branchCount = Object.keys(timetableData).length;
        const facultyCount = Object.keys(facultyMap).length;
        const labCount = Object.keys(labData).length;

        resolve({
          timetableData,
          labData,
          facultyMap,
          facultyList,
          summaryStats: {
            branchCount,
            facultyCount,
            labCount,
            fileName: file.name
          }
        });

      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Expands 2-hour lab sessions into the adjacent empty time slot
 */
function expandTwoHourLabSlots(store) {
  Object.keys(store).forEach(key => {
    Object.keys(store[key]).forEach(day => {
      timeSlotOrder.forEach((slot, idx) => {
        const entries = store[key][day][slot];
        if (entries && entries.length > 0) {
          const hasLab = entries.some(e => e.isLab);
          if (hasLab && idx + 1 < timeSlotOrder.length) {
            const nextSlot = timeSlotOrder[idx + 1];
            if (nextSlot !== '11:00-11:15' && nextSlot !== '01:15-02:15') {
              if (!store[key][day][nextSlot] || store[key][day][nextSlot].length === 0) {
                store[key][day][nextSlot] = entries.map(e => ({ ...e, isContinued: true }));
              }
            }
          }
        }
      });
    });
  });
}

/**
 * Standardize time slot strings
 */
function normalizeTimeSlot(slotStr) {
  if (!slotStr) return '';
  const clean = slotStr.trim();
  // 2-hour lab slots
  if (clean.includes('09:00-11:00') || (clean.includes('09:00') && clean.includes('11:00'))) return '09:00-11:00';
  if (clean.includes('11:15-01:15') || (clean.includes('11:15') && clean.includes('01:15'))) return '11:15-01:15';
  if (clean.includes('02:15-04:15') || (clean.includes('02:15') && clean.includes('04:15'))) return '02:15-04:15';

  // Standard 1-hour slots
  if (clean.includes('09:00')) return '09:00-10:00';
  if (clean.includes('10:00')) return '10:00-11:00';
  if (clean.includes('11:00-11:15')) return '11:00-11:15';
  if (clean.includes('11:15')) return '11:15-12:15';
  if (clean.includes('12:15')) return '12:15-01:15';
  if (clean.includes('01:15-02:15')) return '01:15-02:15';
  if (clean.includes('02:15')) return '02:15-03:15';
  if (clean.includes('03:15')) return '03:15-04:15';
  return clean;
}

/**
 * Parses multiline cell content into Subject, Faculty, Room
 */
function parseCellContent(val, facultyMap = {}) {
  if (!val) return { subject: '', faculty: '', room: '' };

  const upper = val.toUpperCase();
  const isLab = upper.includes('LAB') || upper.includes('PRACTICAL') || upper.includes('3DDA');
  let lines = val.split('\n').map(l => l.trim()).filter(Boolean);

  // Multi-subject parallel session (e.g. FDS / PCS \n KR / CHVVD \n G-405, G-406)
  if (lines.length >= 2 && lines[0].includes('/') && !lines[0].includes('(')) {
    const subParts = lines[0].split('/').map(s => s.trim()).filter(Boolean);
    const facTokens = lines[1].includes('/') ? lines[1].split('/') : lines[1].split(',');
    const facParts = facTokens.map(s => s.trim()).filter(Boolean);
    const roomTokens = (lines[2] || '').includes(',') ? lines[2].split(',') : (lines[2] || '').split('/');
    const roomParts = roomTokens.map(s => s.trim()).filter(Boolean);

    if (subParts.length >= 2 && facParts.length >= 2) {
      return subParts.map((sub, i) => {
        const isItemLab = sub.toUpperCase().includes('LAB') || sub.toUpperCase().includes('PRACTICAL') || sub.toUpperCase().includes('3DDA');
        const facRaw = facParts[i] || '';
        const facResolved = resolveFacultyNames(facRaw, facultyMap);
        const room = roomParts[i] || roomParts[0] || '';
        return {
          subject: sub,
          faculty: facResolved || facRaw,
          rawFaculty: facRaw,
          room: room,
          isLab: isItemLab
        };
      });
    }
  }

  if (lines.length === 1 && val.includes('/') && !val.includes('(')) {
    const slashParts = val.split('/').map(l => l.trim()).filter(Boolean);
    if (slashParts.length >= 2) {
      lines = slashParts;
    }
  }

  if (lines.length >= 3) {
    const subject = lines[0];
    const facultyInitials = lines[1];
    const room = lines[2];
    
    const fullFaculty = resolveFacultyNames(facultyInitials, facultyMap);
    return { subject, faculty: fullFaculty || facultyInitials, room, isLab };
  } else if (lines.length === 2) {
    const subject = lines[0];
    const secondLine = lines[1];

    const lastCommaIdx = secondLine.lastIndexOf(',');
    if (lastCommaIdx !== -1) {
      const candidateRoom = secondLine.slice(lastCommaIdx + 1).trim();
      if (
        candidateRoom.startsWith('G-') || 
        candidateRoom.startsWith('E-') || 
        candidateRoom.startsWith('C-') || 
        candidateRoom.startsWith('A-') || 
        candidateRoom.includes('LAB') ||
        candidateRoom.includes('GVPCE')
      ) {
        const candidateFaculty = secondLine.slice(0, lastCommaIdx).trim();
        const fullFaculty = resolveFacultyNames(candidateFaculty, facultyMap);
        return { subject, faculty: fullFaculty || candidateFaculty, room: candidateRoom, isLab };
      }
    }

    if (secondLine.startsWith('G-') || secondLine.startsWith('E-') || secondLine.startsWith('C-') || secondLine.includes('LAB')) {
      return { subject, faculty: '', room: secondLine, isLab };
    } else {
      const fullFaculty = resolveFacultyNames(secondLine, facultyMap);
      return { subject, faculty: fullFaculty || secondLine, room: '', isLab };
    }
  }

  return { subject: val, faculty: '', room: '', isLab };
}

const facultyAliases = {
  'DDAK': 'Mr. D Arun Kumar',
  'VVBR': 'Mr. V Bhaskar Rao',
  'VVLUR': 'Dr. VVL Usha Ramani',
  'Dr. Dr.': 'Dr. VVL Usha Ramani',
  'FAC-2': 'Faculty-2',
  'Faculty-2': 'Faculty-2',
  'CSP': 'Mr. A Dhanunjaya Prasad',
  'CHVVD': 'Mr. CH VVD Prasad'
};

/**
 * Resolves faculty initials to full names
 */
function resolveFacultyNames(initialsStr, facultyMap) {
  if (!initialsStr || !facultyMap || Object.keys(facultyMap).length === 0) return initialsStr;

  let cleanStr = initialsStr.replace(/Dr\.\s*Dr\.\s*/gi, 'Dr. ');
  const tokens = cleanStr.split(/[\s,]+/).filter(Boolean);
  const resolved = [];

  let i = 0;
  while (i < tokens.length) {
    let token = tokens[i];

    if (token === 'CSP') {
      resolved.push('Mr. A Dhanunjaya Prasad');
      i++;
      continue;
    }
    
    if ((token === 'Dr.' || token === 'Mr.' || token === 'Mrs.' || token === 'Ms.') && i + 1 < tokens.length) {
      token = `${token} ${tokens[i + 1]}`;
      i++;
    }

    if (facultyAliases[token]) {
      resolved.push(facultyAliases[token]);
    } else if (facultyMap[token]) {
      const info = facultyMap[token];
      resolved.push(typeof info === 'object' ? info.fullName : info);
    } else {
      const cleanT = token.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      if (facultyMap[cleanT]) {
        const info = facultyMap[cleanT];
        resolved.push(typeof info === 'object' ? info.fullName : info);
      } else {
        resolved.push(token);
      }
    }
    i++;
  }

  const uniqueNames = Array.from(new Set(resolved));
  return uniqueNames.join(', ') || initialsStr;
}
