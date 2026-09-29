/**
 * Regenerates initialData.json from the Excel file, correctly handling:
 * - Excel merges (horizontal for 2-hour labs, vertical for parallel batches)
 * - Subject legend table detection
 * - Faculty workload sheet parsing
 */
const XLSX = require('./node_modules/xlsx');
const fs = require('fs');

const excelPath = './timetables/1st Sem TIME TABLE 2026-2027_1.1.xlsx';
const outputPath = './src/data/initialData.json';

const wb = XLSX.readFile(excelPath);

const knownBranches = [
  'CHEMICAL', 'CIVIL', 'EEE', 'MECH', 'MECH-ROBOTICS',
  'ECE-1', 'ECE-2', 'ECE-3', 'CSE-1', 'CSE-2',
  'CSE(AI&ML)-1', 'CSE(AI&ML)-2', 'CSE (CS & DS)'
];

const timeSlots = ['09:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-01:15', '02:15-03:15', '03:15-04:15'];
const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// 1. Parse Faculty_Workload_Summary
const facultyMap = {};
const facultyList = [];
let fwSheet = wb.Sheets['Faculty_Workload_Summary'];
if (!fwSheet && fs.existsSync('./1st Sem TIME TABLE 2026-2027_1.1.xlsx')) {
  console.log('Faculty_Workload_Summary missing in current file; loading from root Excel');
  const backupWb = XLSX.readFile('./1st Sem TIME TABLE 2026-2027_1.1.xlsx');
  fwSheet = backupWb.Sheets['Faculty_Workload_Summary'];
}

if (fwSheet) {
  const fwRows = XLSX.utils.sheet_to_json(fwSheet, { header: 1, defval: '' });
  for (let r = 1; r < fwRows.length; r++) {
    const row = fwRows[r];
    const sno = row[0] ? String(row[0]).trim() : '';
    const fullName = row[1] ? String(row[1]).trim() : '';
    const shortName = row[2] ? String(row[2]).trim() : '';
    const dept = row[3] ? String(row[3]).trim() : '';
    const designation = row[4] ? String(row[4]).trim() : '';
    let theoryLoad = row[5] ? Number(row[5]) || 0 : 0;
    const labLoad = row[6] ? Number(row[6]) || 0 : 0;
    let totalLoad = row[8] ? Number(row[8]) || 0 : 0;
    const assignments = row[10] ? String(row[10]).trim() : '';

    // In ECE-3, Thursday 09:00 DLD period was added for Dr. M Neelima (Dr. MN)
    if (shortName === 'Dr. MN') {
      theoryLoad += 1;
      totalLoad += 1;
    }

    if (shortName && fullName) {
      const clean = shortName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      const facObj = { fullName, dept, designation, totalLoad, assignments };
      facultyMap[shortName] = facObj;
      facultyMap[clean] = facObj;
      facultyMap[`Dr. ${clean}`] = facObj;
      facultyMap[`Dr.${clean}`] = facObj;
      facultyMap[`Mr. ${clean}`] = facObj;
      facultyMap[`Mrs. ${clean}`] = facObj;
      facultyMap[`Ms. ${clean}`] = facObj;

      facultyList.push({
        sno: sno,
        fullName,
        shortName,
        dept,
        designation,
        theoryLoad,
        labLoad,
        totalLoad,
        assignments: assignments
      });
    }
  }
}

console.log(`Faculty loaded: ${facultyList.length}`);

// Known typos / shortcode aliases found in branch timetables
const facultyAliases = {
  'DDAK': 'Mr. D Arun Kumar',
  'VVBR': 'Mr. V Bhaskar Rao',
  'VVLUR': 'Dr. VVL Usha Ramani',
  'Dr. Dr.': 'Dr. VVL Usha Ramani',
  'FAC-2': 'Faculty-2',
  'Faculty-2': 'Faculty-2',
  'CSP': 'Mr. A Dhanunjaya Prasad'
};

