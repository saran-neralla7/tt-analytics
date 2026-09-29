/**
 * Regenerates initialData.json from the Excel file:
 * - Timetable_Final is the PRIMARY AUTHORITATIVE source of truth for branch timetables & faculty individual timetables
 * - Pre-computes masterFacultyTimetables directly from Timetable_Final
 * - Reconciles any multi-faculty lab teams from branch legends & Faculty_Workload_Summary
 * - 6 Consolidated course lab sheets and 19 dedicated room lab sheets
 * - Timetable_Labs_Rearrange for master laboratory timetable
 * - Strict token-based faculty matching (preventing false matches like SP in SPORTS, GS in GSK, DM in DMVP)
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
const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const labNextSlot = {
  '09:00-10:00': '10:00-11:00',
  '11:15-12:15': '12:15-01:15',
  '02:15-03:15': '03:15-04:15'
};

// 1. Parse Faculty Roster from Sheet3 & Subject Assignments from Sheet2
const facultyMap = {};
const facultyByClean = {};
const facultyList = [];

// Load master roster from Sheet3 (82 official faculty)
const s3Sheet = wb.Sheets['Sheet3'];
if (s3Sheet) {
  const s3Rows = XLSX.utils.sheet_to_json(s3Sheet);
  s3Rows.forEach(r => {
    const sno = r['S.No'];
    const fullName = (r.Faculty_Name || '').trim();
    const rawShort = (r.Name_short || '').trim();
    const clean = rawShort.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
    const dept = (r.Department || '').trim();
    const designation = (r.Designation || '').trim();

    if (clean && fullName) {
      const facObj = {
        sno,
        fullName,
        shortName: rawShort,
        cleanShort: clean,
        dept,
        designation,
        theoryLoad: 0,
        labLoad: 0,
        tutLoad: 0,
        totalLoad: 0,
        assignedCourses: [],
        assignments: ''
      };

      facultyMap[rawShort] = facObj;
      facultyMap[clean] = facObj;
      facultyMap[`Dr. ${clean}`] = facObj;
      facultyMap[`Dr.${clean}`] = facObj;
      facultyMap[`Mr. ${clean}`] = facObj;
      facultyMap[`Mrs. ${clean}`] = facObj;
      facultyMap[`Ms. ${clean}`] = facObj;
      facultyMap[fullName] = facObj;
      facultyByClean[clean] = facObj;
      facultyByClean[clean.toUpperCase()] = facObj;
      facultyList.push(facObj);
    }
  });
}

// Ensure FAC-2 / Faculty-2 exists
if (!facultyByClean['FAC-2']) {
  const fac2 = {
    sno: facultyList.length + 1,
    fullName: 'Faculty-2',
    shortName: 'FAC-2',
    cleanShort: 'FAC-2',
    dept: 'General',
    designation: 'Assistant Professor',
    theoryLoad: 0,
    labLoad: 0,
    tutLoad: 0,
    totalLoad: 0,
    assignedCourses: [],
    assignments: ''
  };
  facultyList.push(fac2);
  facultyByClean['FAC-2'] = fac2;
  facultyMap['FAC-2'] = fac2;
  facultyMap['Faculty-2'] = fac2;
}

// Known aliases
facultyByClean['DDAK'] = facultyByClean['DAK'];
facultyByClean['VVBR'] = facultyByClean['VBR'];
facultyByClean['CSP'] = facultyByClean['ADP'];
facultyByClean['Faculty-2'] = facultyByClean['FAC-2'];
facultyByClean['Dr. Dr. VVLUR'] = facultyByClean['VVLUR'];
facultyByClean['Dr. VVLUR'] = facultyByClean['VVLUR'];

// Load official subject-faculty allocations and workload from Sheet2
const s2Sheet = wb.Sheets['Sheet2'];
if (s2Sheet) {
  const s2Rows = XLSX.utils.sheet_to_json(s2Sheet);
  s2Rows.forEach(row => {
    const branch = row.Branch;
    const room = row.Room_no || '';
    const subName = row.Subject_Name || '';
    const subShort = row.sub_short || '';
    const th = Number(row.Theory_Hours) || 0;
    const lab = Number(row.Lab_Hours) || 0;
    const tut = Number(row.Tutorial_Hours) || 0;

    const thShorts = (row.Name_short || '')
      .split('\n')
      .map(s => s.trim().replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').toUpperCase())
      .filter(Boolean);
    const tutShorts = (row.Tutorial_Short || '')
      .split('\n')
      .map(s => s.trim().replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').toUpperCase())
      .filter(Boolean);

    // Theory
    if (th > 0) {
      thShorts.forEach(sh => {
        const fac = facultyByClean[sh];
        if (fac) {
          fac.theoryLoad += th;
          fac.assignedCourses.push({
            branch,
            subject: subName,
            code: subShort,
            room,
            hours: th,
            type: 'theory',
            loadDetail: `${th} theory = ${th} periods`
          });
        }
      });
    }

    // Lab
    if (lab > 0) {
      thShorts.forEach(sh => {
        const fac = facultyByClean[sh];
        if (fac) {
          fac.labLoad += lab;
          fac.assignedCourses.push({
            branch,
            subject: subName,
            code: subShort,
            room,
            hours: lab,
            type: 'lab',
            loadDetail: `${lab} lab = ${lab} periods`
          });
        }
      });
    }

    // Tutorial
    if (tut > 0) {
      tutShorts.forEach(sh => {
        const fac = facultyByClean[sh];
        if (fac) {
          fac.tutLoad += tut;
          fac.assignedCourses.push({
            branch,
            subject: subName,
            code: subShort,
            room,
            hours: tut,
            type: 'tutorial',
            loadDetail: `${tut} tutorial = ${tut} periods`
          });
        }
      });
    }
  });

  // Calculate totalLoad and formatted assignments string
  facultyList.forEach(fac => {
    fac.totalLoad = fac.theoryLoad + fac.labLoad + fac.tutLoad;
    fac.assignments = fac.assignedCourses
      .map(c => `${c.branch} → ${c.subject} (${c.code}) – ${c.loadDetail}`)
      .join('\n');
  });
}

// Filter to ONLY count and include faculty who are assigned workload (totalLoad > 0)
const activeFacultyList = facultyList.filter(fac => fac.totalLoad > 0);
activeFacultyList.forEach((fac, idx) => {
  fac.sno = idx + 1;
});

console.log(`Faculty with assigned workload: ${activeFacultyList.length} (out of ${facultyList.length} in master roster)`);

// Known non-faculty words to ignore during token matching
const nonFacultyWords = new Set([
  'CAL', 'LA', 'PSUC', 'ENGG', 'PHY', 'CHEM', 'AITA', 'FWD', 'ENV', 'STD',
  'DLD', '3DDA', 'S&G', 'ESAM', 'SUS', 'EME', 'FEEE', 'FDS', 'PAC', 'PCE',
  'COM', 'CSP', 'FAI', 'ML', 'TUT', 'TUTORIAL', 'LAB', 'LABORATORY', 'PRACTICAL',
  'LUNCH', 'BREAK', 'LIBRARY', 'COUNSELLING', 'SPORTS', 'YOGA', 'SECTION',
  'COMP', 'GVPCE', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'DAY', 'BRANCH',
  'A', 'B', 'C', 'D', 'E', 'G', 'A-60', 'B-60', 'A-30', 'B-30'
]);

// Helper: exact token faculty matching
function matchFacultyInText(text) {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const matched = new Set();
  lines.forEach((line) => {
    const cleanLine = line.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/gi, ' ').replace(/[\(\),\/]/g, ' ');
    const tokens = cleanLine.split(/\s+/).filter(Boolean);
    tokens.forEach(tok => {
      const cleanTok = tok.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)/i, '').replace(/[\.,]$/, '').trim();
      if (!cleanTok || nonFacultyWords.has(cleanTok.toUpperCase())) return;
      if (facultyByClean[cleanTok]) {
        matched.add(facultyByClean[cleanTok].fullName);
      }
    });
  });
  return Array.from(matched);
}

// Helper: resolve faculty string in period cell to full names
function resolveFacultyNames(initialsStr) {
  if (!initialsStr) return '';
  const facs = matchFacultyInText(initialsStr);
  return facs.join(', ');
}

// Helper: extract room from cell
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

// Helper: parse cell content
function parseCellContent(val) {
  if (!val) return null;
  val = val.trim();
  const upper = val.toUpperCase();
  if (!val || upper === 'BREAK' || upper === 'LUNCH') return null;

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
    } else if (second.startsWith('G-') || second.startsWith('E-') || second.startsWith('C-') || second.startsWith('A-') || second.includes('LAB') || second.includes('GVPCE')) {
      return { subject: lines[0], faculty: '', room: second, isLab };
    } else {
      return { subject: lines[0], faculty: resolveFacultyNames(second), room: '', isLab };
    }
  }
  return { subject: val, faculty: '', room: '', isLab };
}

function normSubj(s) {
  return (s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/LABORATORY/g, 'LAB')
    .replace(/PRACTICAL/g, 'LAB')
    .replace(/TUTORIAL/g, 'TUT');
}

// 2. Parse Branch Legends from Sheet2 (Authoritative for all 13 branches)
const branchLegends = {};
if (s2Sheet) {
  const s2Rows = XLSX.utils.sheet_to_json(s2Sheet);
  s2Rows.forEach(r => {
    const b = r.Branch;
    if (!b) return;
    if (!branchLegends[b]) branchLegends[b] = [];
    branchLegends[b].push({
      sno: branchLegends[b].length + 1,
      subjectFullName: r.Subject_Name || '',
      subjectShort: r.sub_short || '',
      facultyShort: r.Name_short || '',
      facultyFullName: r.Faculty_Name || '',
      tutorialShort: r.Tutorial_Short || '',
      tutorialFullName: r.Tutorial_Name || '',
      room: r.Room_no || '',
      isLab: Boolean(r.Lab_Hours || (r.sub_short && r.sub_short.toUpperCase().includes('LAB')) || (r.Subject_Name && r.Subject_Name.toLowerCase().includes('lab')))
    });
  });
}

// Fallback for any branches not in Sheet2
knownBranches.forEach(b => {
  if (branchLegends[b] && branchLegends[b].length > 0) return;
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
    const rawFacultyShort = String(r[colFacShort] || '').trim();
    const facultyShort = rawFacultyShort
      .split('\n')
      .map(line => line.trim().replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim())
      .filter(Boolean)
      .join('\n');
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

// 3. Parse Timetable_Final into timetableData (authoritative sheet for branch schedules)
const wsFinal = wb.Sheets['Timetable_Final'] || wb.Sheets['Timetable_Master'];
const rowsFinal = XLSX.utils.sheet_to_json(wsFinal, { header: 1, defval: '' });

const timetableData = {};
knownBranches.forEach(b => {
  timetableData[b] = {};
  dayNames.forEach(d => timetableData[b][d] = {});
});

const slotCols = [
  { slot: '09:00-10:00', nextSlot: '10:00-11:00', c: 2 },
  { slot: '10:00-11:00', nextSlot: null, c: 3 },
  { slot: '11:15-12:15', nextSlot: '12:15-01:15', c: 5 },
  { slot: '12:15-01:15', nextSlot: null, c: 6 },
  { slot: '02:15-03:15', nextSlot: '03:15-04:15', c: 8 },
  { slot: '03:15-04:15', nextSlot: null, c: 9 }
];

const branchSessionsMap = {}; // branch -> day -> slot -> array of sessions

let curDay = '', curBranch = '';
for (let r = 1; r < rowsFinal.length; r++) {
  const row = rowsFinal[r];
  if (row[0] && row[0].trim()) curDay = row[0].trim().toUpperCase();
  if (row[1] && row[1].trim()) curBranch = row[1].trim();
  if (!dayNames.includes(curDay) || !curBranch || !timetableData[curBranch]) continue;

  if (!branchSessionsMap[curBranch]) branchSessionsMap[curBranch] = {};
  if (!branchSessionsMap[curBranch][curDay]) branchSessionsMap[curBranch][curDay] = {};

  slotCols.forEach(({ slot, nextSlot, c }) => {
    const val = String(row[c] || '').trim();
    if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) return;

    const parsed = parseCellContent(val);
    if (!parsed) return;

    if (!timetableData[curBranch][curDay][slot]) {
      timetableData[curBranch][curDay][slot] = [];
    }
    timetableData[curBranch][curDay][slot].push(parsed);

    if (!branchSessionsMap[curBranch][curDay][slot]) {
      branchSessionsMap[curBranch][curDay][slot] = [];
    }
    branchSessionsMap[curBranch][curDay][slot].push({ ...parsed, nextSlot, raw: val });

    // Handle horizontal 2-hour lab span
    if (parsed.isLab && nextSlot) {
      if (!timetableData[curBranch][curDay][nextSlot]) {
        timetableData[curBranch][curDay][nextSlot] = [];
      }
      timetableData[curBranch][curDay][nextSlot].push({ ...parsed, isContinued: true });
    }
  });
}

console.log(`Parsed timetableData for ${Object.keys(timetableData).length} branches from Timetable_Final`);

// 4. Pre-compute masterFacultyTimetables directly from Timetable_Final
const masterFacultyTimetables = {};
facultyList.forEach(f => {
  masterFacultyTimetables[f.fullName] = { MON: {}, TUE: {}, WED: {}, THU: {}, FRI: {} };
});

function addFacultySlot(facName, day, slot, branch, subject, room, isLab, isContinued = false) {
  if (!masterFacultyTimetables[facName] || !masterFacultyTimetables[facName][day]) return;
  const list = masterFacultyTimetables[facName][day][slot] || [];
  let cleanSubj = (subject || '').split('\n')[0].trim();
  if (cleanSubj.includes('/') && !cleanSubj.includes('(')) {
    cleanSubj = cleanSubj.split('/')[0].trim();
  }
  const normS = normSubj(cleanSubj);
  const exists = list.some(x => {
    if (x.branch !== branch) return false;
    const xNorm = normSubj(x.subject);
    return xNorm === normS || xNorm.includes(normS) || normS.includes(xNorm);
  });
  if (!exists) {
    list.push({ branch, subject: cleanSubj, room, isLab, isContinued });
    masterFacultyTimetables[facName][day][slot] = list;
  }
}

// Extract directly and authoritatively from Timetable_Final
curDay = ''; curBranch = '';
for (let r = 1; r < rowsFinal.length; r++) {
  const row = rowsFinal[r];
  if (row[0] && row[0].trim()) curDay = row[0].trim().toUpperCase();
  if (row[1] && row[1].trim()) curBranch = row[1].trim();
  if (!dayNames.includes(curDay) || !curBranch) continue;

  slotCols.forEach(({ slot, nextSlot, c }) => {
    const val = String(row[c] || '').trim();
    if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) return;
    const parsed = parseCellContent(val);
    if (!parsed) return;

    const facs = matchFacultyInText(val);
    if (facs.length === 0) return;

    facs.forEach(fn => {
      addFacultySlot(fn, curDay, slot, curBranch, parsed.subject, parsed.room, parsed.isLab, false);
      if (parsed.isLab && nextSlot) {
        addFacultySlot(fn, curDay, nextSlot, curBranch, parsed.subject, parsed.room, parsed.isLab, true);
      }
    });
  });
}

console.log(`Pre-computed masterFacultyTimetables for ${Object.keys(masterFacultyTimetables).length} faculty from Timetable_Final`);

// 5. Parse Comprehensive Lab Data
const dedicatedLabSheets = [
  'COMP. LAB-1', 'COMP. LAB-2', 'COMP. LAB-3', 'COMP. LAB-4',
  'CHEM. LAB.', 'PHY LAB', 'A-406', 'A-301,302', 'A-303,304', 'C-208',
  'E-319', 'G-302', 'G-303', 'G-304', 'G-305', 'G-405',
  'GVPCE CHEM. LAB.', 'GVPCE MECH. LAB', 'GVPCE SUR. LAB'
];

const courseLabSheetNames = [
  'Problem solving using C lab',
  'Engineering Physics lab',
  'AI Tools and Applications Lab',
  'Foundations of Artificial Intel',
  '3D Design and Animation',
  'Fundamentals of Web Designing L'
];

const roomLabs = {};

for (const sheetName of dedicatedLabSheets) {
  if (!wb.Sheets[sheetName]) continue;
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    if (rows[r] && rows[r].some(c => String(c).trim().toUpperCase() === 'DAY')) {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1) continue;

  const header = rows[headerRowIdx];
  roomLabs[sheetName] = { schedule: {}, labDetails: [] };

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
      roomLabs[sheetName].schedule[day] = {};
      for (let c = 1; c < header.length; c++) {
        const slot = String(header[c] || '').trim();
        const val = String(row[c] || '').trim();
        if (slot && val) {
          const parts = val.split('/').map(p => p.trim());
          roomLabs[sheetName].schedule[day][slot] = {
            raw: val,
            branch: parts[0] || '',
            subject: parts[1] || val
          };
        }
      }
    }
  }

  for (let r = detailsStart + 2; r < rows.length; r++) {
    const row = rows[r];
    if (row && (row[1] || row[2])) {
      roomLabs[sheetName].labDetails.push({
        sno: row[0],
        shortName: row[1],
        fullName: row[2]
      });
    }
  }
}

// Parse Course Labs
const consolidatedLabs = {};
courseLabSheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headers = rows[0] || [];
  const schedule = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const day = String(row[0] || '').trim().toUpperCase();
    if (!['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].includes(day)) continue;
    schedule[day] = {};
    for (let c = 1; c < headers.length; c++) {
      const slot = String(headers[c] || '').trim();
      const val = String(row[c] || '').trim();
      if (val) {
        const sessions = val.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
          const parts = line.split('/').map(p => p.trim());
          return {
            branch: parts[0] || '',
            room: parts[1] || '',
            raw: line
          };
        });
        schedule[day][slot] = sessions;
      }
    }
  }
  consolidatedLabs[name] = schedule;
});

// Parse Master Laboratory Schedule from Timetable_Labs_Rearrange
const wsLabs = wb.Sheets['Timetable_Labs_Rearrange'];
const masterLabSchedule = {};
if (wsLabs) {
  const labsRows = XLSX.utils.sheet_to_json(wsLabs, { header: 1, defval: '' });
  let curDay = '', curBranch = '';
  for (let r = 1; r < labsRows.length; r++) {
    const row = labsRows[r];
    if (row[0] && row[0].trim()) curDay = row[0].trim().toUpperCase();
    if (row[1] && row[1].trim()) curBranch = row[1].trim();
    if (!dayNames.includes(curDay) || !curBranch) continue;
    
    if (!masterLabSchedule[curBranch]) masterLabSchedule[curBranch] = {};
    if (!masterLabSchedule[curBranch][curDay]) masterLabSchedule[curBranch][curDay] = {};

    const labCols = [
      { slot: '09:00-11:00', c: 2 },
      { slot: '11:15-01:15', c: 5 },
      { slot: '02:15-04:15', c: 8 }
    ];

    labCols.forEach(({ slot, c }) => {
      const val = String(row[c] || '').trim();
      if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) return;
      const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
      const subject = lines[0] || val;
      const faculty = lines.length > 2 ? lines[1] : '';
      const room = lines.length > 2 ? lines[2] : (lines.length === 2 ? lines[1] : '');
      
      if (!masterLabSchedule[curBranch][curDay][slot]) {
        masterLabSchedule[curBranch][curDay][slot] = [];
      }
      masterLabSchedule[curBranch][curDay][slot].push({ subject, faculty, room, raw: val });
    });
  }
}

// Assemble labSheetsData with backwards-compatible root keys
const labSheetsData = {
  roomLabs,
  consolidatedLabs,
  masterLabSchedule,
  ...roomLabs
};

console.log(`Dedicated lab rooms: ${Object.keys(roomLabs).length}, Consolidated course labs: ${Object.keys(consolidatedLabs).length}`);

// Write output (only counting faculty with assigned workload in facultyList)
const output = {
  timetableData,
  branchLegends,
  labSheetsData,
  masterFacultyTimetables,
  facultyList: activeFacultyList,
  allFacultyList: facultyList,
  facultyMap,
  knownBranches
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
