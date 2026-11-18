import { Editor } from '@tiptap/core';
import { expect, test, vi } from 'vitest';

import { insertUploadedAsset, validateUpload } from '@/components/rich-text-editor/asset-upload';
import { createExtensions } from '@/components/rich-text-editor/extensions';

test('附件校验拒绝不支持的扩展名、空文件和超过上限的文件', () => {
  const upload = vi.fn();
  const services = { file: { accept: '.pdf', maxSize: 4, upload } };

  expect(validateUpload([new File(['1234'], 'guide.PDF')], 'file', services)).toBe('');
  expect(validateUpload([new File(['1234'], 'guide.txt')], 'file', services)).toContain(
    '类型不支持',
  );
  expect(validateUpload([new File([], 'guide.pdf')], 'file', services)).toContain('不能为空');
  expect(validateUpload([new File(['12345'], 'guide.pdf')], 'file', services)).toContain(
    '不能超过',
  );
  expect(upload).not.toHaveBeenCalled();
});

test('上传完成后将服务端地址和文件信息写入附件节点', async () => {
  const editor = new Editor({ extensions: createExtensions() });
  const file = new File(['guide'], 'guide.pdf', { type: 'application/pdf' });
  const upload = vi.fn().mockResolvedValue({ url: '/files/guide.pdf' });
  const context = { signal: new AbortController().signal, onProgress: vi.fn() };

  try {
    await insertUploadedAsset(editor, file, 'file', { file: { upload } }, context);

    expect(upload).toHaveBeenCalledExactlyOnceWith(file, context);
    expect(editor.getJSON().content).toContainEqual({
      type: 'attachment',
      attrs: { href: '/files/guide.pdf', name: 'guide.pdf', size: file.size },
    });
  } finally {
    editor.destroy();
  }
});

test('取消进行中的上传后，迟到结果不改写文档', async () => {
  const editor = new Editor({ extensions: createExtensions(), content: '<p>原文</p>' });
  const controller = new AbortController();
  const upload = vi.fn(async () => {
    await Promise.resolve();
    return { url: '/files/late.pdf' };
  });

  try {
    const original = editor.getJSON();
    const pending = insertUploadedAsset(
      editor,
      new File(['late'], 'late.pdf'),
      'file',
      { file: { upload } },
      { signal: controller.signal, onProgress: vi.fn() },
    );
    controller.abort();
    await pending;

    expect(upload).toHaveBeenCalledOnce();
    expect(editor.getJSON()).toEqual(original);
  } finally {
    editor.destroy();
  }
});
