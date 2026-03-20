import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Save, Trash2, ShieldCheck, Zap, Database, HardDrive, Server, Layers, ShieldAlert, Hand, ArrowRight, PlayCircle, Palette, Cloud } from 'lucide-react';
import { 
  saveApiKey, 
  getApiKey, 
  removeApiKey, 
  saveStorageConfig, 
  getStorageProvider, 
  saveGestureEnabled, 
  getGestureEnabled,
  saveTheme,
  saveSRSEnabled,
  getSRSEnabled
} from '../services/storageService';
import { requestKaomojiPermission } from '../services/kaomojiNotificationService';
import { scheduleDailyReminder, getReminderTime } from '../services/notificationService';
import { getSavedTheme, applyTheme } from '../services/themeService';
import { GlassButton } from './GlassButton';
import { ThemeSelector } from './ThemeSelector';
import { AiProvider, StorageProvider, ThemeName } from '../types';
import { AuthWidget } from './AuthWidget';
import { getActiveProvider } from '../services/geminiService';

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AiProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [isGeminiSaved, setIsGeminiSaved] = useState(false);
  const [storageTab, setStorageTab] = useState<'ai' | 'storage' | 'account' | 'appearance' | 'features' | 'notifications'>('ai');
  const [storageProvider, setStorageProvider] = useState<StorageProvider>('local');
  const [srsEnabled, setSrsEnabledState] = useState(true);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getSavedTheme());

  // NOTIFICATION STATES
  const [reminderTime, setReminderTime] = useState('');
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  useEffect(() => {
    // Check permissions on mount
    if ("Notification" in window) {
        setNotifPermission(Notification.permission);
    }
    
    const savedTime = getReminderTime();
    if (savedTime) setReminderTime(savedTime);

    const savedGemini = getApiKey('gemini');
    if (savedGemini) { setGeminiKey(savedGemini); setIsGeminiSaved(true); }
    setStorageProvider(getStorageProvider());
    setSrsEnabledState(getSRSEnabled());
    setGestureEnabled(getGestureEnabled());
  }, []);

  const handleRequestNotif = async () => {
      const granted = await requestKaomojiPermission();
      setNotifPermission(granted ? 'granted' : 'denied');
      if (granted) alert("Notifikasi diaktifkan! ( ◕ ‿ ◕ )");
      else alert("Notifikasi ditolak browser. Cek setting browser kamu.");
  };

  const handleSaveReminder = () => {
      if (notifPermission !== 'granted') {
          alert("Aktifkan izin notifikasi dulu ya!");
          return;
      }
      if (reminderTime) {
          scheduleDailyReminder(reminderTime);
          alert(`Pengingat diset jam ${reminderTime}!`);
      }
  };

  const handleSaveKeys = () => {
    if (geminiKey.trim().length > 10) { saveApiKey('gemini', geminiKey.trim()); setIsGeminiSaved(true); alert("Gemini Key berhasil disimpan!"); }
  };

  const handleDeleteKey = () => {
    if (confirm(`Hapus API Key?`)) {
      removeApiKey('gemini');
      setGeminiKey(''); setIsGeminiSaved(false);
    }
  };

  const handleSaveStorage = () => {
    if (storageProvider === 'firebase') {
      saveStorageConfig('firebase');
      alert("Firebase diaktifkan!");
    } else {
      saveStorageConfig('local');
      alert("Local Storage aktif.");
    }
  };

  const toggleSRS = () => { const newState = !srsEnabled; setSrsEnabledState(newState); saveSRSEnabled(newState); };
  const toggleGesture = () => { const newState = !gestureEnabled; setGestureEnabled(newState); saveGestureEnabled(newState); };

  const handleThemeChange = (theme: ThemeName) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    saveTheme(theme as any);
  };

  const inputStyle = "w-full bg-theme-glass border border-theme-border rounded-xl px-4 py-3 text-theme-text placeholder:text-theme-muted/50 focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all";
  const tabActive = "bg-theme-primary text-white shadow-lg";
  const tabInactive = "bg-theme-glass text-theme-muted hover:bg-theme-bg border border-transparent hover:border-theme-border";

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-32 px-4 text-theme-text relative">
      <div className="flex space-x-2 md:space-x-4 mb-8 justify-center overflow-x-auto pb-2 scrollbar-hide">
         {['ai', 'storage', 'account', 'appearance', 'features', 'notifications'].map(tab => (
           <button key={tab} onClick={() => setStorageTab(tab as any)} className={`px-6 py-2 rounded-full font-medium transition-all whitespace-nowrap capitalize ${storageTab === tab ? tabActive : tabInactive}`}>{tab}</button>
         ))}
      </div>

      <motion.div key={storageTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-theme-glass border border-theme-border rounded-3xl p-8 shadow-xl">
        {storageTab === 'ai' && (
          <>
            <div className="flex items-center space-x-3 mb-6 select-none"><div className="p-3 bg-theme-primary/10 rounded-xl text-theme-primary"><Key size={24} /></div><div><h2 className="text-2xl font-bold">API Key</h2><p className="text-sm opacity-70">Akses Gemini AI.</p></div></div>
            
            {/* Provider Status Badge */}
            <div className={`mb-6 p-4 rounded-2xl border flex items-center space-x-3 ${
              import.meta.env.VITE_USE_VERTEX_EXPRESS === 'true'
                ? 'bg-blue-500/10 border-blue-500/30' 
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className={`p-2 rounded-xl ${
                import.meta.env.VITE_USE_VERTEX_EXPRESS === 'true' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'
              }`}>
                {import.meta.env.VITE_USE_VERTEX_EXPRESS === 'true' ? <Cloud size={20} /> : <Key size={20} />}
              </div>
              <div>
                <p className={`text-sm font-bold ${
                  import.meta.env.VITE_USE_VERTEX_EXPRESS === 'true' ? 'text-blue-600' : 'text-emerald-600'
                }`}>
                  {import.meta.env.VITE_USE_VERTEX_EXPRESS === 'true' ? '☁️ Mode: Vertex AI Express (Primary)' : '🔑 Mode: Google AI Studio'}
                </p>
                <p className="text-xs opacity-60">
                  {import.meta.env.VITE_USE_VERTEX_EXPRESS === 'true'
                    ? `Dikonfigurasi via Vercel Environment Variables` 
                    : 'Langsung menggunakan API Key tanpa Vertex AI'}
                </p>
              </div>
            </div>
            <div className="space-y-6">
            <div>
                <div className="flex justify-between items-end mb-2">
                   <label className="block text-sm font-medium text-theme-text">Google Gemini Key</label>
                   <a 
                     href='https://aistudio.google.com/app/apikey' 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                   >
                     Dapatkan Key <ArrowRight size={12} className="ml-1" />
                   </a>
                </div>
                <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="Paste Key here..." className={inputStyle} />
                
                {/* Expandable Tutorial */}
                <details className="mt-3 group bg-theme-glass border border-theme-border rounded-xl overflow-hidden">
                   <summary className="p-3 flex items-center cursor-pointer list-none hover:bg-theme-bg/50 transition-colors">
                       <div className="p-1.5 bg-theme-primary/10 rounded-md mr-3 shrink-0 group-open:bg-theme-primary/20 transition-colors">
                          <PlayCircle size={16} className="text-theme-primary" />
                       </div>
                       <div className="flex-1">
                          <p className="text-xs font-bold text-theme-text">Tutorial: Cara mendapatkan Gemini API Key</p>
                          <p className="text-[10px] text-theme-muted mt-0.5 group-open:hidden">Klik untuk melihat langkah-langkah</p>
                       </div>
                   </summary>
                   <div className="p-4 pt-0 text-xs text-theme-muted border-t border-theme-border bg-theme-bg/30">
                       <ol className="list-decimal ml-4 space-y-2 mt-3">
                           <li>Buka <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-theme-primary font-bold hover:underline">Google AI Studio</a>.</li>
                           <li>Login menggunakan akun Google Anda.</li>
                           <li>Klik tombol <b>"Create API key"</b>.</li>
                           <li>Pilih <b>"Create API key in new project"</b>.</li>
                           <li>Tunggu beberapa saat, lalu <b>Copy</b> API Key yang muncul.</li>
                           <li>Paste API Key tersebut ke dalam kotak di atas.</li>
                       </ol>
                   </div>
                </details>
            </div>
            <div className="flex space-x-3 pt-4 border-t border-theme-border">
                <GlassButton onClick={handleSaveKeys} className="flex-1 flex items-center justify-center"><Save size={18} className="mr-2" /> Simpan Key</GlassButton>
                {isGeminiSaved && <button onClick={handleDeleteKey} className="px-4 py-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"><Trash2 size={20} /></button>}
            </div>
            </div>
          </>
        )}
        
        {storageTab === 'storage' && (
          <>
             <div className="flex items-center space-x-3 mb-6"><div className="p-3 bg-theme-primary/10 rounded-xl text-theme-primary"><Database size={24} /></div><div><h2 className="text-2xl font-bold">Storage</h2><p className="text-sm opacity-70">Pilih penyimpanan data.</p></div></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => setStorageProvider('local')} className={`p-4 rounded-2xl border text-left transition-all ${storageProvider === 'local' ? 'bg-theme-primary/10 border-theme-primary ring-2 ring-theme-primary/20' : 'bg-theme-glass border-theme-border'}`}>
                <div className="flex items-center space-x-2 text-theme-primary font-bold mb-1"><HardDrive size={18} /> <span>Local</span></div>
                <p className="text-xs opacity-60">Disimpan di Browser.</p>
              </button>
              <button onClick={() => setStorageProvider('firebase')} className={`p-4 rounded-2xl border text-left transition-all ${storageProvider === 'firebase' ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20' : 'bg-theme-glass border-theme-border'}`}>
                <div className="flex items-center space-x-2 text-amber-600 font-bold mb-1"><Server size={18} /> <span>Firebase</span></div>
                <p className="text-xs opacity-60">Database Cloud.</p>
              </button>
            </div>
            <div className="flex gap-3 pt-2">
               <GlassButton onClick={handleSaveStorage} className="w-full flex items-center justify-center"><Save size={18} className="mr-2" /> Simpan Konfigurasi</GlassButton>
            </div>
          </>
        )}

        {storageTab === 'account' && (
          <AuthWidget />
        )}

        {storageTab === 'appearance' && (
          <>
             <div className="flex items-center space-x-3 mb-6"><div className="p-3 bg-theme-primary/10 rounded-xl text-theme-primary"><Palette size={24} /></div><div><h2 className="text-2xl font-bold">Tema</h2><p className="text-sm opacity-70">Ganti suasana hati.</p></div></div>
             <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
          </>
        )}

        {storageTab === 'notifications' && (
            <>
              <div className="flex items-center space-x-3 mb-6"><div className="p-3 bg-theme-primary/10 rounded-xl text-theme-primary"><ShieldAlert size={24} /></div><div><h2 className="text-2xl font-bold">Notifikasi</h2><p className="text-sm opacity-70">Atur pengingat belajar.</p></div></div>
              
              <div className="bg-theme-glass border border-theme-border rounded-2xl p-6 mb-6">
                 <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-lg">Izin Browser</h3>
                        <p className="text-sm opacity-60">Izinkan Mikir mengirim notifikasi.</p>
                    </div>
                    <button 
                        onClick={handleRequestNotif}
                        disabled={notifPermission === 'granted'}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${notifPermission === 'granted' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-theme-primary text-white shadow-lg hover:bg-theme-primary/90'}`}
                    >
                        {notifPermission === 'granted' ? 'Aktif (Granted)' : 'Aktifkan Notifikasi'}
                    </button>
                 </div>
                 {notifPermission === 'denied' && (
                     <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
                        Browser memblokir notifikasi. Silakan reset izin di pengaturan browser (ikon gembok di URL bar).
                     </div>
                 )}
              </div>

              <div className="bg-theme-glass border border-theme-border rounded-2xl p-6">
                  <h3 className="font-bold text-lg mb-4">Jadwal Belajar Harian</h3>
                  <div className="flex items-end gap-4">
                      <div className="flex-1">
                          <label className="block text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Waktu Pengingat</label>
                          <input 
                            type="time" 
                            value={reminderTime} 
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-theme-primary"
                          />
                      </div>
                      <GlassButton onClick={handleSaveReminder} className="h-[58px] px-6 flex items-center justify-center font-bold">
                          <Save size={18} className="mr-2" /> Simpan Jadwal
                      </GlassButton>
                  </div>
                  <p className="text-xs opacity-60 mt-4">
                      * Kami akan mengirim notifikasi lucu setiap hari pada jam ini untuk mengingatkanmu belajar.
                  </p>
              </div>
            </>
        )}

        {storageTab === 'features' && (
           <>
             <div className="flex items-center space-x-3 mb-6"><div className="p-3 bg-theme-primary/10 rounded-xl text-theme-primary"><Layers size={24} /></div><div><h2 className="text-2xl font-bold">Fitur</h2></div></div>
             
             <div className="bg-theme-glass border border-theme-border rounded-2xl p-4 flex items-center justify-between mb-4">
               <div><h3 className="font-bold">Spaced Repetition (SRS)</h3><p className="text-xs opacity-60">Review berkala otomatis.</p></div>
               <button onClick={toggleSRS} className={`w-14 h-8 rounded-full p-1 transition-colors ${srsEnabled ? 'bg-theme-primary' : 'bg-slate-300'}`}><motion.div className="w-6 h-6 bg-white rounded-full shadow-sm" animate={{ x: srsEnabled ? 24 : 0 }} /></button>
             </div>

             <div className="bg-theme-glass border border-theme-border rounded-2xl p-4 flex items-center justify-between">
               <div>
                 <h3 className="font-bold flex items-center"><Hand size={14} className="mr-1 text-purple-500" /> Gesture Control</h3>
                 <p className="text-xs opacity-60">Jawab kuis dengan jari (Kamera). <span className="text-rose-500 font-bold text-[10px] uppercase">Experimental</span></p>
               </div>
               <button onClick={toggleGesture} className={`w-14 h-8 rounded-full p-1 transition-colors ${gestureEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}><motion.div className="w-6 h-6 bg-white rounded-full shadow-sm" animate={{ x: gestureEnabled ? 24 : 0 }} /></button>
             </div>
           </>
        )}
      </motion.div>
    </div>
  );
};