// Helper: resolve faculty initials to full names
function resolveFacultyNames(initialsStr) {
  if (!initialsStr) return initialsStr;
  
  // Clean up "Dr. Dr. VVLUR" -> "Dr. VVLUR"
  let cleanStr = initialsStr.replace(/Dr\.\s*Dr\.\s*/gi, 'Dr. ');

  const tokens = cleanStr.split(/[\s,]+/).filter(Boolean);
  const resolved = [];
  let i = 0;
  while (i < tokens.length) {
    let token = tokens[i];

    // Ignore subject code or room tokens mistakenly placed in faculty row
    if (token === 'CSP' || token === 'COMP.' || token.startsWith('LAB-') || token === 'PHY' || token === 'CHEM.' || token === 'A-406' || token === 'C-208' || token === 'E-319' || token.startsWith('GVPCE')) {
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
      resolved.push(facultyMap[token].fullName);
    } else {
      const cleanT = token.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      if (facultyMap[cleanT]) {
        resolved.push(facultyMap[cleanT].fullName);
      } else {
        resolved.push(token);
      }
    }
    i++;
  }

  // Deduplicate names within the same period cell
  const uniqueNames = Array.from(new Set(resolved));
  return uniqueNames.join(', ') || initialsStr;
}

// Helper: extract room from the end of a string if present (e.g. "Dr. KVNL, SA, Dr. KVP, GVPCE CHEM. LAB." or "DAK KS, G-303")
function extractRoomFromEnd(str) {
  if (!str) return { facultyStr: '', roomStr: '' };
  
  const roomPattern = /,\s*(((?:COMP\.\s*LAB-[0-9]|CHEM\.\s*LAB\.?|PHY\s*LAB|A-[0-9]+(?:,\s*[0-9]+)?|G-[0-9]+|E-[0-9]+|C-[0-9]+|GVPCE[^\n,]*)[,\s]*)+)$/i;
  const match = str.match(roomPattern);
  if (match) {
    return { facultyStr: str.slice(0, match.index).trim(), roomStr: match[1].trim() };
  }

  const lastCommaIdx = str.lastIndexOf(',');
  if (lastCommaIdx !== -1) {
    const candidateRoom = str.slice(lastCommaIdx + 1).trim();
    if (
      candidateRoom.startsWith('G-') || 
      candidateRoom.startsWith('E-') || 
      candidateRoom.startsWith('C-') || 
      candidateRoom.startsWith('A-') || 
      candidateRoom.includes('LAB') ||
      candidateRoom.includes('GVPCE')
    ) {
      const candidateFaculty = str.slice(0, lastCommaIdx).trim();
      return { facultyStr: candidateFaculty, roomStr: candidateRoom };
    }
  }
  return { facultyStr: str, roomStr: '' };
}

// Helper: parse cell content (multiline: subject\nfaculty\nroom or slash-separated: subject/faculty/room)
function parseCellContent(val) {
  if (!val) return null;
  val = val.trim();
  const upper = val.toUpperCase();
  if (!val || upper === 'BREAK' || upper === 'LUNCH') return null;

  // Extracurricular and non-instructional slots
  if (upper === 'YOGA' || upper === 'SPORTS' || upper.includes('YOGA /') || upper.includes('YOGA/') || upper.includes('YOGA\n') || upper.includes('LIBRARY') || upper.includes('COUNSELLING')) {
    return { subject: val.replace(/\n/g, ' / '), faculty: '', room: '', isLab: false };
  }
  
  const isLab = upper.includes('LAB') || upper.includes('PRACTICAL') || upper.includes('3DDA');
  let lines = val.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length === 1 && val.includes('/') && !val.includes('(')) {
    const slashParts = val.split('/').map(l => l.trim()).filter(Boolean);
    if (slashParts.length >= 2) {
      lines = slashParts;
    }
  }

  if (lines.length >= 3) {
    return { subject: lines[0], faculty: resolveFacultyNames(lines[1]), room: lines[2], isLab };
  } else if (lines.length === 2) {
    const second = lines[1];
    const { facultyStr, roomStr } = extractRoomFromEnd(second);
    if (roomStr) {
      return {
        subject: lines[0],
        faculty: resolveFacultyNames(facultyStr),
        room: roomStr,
        isLab
      };
    } else if (second.startsWith('G-') || second.startsWith('E-') || second.startsWith('C-') || second.startsWith('A-') || second.includes('LAB')) {
      return { subject: lines[0], faculty: '', room: second, isLab };
    } else {
      return { subject: lines[0], faculty: resolveFacultyNames(second), room: '', isLab };
    }
  }
  return { subject: val, faculty: '', room: '', isLab };
}

