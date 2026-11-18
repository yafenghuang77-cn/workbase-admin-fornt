import { describe, expect, test } from 'vitest';

import { isRichTextEmpty, sanitizeContent } from '@/components/rich-text-editor/content';
import { prepareDocument } from '@/components/rich-text-editor/document';

describe('富文本必填校验', () => {
  test('没有内容或只有空白时视为空', () => {
    expect(isRichTextEmpty(null)).toBe(true);
    expect(isRichTextEmpty({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(true);
    expect(isRichTextEmpty({ type: 'text', text: ' \n ' })).toBe(true);
  });

  test.each(['image', 'video', 'attachment', 'table', 'horizontalRule'])(
    '仅包含 %s 节点也算有内容',
    (type) => {
      expect(isRichTextEmpty({ type: 'doc', content: [{ type }] })).toBe(false);
    },
  );
});

test('清理不支持的链接和样式，保留正文、支持的颜色及站内链接', () => {
  expect(
    sanitizeContent({
      type: 'text',
      text: '员工手册',
      marks: [
        { type: 'textStyle', attrs: { color: '#1677ff', fontSize: '99px' } },
        { type: 'link', attrs: { href: 'ftp://example.test/manual' } },
        { type: 'link', attrs: { href: '/workbase/manual', target: '_self' } },
      ],
    }),
  ).toEqual({
    type: 'text',
    text: '员工手册',
    marks: [
      { type: 'textStyle', attrs: { color: '#1677ff' } },
      {
        type: 'link',
        attrs: { href: '/workbase/manual', target: '_blank', rel: 'noopener noreferrer nofollow' },
      },
    ],
  });
});

test('不符合编辑器 Schema 的文档返回空文档和错误', () => {
  const result = prepareDocument({ type: 'doc', content: [{ type: 'unsupportedNode' }] });

  expect(result.error).toContain('unsupportedNode');
  expect(result.document.eq(prepareDocument(null).document)).toBe(true);
});
