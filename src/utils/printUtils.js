// Unified Print Orientation & Paper Format Utility for Timetable Analytics

export const PRINT_FORMATS = {
  A4_PORTRAIT: {
    id: 'a4-portrait',
    shortLabel: 'A4 Portrait',
    label: 'A4 Portrait (Vertical)',
    size: 'A4',
    orientation: 'portrait',
    cssSize: 'A4 portrait',
    margin: '4mm 4mm',
    bodyFontSize: '8pt',
    description: 'Best for Branch, Faculty & 1-page compact rosters'
  },
  A4_LANDSCAPE: {
    id: 'a4-landscape',
    shortLabel: 'A4 Landscape',
    label: 'A4 Landscape (Horizontal)',
    size: 'A4',
    orientation: 'landscape',
    cssSize: 'A4 landscape',
    margin: '4mm 5mm',
    bodyFontSize: '8.2pt',
    description: 'Standard horizontal sheet for single department grids'
  },
  A3_LANDSCAPE: {
    id: 'a3-landscape',
    shortLabel: 'A3 Landscape',
    label: 'A3 Landscape (Large Matrix)',
    size: 'A3',
    orientation: 'landscape',
    cssSize: 'A3 landscape',
    margin: '4mm 5mm',
    bodyFontSize: '9pt',
    description: 'Wide expansive sheet for full multi-branch matrices'
  }
};

export const getPrintFormat = (formatId) => {
  return (
    Object.values(PRINT_FORMATS).find(f => f.id === formatId) ||
    PRINT_FORMATS.A4_PORTRAIT
  );
};

export const applyPrintFormat = (formatId = 'a4-portrait') => {
  const format = getPrintFormat(formatId);
  
  if (typeof document === 'undefined') return format;

  let styleEl = document.getElementById('dynamic-page-orientation-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-page-orientation-style';
    document.head.appendChild(styleEl);
  }

  // Force override on root @page as well as any named page selectors in index.css
  styleEl.innerHTML = `
    @page {
      size: ${format.cssSize} !important;
      margin: ${format.margin} !important;
    }
    @page branchA3Landscape {
      size: ${format.cssSize} !important;
      margin: ${format.margin} !important;
    }
    @page individualA4Portrait {
      size: ${format.cssSize} !important;
      margin: ${format.margin} !important;
    }
    @page deptPrintPage {
      size: ${format.cssSize} !important;
      margin: ${format.margin} !important;
    }
    @media print {
      html, body {
        font-size: ${format.bodyFontSize} !important;
      }
    }
  `;

  return format;
};

export const triggerPrint = (formatId, beforePrintCallback, delay = 80) => {
  applyPrintFormat(formatId);
  if (typeof beforePrintCallback === 'function') {
    beforePrintCallback();
  }
  setTimeout(() => {
    window.print();
  }, delay);
};