// 2. Parse each branch sheet
const timetableData = {};

for (const branch of knownBranches) {
  if (!wb.SheetNames.includes(branch)) {
    console.log(`SKIP: ${branch} not in workbook`);
    continue;
  }
  
  const ws = wb.Sheets[branch];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  const merges = ws['!merges'] || [];
  
  // Find header row
  let headerRow = -1;
  for (let r = 0; r < 15; r++) {
    const row = rawData[r];
    if (row && row.some(cell => typeof cell === 'string' && cell.trim().toUpperCase() === 'DAY')) {
      headerRow = r;
      break;
    }
  }
  if (headerRow === -1) { console.log(`SKIP: ${branch} - no header`); continue; }

  const header = rawData[headerRow];
  const slotCols = {};
  for (let c = 0; c < header.length; c++) {
    const h = (header[c] || '').toString().trim();
    if (timeSlots.includes(h)) {
      slotCols[h] = c;
    }
  }

  // Find where timetable data ends
  let dataEndRow = rawData.length;
  for (let r = headerRow + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, 10); c++) {
      const val = (row[c] || '').toString().trim();
      if (val === 'Subject Name' || val === 'S.NO' || val === 'S. NO' ||
          val === 'Timetable Incharge' || val === 'Short Form') {
        dataEndRow = r;
        break;
      }
    }
    if (dataEndRow !== rawData.length) break;
  }

  // Build merge map
  const mergeContinuations = new Set();
  const mergeMap = {}; // "r,c" → merge object (for origins)
  
  for (const m of merges) {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r !== m.s.r || c !== m.s.c) {
          mergeContinuations.add(`${r},${c}`);
        }
      }
    }
    mergeMap[`${m.s.r},${m.s.c}`] = m;
  }

  // Extract timetable
  timetableData[branch] = {};
  let currentDay = '';
  
  for (let r = headerRow + 1; r < dataEndRow; r++) {
    const row = rawData[r];
    if (!row || row.every(c => !c || c.toString().trim() === '')) continue;

    const dayCell = (row[0] || '').toString().trim().toUpperCase();
    if (dayNames.includes(dayCell)) {
      currentDay = dayCell;
    }
    if (!currentDay) continue;
    if (!timetableData[branch][currentDay]) timetableData[branch][currentDay] = {};

    for (const [slot, col] of Object.entries(slotCols)) {
      const key = `${r},${col}`;
      
      // Skip merge continuations
      if (mergeContinuations.has(key)) continue;
      
      const cellValue = (row[col] || '').toString().trim();
      if (!cellValue || cellValue.toUpperCase() === 'BREAK' || cellValue.toUpperCase() === 'LUNCH') continue;

      const parsed = parseCellContent(cellValue);
      if (!parsed) continue;

      if (!timetableData[branch][currentDay][slot]) {
        timetableData[branch][currentDay][slot] = [];
      }
      timetableData[branch][currentDay][slot].push(parsed);

      // Handle horizontal merge (2-hour lab spanning cols)
      const merge = mergeMap[key];
      if (merge && merge.e.c > merge.s.c) {
        for (const [nextSlot, nextCol] of Object.entries(slotCols)) {
          if (nextCol > col && nextCol <= merge.e.c) {
            if (!timetableData[branch][currentDay][nextSlot]) {
              timetableData[branch][currentDay][nextSlot] = [];
            }
            timetableData[branch][currentDay][nextSlot].push({ ...parsed, isContinued: true });
          }
        }
      }
    }
  }
  
  console.log(`✅ ${branch}: parsed ${Object.keys(timetableData[branch]).length} days`);
}

