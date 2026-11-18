import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSONContent } from '@tiptap/core';
import { expect, test, vi } from 'vitest';

import type { FileUploadOptions, UploadedFile } from '@/components/rich-text-editor';
import { RichTextEditor, RichTextViewer } from '@/components/rich-text-editor';

const article = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const pasteAttachment = (editor: HTMLElement) => {
  const file = new File(['notice'], 'notice.pdf', { type: 'application/pdf' });
  fireEvent.paste(editor, { clipboardData: { files: [file], getData: () => '' } });
};

test('外部回填和清空更新编辑区，但不会触发用户编辑回调', async () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <RichTextEditor aria-label="文章正文" value={article('初稿')} onChange={onChange} />,
  );

  const editor = await screen.findByRole('textbox', { name: '文章正文' }, { timeout: 4_000 });
  expect(editor).toHaveTextContent('初稿');

  rerender(<RichTextEditor aria-label="文章正文" value={article('修订稿')} onChange={onChange} />);
  await waitFor(() => expect(editor).toHaveTextContent('修订稿'));

  rerender(<RichTextEditor aria-label="文章正文" value={null} onChange={onChange} />);
  await waitFor(() => expect(editor).not.toHaveTextContent(/\S/u));
  expect(onChange).not.toHaveBeenCalled();
});

test('无效文档显示错误，收到有效文档后恢复编辑区', async () => {
  const { rerender } = render(<RichTextEditor value={{ type: 'unsupportedNode' }} />);

  expect(await screen.findByText('无法加载富文本内容')).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

  rerender(<RichTextEditor value={article('恢复后的正文')} />);
  expect(await screen.findByRole('textbox')).toHaveTextContent('恢复后的正文');
});

test('只读预览显示正文且不暴露编辑工具栏', async () => {
  render(<RichTextViewer aria-label="文章预览" value={article('已发布正文')} />);

  const preview = await screen.findByRole('document', { name: '文章预览' });
  expect(preview).toHaveTextContent('已发布正文');
  expect(preview).toHaveAttribute('contenteditable', 'false');
  expect(screen.queryByRole('group', { name: '富文本工具栏' })).not.toBeInTheDocument();
});

test('粘贴附件上传失败后可重试，成功时插入附件并清除错误', async () => {
  const upload = vi
    .fn<FileUploadOptions['upload']>()
    .mockRejectedValueOnce(new Error('附件暂时无法上传'))
    .mockResolvedValueOnce({ url: '/files/notice.pdf' });
  render(<RichTextEditor fileUpload={{ upload }} />);

  const editor = await screen.findByRole('textbox');
  pasteAttachment(editor);
  expect(await screen.findByRole('alert')).toHaveTextContent('附件暂时无法上传');

  pasteAttachment(editor);
  const attachment = await within(editor).findByRole('link', { name: /notice\.pdf/u });
  expect(attachment).toHaveAttribute('href', '/files/notice.pdf');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('点击取消上传会中止请求，迟到结果不会插入正文', async () => {
  const user = userEvent.setup();
  let finishUpload: (() => void) | undefined;
  const pending = new Promise<UploadedFile>((resolve) => {
    finishUpload = () => resolve({ url: '/files/notice.pdf' });
  });
  const upload = vi.fn<FileUploadOptions['upload']>().mockReturnValue(pending);
  render(<RichTextEditor value={article('保留这段正文')} fileUpload={{ upload }} />);

  const editor = await screen.findByRole('textbox');
  pasteAttachment(editor);
  await user.click(await screen.findByRole('button', { name: '取消上传' }));

  expect(upload.mock.calls[0]?.[1].signal.aborted).toBe(true);
  await act(async () => {
    finishUpload?.();
    await pending;
  });

  expect(screen.getByRole('textbox')).toHaveTextContent('保留这段正文');
  expect(within(editor).queryByRole('link', { name: /notice\.pdf/u })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '取消上传' })).not.toBeInTheDocument();
});

test.each([
  { scenario: '禁用编辑', disabled: true, nextText: '初稿' },
  { scenario: '外部回填正文', disabled: false, nextText: '回填正文' },
])('$scenario 会取消上传，迟到结果不会插入文档', async ({ disabled, nextText }) => {
  const upload = vi
    .fn<FileUploadOptions['upload']>()
    .mockResolvedValue({ url: '/files/notice.pdf' });
  const fileUpload = { upload };
  const { rerender } = render(<RichTextEditor value={article('初稿')} fileUpload={fileUpload} />);

  const editor = await screen.findByRole('textbox');
  pasteAttachment(editor);
  expect(screen.getByRole('button', { name: '取消上传' })).toBeInTheDocument();
  rerender(
    <RichTextEditor disabled={disabled} value={article(nextText)} fileUpload={fileUpload} />,
  );

  expect(upload.mock.calls[0]?.[1].signal.aborted).toBe(true);
  await act(async () => {
    await upload.mock.results[0]?.value;
  });

  expect(editor).toHaveTextContent(nextText);
  expect(editor).toHaveAttribute('aria-readonly', String(disabled));
  expect(within(editor).queryByRole('link')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '取消上传' })).not.toBeInTheDocument();
});
