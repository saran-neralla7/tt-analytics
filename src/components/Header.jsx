import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle2, AlertCircle, FileCheck } from 'lucide-react';

export default function Header({ 
  universityInfo, 
  syncStatus, 
  activeFileName,
  lastSyncTime
}) {
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar once user scrolls down past the main header banner (~220px)
      if (window.scrollY > 220) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Sticky Single-Line Topbar: Appears ONLY after main header scrolls up */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-300 shadow-md transition-all duration-300 no-print ${
          showStickyBar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              src={universityInfo.logo} 
              alt="University Logo" 
              className="h-8 sm:h-9 w-auto object-contain shrink-0 drop-shadow-xs"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs sm:text-sm md:text-base font-black text-[#0a2540] uppercase tracking-tight truncate font-sans">
                {universityInfo.name}
              </span>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                {universityInfo.semester || 'B.Tech 1st Sem'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Print or Export as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / Export</span>
            </button>
          </div>
        </div>
      </div>

      <header className="bg-white border-b-2 border-slate-200/90 pt-6 pb-6 px-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print flex flex-wrap justify-between items-center gap-3 mb-6 pb-4 border-b border-slate-100 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Data Source:</span>
            {syncStatus === 'uploaded' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Uploaded: {activeFileName}
              </span>
            ) : syncStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Google Sheets Live DB
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-xs">
                <AlertCircle className="w-4 h-4 text-blue-600" /> Local Demo Mode
              </span>
            )}
            {lastSyncTime && (
              <span className="text-slate-400 hidden sm:inline text-xs">
                ({lastSyncTime})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-lg text-white bg-blue-700 hover:bg-blue-800 shadow-md transition-all hover:shadow-lg active:scale-95"
              title="Print or Export as PDF"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
          </div>
        </div>

        {/* University Official Branding Header - Senior-friendly large typography & distinguished academic colors */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={universityInfo.logo} 
              alt="Gayatri Vidya Parishad Logo" 
              className="h-24 sm:h-28 w-auto object-contain drop-shadow-md hover:scale-102 transition-transform duration-200"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-[32px] font-black tracking-tight text-[#0a2540] uppercase font-sans leading-snug">
            {universityInfo.name}
          </h1>
          
          <p className="text-sm sm:text-base font-semibold text-slate-700 mt-1 max-w-4xl mx-auto leading-relaxed">
            {universityInfo.statusText}
          </p>

          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            {universityInfo.address}
          </p>

          {/* Distinguished Academic Badge */}
          <div className="mt-4 flex flex-wrap justify-center items-center gap-3">
            <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 px-6 py-2 rounded-full bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 border border-blue-200 shadow-sm text-sm sm:text-base font-bold text-slate-800">
              <span>TENTATIVE TIME TABLE FOR THE ACADEMIC YEAR <span className="font-extrabold text-blue-900">{universityInfo.academicYear}</span></span>
              <span className="text-blue-300 hidden sm:inline">•</span>
              <span className="px-3.5 py-1 rounded-full bg-blue-700 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-xs">
                {universityInfo.semester || 'B.Tech 1st Sem'}
              </span>
            </div>
          </div>

          <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-2.5 font-mono">
            w.e.f : {universityInfo.wef} &nbsp;|&nbsp; Version: {universityInfo.version}
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
