import { Extension, getSchema } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Slice } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';

import { isSafeUrl, sanitizeContent } from './content';
import { Attachment, Video } from './media-nodes';

// 3.34 的 CharacterCount 在超限粘贴时按 UTF-16 坐标截断，可能切开 emoji。
// 先拒绝超限粘贴，计数及其余长度规则仍由官方扩展处理。
const SafeCharacterCount = CharacterCount.extend({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (transaction, state) => {
          const limit = this.options.limit;
          if (!transaction.getMeta('paste') || !limit) return true;
          const before = this.storage.characters({ node: state.doc });
          const after = this.storage.characters({ node: transaction.doc });
          return after <= limit || after <= before;
        },
      }),
      ...(this.parent?.() ?? []),
    ];
  },
});

const safePaste = Extension.create({
  name: 'safePaste',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPasted: (slice, view) => {
            try {
              const content = slice.content.toJSON() as Array<
                ReturnType<typeof sanitizeContent>
              > | null;
              return Slice.fromJSON(view.state.schema, {
                content: content?.map(sanitizeContent),
                openStart: slice.openStart,
                openEnd: slice.openEnd,
              });
            } catch {
              // 不安全的图片或无法解析的片段不进入文档。
              return Slice.empty;
            }
          },
        },
      }),
    ];
  },
});

export function createExtensions(placeholder = '', maxLength?: number) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        isAllowedUri: (url) => isSafeUrl(url, 'link'),
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
      },
    }),
    Image.configure({ allowBase64: false, HTMLAttributes: { loading: 'lazy' } }),
    Video,
    Attachment,
    TableKit.configure({ table: { resizable: true } }),
    TextStyleKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder }),
    SafeCharacterCount.configure({
      limit: maxLength ?? null,
      autoTrim: false,
      textCounter: (text) => Array.from(text).length,
    }),
    safePaste,
  ];
}

// 只在组件被按需加载后创建；编辑与只读展示使用同一 Schema。
export const richTextSchema = getSchema(createExtensions());
