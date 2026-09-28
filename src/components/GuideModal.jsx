import React, { useState } from 'react';
import { HelpCircle, FileCode, CheckCircle, Copy, Check, ExternalLink, X } from 'lucide-react';

export default function GuideModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = `function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = { status: "success", timetableData: {} };
    var sheets = ss.getSheets();
    
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var branchName = sheet.getName().toUpperCase();
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) continue;
      
      var headers = data[0];
      result.timetableData[branchName] = {};

      for (var r = 1; r < data.length; r++) {
        var day = data[r][0] ? data[r][0].toString().trim().toUpperCase() : "";
        if (!day) continue;
        result.timetableData[branchName][day] = {};

        for (var c = 1; c < headers.length; c++) {
          var timeSlot = headers[c] ? headers[c].toString().trim() : "";
          var val = data[r][c] ? data[r][c].toString().trim() : "";

          if (timeSlot && val) {
            result.timetableData[branchName][day][timeSlot] = {
              subject: val,
              faculty: '',
              room: '',
              isLab: val.toUpperCase().indexOf('LAB') > -1
            };
          }
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-gray-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">How to use Google Sheets as Live DB</h3>
            <p className="text-xs text-gray-500">
              Follow these simple steps in your Google Workspace domain account.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-gray-700">
          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-900 text-sm mb-1 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              How Live Updates Work:
            </h4>
            <p className="leading-relaxed text-purple-800">
              When you edit a subject, room, or faculty name in your Google Sheet, Google Sheets automatically saves it. The website queries your script endpoint and displays the updated timetable instantly without requiring any database hosting!
            </p>
          </div>

          <ol className="list-decimal pl-5 space-y-3 font-medium text-gray-800">
            <li>
              <span className="font-bold">Open your Google Sheet</span> where timetables are generated in Google Workspace.
            </li>
            <li>
              Click on <span className="font-bold text-blue-600">Extensions &gt; Apps Script</span> in the top menu of Google Sheets.
            </li>
            <li>
              Replace any default code in <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">Code.gs</code> with the snippet below:
              <div className="relative mt-2">
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed max-h-48">
                  {scriptCode}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 px-2.5 py-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white rounded flex items-center gap-1 transition-colors backdrop-blur-sm"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </li>
            <li>
              Click <span className="font-bold text-blue-600">Deploy &gt; New deployment</span> (top right).
            </li>
            <li>
              Select type: <span className="font-bold">Web app</span>.
              <ul className="list-disc pl-5 mt-1 text-gray-600 space-y-1">
                <li>Execute as: <span className="font-semibold text-gray-800">Me (your email)</span></li>
                <li>Who has access: <span className="font-semibold text-gray-800">Anyone</span> (or Anyone within Gayatri Vidya Parishad domain)</li>
              </ul>
            </li>
            <li>
              Click <span className="font-bold text-blue-600">Deploy</span>, authorize permissions, and copy the generated Web App URL.
            </li>
            <li>
              Paste the URL into <span className="font-bold text-blue-600">Connect Google Sheet</span> on this website!
            </li>
          </ol>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
