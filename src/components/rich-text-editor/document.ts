import { EMPTY_DOCUMENT, sanitizeContent } from './content';
import { richTextSchema } from './extensions';
import type { RichTextValue } from './types';

export const prepareDocument = (value: RichTextValue | undefined) => {
  try {
    const content = sanitizeContent(value ?? EMPTY_DOCUMENT);
    if (content.type !== 'doc') throw new Error('内容必须是 Tiptap JSON 文档');
    const document = richTextSchema.nodeFromJSON(content);
    document.check();
    return { document, error: '' };
  } catch (cause) {
    return {
      document: richTextSchema.nodeFromJSON(EMPTY_DOCUMENT),
      error: cause instanceof Error ? cause.message : '文档格式无效',
    };
  }
};
