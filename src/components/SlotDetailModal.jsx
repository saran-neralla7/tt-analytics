import React from 'react';
import { BookOpen, User, MapPin, Clock, Calendar, X, Layers, Sparkles } from 'lucide-react';
import initialData from '../data/initialData.json';
import { getSubjectStyle } from '../utils/subjectColors';

// Dynamic map built from all branch legends parsed directly from Excel
const dynamicSubjectMap = {};
if (initialData.branchLegends) {
  Object.values(initialData.branchLegends).forEach(list => {
    if (Array.isArray(list)) {
      list.forEach(item => {
        if (item.subjectShort && item.subjectFullName) {
          dynamicSubjectMap[item.subjectShort.trim()] = item.subjectFullName.trim();
        }
      });
    }
  });
}

// Complete static fallbacks for all subjects, labs & co-curricular activities
const staticSubjectMap = {
  'CAL & LA': 'Calculus and Linear Algebra',
  'CAL & LA Tut': 'Calculus and Linear Algebra Tutorial',
  'CAL & LA Tut.': 'Calculus and Linear Algebra Tutorial',
  'EME': 'Elements of Mechanical Engineering',
  'EME LAB': 'Elements of Mechanical Engineering Lab',
  'COM': 'Chemistry of Materials',
  'CHEM LAB': 'Chemistry Lab',
  'DLD': 'Digital Logic Design',
  'DLD LAB': 'Digital Logic Design Lab',
  'FEEE': 'Fundamentals of Electrical and Electronics Engineering',
  'FEEE LAB': 'Fundamentals of Electrical and Electronics Engineering Lab',
  'ESAM': 'Energy Systems and Advanced Materials',
  'ENGG.PHY': 'Engineering Physics',
  'ENGG. PHY. LAB': 'Engineering Physics Lab',
  'ENGG. CHEM LAB': 'Engineering Chemistry Lab',
  'PSUC': 'Problem Solving using C',
  'PSUC LAB': 'Problem Solving using C Lab',
  'AITA': 'AI Tools and Applications',
  'AITA LAB': 'AI Tools and Applications Lab',
  'FWD': 'Fundamentals of Web Designing and User Interface',
  'FWD LAB': 'Fundamentals of Web Designing and User Interface Lab',
  'ENV. STD.': 'Environmental Studies',
  '3DDA': '3D Design and Animation',
  'PCE': 'Principles of Chemical Engineering',
  'PCE LAB': 'Principles of Chemical Engineering Lab',
  'PAC': 'Physical and Analytical Chemistry',
  'PAC LAB': 'Physical and Analytical Chemistry Lab',
  'SUS. ENGG.': 'Sustainable Engineering',
  'ESS. ENG.': 'Essential English',
  'ESS. ENG. LAB': 'Essential English Lab',
  'ESS. ENG. Tut': 'Essential English Tutorial',
  'ESS. ENG. Tut.': 'Essential English Tutorial',
  'S&G': 'Surveying and Geomatics',
  'S&G LAB': 'Surveying and Geomatics Lab',
  'FAI & ML': 'Foundations of Artificial Intelligence & Machine Learning',
  'FAI & ML LAB': 'Foundations of Artificial Intelligence & Machine Learning Lab',
  'FDS': 'Foundations of Data Science',
  'FDS / CSP': 'Foundations of Data Science / Principles of Cyber Security',
  'FDS / CSP LAB': 'Foundations of Data Science / Principles of Cyber Security Lab',
  'YOGA / SPORTS': 'Yoga, Physical Education & Sports',
  'LIBRARY': 'Library & Self-Study Session',
  'COUNSELLING': 'Student Mentoring & Counselling'
};

export function getFullCourseName(subject = '') {
  if (!subject) return 'Course Details';
  const clean = subject.trim();
  
  if (dynamicSubjectMap[clean]) return dynamicSubjectMap[clean];
  if (staticSubjectMap[clean]) return staticSubjectMap[clean];

  const withoutPeriod = clean.replace(/\.$/, '');
  if (dynamicSubjectMap[withoutPeriod]) return dynamicSubjectMap[withoutPeriod];
  if (staticSubjectMap[withoutPeriod]) return staticSubjectMap[withoutPeriod];

  if (clean.startsWith('CAL & LA Tut')) return 'Calculus and Linear Algebra Tutorial';
  if (clean.startsWith('ESS. ENG. Tut')) return 'Essential English Tutorial';

  return clean;
}

export default function SlotDetailModal({ isOpen, onClose, slotData, day, timeSlot, branch }) {
  if (!isOpen || !slotData) return null;

  const items = Array.isArray(slotData) ? slotData : [slotData];
  const facultyList = initialData.facultyList || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-blue-100 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Period & Course Details</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 font-mono">
              <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <Calendar className="w-3.5 h-3.5" /> {day}
              </span>
              <span className="flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                <Clock className="w-3.5 h-3.5" /> {timeSlot}
              </span>
              {branch && (
                <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  <Layers className="w-3.5 h-3.5" /> {branch}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Course Cards */}
        <div className="space-y-4 my-2">
          {items.map((item, idx) => {
            const fullSubjectName = getFullCourseName(item.subject);
            const style = getSubjectStyle(item.subject, item.isLab);
            
            // Lookup faculty full info if available
            const facultyNames = item.faculty ? item.faculty.split(/[,|]+/).map(f => f.trim()) : [];

            return (
              <div key={idx} className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3">
                {items.length > 1 && (
                  <div className="inline-block px-2.5 py-0.5 text-[11px] font-extrabold bg-purple-100 text-purple-800 rounded-full border border-purple-200 uppercase">
                    Parallel Session {idx + 1}
                  </div>
                )}

                {/* Full Course Name */}
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border ${style.bg} ${style.border}`}>
                    <BookOpen className={`w-5 h-5 ${style.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Course Name</div>
                    <div className="text-base font-black text-gray-900 leading-snug">
                      {fullSubjectName}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${style.bg} ${style.border} ${style.text}`}>
                        Code: {item.subject}
                      </span>
                      {item.isLab && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          Practical / Lab
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Faculty Full Details */}
                <div className="flex items-start gap-2.5 pt-2 border-t border-gray-200/60">
                  <User className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Faculty In-Charge</div>
                    {facultyNames.length > 0 ? (
                      <div className="space-y-1 mt-1">
                        {facultyNames.map((facName, fIdx) => {
                          const info = facultyList.find(f => f.fullName === facName || f.shortName === facName);
                          return (
                            <div key={fIdx} className="bg-white p-2 rounded-lg border border-gray-200 text-xs">
                              <div className="font-bold text-gray-900">{info?.fullName || facName}</div>
                              {info && (
                                <div className="text-[11px] text-gray-500 font-medium">
                                  {info.designation} • Dept of {info.dept}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-medium">Faculty Advisors / Coordinators</div>
                    )}
                  </div>
                </div>

                {/* Room / Location */}
                {item.room && (
                  <div className="flex items-center gap-2.5 pt-2 border-t border-gray-200/60">
                    <MapPin className="w-5 h-5 text-purple-600 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Classroom / Lab Location</div>
                      <div className="text-xs font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded inline-block mt-0.5 border border-purple-200">
                        {item.room} {item.isLab ? '(Practical Laboratory)' : '(Lecture Room)'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Close */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
