/**
 * Regenerates initialData.json from the Excel file, correctly handling:
 * - Timetable_Master as authoritative college schedule
 * - Timetable_Final for tutorial splits
 * - Timetable_Labs_Rearrange for master laboratory timetable
 * - 6 Consolidated course lab sheets and 19 dedicated room lab sheets
 * - Strict token-based faculty matching (preventing false matches like SP in SPORTS, GS in GSK, DM in DMVP)
 * - Pre-computed masterFacultyTimetables for all 77 faculty members
 * - Preserving horizontal 2-hour lab merges and parallel batch continuations
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

// 1. Parse Faculty_Workload_Summary
const facultyMap = {};
const facultyByClean = {};
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

    if (shortName === 'Dr. MN') {
      theoryLoad += 1;
      totalLoad += 1;
    }

    if (shortName && fullName) {
      const clean = shortName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      const facObj = { fullName, cleanShort: clean, rawShort: shortName, dept, designation, theoryLoad, labLoad, totalLoad, assignments };
      
      facultyMap[shortName] = facObj;
      facultyMap[clean] = facObj;
      facultyMap[`Dr. ${clean}`] = facObj;
      facultyMap[`Dr.${clean}`] = facObj;
      facultyMap[`Mr. ${clean}`] = facObj;
      facultyMap[`Mrs. ${clean}`] = facObj;
      facultyMap[`Ms. ${clean}`] = facObj;
      facultyByClean[clean] = facObj;

      facultyList.push({
        sno: sno,
        fullName,
        shortName,
        cleanShort: clean,
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

// Known aliases
facultyByClean['DDAK'] = facultyByClean['DAK'];
facultyByClean['VVBR'] = facultyByClean['VBR'];
facultyByClean['CSP'] = facultyByClean['ADP'];
facultyByClean['Faculty-2'] = facultyByClean['FAC-2'];
facultyByClean['Dr. Dr. VVLUR'] = facultyByClean['VVLUR'];
facultyByClean['Dr. VVLUR'] = facultyByClean['VVLUR'];

console.log(`Faculty loaded: ${facultyList.length}`);

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
    // Remove titles first
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

// 2. Parse Branch Legends
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

// 3. Parse Branch Sheets into timetableData
const timetableData = {};

for (const branch of knownBranches) {
  if (!wb.SheetNames.includes(branch)) {
    console.log(`SKIP: ${branch} not in workbook`);
    continue;
  }
  
  const ws = wb.Sheets[branch];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  const merges = ws['!merges'] || [];
  
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

  const mergeContinuations = new Set();
  const mergeMap = {};
  
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
      if (mergeContinuations.has(key)) continue;
      
      const cellValue = (row[col] || '').toString().trim();
      if (!cellValue || cellValue.toUpperCase() === 'BREAK' || cellValue.toUpperCase() === 'LUNCH') continue;

      const parsed = parseCellContent(cellValue);
      if (!parsed) continue;

      if (!timetableData[branch][currentDay][slot]) {
        timetableData[branch][currentDay][slot] = [];
      }
      timetableData[branch][currentDay][slot].push(parsed);

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
}

// 4. Fill gaps and sync parallel continuation rows from Timetable_Master
const wsMaster = wb.Sheets['Timetable_Master'];
if (wsMaster) {
  const masterRows = XLSX.utils.sheet_to_json(wsMaster, { header: 1, defval: '' });
  let mHeaderRow = -1;
  for (let r = 0; r < 10; r++) {
    if (masterRows[r] && masterRows[r].some(c => String(c).toUpperCase().includes('DAY'))) {
      mHeaderRow = r;
      break;
    }
  }

  if (mHeaderRow !== -1) {
    const mHeader = masterRows[mHeaderRow];
    const mSlotCols = {};
    mHeader.forEach((h, c) => {
      const hs = String(h || '').trim();
      timeSlots.forEach(ts => {
        if (hs.includes(ts)) mSlotCols[ts] = c;
      });
    });

    let curDay = '', curBranch = '';
    for (let r = mHeaderRow + 1; r < masterRows.length; r++) {
      const row = masterRows[r];
      if (!row) continue;
      const dCell = String(row[0] || '').trim().toUpperCase();
      const bCell = String(row[1] || '').trim().toUpperCase();
      if (dayNames.includes(dCell)) curDay = dCell;
      const matchedB = knownBranches.find(b => b.toUpperCase() === bCell);
      if (matchedB) curBranch = matchedB;
      if (!curDay || !curBranch || !timetableData[curBranch]) continue;
      if (!timetableData[curBranch][curDay]) timetableData[curBranch][curDay] = {};

      for (const [slot, col] of Object.entries(mSlotCols)) {
        const val = String(row[col] || '').trim();
        if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) continue;

        const parsed = parseCellContent(val);
        if (!parsed) continue;

        if (!timetableData[curBranch][curDay][slot]) {
          timetableData[curBranch][curDay][slot] = [];
        }

        // If slot is empty or parallel session not yet added
        const currentList = timetableData[curBranch][curDay][slot];
        const alreadyExists = currentList.some(s => {
          const s1 = normSubj(s.subject);
          const s2 = normSubj(parsed.subject);
          return s1 === s2 || s1.includes(s2) || s2.includes(s1);
        });

        if (!alreadyExists) {
          currentList.push(parsed);
          // If lab, also add continuation
          if (parsed.isLab && labNextSlot[slot]) {
            if (!timetableData[curBranch][curDay][labNextSlot[slot]]) {
              timetableData[curBranch][curDay][labNextSlot[slot]] = [];
            }
            timetableData[curBranch][curDay][labNextSlot[slot]].push({ ...parsed, isContinued: true });
          }
        }
      }
    }
  }
}

// 5. Reconcile tutorial splits from Timetable_Final
const wsFinal = wb.Sheets['Timetable_Final'];
if (wsFinal) {
  const finalRows = XLSX.utils.sheet_to_json(wsFinal, { header: 1, defval: '' });
  let fHeaderRow = -1;
  for (let r = 0; r < 10; r++) {
    if (finalRows[r] && finalRows[r].some(c => String(c).toUpperCase().includes('DAY'))) {
      fHeaderRow = r;
      break;
    }
  }

  if (fHeaderRow !== -1) {
    const fHeader = finalRows[fHeaderRow];
    const fSlotCols = {};
    fHeader.forEach((h, c) => {
      const hs = String(h || '').trim();
      timeSlots.forEach(ts => {
        if (hs.includes(ts)) fSlotCols[ts] = c;
      });
    });

    let curDay = '', curBranch = '';
    for (let r = fHeaderRow + 1; r < finalRows.length; r++) {
      const row = finalRows[r];
      if (!row) continue;
      const dCell = String(row[0] || '').trim().toUpperCase();
      const bCell = String(row[1] || '').trim().toUpperCase();
      if (dayNames.includes(dCell)) curDay = dCell;
      const matchedB = knownBranches.find(b => b.toUpperCase() === bCell);
      if (matchedB) curBranch = matchedB;
      if (!curDay || !curBranch || !timetableData[curBranch] || !timetableData[curBranch][curDay]) continue;

      for (const [slot, col] of Object.entries(fSlotCols)) {
        const val = String(row[col] || '').trim();
        if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) continue;

        const facs = matchFacultyInText(val);
        if (facs.length === 0) continue;

        const sessions = timetableData[curBranch][curDay][slot] || [];
        const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
        const cellSubj = normSubj(lines[0] || '');

        sessions.forEach(sess => {
          const sSubj = normSubj(sess.subject);
          if (sSubj === cellSubj || sSubj.includes(cellSubj) || cellSubj.includes(sSubj)) {
            const curFacs = sess.faculty ? sess.faculty.split(', ').map(x => x.trim()) : [];
            facs.forEach(f => {
              if (!curFacs.includes(f)) curFacs.push(f);
            });
            sess.faculty = curFacs.join(', ');
          }
        });
      }
    }
  }
}

// 6. Pre-compute masterFacultyTimetables for all 77 faculty
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

// Collect from Timetable_Master
if (wsMaster) {
  const masterRows = XLSX.utils.sheet_to_json(wsMaster, { header: 1, defval: '' });
  const mHeader = masterRows[0] || [];
  const mSlotCols = {};
  mHeader.forEach((h, c) => {
    const hs = String(h || '').trim();
    timeSlots.forEach(ts => {
      if (hs.includes(ts)) mSlotCols[ts] = c;
    });
  });

  let curDay = '', curBranch = '';
  for (let r = 1; r < masterRows.length; r++) {
    const row = masterRows[r];
    if (row[0] && row[0].trim()) curDay = row[0].trim().toUpperCase();
    if (row[1] && row[1].trim()) curBranch = row[1].trim();
    if (!dayNames.includes(curDay) || !curBranch) continue;

    for (const [slot, col] of Object.entries(mSlotCols)) {
      const val = String(row[col] || '').trim();
      if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) continue;
      const facs = matchFacultyInText(val);
      if (facs.length === 0) continue;

      const isLab = val.toUpperCase().includes('LAB') || val.toUpperCase().includes('3DDA');
      const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
      const subject = lines[0] || val;
      const room = lines.length > 2 ? lines[2] : (lines.length === 2 && (lines[1].includes('LAB') || lines[1].startsWith('G-') || lines[1].startsWith('E-') || lines[1].startsWith('C-') || lines[1].startsWith('A-')) ? lines[1] : '');

      facs.forEach(fn => {
        addFacultySlot(fn, curDay, slot, curBranch, subject, room, isLab, false);
        if (isLab && labNextSlot[slot]) {
          addFacultySlot(fn, curDay, labNextSlot[slot], curBranch, subject, room, isLab, true);
        }
      });
    }
  }
}

// Collect from Timetable_Final (tutorial splits)
if (wsFinal) {
  const finalRows = XLSX.utils.sheet_to_json(wsFinal, { header: 1, defval: '' });
  const fHeader = finalRows[0] || [];
  const fSlotCols = {};
  fHeader.forEach((h, c) => {
    const hs = String(h || '').trim();
    timeSlots.forEach(ts => {
      if (hs.includes(ts)) fSlotCols[ts] = c;
    });
  });

  let curDay = '', curBranch = '';
  for (let r = 1; r < finalRows.length; r++) {
    const row = finalRows[r];
    if (row[0] && row[0].trim()) curDay = row[0].trim().toUpperCase();
    if (row[1] && row[1].trim()) curBranch = row[1].trim();
    if (!dayNames.includes(curDay) || !curBranch) continue;

    for (const [slot, col] of Object.entries(fSlotCols)) {
      const val = String(row[col] || '').trim();
      if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) continue;
      const facs = matchFacultyInText(val);
      if (facs.length === 0) continue;

      const isLab = val.toUpperCase().includes('LAB') || val.toUpperCase().includes('3DDA');
      const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
      const subject = lines[0] || val;
      const room = lines.length > 2 ? lines[2] : '';

      facs.forEach(fn => {
        addFacultySlot(fn, curDay, slot, curBranch, subject, room, isLab, false);
        if (isLab && labNextSlot[slot]) {
          addFacultySlot(fn, curDay, labNextSlot[slot], curBranch, subject, room, isLab, true);
        }
      });
    }
  }
}

// Collect from Timetable_Labs_Rearrange
const wsLabs = wb.Sheets['Timetable_Labs_Rearrange'];
if (wsLabs) {
  const labsRows = XLSX.utils.sheet_to_json(wsLabs, { header: 1, defval: '' });
  const lHeader = labsRows[0] || [];
  const lSlotCols = {};
  lHeader.forEach((h, c) => {
    const hs = String(h || '').trim();
    timeSlots.forEach(ts => {
      if (hs.includes(ts)) lSlotCols[ts] = c;
    });
  });

  let curDay = '', curBranch = '';
  for (let r = 1; r < labsRows.length; r++) {
    const row = labsRows[r];
    if (row[0] && row[0].trim()) curDay = row[0].trim().toUpperCase();
    if (row[1] && row[1].trim()) curBranch = row[1].trim();
    if (!dayNames.includes(curDay) || !curBranch) continue;

    for (const [slot, col] of Object.entries(lSlotCols)) {
      const val = String(row[col] || '').trim();
      if (!val || ['BREAK', 'LUNCH'].includes(val.toUpperCase())) continue;
      const facs = matchFacultyInText(val);
      if (facs.length === 0) continue;

      const isLab = true;
      const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
      const subject = lines[0] || val;
      const room = lines.length > 2 ? lines[2] : (lines.length === 2 ? lines[1] : '');

      facs.forEach(fn => {
        addFacultySlot(fn, curDay, slot, curBranch, subject, room, isLab, false);
        if (labNextSlot[slot]) {
          addFacultySlot(fn, curDay, labNextSlot[slot], curBranch, subject, room, isLab, true);
        }
      });
    }
  }
}

// Collect from branch sheets
knownBranches.forEach(branch => {
  const bSched = timetableData[branch] || {};
  Object.entries(bSched).forEach(([day, daySched]) => {
    Object.entries(daySched).forEach(([slot, sessions]) => {
      sessions.forEach(sess => {
        if (!sess.faculty) return;
        const facs = sess.faculty.split(', ').map(f => f.trim()).filter(Boolean);
        facs.forEach(fn => {
          const facObj = facultyList.find(f => f.fullName === fn);
          if (facObj) {
            addFacultySlot(facObj.fullName, day, slot, branch, sess.subject, sess.room, sess.isLab, sess.isContinued);
          }
        });
      });
    });
  });
});

// Reconcile Branch Legends for lab teams
knownBranches.forEach(branch => {
  const legends = branchLegends[branch] || [];
  legends.forEach(leg => {
    if (!leg.isLab) return;
    const legFacs = leg.facultyFullName.split('\n').map(f => f.trim()).filter(Boolean);
    if (legFacs.length === 0) return;
    const legSubjNorm = normSubj(leg.subjectShort || leg.subjectFullName);

    dayNames.forEach(day => {
      timeSlots.forEach(slot => {
        let labFound = null;
        for (const [facName, sched] of Object.entries(masterFacultyTimetables)) {
          const sessions = sched[day][slot] || [];
          const s = sessions.find(x => x.branch === branch && normSubj(x.subject) === legSubjNorm);
          if (s) {
            labFound = s;
            break;
          }
        }
        if (labFound) {
          legFacs.forEach(fFullName => {
            const facObj = facultyList.find(f => f.fullName.toLowerCase() === fFullName.toLowerCase());
            if (facObj) {
              addFacultySlot(facObj.fullName, day, slot, branch, labFound.subject, labFound.room, true, false);
              if (labNextSlot[slot]) {
                addFacultySlot(facObj.fullName, day, labNextSlot[slot], branch, labFound.subject, labFound.room, true, true);
              }
            }
          });
        }
      });
    });
  });
});

console.log(`Pre-computed masterFacultyTimetables for ${Object.keys(masterFacultyTimetables).length} faculty`);

// 7. Parse Comprehensive Lab Data
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

    const slotCols = [
      { slot: '09:00-11:00', c: 2 },
      { slot: '11:15-01:15', c: 5 },
      { slot: '02:15-04:15', c: 8 }
    ];

    slotCols.forEach(({ slot, c }) => {
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

// Write output
const output = {
  timetableData,
  branchLegends,
  labSheetsData,
  masterFacultyTimetables,
  facultyList,
  facultyMap,
  knownBranches
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
