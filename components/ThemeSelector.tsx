
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';
import { ThemeName, applyTheme, getThemeList } from '../services/themeService';

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  const themes = getThemeList();

  const handleSelect = (id: ThemeName) => {
    applyTheme(id);
    onThemeChange(id);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => handleSelect(t.id)}
          className={`
            relative p-4 rounded-2xl border flex items-center space-x-4 transition-all duration-200 text-left group
            ${currentTheme === t.id 
              ? 'bg-theme-glass ring-2 ring-theme-primary border-theme-primary shadow-lg' 
              : 'bg-theme-bg/30 border-theme-border hover:bg-theme-glass'}
          `}
        >
          {/* Color Preview Circle */}
          <div 
            className="w-12 h-12 rounded-full border border-slate-200/20 shadow-inner flex items-center justify-center shrink-0"
            style={{ backgroundColor: t.previewColor }}
          >
             {currentTheme === t.id && (
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                 <Check size={18} style={{ color: t.textColor }} />
               </motion.div>
             )}
          </div>
          
          <div>
            <h4 className="font-bold text-sm text-theme-text group-hover:text-theme-primary transition-colors">
              {t.name}
            </h4>
            <p className="text-[10px] text-theme-muted uppercase tracking-wider font-medium">
              {t.desc}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
