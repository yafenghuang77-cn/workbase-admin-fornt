import type { JSONContent } from '@tiptap/core';

import { isLocalAssetUrl } from './local-assets';
import type { RichTextValue } from './types';

export const EMPTY_DOCUMENT: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };
export const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];
export const FONT_OPTIONS = [
  { label: '宋体', value: 'SimSun, "Songti SC", serif' },
  { label: '黑体', value: 'SimHei, "Heiti SC", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: '楷体', value: 'KaiTi, "Kaiti SC", serif' },
  { label: '仿宋', value: 'FangSong, STFangsong, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];
// 保留旧文档中的通用字体值；新内容由菜单写入具体字体及系统回退。
const FONT_FAMILIES = [
  'sans-serif',
  'serif',
  'monospace',
  ...FONT_OPTIONS.map(({ value }) => value),
];
export const LINE_HEIGHTS = ['1', '1.5', '1.75', '2', '2.5'];

/** 仅本地预览注册的媒体可使用 blob；拒绝任意外部 blob / data / javascript 地址。 */
export function isSafeUrl(
  value: unknown,
  kind: 'image' | 'video' | 'file' | 'link',
): value is string {
  if (typeof value !== 'string' || !value || /[\s\p{Cc}\\]/u.test(value)) {
    return false;
  }
  if (kind !== 'link' && isLocalAssetUrl(value)) return true;
  if (/^\/(?!\/)/u.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      (['http:', 'https:'].includes(url.protocol) ||
        (kind === 'link' && ['mailto:', 'tel:'].includes(url.protocol)))
    );
  } catch {
    return false;
  }
}

function safeAttributes(attrs: Record<string, unknown>): Record<string, unknown> {
  const result = { ...attrs };
  for (const name of ['color', 'backgroundColor']) {
    const color = result[name];
    if (typeof color !== 'string' || !/^#[\da-f]{3,8}$/iu.test(color)) delete result[name];
  }
  for (const [name, allowed] of [
    ['fontSize', FONT_SIZES],
    ['fontFamily', FONT_FAMILIES],
    ['lineHeight', LINE_HEIGHTS],
    ['textAlign', ['left', 'center', 'right', 'justify']],
  ] as const) {
    if (!allowed.some((entry) => entry === result[name])) delete result[name];
  }
  // 链接始终在新窗口打开，并隔离 opener。原始 HTML 属性不会直接进入 DOM。
  if ('href' in result) {
    result['target'] = '_blank';
    result['rel'] = 'noopener noreferrer nofollow';
  }
  return result;
}

/** 编辑器回显和粘贴共用同一 URL / 样式边界；不解析或直接渲染原始 HTML。 */
export function sanitizeContent(node: JSONContent): JSONContent {
  const attrs: Record<string, unknown> = node.attrs ?? {};
  if (node.type === 'image' && !isSafeUrl(attrs['src'], 'image')) {
    throw new Error('文档包含不支持的图片地址');
  }
  if (node.type === 'video') {
    if (!isSafeUrl(attrs['src'], 'video')) throw new Error('文档包含不支持的视频地址');
    if (attrs['poster'] != null && !isSafeUrl(attrs['poster'], 'image'))
      throw new Error('文档包含不支持的视频封面地址');
  }
  if (node.type === 'attachment' && !isSafeUrl(attrs['href'], 'file'))
    throw new Error('文档包含不支持的附件地址');
  const safe = safeAttributes(attrs);
  if (node.type === 'attachment') {
    safe['name'] =
      typeof attrs['name'] === 'string' && attrs['name'].trim()
        ? attrs['name'].trim().slice(0, 255)
        : '附件';
    safe['size'] =
      typeof attrs['size'] === 'number' && Number.isSafeInteger(attrs['size']) && attrs['size'] > 0
        ? attrs['size']
        : null;
  }
  return {
    ...node,
    ...(node.attrs ? { attrs: safe } : {}),
    ...(node.content ? { content: node.content.map(sanitizeContent) } : {}),
    ...(node.marks
      ? {
          marks: node.marks
            .filter((mark) => mark.type !== 'link' || isSafeUrl(mark.attrs?.['href'], 'link'))
            .map((mark) => ({
              ...mark,
              ...(mark.attrs ? { attrs: safeAttributes(mark.attrs) } : {}),
            })),
        }
      : {}),
  };
}

/** 供 Form.Item 自定义必填校验使用，媒体、附件、表格和分隔线也算有效内容。 */
export function isRichTextEmpty(value: RichTextValue | undefined): boolean {
  if (!value) return true;
  if (value.text?.trim()) return false;
  if (['image', 'video', 'attachment', 'table', 'horizontalRule'].includes(value.type ?? ''))
    return false;
  return value.content?.every(isRichTextEmpty) ?? true;
}
