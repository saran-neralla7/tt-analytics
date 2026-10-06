import React from 'react';
import { PRINT_FORMATS, applyPrintFormat } from '../utils/printUtils';
import { FileText, LayoutTemplate, Maximize2 } from 'lucide-react';

export default function PrintFormatToggle({
  selectedFormat = 'a4-portrait',
  onFormatChange,
  formats = ['a4-portrait', 'a4-landscape', 'a3-landscape'],
  compact = false,
  className = ''
}) {
  const getIcon = (id) => {
    switch (id) {
      case 'a4-portrait':
        return <FileText className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'a4-landscape':
        return <LayoutTemplate className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'a3-landscape':
        return <Maximize2 className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      default:
        return <FileText className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
    }
  };

  const handleSelect = (formatId) => {
    if (onFormatChange) {
      onFormatChange(formatId);
    }
    // Eagerly apply CSS so page rules are instantly active
    applyPrintFormat(formatId);
  };

  return (
    <div 
      className={`inline-flex items-center p-0.5 sm:p-1 bg-slate-100/90 rounded-lg sm:rounded-xl border border-slate-300/80 shadow-2xs select-none no-print ${className}`}
      title="Select Page Size & Print Orientation"
    >
      <span className="hidden xl:inline-block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 px-2">
        Page:
      </span>
      {formats.map((formatId) => {
        const item = Object.values(PRINT_FORMATS).find(f => f.id === formatId);
        if (!item) return null;
        const isActive = selectedFormat === formatId;

        return (
          <button
            key={formatId}
            type="button"
            onClick={() => handleSelect(formatId)}
            className={`inline-flex items-center gap-1.5 rounded-md sm:rounded-lg font-bold transition-all cursor-pointer ${
              compact 
                ? 'px-2 py-1 text-[11px]' 
                : 'px-2.5 sm:px-3 py-1.5 text-xs'
            } ${
              isActive
                ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-500/20 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title={`${item.label} — ${item.description}`}
          >
            {getIcon(formatId)}
            <span>{item.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
