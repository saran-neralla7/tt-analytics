import React, { useState } from 'react';
import { Database, Link, Check, AlertTriangle, RefreshCw, X } from 'lucide-react';

export default function GoogleSheetSyncModal({ 
  isOpen, 
  onClose, 
  webAppUrl, 
  onSaveUrl, 
  syncStatus, 
  onTestConnection 
}) {
  const [inputUrl, setInputUrl] = useState(webAppUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!inputUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid Apps Script URL' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(inputUrl.trim());
      if (res && res.success) {
        setTestResult({ success: true, message: `Connected successfully! Found ${res.branchesCount || 0} branches.` });
      } else {
        setTestResult({ success: false, message: res?.message || 'Failed to fetch data from the script.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveUrl(inputUrl.trim());
    onClose();
  };

  const handleResetToDemo = () => {
    setInputUrl('');
    onSaveUrl('');
    setTestResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 border border-gray-100 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Google Sheet Database Settings</h3>
            <p className="text-xs text-gray-500">
              Connect your Google Workspace Google Sheet for live timetable updates.
            </p>
          </div>
        </div>

        <div className="space-y-4 my-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Google Apps Script Web App URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/a/macros/yourdomain.edu.in/s/.../exec"
                className="w-full text-xs font-mono px-3 py-2.5 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <Link className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Deploy your Google Sheet script as a Web App with access set to "Anyone" or "Anyone within domain".
            </p>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult.success ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />}
              <div>{testResult.message}</div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing Connection...' : 'Test Connection'}
            </button>

            <div className="flex items-center gap-2">
              {webAppUrl && (
                <button
                  type="button"
                  onClick={handleResetToDemo}
                  className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Use Demo Data
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
