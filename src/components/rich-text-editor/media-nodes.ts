import { Node } from '@tiptap/core';

import { isSafeUrl } from './content';

function displayName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 255) : fallback;
}

function displaySize(value: unknown): string {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${Number((value / 1024).toFixed(1))} KB`;
  return `${Number((value / 1024 ** 2).toFixed(1))} MB`;
}

/** 原生 video 控件；不渲染任意 iframe、脚本或用户提供的 HTML 属性。 */
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, poster: { default: null }, title: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'video[src]' }];
  },
  renderHTML({ node }) {
    const src: unknown = node.attrs['src'];
    const poster: unknown = node.attrs['poster'];
    const title = displayName(node.attrs['title'], '视频');
    if (!isSafeUrl(src, 'video')) return ['p', {}, '视频地址不可用'];
    return [
      'div',
      { class: 'rich-text-editor__video', 'data-type': 'video', contenteditable: 'false' },
      [
        'video',
        {
          src,
          ...(isSafeUrl(poster, 'image') ? { poster } : {}),
          title,
          'aria-label': title,
          controls: '',
          playsinline: '',
          preload: 'metadata',
        },
        ['a', { href: src, target: '_blank', rel: 'noopener noreferrer' }, `打开视频：${title}`],
      ],
    ];
  },
});

/** 附件只输出有文件名的链接，文件内容不嵌入页面。 */
export const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      href: { default: null },
      name: {
        default: '附件',
        parseHTML: (element) => element.getAttribute('data-name') ?? element.textContent,
      },
      size: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-size');
          return value === null ? null : Number(value);
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'a[data-type="attachment"][href]', priority: 60 }];
  },
  renderHTML({ node }) {
    const href: unknown = node.attrs['href'];
    const name = displayName(node.attrs['name'], '附件');
    const size: unknown = node.attrs['size'];
    if (!isSafeUrl(href, 'file')) return ['p', {}, '附件地址不可用'];
    return [
      'div',
      { class: 'rich-text-editor__attachment', contenteditable: 'false' },
      [
        'a',
        {
          href,
          'data-type': 'attachment',
          'data-name': name,
          'data-size': typeof size === 'number' ? size : null,
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
          download: name,
          'aria-label': `下载附件：${name}`,
        },
        ['span', { class: 'rich-text-editor__attachment-badge', 'aria-hidden': 'true' }, '附件'],
        ['span', { class: 'rich-text-editor__attachment-name' }, name],
        ['span', { class: 'rich-text-editor__attachment-size' }, displaySize(size)],
      ],
    ];
  },
});
