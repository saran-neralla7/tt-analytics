import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, X, FileText } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';

export default function FileUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileSelect = async (file) => {
    if (!file) return;

    const validTypes = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      const parsed = await parseExcelFile(file);
      if (parsed && parsed.timetableData && Object.keys(parsed.timetableData).length > 0) {
        onUploadSuccess({
          data: parsed.timetableData,
          facultyList: parsed.facultyList || [],
          facultyMap: parsed.facultyMap || {},
          summaryStats: parsed.summaryStats
        });
        setIsProcessing(false);
        onClose();
      } else {
        throw new Error('No valid timetable data found in the uploaded file. Make sure your sheets have headers (Day, Branch, 09:00-10:00, etc.).');
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Upload Downloaded Google Sheet</h3>
            <p className="text-xs text-gray-500">
              Select or drag & drop your downloaded Excel (.xlsx / .csv) file to update the website.
            </p>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]' 
              : 'border-gray-300 hover:border-emerald-400 bg-gray-50/50 hover:bg-emerald-50/20'
          }`}
        >
          <input
            type="file"
            id="sheet-file-input"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <label htmlFor="sheet-file-input" className="cursor-pointer block">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-emerald-600 mb-3" />
            <p className="text-xs font-bold text-gray-800">
              {isProcessing ? 'Processing File...' : 'Click to Browse or Drag & Drop File Here'}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Supports Google Sheet downloaded files: <span className="font-mono text-emerald-700 font-semibold">.xlsx, .xls, .csv</span>
            </p>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <div>{error}</div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1 font-medium">
            <FileText className="w-3.5 h-3.5 text-gray-400" /> Instant local parsing (no server required)
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