// Cross-reference Master Sheet (Timetable_Master or Timetable_Final_2) to auto-fill any omitted periods in branch sheets
const masterSheetName = wb.Sheets['Timetable_Master'] ? 'Timetable_Master' : (wb.Sheets['Timetable_Final_2'] ? 'Timetable_Final_2' : (wb.Sheets['Timetable_Final'] ? 'Timetable_Final' : null));
if (masterSheetName) {
  const tfWs = wb.Sheets[masterSheetName];
  const tfRows = XLSX.utils.sheet_to_json(tfWs, { header: 1, defval: '' });
  
  let tfHeaderRow = -1;
  for (let r = 0; r < 10; r++) {
    if (tfRows[r] && tfRows[r].some(c => typeof c === 'string' && c.toUpperCase().includes('DAY'))) {
      tfHeaderRow = r;
      break;
    }
  }

  if (tfHeaderRow !== -1) {
    const tfHeader = tfRows[tfHeaderRow];
    const tfSlotCols = {};
    for (let c = 0; c < tfHeader.length; c++) {
      const h = String(tfHeader[c] || '').trim();
      timeSlots.forEach(ts => {
        if (h.includes(ts)) tfSlotCols[ts] = c;
      });
    }

    let tfCurrentDay = '';
    for (let r = tfHeaderRow + 1; r < tfRows.length; r++) {
      const row = tfRows[r];
      if (!row) continue;
      const dayCell = String(row[0] || '').trim().toUpperCase();
      if (dayNames.includes(dayCell)) {
        tfCurrentDay = dayCell;
      }
      const branchCell = String(row[1] || '').trim().toUpperCase();
      const matchedBranch = knownBranches.find(b => b.toUpperCase() === branchCell);
      if (!tfCurrentDay || !matchedBranch) continue;

      for (const [slot, col] of Object.entries(tfSlotCols)) {
        const tfVal = String(row[col] || '').trim();
        if (!tfVal || tfVal.toUpperCase() === 'BREAK' || tfVal.toUpperCase() === 'LUNCH') continue;

        if (!timetableData[matchedBranch]) timetableData[matchedBranch] = {};
        if (!timetableData[matchedBranch][tfCurrentDay]) timetableData[matchedBranch][tfCurrentDay] = {};

        // If the branch sheet had nothing for this slot, fill from master!
        if (!timetableData[matchedBranch][tfCurrentDay][slot] || timetableData[matchedBranch][tfCurrentDay][slot].length === 0) {
          const parsed = parseCellContent(tfVal);
          if (parsed) {
            console.log(`[Master Auto-fill] Filled gap in ${matchedBranch} ${tfCurrentDay} ${slot} from ${masterSheetName}: ${parsed.subject} (${parsed.faculty || 'No faculty'})`);
            timetableData[matchedBranch][tfCurrentDay][slot] = [parsed];
          }
        }
      }
    }
  }
}

// 3. Parse Dedicated Laboratory Sheets
const dedicatedLabSheets = [
  'COMP. LAB-1', 'COMP. LAB-2', 'COMP. LAB-3', 'COMP. LAB-4',
  'CHEM. LAB.', 'PHY LAB', 'A-406', 'A-301,302', 'A-303,304', 'C-208',
  'E-319', 'G-302', 'G-303', 'G-304', 'G-305', 'G-405',
  'G-202', 'G-203', 'G-204', 'G-205',
  'GVPCE CHEM. LAB.', 'GVPCE MECH. LAB', 'GVPCE SUR. LAB'
];

