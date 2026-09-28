// Soft Pastel Palette for Academic Timetables
// Designed for unique identification of every subject & lab, zero eye strain, and high contrast for seniors

const EXACT_SUBJECT_COLORS = {
  // === LABS (Each lab gets its own vibrant, distinct pastel) ===
  'PSUC LAB': {
    bg: 'bg-purple-100/95',
    inlineBg: '#ede9fe',
    border: 'border-purple-300',
    text: 'text-purple-950',
    badge: 'bg-purple-200 text-purple-950 border-purple-400',
    category: 'Programming Lab'
  },
  'ENGG. PHY. LAB': {
    bg: 'bg-teal-100/95',
    inlineBg: '#ccfbf1',
    border: 'border-teal-300',
    text: 'text-teal-950',
    badge: 'bg-teal-200 text-teal-950 border-teal-400',
    category: 'Physics Lab'
  },
  'ENGG. CHEM LAB': {
    bg: 'bg-emerald-100/95',
    inlineBg: '#d1fae5',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    badge: 'bg-emerald-200 text-emerald-950 border-emerald-400',
    category: 'Chemistry Lab'
  },
  'CHEM LAB': {
    bg: 'bg-emerald-100/95',
    inlineBg: '#d1fae5',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    badge: 'bg-emerald-200 text-emerald-950 border-emerald-400',
    category: 'Chemistry Lab'
  },
  'DLD LAB': {
    bg: 'bg-pink-100/95',
    inlineBg: '#fce7f3',
    border: 'border-pink-300',
    text: 'text-pink-950',
    badge: 'bg-pink-200 text-pink-950 border-pink-400',
    category: 'Digital Electronics Lab'
  },
  'AITA LAB': {
    bg: 'bg-orange-100/95',
    inlineBg: '#ffedd5',
    border: 'border-orange-300',
    text: 'text-orange-950',
    badge: 'bg-orange-200 text-orange-950 border-orange-400',
    category: 'AI Tools Lab'
  },
  'FWD LAB': {
    bg: 'bg-rose-100/95',
    inlineBg: '#ffe4e6',
    border: 'border-rose-300',
    text: 'text-rose-950',
    badge: 'bg-rose-200 text-rose-950 border-rose-400',
    category: 'Web Dev Lab'
  },
  'FAI & ML LAB': {
    bg: 'bg-green-100/95',
    inlineBg: '#dcfce7',
    border: 'border-green-300',
    text: 'text-green-950',
    badge: 'bg-green-200 text-green-950 border-green-400',
    category: 'Machine Learning Lab'
  },
  'EME LAB': {
    bg: 'bg-amber-200/90',
    inlineBg: '#fef08a',
    border: 'border-amber-400',
    text: 'text-amber-950',
    badge: 'bg-amber-300 text-amber-950 border-amber-500',
    category: 'Mechanical Lab'
  },
  'FEEE LAB': {
    bg: 'bg-cyan-200/90',
    inlineBg: '#a5f3fc',
    border: 'border-cyan-400',
    text: 'text-cyan-950',
    badge: 'bg-cyan-300 text-cyan-950 border-cyan-500',
    category: 'Electrical Lab'
  },
  'ESS. ENG. LAB': {
    bg: 'bg-red-100/95',
    inlineBg: '#fee2e2',
    border: 'border-red-300',
    text: 'text-red-950',
    badge: 'bg-red-200 text-red-950 border-red-400',
    category: 'Communication Lab'
  },
  'PAC LAB': {
    bg: 'bg-lime-200/90',
    inlineBg: '#d9f99d',
    border: 'border-lime-400',
    text: 'text-lime-950',
    badge: 'bg-lime-300 text-lime-950 border-lime-500',
    category: 'Applied Chem Lab'
  },
  'PCE LAB': {
    bg: 'bg-teal-200/90',
    inlineBg: '#99f6e4',
    border: 'border-teal-400',
    text: 'text-teal-950',
    badge: 'bg-teal-300 text-teal-950 border-teal-500',
    category: 'Polymer Lab'
  },
  'S&G LAB': {
    bg: 'bg-yellow-200/90',
    inlineBg: '#fef08a',
    border: 'border-yellow-400',
    text: 'text-yellow-950',
    badge: 'bg-yellow-300 text-yellow-950 border-yellow-500',
    category: 'Surveying Lab'
  },

  // === THEORY COURSES (Distinct tints across spectrum) ===
  'CAL & LA': {
    bg: 'bg-sky-100/95',
    inlineBg: '#e0f2fe',
    border: 'border-sky-300',
    text: 'text-sky-950',
    badge: 'bg-sky-200 text-sky-950 border-sky-400',
    category: 'Mathematics'
  },
  'CAL & LA TUT': {
    bg: 'bg-sky-50/95',
    inlineBg: '#f0f9ff',
    border: 'border-sky-200',
    text: 'text-sky-950',
    badge: 'bg-sky-200 text-sky-950 border-sky-300',
    category: 'Mathematics Tutorial'
  },
  'SUS. ENGG.': {
    bg: 'bg-amber-100/95',
    inlineBg: '#fef3c7',
    border: 'border-amber-300',
    text: 'text-amber-950',
    badge: 'bg-amber-200 text-amber-950 border-amber-400',
    category: 'Sustainable Engineering'
  },
  'PSUC': {
    bg: 'bg-indigo-100/95',
    inlineBg: '#e0e7ff',
    border: 'border-indigo-300',
    text: 'text-indigo-950',
    badge: 'bg-indigo-200 text-indigo-950 border-indigo-400',
    category: 'Programming'
  },
  'ENGG.PHY': {
    bg: 'bg-cyan-100/95',
    inlineBg: '#cffafe',
    border: 'border-cyan-300',
    text: 'text-cyan-950',
    badge: 'bg-cyan-200 text-cyan-950 border-cyan-400',
    category: 'Physics'
  },
  'EP': {
    bg: 'bg-cyan-100/95',
    inlineBg: '#cffafe',
    border: 'border-cyan-300',
    text: 'text-cyan-950',
    badge: 'bg-cyan-200 text-cyan-950 border-cyan-400',
    category: 'Physics'
  },
  'COM': {
    bg: 'bg-lime-100/95',
    inlineBg: '#ecfccb',
    border: 'border-lime-300',
    text: 'text-lime-950',
    badge: 'bg-lime-200 text-lime-950 border-lime-400',
    category: 'Chemistry'
  },
  'DLD': {
    bg: 'bg-fuchsia-100/95',
    inlineBg: '#fae8ff',
    border: 'border-fuchsia-300',
    text: 'text-fuchsia-950',
    badge: 'bg-fuchsia-200 text-fuchsia-950 border-fuchsia-400',
    category: 'Digital Electronics'
  },
  'AITA': {
    bg: 'bg-orange-100/95',
    inlineBg: '#ffedd5',
    border: 'border-orange-300',
    text: 'text-orange-950',
    badge: 'bg-orange-200 text-orange-950 border-orange-400',
    category: 'Artificial Intelligence'
  },
  'FWD': {
    bg: 'bg-slate-200/90',
    inlineBg: '#e2e8f0',
    border: 'border-slate-300',
    text: 'text-slate-950',
    badge: 'bg-slate-300 text-slate-950 border-slate-400',
    category: 'Web Development'
  },
  'FAI & ML': {
    bg: 'bg-yellow-100/95',
    inlineBg: '#fef9c3',
    border: 'border-yellow-300',
    text: 'text-yellow-950',
    badge: 'bg-yellow-200 text-yellow-950 border-yellow-400',
    category: 'Machine Learning'
  },
  'FDS': {
    bg: 'bg-violet-100/95',
    inlineBg: '#ede9fe',
    border: 'border-violet-300',
    text: 'text-violet-950',
    badge: 'bg-violet-200 text-violet-950 border-violet-400',
    category: 'Data Science'
  },
  '3DDA': {
    bg: 'bg-violet-100/95',
    inlineBg: '#ede9fe',
    border: 'border-violet-300',
    text: 'text-violet-950',
    badge: 'bg-violet-200 text-violet-950 border-violet-400',
    category: '3D Animation'
  },
  'EME': {
    bg: 'bg-amber-100/90',
    inlineBg: '#fef3c7',
    border: 'border-amber-300',
    text: 'text-amber-950',
    badge: 'bg-amber-200 text-amber-950 border-amber-400',
    category: 'Mechanical Engineering'
  },
  'FEEE': {
    bg: 'bg-sky-200/80',
    inlineBg: '#bae6fd',
    border: 'border-sky-400',
    text: 'text-sky-950',
    badge: 'bg-sky-300 text-sky-950 border-sky-500',
    category: 'Electrical Engineering'
  },
  'ESAM': {
    bg: 'bg-zinc-200/90',
    inlineBg: '#e4e4e7',
    border: 'border-zinc-300',
    text: 'text-zinc-950',
    badge: 'bg-zinc-300 text-zinc-950 border-zinc-400',
    category: 'Energy Materials'
  },
  'ESS. ENG.': {
    bg: 'bg-rose-100/95',
    inlineBg: '#ffe4e6',
    border: 'border-rose-300',
    text: 'text-rose-950',
    badge: 'bg-rose-200 text-rose-950 border-rose-400',
    category: 'English'
  },
  'ESS. ENG. TUT': {
    bg: 'bg-rose-100/95',
    inlineBg: '#ffe4e6',
    border: 'border-rose-300',
    text: 'text-rose-950',
    badge: 'bg-rose-200 text-rose-950 border-rose-400',
    category: 'English Tutorial'
  },
  'ENV. STD.': {
    bg: 'bg-emerald-100/95',
    inlineBg: '#d1fae5',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    badge: 'bg-emerald-200 text-emerald-950 border-emerald-400',
    category: 'Environmental Studies'
  },
  'PAC': {
    bg: 'bg-lime-100/95',
    inlineBg: '#ecfccb',
    border: 'border-lime-300',
    text: 'text-lime-950',
    badge: 'bg-lime-200 text-lime-950 border-lime-400',
    category: 'Applied Chemistry'
  },
  'PCE': {
    bg: 'bg-teal-100/95',
    inlineBg: '#ccfbf1',
    border: 'border-teal-300',
    text: 'text-teal-950',
    badge: 'bg-teal-200 text-teal-950 border-teal-400',
    category: 'Polymer Chemistry'
  },
  'S&G': {
    bg: 'bg-amber-100/90',
    inlineBg: '#fef3c7',
    border: 'border-amber-300',
    text: 'text-amber-950',
    badge: 'bg-amber-200 text-amber-950 border-amber-400',
    category: 'Surveying'
  },
  'COUNSELLING': {
    bg: 'bg-violet-100/95',
    inlineBg: '#ede9fe',
    border: 'border-violet-300',
    text: 'text-violet-950',
    badge: 'bg-violet-200 text-violet-950 border-violet-400',
    category: 'Mentorship'
  },
  'LIBRARY': {
    bg: 'bg-sky-100/95',
    inlineBg: '#e0f2fe',
    border: 'border-sky-300',
    text: 'text-sky-950',
    badge: 'bg-sky-200 text-sky-950 border-sky-400',
    category: 'Library'
  },
  'YOGA / SPORTS': {
    bg: 'bg-emerald-100/95',
    inlineBg: '#d1fae5',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    badge: 'bg-emerald-200 text-emerald-950 border-emerald-400',
    category: 'Sports & Wellness'
  }
};

