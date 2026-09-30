import React, { useState } from 'react';
import Header from './components/Header';
import ViewTabs from './components/ViewTabs';
import BranchView from './components/BranchView';
import MasterView from './components/MasterView';
import IndividualView from './components/IndividualView';
import LabView from './components/LabView';
import RoomsView from './components/RoomsView';
import FacultyWorkloadView from './components/FacultyWorkloadView';
import SlotDetailModal from './components/SlotDetailModal';
import { universityInfo } from './data/mockData';
import initialData from './data/initialData.json';

export default function App() {
  // REQUIREMENT: Default active view is 'master' on page load!
  const [activeTab, setActiveTab] = useState('master');
  const [selectedBranch, setSelectedBranch] = useState('CSE-1');
  
  // Storage & State
  const [timetableData] = useState(initialData.timetableData || {});
  const [branchLegends] = useState(initialData.branchLegends || {});
  const [labSheetsData] = useState(initialData.labSheetsData || {});
  const [facultyList] = useState(initialData.facultyList || []);
  const syncStatus = 'uploaded';
  const activeFileName = '1st Sem TIME TABLE 2026-2027_1.1.xlsx';
  const lastSyncTime = 'Excel File Loaded';

  // Slot Detail Modal State
  const [slotDetail, setSlotDetail] = useState(null);
  const [isSlotDetailOpen, setIsSlotDetailOpen] = useState(false);

  // Slot click handler for all views
  const handleSlotClick = (items, day, timeSlot, branch) => {
    setSlotDetail({ items, day, timeSlot, branch });
    setIsSlotDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Official Header */}
      <Header
        universityInfo={universityInfo}
        syncStatus={syncStatus}
        activeFileName={activeFileName}
        lastSyncTime={lastSyncTime}
      />

      {/* View Tabs Selector */}
      <ViewTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Active Tab View Rendering */}
      <main className="flex-1 pb-12">
        {activeTab === 'master' && (
          <MasterView
            timetableData={timetableData}
            branchLegends={branchLegends}
            universityInfo={universityInfo}
            facultyList={facultyList}
            onSlotClick={handleSlotClick}
          />
        )}

        {activeTab === 'branch' && (
          <BranchView
            timetableData={timetableData}
            branchLegends={branchLegends}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            universityInfo={universityInfo}
            onSlotClick={handleSlotClick}
          />
        )}

        {activeTab === 'individual' && (
          <IndividualView
            timetableData={timetableData}
            universityInfo={universityInfo}
            facultyList={facultyList}
            onSlotClick={handleSlotClick}
          />
        )}

        {activeTab === 'lab' && (
          <LabView
            timetableData={timetableData}
            labSheetsData={labSheetsData}
            universityInfo={universityInfo}
            onSlotClick={handleSlotClick}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsView
            timetableData={timetableData}
            universityInfo={universityInfo}
            onSlotClick={handleSlotClick}
          />
        )}

        {activeTab === 'workload' && (
          <FacultyWorkloadView
            universityInfo={universityInfo}
            facultyList={facultyList}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Gayatri Vidya Parishad Institute of Higher Learning and Research. All Rights Reserved.</p>
        <p className="text-[11px] text-gray-400 mt-1">Timetable Display & Analytics Portal • Powered by Gayatri Vidya Parishad Live API</p>
      </footer>

      {/* Modals */}
      <SlotDetailModal
        isOpen={isSlotDetailOpen}
        onClose={() => setIsSlotDetailOpen(false)}
        slotData={slotDetail?.items}
        day={slotDetail?.day}
        timeSlot={slotDetail?.timeSlot}
        branch={slotDetail?.branch}
      />
    </div>
  );
}