// Dynamically discover all dedicated lab sheets that contain 'LAB DETAILS' and 'DAY'
const allLabSheets = new Set(dedicatedLabSheets);
wb.SheetNames.forEach(sName => {
  const ws = wb.Sheets[sName];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const hasLabDetails = rows.some(r => r.some(c => String(c).toUpperCase().includes('LAB DETAILS')));
  const hasDay = rows.slice(0, 5).some(r => r.some(c => String(c).trim().toUpperCase() === 'DAY'));
  if (hasLabDetails && hasDay) {
    allLabSheets.add(sName);
  }
});

const labSheetsData = {};

for (const sheetName of allLabSheets) {
  if (!wb.Sheets[sheetName]) continue;
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Dynamically find header row containing 'Day'
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    if (rows[r] && rows[r].some(c => String(c).trim().toUpperCase() === 'DAY')) {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1) continue;

  const header = rows[headerRowIdx]; // e.g. ['Day', '09:00-11:00', '11:15-01:15', '02:15-04:15']
  labSheetsData[sheetName] = { schedule: {}, labDetails: [] };

  let detailsStart = rows.length;
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    if (String(row[0]).toUpperCase().includes('LAB DETAILS')) {
      detailsStart = r;
      break;
    }
    const day = String(row[0]).trim().toUpperCase();
    if (['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].includes(day)) {
      labSheetsData[sheetName].schedule[day] = {};
      for (let c = 1; c < header.length; c++) {
        const slot = String(header[c] || '').trim();
        const val = String(row[c] || '').trim();
        if (slot && val) {
          const parts = val.split('/').map(p => p.trim());
          labSheetsData[sheetName].schedule[day][slot] = {
            raw: val,
            branch: parts[0] || '',
            subject: parts[1] || val
          };
        }
      }
    }
  }

  // Parse lab details table
  for (let r = detailsStart + 2; r < rows.length; r++) {
    const row = rows[r];
    if (row && (row[1] || row[2])) {
      labSheetsData[sheetName].labDetails.push({
        sno: row[0],
        shortName: row[1],
        fullName: row[2]
      });
    }
  }
}

console.log(`Dedicated lab sheets parsed: ${Object.keys(labSheetsData).length}`);

// 3. Parse Branch Legends (Course & Faculty Mapping for each branch)
const branchLegends = {};
knownBranches.forEach(b => {
  const ws = wb.Sheets[b];
  if (!ws) return;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  let headerIdx = -1;
  let colSub = -1, colShort = -1, colFacShort = -1, colFacName = -1;
  data.forEach((r, i) => {
    if (!r) return;
    r.forEach((c, j) => {
      const str = String(c || '').toLowerCase().trim();
      if (str.includes('subject name')) { headerIdx = i; colSub = j; }
      if (str.includes('short form')) colShort = j;
      if (str.includes('faculty short')) colFacShort = j;
      if (str.includes('faculty name')) colFacName = j;
    });
  });

  if (headerIdx === -1) return;
  const items = [];
  for (let i = headerIdx + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !r.some(c => c)) continue;
    const text = r.join(' ');
    if (text.includes('Timetable Incharge') || text.includes('HOD-') || text.includes('Director')) break;
    const subjectFullName = String(r[colSub] || '').trim();
    const subjectShort = String(r[colShort] || '').trim();
    const facultyShort = String(r[colFacShort] || '').trim();
    const facultyFullName = String(r[colFacName] || '').trim();
    if (subjectFullName && !subjectFullName.toLowerCase().includes('subject name')) {
      items.push({
        sno: items.length + 1,
        subjectFullName,
        subjectShort,
        facultyShort,
        facultyFullName,
        isLab: subjectShort.toUpperCase().includes('LAB') || subjectFullName.toLowerCase().includes('lab')
      });
    }
  }
  branchLegends[b] = items;
});
console.log(`Branch legends parsed for: ${Object.keys(branchLegends).length} branches`);

// Write output
const output = {
  timetableData,
  branchLegends,
  labSheetsData,
  facultyList,
  facultyMap,
  knownBranches
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
