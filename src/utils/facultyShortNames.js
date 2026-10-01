import initialData from '../data/initialData.json';

// Build global lookup dictionary
const lookup = {};

// 1. From facultyList in initialData
if (initialData.facultyList && Array.isArray(initialData.facultyList)) {
  for (const f of initialData.facultyList) {
    const short = f.shortName || f.cleanShort;
    if (!short) continue;
    
    // Store full name
    lookup[f.fullName.toLowerCase()] = short;
    
    // Store without honorifics (Dr., Mr., Mrs., Ms., Prof.)
    const clean = f.fullName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim().toLowerCase();
    lookup[clean] = short;

    // Store normalized spaces
    lookup[f.fullName.replace(/\s+/g, ' ').toLowerCase()] = short;
    lookup[clean.replace(/\s+/g, ' ')] = short;
  }
}

// 2. From branchLegends (authoritative for each branch)
if (initialData.branchLegends && typeof initialData.branchLegends === 'object') {
  for (const legendItems of Object.values(initialData.branchLegends)) {
    if (!Array.isArray(legendItems)) continue;
    for (const item of legendItems) {
      const fulls = (item.facultyFullName || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      const shorts = (item.facultyShort || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      
      fulls.forEach((fn, idx) => {
        if (shorts[idx]) {
          const cleanShort = shorts[idx].replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim();
          lookup[fn.toLowerCase()] = cleanShort;
          const c = fn.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim().toLowerCase();
          lookup[c] = cleanShort;
        }
      });

      // Also check tutorial faculty
      const tutFulls = (item.tutorialFullName || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      const tutShorts = (item.tutorialShort || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      tutFulls.forEach((fn, idx) => {
        if (tutShorts[idx]) {
          const cleanShort = tutShorts[idx].replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim();
          lookup[fn.toLowerCase()] = cleanShort;
          const c = fn.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim().toLowerCase();
          lookup[c] = cleanShort;
        }
      });
    }
  }
}

/**
 * Converts a comma/ampersand separated faculty string into initials/short names.
 * e.g., "Dr. B Rajesh Babu, Dr. Ch Rajesh, Dr. B Nagarjun" -> "BRB, CHR, BN"
 */
export function getFacultyShortNames(facultyStr) {
  if (!facultyStr || facultyStr === '-' || facultyStr.trim() === '') return '';
  
  // Split multiple faculty
  const parts = facultyStr.split(/[,&/]/).map(p => p.trim()).filter(Boolean);
  
  const shortParts = parts.map(rawName => {
    // If it is already short (e.g. "BRB", "FAC-2")
    if (rawName.length <= 5 && rawName === rawName.toUpperCase()) return rawName;

    const lower = rawName.toLowerCase();
    const clean = rawName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim().toLowerCase();

    if (lookup[lower]) return lookup[lower];
    if (lookup[clean]) return lookup[clean];

    // Check fuzzy match against known names
    for (const [k, v] of Object.entries(lookup)) {
      if (clean.length > 3 && (k.includes(clean) || clean.includes(k))) {
        return v;
      }
    }

    // Fallback: Generate acronym from capital letters
    const cleanTitle = rawName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, '').trim();
    const capitals = cleanTitle.match(/[A-Z]/g);
    if (capitals && capitals.length >= 2) {
      return capitals.join('');
    }

    return cleanTitle;
  });

  return shortParts.join(', ');
}

export const getFacultyShortName = getFacultyShortNames;

export default getFacultyShortNames;
