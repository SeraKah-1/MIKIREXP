import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Bell, Check, Calendar as CalendarIcon, Download } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { requestNotificationPermission, scheduleDailyReminder, getReminderTime, downloadICSFile } from '../services/notificationService';

interface StudySchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTopic?: string;
}

export const StudyScheduler: React.FC<StudySchedulerProps> = ({ isOpen, onClose, defaultTopic = "" }) => {
  const [time, setTime] = useState("19:00");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    const savedTime = getReminderTime();
    if (savedTime) setTime(savedTime);
    if (Notification.permission === "granted") setPermissionGranted(true);
  }, [isOpen]);

  const handleActivate = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    
    if (granted) {
      scheduleDailyReminder(time);
      setIsScheduled(true);
      setTimeout(() => {
        setIsScheduled(false);
        onClose();
      }, 1500);
    }
  };

  // Google Calendar Fallback
  const handleGoogleCalendar = () => {
    const title = encodeURIComponent(`Belajar Rutin: ${defaultTopic || "Materi Umum"}`);
    const details = encodeURIComponent(`Waktunya mengasah otak di Mikir (-•_•)!`);
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&recur=RRULE:FREQ=DAILY`;
    window.open(gCalUrl, '_blank');
  };

  const handleDownloadICS = () => {
    downloadICSFile(time, defaultTopic);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full mb-3 shadow-sm">
                <Bell size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Aktifkan Notifikasi</h2>
              <p className="text-sm text-slate-500 mt-1">Kami akan mengingatkanmu untuk belajar setiap hari lewat browser.</p>
            </div>

            <div className="space-y-6">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">Pilih Jam Pengingat</label>
                 <div className="relative max-w-[150px] mx-auto">
                   <Clock size={18} className="absolute left-3 top-3.5 text-indigo-400" />
                   <input 
                     type="time" 
                     value={time}
                     onChange={(e) => setTime(e.target.value)}
                     className="w-full pl-10 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-lg font-bold text-indigo-700 text-center outline-none focus:ring-2 focus:ring-indigo-300"
                   />
                 </div>
              </div>

              <div>
                <GlassButton fullWidth onClick={handleActivate} disabled={isScheduled}>
                  <div className="flex items-center justify-center">
                    {isScheduled ? <Check size={18} className="mr-2" /> : <Bell size={18} className="mr-2" />}
                    {isScheduled ? "Berhasil Diatur!" : "Simpan Jadwal"}
                  </div>
                </GlassButton>
                
                <div className="mt-4 flex flex-col space-y-2">
                  <button 
                    onClick={handleGoogleCalendar} 
                    className="w-full text-xs text-slate-500 hover:text-indigo-600 flex items-center justify-center py-2 bg-slate-50 rounded-xl border border-slate-100 transition-colors"
                  >
                    <CalendarIcon size={14} className="mr-2" /> Tambah ke Google Calendar
                  </button>
                  <button 
                    onClick={handleDownloadICS} 
                    className="w-full text-xs text-slate-500 hover:text-indigo-600 flex items-center justify-center py-2 bg-slate-50 rounded-xl border border-slate-100 transition-colors"
                  >
                    <Download size={14} className="mr-2" /> Download File .ICS (Apple/Outlook)
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};