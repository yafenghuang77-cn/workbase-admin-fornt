import type { Dispatch, SetStateAction } from 'react';
import { createContext, useContext } from 'react';

export interface ThemeSettings {
  navTheme: 'light' | 'realDark';
  colorPrimary: string;
}

export const ThemeSettingsContext = createContext<{
  settings: ThemeSettings;
  setSettings: Dispatch<SetStateAction<ThemeSettings>>;
} | null>(null);

export const useThemeSettings = () => {
  const context = useContext(ThemeSettingsContext);
  if (!context) throw new Error('useThemeSettings must be used within AppProviders');
  return context;
};
