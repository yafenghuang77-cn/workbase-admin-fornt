import { defaultThemeSettings } from './theme';
import type { ThemeSettings } from './theme-settings';

const storageKey = 'workbase-theme-settings';

export const loadThemeSettings = (): ThemeSettings => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) {
      return { ...defaultThemeSettings };
    }
    const values = {
      navTheme: 'navTheme' in saved ? saved.navTheme : undefined,
      colorPrimary: 'colorPrimary' in saved ? saved.colorPrimary : undefined,
    };
    return {
      navTheme:
        values.navTheme === 'light' || values.navTheme === 'realDark'
          ? values.navTheme
          : defaultThemeSettings.navTheme,
      colorPrimary:
        typeof values['colorPrimary'] === 'string' &&
        /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/iu.test(values['colorPrimary'])
          ? values['colorPrimary']
          : defaultThemeSettings.colorPrimary,
    };
  } catch {
    // 存储损坏或浏览器禁用存储时，使用默认配置。
    return { ...defaultThemeSettings };
  }
};

export const saveThemeSettings = (settings: ThemeSettings) => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // 存储不可用时仍允许在本次访问中切换主题。
  }
};
