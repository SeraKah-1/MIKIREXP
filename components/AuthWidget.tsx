import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogIn, LogOut, Loader2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, signInWithGoogle, logOut } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export const AuthWidget: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
      setSuccessMsg("Login berhasil!");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan autentikasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logOut();
      setSuccessMsg("Logout berhasil.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user.email?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg text-theme-text">{user.displayName || 'Akun Saya'}</h3>
              <p className="text-sm text-theme-muted">{user.email}</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/20 flex items-center">
            <Shield size={12} className="mr-1" /> Terhubung
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-theme-bg/50 rounded-xl border border-theme-border">
            <p className="text-xs text-theme-muted uppercase font-bold mb-1">User ID</p>
            <p className="text-xs font-mono truncate opacity-70">{user.uid}</p>
          </div>
          <div className="p-4 bg-theme-bg/50 rounded-xl border border-theme-border">
            <p className="text-xs text-theme-muted uppercase font-bold mb-1">Last Sign In</p>
            <p className="text-xs font-mono truncate opacity-70">{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : '-'}</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          disabled={isLoading}
          className="w-full py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><LogOut size={18} className="mr-2" /> Sign Out</>}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-theme-glass border border-theme-border rounded-2xl p-6 md:p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-theme-primary/10 text-theme-primary mb-4">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-bold text-theme-text">Mikir Cloud Account</h2>
        <p className="text-sm text-theme-muted mt-2">Simpan kuis secara privat & sinkronisasi antar perangkat.</p>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-start text-rose-500 text-sm">
              <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-start text-emerald-500 text-sm">
              <CheckCircle2 size={16} className="mr-2 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
              Masuk dengan Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};
