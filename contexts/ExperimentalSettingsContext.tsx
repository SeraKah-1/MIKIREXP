import React, { createContext, useContext, useState, useEffect } from 'react';

interface ExperimentalSettingsContextType {
  isExperimentalEnabled: boolean;
  toggleExperimental: () => void;
}

const ExperimentalSettingsContext = createContext<ExperimentalSettingsContextType | null>(null);

export const useExperimentalSettings = () => {
  const context = useContext(ExperimentalSettingsContext);
  if (!context) {
    throw new Error('useExperimentalSettings must be used within an ExperimentalSettingsProvider');
  }
  return context;
};

export const ExperimentalSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isExperimentalEnabled, setIsExperimentalEnabled] = useState(() => {
    const saved = localStorage.getItem('experimental_features_enabled');
    return saved === 'true';
  });

  const toggleExperimental = () => {
    setIsExperimentalEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('experimental_features_enabled', String(newValue));
      return newValue;
    });
  };

  return (
    <ExperimentalSettingsContext.Provider value={{ isExperimentalEnabled, toggleExperimental }}>
      {children}
    </ExperimentalSettingsContext.Provider>
  );
};
