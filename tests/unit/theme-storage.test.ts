import { beforeEach, expect, test, vi } from 'vitest';

import { defaultThemeSettings } from '@/providers/theme';
import { loadThemeSettings, saveThemeSettings } from '@/providers/theme-storage';

beforeEach(() => {
  window.localStorage.clear();
});

test('无个人配置时读取默认主题对象', () => {
  expect(loadThemeSettings()).toEqual(defaultThemeSettings);
});

test('保存并恢复主题，兼容旧版明暗配置', () => {
  const settings = { navTheme: 'realDark', colorPrimary: '#F5222D' } as const;
  saveThemeSettings(settings);
  expect(loadThemeSettings()).toEqual(settings);
  window.localStorage.setItem('workbase-theme-settings', JSON.stringify({ navTheme: 'realDark' }));
  expect(loadThemeSettings()).toEqual({ ...defaultThemeSettings, navTheme: 'realDark' });
});

test.each(['invalid JSON', 'null', '[]', '{"navTheme":"invalid","colorPrimary":"url(x)"}'])(
  '无效存储 %s 回退默认配置',
  (raw) => {
    window.localStorage.setItem('workbase-theme-settings', raw);
    expect(loadThemeSettings()).toEqual(defaultThemeSettings);
  },
);

test('浏览器禁止本地存储时仍可使用默认主题', () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  try {
    expect(loadThemeSettings()).toEqual(defaultThemeSettings);
    expect(() => saveThemeSettings(defaultThemeSettings)).not.toThrow();
  } finally {
    read.mockRestore();
    write.mockRestore();
  }
});