// Clean normalization helper
function cleanSubject(s) {
  return (s || '')
    .toUpperCase()
    .trim()
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ');
}

export function getSubjectStyle(subject = '', isLab = false) {
  const rawClean = cleanSubject(subject);

  // 1. Direct exact match
  if (EXACT_SUBJECT_COLORS[rawClean]) {
    return EXACT_SUBJECT_COLORS[rawClean];
  }

  // 2. Tutorial variations (e.g. "CAL & LA Tut Dr. NGB", "CAL & LA Tut.")
  if (rawClean.includes('CAL & LA') && (rawClean.includes('TUT') || rawClean.includes('TUTORIAL'))) {
    return EXACT_SUBJECT_COLORS['CAL & LA TUT'];
  }
  if (rawClean.includes('ESS. ENG') && (rawClean.includes('TUT') || rawClean.includes('TUTORIAL'))) {
    return EXACT_SUBJECT_COLORS['ESS. ENG. TUT'];
  }

  // 3. Normalized lab match
  if (isLab || rawClean.includes('LAB')) {
    if (rawClean.includes('PSUC')) return EXACT_SUBJECT_COLORS['PSUC LAB'];
    if (rawClean.includes('PHY')) return EXACT_SUBJECT_COLORS['ENGG. PHY. LAB'];
    if (rawClean.includes('CHEM')) return EXACT_SUBJECT_COLORS['ENGG. CHEM LAB'];
    if (rawClean.includes('DLD')) return EXACT_SUBJECT_COLORS['DLD LAB'];
    if (rawClean.includes('AITA')) return EXACT_SUBJECT_COLORS['AITA LAB'];
    if (rawClean.includes('FWD')) return EXACT_SUBJECT_COLORS['FWD LAB'];
    if (rawClean.includes('FAI') || rawClean.includes('ML')) return EXACT_SUBJECT_COLORS['FAI & ML LAB'];
    if (rawClean.includes('EME') || rawClean.includes('MECH')) return EXACT_SUBJECT_COLORS['EME LAB'];
    if (rawClean.includes('FEEE') || rawClean.includes('EEE')) return EXACT_SUBJECT_COLORS['FEEE LAB'];
    if (rawClean.includes('ENG') || rawClean.includes('ESS')) return EXACT_SUBJECT_COLORS['ESS. ENG. LAB'];
    if (rawClean.includes('PAC')) return EXACT_SUBJECT_COLORS['PAC LAB'];
    if (rawClean.includes('PCE')) return EXACT_SUBJECT_COLORS['PCE LAB'];
    if (rawClean.includes('S&G') || rawClean.includes('SURVEY')) return EXACT_SUBJECT_COLORS['S&G LAB'];

    // Default distinctive lab style
    return {
      bg: 'bg-purple-100/95',
      inlineBg: '#ede9fe',
      border: 'border-purple-300',
      text: 'text-purple-950',
      badge: 'bg-purple-200 text-purple-950 border-purple-400',
      category: 'Laboratory'
    };
  }

  // 4. Normalized theory matching
  if (rawClean.includes('CAL') || rawClean.includes('MATH') || rawClean.includes('LA')) return EXACT_SUBJECT_COLORS['CAL & LA'];
  if (rawClean.includes('SUS')) return EXACT_SUBJECT_COLORS['SUS. ENGG.'];
  if (rawClean.includes('PSUC')) return EXACT_SUBJECT_COLORS['PSUC'];
  if (rawClean.includes('PHY')) return EXACT_SUBJECT_COLORS['ENGG.PHY'];
  if (rawClean.includes('COM')) return EXACT_SUBJECT_COLORS['COM'];
  if (rawClean.includes('DLD')) return EXACT_SUBJECT_COLORS['DLD'];
  if (rawClean.includes('AITA')) return EXACT_SUBJECT_COLORS['AITA'];
  if (rawClean.includes('FWD')) return EXACT_SUBJECT_COLORS['FWD'];
  if (rawClean.includes('FAI') || rawClean.includes('ML')) return EXACT_SUBJECT_COLORS['FAI & ML'];
  if (rawClean.includes('FDS')) return EXACT_SUBJECT_COLORS['FDS'];
  if (rawClean.includes('3DDA')) return EXACT_SUBJECT_COLORS['3DDA'];
  if (rawClean.includes('EME')) return EXACT_SUBJECT_COLORS['EME'];
  if (rawClean.includes('FEEE')) return EXACT_SUBJECT_COLORS['FEEE'];
  if (rawClean.includes('ESAM')) return EXACT_SUBJECT_COLORS['ESAM'];
  if (rawClean.includes('ESS') || rawClean.includes('ENG')) return EXACT_SUBJECT_COLORS['ESS. ENG.'];
  if (rawClean.includes('ENV')) return EXACT_SUBJECT_COLORS['ENV. STD.'];
  if (rawClean.includes('PAC')) return EXACT_SUBJECT_COLORS['PAC'];
  if (rawClean.includes('PCE')) return EXACT_SUBJECT_COLORS['PCE'];
  if (rawClean.includes('S&G')) return EXACT_SUBJECT_COLORS['S&G'];
  if (rawClean.includes('COUNSEL')) return EXACT_SUBJECT_COLORS['COUNSELLING'];
  if (rawClean.includes('LIB')) return EXACT_SUBJECT_COLORS['LIBRARY'];
  if (rawClean.includes('YOGA') || rawClean.includes('SPORT')) return EXACT_SUBJECT_COLORS['YOGA / SPORTS'];

  // 5. Fallback deterministic hash generator for future subjects
  const fallbackColors = [
    { bg: 'bg-blue-100/95', inlineBg: '#dbeafe', border: 'border-blue-300', text: 'text-blue-950', badge: 'bg-blue-200 text-blue-950 border-blue-400' },
    { bg: 'bg-emerald-100/95', inlineBg: '#d1fae5', border: 'border-emerald-300', text: 'text-emerald-950', badge: 'bg-emerald-200 text-emerald-950 border-emerald-400' },
    { bg: 'bg-amber-100/95', inlineBg: '#fef3c7', border: 'border-amber-300', text: 'text-amber-950', badge: 'bg-amber-200 text-amber-950 border-amber-400' },
    { bg: 'bg-rose-100/95', inlineBg: '#ffe4e6', border: 'border-rose-300', text: 'text-rose-950', badge: 'bg-rose-200 text-rose-950 border-rose-400' },
    { bg: 'bg-purple-100/95', inlineBg: '#ede9fe', border: 'border-purple-300', text: 'text-purple-950', badge: 'bg-purple-200 text-purple-950 border-purple-400' },
    { bg: 'bg-cyan-100/95', inlineBg: '#cffafe', border: 'border-cyan-300', text: 'text-cyan-950', badge: 'bg-cyan-200 text-cyan-950 border-cyan-400' },
    { bg: 'bg-teal-100/95', inlineBg: '#ccfbf1', border: 'border-teal-300', text: 'text-teal-950', badge: 'bg-teal-200 text-teal-950 border-teal-400' },
  ];

  let hash = 0;
  for (let i = 0; i < rawClean.length; i++) {
    hash = rawClean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const selected = fallbackColors[Math.abs(hash) % fallbackColors.length];
  return {
    ...selected,
    category: 'Course'
  };
}
