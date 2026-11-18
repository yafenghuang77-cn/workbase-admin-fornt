import { useRef } from 'react';

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSONContent } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import { Button, ConfigProvider, Form } from 'antd';
import { afterEach, expect, test, vi } from 'vitest';

import type {
  RichTextEditorRef,
  RichTextUploadContext,
  RichTextValue,
  UploadedImage,
} from '@/components/rich-text-editor';
import { isRichTextEmpty, RichTextEditor, RichTextViewer } from '@/components/rich-text-editor';
import { validateUpload } from '@/components/rich-text-editor/asset-upload';
import { isSafeUrl, sanitizeContent } from '@/components/rich-text-editor/content';
import { createExtensions } from '@/components/rich-text-editor/extensions';
import { useAssetUpload } from '@/components/rich-text-editor/use-asset-upload';

const editors: Editor[] = [];
function createEditor(content?: JSONContent, limit?: number) {
  const editor = new Editor({ extensions: createExtensions('', limit), content: content ?? '' });
  editors.push(editor);
  return editor;
}

function paragraph(text: string): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

test.each([
  'javascript:alert(1)',
  'data:image/svg+xml,test',
  '//evil.example/a',
  '/\\evil.example',
  'https://user:pass@example.com',
  'java\nscript:alert(1)',
])('拒绝不安全地址 %s', (url) => {
  expect(isSafeUrl(url, 'image')).toBe(false);
  expect(isSafeUrl(url, 'link')).toBe(false);
});

test('过滤链接和可注入的文字样式，同时保留有效文档', () => {
  const content = sanitizeContent({
    type: 'text',
    text: '链接',
    marks: [
      { type: 'link', attrs: { href: 'javascript:alert(1)' } },
      {
        type: 'textStyle',
        attrs: { color: '#1677ff', fontFamily: 'serif; background:url(https://example.com)' },
      },
    ],
  });
  expect(content.marks).toEqual([{ type: 'textStyle', attrs: { color: '#1677ff' } }]);
  expect(isSafeUrl('/media/a.png', 'image')).toBe(true);
  expect(isSafeUrl('mailto:a@example.com', 'link')).toBe(true);
  expect(() =>
    sanitizeContent({ type: 'image', attrs: { src: 'data:image/png;base64,xxx' } }),
  ).toThrow('图片地址');
});

test('必填校验支持空白文字、图片和表格', () => {
  expect(isRichTextEmpty(null)).toBe(true);
  expect(isRichTextEmpty(paragraph(' \n '))).toBe(true);
  expect(isRichTextEmpty(paragraph('正文'))).toBe(false);
  expect(
    isRichTextEmpty({ type: 'doc', content: [{ type: 'image', attrs: { src: '/a.png' } }] }),
  ).toBe(false);
  expect(isRichTextEmpty({ type: 'table' })).toBe(false);
  expect(isRichTextEmpty({ type: 'video' })).toBe(false);
  expect(isRichTextEmpty({ type: 'attachment' })).toBe(false);
});

test('视频与附件在 HTML 和 JSON 回显后保留地址、封面及文件名', () => {
  const document: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'video',
        attrs: { src: '/media/demo.mp4', poster: '/media/poster.png', title: '演示视频' },
      },
      {
        type: 'attachment',
        attrs: { href: '/files/report.pdf', name: '报告 <终稿>.pdf', size: 2048 },
      },
    ],
  };
  const editor = createEditor(sanitizeContent(document));
  const original = editor.getJSON();
  editor.commands.setContent(editor.getHTML());
  expect(editor.getJSON().content?.slice(0, 2)).toEqual(original.content);
  expect(editor.getHTML()).toContain('controls=""');
  expect(editor.getHTML()).toContain('报告 &lt;终稿&gt;.pdf');
  expect(editor.getHTML()).not.toContain('autoplay');
});

test.each([
  { type: 'video', attrs: { src: 'javascript:alert(1)' } },
  { type: 'video', attrs: { src: '/a.mp4', poster: 'data:image/svg+xml,test' } },
  { type: 'attachment', attrs: { href: 'mailto:a@example.com', name: '附件' } },
])('拒绝危险媒体文档 $type $attrs', (content) => {
  expect(() => sanitizeContent(content)).toThrow('不支持');
});

test('附件同时校验 accept、数量、空文件与大小，视频不接受不支持的格式', () => {
  const upload = vi.fn().mockResolvedValue({ url: '/files/report.pdf' });
  const services = {
    file: { upload, accept: '.pdf,application/zip', maxSize: 8 },
    video: { upload },
  };
  expect(validateUpload([new File(['pdf'], 'report.PDF')], 'file', services)).toBe('');
  expect(
    validateUpload([new File(['zip'], 'archive', { type: 'application/zip' })], 'file', services),
  ).toBe('');
  expect(validateUpload([new File(['txt'], 'report.txt')], 'file', services)).toContain(
    '类型不支持',
  );
  expect(validateUpload([new File([], 'report.pdf')], 'file', services)).toContain('不能为空');
  expect(validateUpload([new File(['123456789'], 'report.pdf')], 'file', services)).toContain(
    '不能超过',
  );
  expect(validateUpload([], 'file', services)).toContain('一次请选择');
  expect(
    validateUpload([new File(['avi'], 'demo.avi', { type: 'video/x-msvideo' })], 'video', services),
  ).toContain('类型不支持');
  expect(validateUpload([new File(['a'], 'a.png')], 'image', services)).toContain('尚未配置');
  expect(upload).not.toHaveBeenCalled();
});

test.each([
  { kind: 'video', mime: 'video/mp4', response: { url: 'javascript:alert(1)' } },
  { kind: 'video', mime: 'video/mp4', response: { url: '/a.mp4', poster: 'javascript:alert(1)' } },
  { kind: 'file', mime: 'application/pdf', response: { url: 'mailto:a@example.com' } },
] as const)('拒绝上传服务返回的不安全 $kind 地址', async ({ kind, mime, response }) => {
  const editor = createEditor();
  const upload = vi.fn().mockResolvedValue(response);
  const { result } = renderHook(() =>
    useAssetUpload(editor, { video: { upload }, file: { upload } }),
  );
  await act(() => result.current.upload([new File(['asset'], 'asset', { type: mime })], kind));
  expect(result.current.error).toContain('不支持');
  expect(result.current.kind).toBeNull();
  expect(
    editor.getJSON().content?.some((node) => ['video', 'attachment'].includes(node.type ?? '')),
  ).toBe(false);
});

test('粘贴视频和附件分别调用对应服务，JSON 可在只读组件还原', async () => {
  const videoUpload = vi
    .fn()
    .mockResolvedValue({ url: '/media/demo.mp4', poster: '/media/poster.png' });
  const fileUpload = vi.fn().mockResolvedValue({ url: '/files/report.pdf', name: '年度报告.pdf' });
  const onChange = vi.fn<(value: RichTextValue) => void>();
  const view = render(
    <RichTextEditor
      videoUpload={{ upload: videoUpload }}
      fileUpload={{ upload: fileUpload }}
      onChange={onChange}
    />,
  );
  const input = await screen.findByRole('textbox', undefined, { timeout: 5000 });
  expect(screen.getByRole('button', { name: '上传图片' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '上传视频' })).toBeEnabled();
  fireEvent.paste(input, {
    clipboardData: {
      files: [new File(['mp4'], 'demo.mp4', { type: 'video/mp4' })],
      types: ['Files'],
      getData: () => '',
    },
  });
  expect(await screen.findByLabelText('demo.mp4')).toHaveAttribute('src', '/media/demo.mp4');
  await waitFor(() => expect(screen.getByRole('button', { name: '上传附件' })).toBeEnabled());
  fireEvent.paste(input, {
    clipboardData: {
      files: [new File(['pdf'], 'report.pdf', { type: 'application/pdf' })],
      types: ['Files'],
      getData: () => '',
    },
  });
  expect(await screen.findByRole('link', { name: '下载附件：年度报告.pdf' })).toHaveAttribute(
    'href',
    '/files/report.pdf',
  );
  expect(videoUpload).toHaveBeenCalledOnce();
  expect(fileUpload).toHaveBeenCalledOnce();
  const value = onChange.mock.calls.at(-1)?.[0];
  view.unmount();
  render(<RichTextViewer {...(value === undefined ? {} : { value })} />);
  expect(await screen.findByLabelText('demo.mp4')).toHaveAttribute('controls');
  expect(screen.getByRole('link', { name: '下载附件：年度报告.pdf' })).toHaveAttribute(
    'rel',
    'noopener noreferrer nofollow',
  );
});

test('采用真实 Tiptap 编辑事务限制长度，已有超限内容不被截断', () => {
  const editor = createEditor(paragraph('正文超限'), 3);
  expect(editor.getText()).toBe('正文超限');
  editor.commands.insertContentAt(1, '加');
  expect(editor.getText()).toBe('正文超限');
  editor.commands.deleteRange({ from: 1, to: 2 });
  expect(editor.getText()).toBe('文超限');
});

test('中文和 emoji 按 Unicode 码点计数', () => {
  const editor = createEditor(paragraph('中😀'), 2);
  expect(editor.storage.characterCount.characters()).toBe(2);
  editor.commands.insertContentAt(1, 'a');
  expect(editor.getText()).toBe('中😀');
});

test('超限粘贴整体拒绝，避免按 UTF-16 截断造成 emoji 损坏', () => {
  const editor = createEditor(paragraph('中'), 2);
  editor.view.dispatch(editor.state.tr.insertText('😀😀', 2).setMeta('paste', true));
  expect(editor.getText()).toBe('中');
  editor.view.dispatch(editor.state.tr.insertText('😀', 2).setMeta('paste', true));
  expect(editor.getText()).toBe('中😀');
});

test('外部替换文档后撤销不会恢复旧内容', async () => {
  const view = render(<RichTextEditor value={paragraph('旧文档')} />);
  const input = await screen.findByRole('textbox', { name: '富文本内容' }, { timeout: 5000 });
  fireEvent.paste(input, {
    clipboardData: {
      files: [],
      getData: (type: string) => (type === 'text/plain' ? '编辑' : ''),
      types: ['text/plain'],
    },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '撤销' })).toBeEnabled());
  view.rerender(<RichTextEditor value={paragraph('新文档')} />);
  await waitFor(() => expect(screen.getByRole('button', { name: '撤销' })).toBeDisabled());
  expect(screen.getByRole('textbox')).toHaveTextContent('新文档');
});

test('延迟加载编辑器，外部回填与清空不触发 onChange', async () => {
  const onChange = vi.fn();
  const view = render(<RichTextEditor value={paragraph('旧内容')} onChange={onChange} />);
  expect(
    await screen.findByRole('textbox', { name: '富文本内容' }, { timeout: 5000 }),
  ).toHaveTextContent('旧内容');
  view.rerender(<RichTextEditor value={paragraph('新内容')} onChange={onChange} />);
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: '富文本内容' })).toHaveTextContent('新内容'),
  );
  expect(screen.getByRole('button', { name: '撤销' })).toBeDisabled();
  view.rerender(<RichTextEditor value={null} onChange={onChange} />);
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: '富文本内容' })).not.toHaveTextContent('新内容'),
  );
  expect(onChange).not.toHaveBeenCalled();
});

test('只读展示不包含工具栏，也不允许编辑', async () => {
  render(<RichTextViewer value={paragraph('只读正文')} />);
  expect(await screen.findByRole('document', { name: '富文本内容' })).toHaveTextContent('只读正文');
  expect(screen.getByRole('document')).toHaveAttribute('contenteditable', 'false');
  expect(screen.queryByRole('group', { name: '富文本工具栏' })).not.toBeInTheDocument();
});

test('继承 antd 禁用状态，保留表单字段 id 和无障碍属性', async () => {
  render(
    <ConfigProvider componentDisabled>
      <RichTextEditor id="article-body" aria-label="文章正文" value={paragraph('内容')} />
    </ConfigProvider>,
  );
  expect(await screen.findByRole('textbox', { name: '文章正文' })).toHaveAttribute(
    'id',
    'article-body',
  );
  expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'false');
  expect(screen.getByRole('button', { name: '粗体' })).toBeDisabled();
});

test('非法文档展示错误，修复后可恢复，不静默覆盖源数据', async () => {
  const onChange = vi.fn();
  const view = render(<RichTextEditor value={{ type: 'unknownNode' }} onChange={onChange} />);
  expect(await screen.findByText('无法加载富文本内容')).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  view.rerender(<RichTextEditor value={paragraph('恢复')} onChange={onChange} />);
  expect(await screen.findByRole('textbox', { name: '富文本内容' })).toHaveTextContent('恢复');
  expect(onChange).not.toHaveBeenCalled();
});

test('粘贴正文通过 onChange 回传 JSON，并支持 Form 重置', async () => {
  const onChange = vi.fn();
  function ArticleForm() {
    const [form] = Form.useForm<{ body: RichTextValue }>();
    const ref = useRef<RichTextEditorRef>(null);
    return (
      <Form form={form} initialValues={{ body: null }} onValuesChange={onChange}>
        <Form.Item name="body" label="文章正文">
          <RichTextEditor ref={ref} />
        </Form.Item>
        <Button onClick={() => form.resetFields()}>重置</Button>
      </Form>
    );
  }
  render(<ArticleForm />);
  const input = await screen.findByRole('textbox');
  fireEvent.paste(input, {
    clipboardData: {
      files: [],
      getData: (type: string) => (type === 'text/plain' ? '粘贴正文' : ''),
      types: ['text/plain'],
    },
  });
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(screen.getByRole('textbox')).toHaveTextContent('粘贴正文');
  fireEvent.paste(screen.getByRole('textbox'), {
    clipboardData: {
      files: [],
      getData: (type: string) => (type === 'text/plain' ? '继续' : ''),
      types: ['text/plain'],
    },
  });
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveTextContent('粘贴正文继续'));
  expect(screen.getByRole('button', { name: '撤销' })).toBeEnabled();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /重\s*置/u }));
  await waitFor(() => expect(screen.getByRole('textbox')).not.toHaveTextContent('粘贴正文'));
});

test.each([
  { kind: 'image', type: 'image/png', name: 'a.png', node: 'image' },
  { kind: 'video', type: 'video/mp4', name: 'a.mp4', node: 'video' },
  { kind: 'file', type: 'application/pdf', name: 'a.pdf', node: 'attachment' },
] as const)(
  '$kind 上传期间编辑正文后，插入位置跟随文档变化',
  async ({ kind, type, name, node }) => {
    const editor = createEditor(paragraph('原文'));
    editor.commands.setTextSelection(3);
    let complete: ((image: UploadedImage) => void) | undefined;
    const upload = vi.fn(
      () =>
        new Promise<UploadedImage>((resolve) => {
          complete = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useAssetUpload(editor, { image: { upload }, video: { upload }, file: { upload } }),
    );
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.upload([new File(['asset'], name, { type })], kind);
    });
    act(() => {
      editor.commands.insertContentAt(1, '新增');
    });
    await act(async () => {
      complete?.({ url: '/media/a.png' });
      await pending;
    });
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual([
      'paragraph',
      node,
      'paragraph',
    ]);
    expect(editor.state.doc.firstChild?.textContent).toBe('新增原文');
  },
);

test('取消视频上传后忽略迟到结果和进度，新上传可正常完成', async () => {
  const editor = createEditor();
  const requests: Array<{
    context: RichTextUploadContext;
    resolve: (value: { url: string }) => void;
  }> = [];
  const upload = vi.fn(
    (_file: File, context: RichTextUploadContext) =>
      new Promise<{ url: string }>((resolve) => {
        requests.push({ context, resolve });
      }),
  );
  const { result } = renderHook(() => useAssetUpload(editor, { video: { upload } }));
  const file = new File(['video'], 'demo.mp4', { type: 'video/mp4' });
  let first: Promise<void> | undefined;
  let second: Promise<void> | undefined;
  act(() => {
    first = result.current.upload([file]);
  });
  act(() => {
    requests[0]?.context.onProgress(40);
  });
  expect(result.current.progress).toBe(40);
  act(() => {
    result.current.cancel();
  });
  expect(requests[0]?.context.signal.aborted).toBe(true);
  act(() => {
    second = result.current.upload([file]);
  });
  act(() => {
    requests[0]?.context.onProgress(99);
    requests[1]?.context.onProgress(35);
  });
  expect(result.current.progress).toBe(35);
  await act(async () => {
    requests[0]?.resolve({ url: '/late.mp4' });
    await first;
  });
  expect(result.current.kind).toBe('video');
  expect(editor.getJSON().content?.some((node) => node.type === 'video')).toBe(false);
  await act(async () => {
    requests[1]?.resolve({ url: '/success.mp4' });
    await second;
  });
  expect(result.current.kind).toBeNull();
  expect(editor.getJSON().content?.find((node) => node.type === 'video')?.attrs?.['src']).toBe(
    '/success.mp4',
  );
});

test('长度限制拒绝媒体插入时提示失败，不把上传成功当作插入成功', async () => {
  const editor = createEditor(paragraph('正文'), 2);
  editor.commands.setTextSelection(3);
  const upload = vi.fn().mockResolvedValue({ url: '/media/demo.mp4' });
  const { result } = renderHook(() => useAssetUpload(editor, { video: { upload } }));
  await act(() => result.current.upload([new File(['video'], 'demo.mp4', { type: 'video/mp4' })]));
  expect(result.current.error).toContain('插入失败');
  expect(editor.getText()).toBe('正文');
  expect(editor.getJSON().content?.some((node) => node.type === 'video')).toBe(false);
});

test('外部切换文档时取消视频上传，迟到结果不写入新文档', async () => {
  let complete: ((value: { url: string }) => void) | undefined;
  let signal: AbortSignal | undefined;
  const upload = vi.fn((_file: File, context: RichTextUploadContext) => {
    signal = context.signal;
    return new Promise<{ url: string }>((resolve) => {
      complete = resolve;
    });
  });
  const view = render(<RichTextEditor value={paragraph('原文')} videoUpload={{ upload }} />);
  const input = await screen.findByRole('textbox');
  fireEvent.paste(input, {
    clipboardData: {
      files: [new File(['mp4'], 'demo.mp4', { type: 'video/mp4' })],
      types: ['Files'],
      getData: () => '',
    },
  });
  expect(await screen.findByRole('button', { name: '取消上传' })).toBeEnabled();
  view.rerender(<RichTextEditor value={paragraph('新文档')} videoUpload={{ upload }} />);
  await waitFor(() => expect(signal?.aborted).toBe(true));
  await act(async () => {
    complete?.({ url: '/late.mp4' });
    await Promise.resolve();
  });
  expect(screen.getByRole('textbox')).toHaveTextContent('新文档');
  expect(screen.queryByLabelText('demo.mp4')).not.toBeInTheDocument();
});

test('取消或卸载后忽略迟到的上传结果，并传递 AbortSignal', async () => {
  const editor = createEditor();
  let complete: ((image: UploadedImage) => void) | undefined;
  const upload = vi.fn(
    (_file: File, _context: { signal: AbortSignal }) =>
      new Promise<UploadedImage>((resolve) => {
        complete = resolve;
      }),
  );
  const { result, unmount } = renderHook(() => useAssetUpload(editor, { image: { upload } }));
  let pending: Promise<void> | undefined;
  act(() => {
    pending = result.current.upload([new File(['image'], 'a.png', { type: 'image/png' })]);
  });
  unmount();
  expect(upload.mock.calls[0]?.[1].signal.aborted).toBe(true);
  await act(async () => {
    complete?.({ url: '/late.png' });
    await pending;
  });
  expect(editor.getJSON().content?.some((node) => node.type === 'image')).toBe(false);
});

test('上传失败或返回危险地址时可重试，SVG 和超大文件不发送请求', async () => {
  const editor = createEditor();
  const upload = vi
    .fn()
    .mockRejectedValueOnce(new Error('网络失败'))
    .mockResolvedValueOnce({ url: 'javascript:alert(1)' });
  const { result } = renderHook(() => useAssetUpload(editor, { image: { upload, maxSize: 8 } }));
  await act(() => result.current.upload([new File(['image'], 'a.svg', { type: 'image/svg+xml' })]));
  expect(upload).not.toHaveBeenCalled();
  await act(() =>
    result.current.upload([new File(['too-large-file'], 'a.png', { type: 'image/png' })]),
  );
  expect(upload).not.toHaveBeenCalled();
  const file = new File(['image'], 'a.png', { type: 'image/png' });
  await act(() => result.current.upload([file]));
  expect(result.current.error).toBe('网络失败');
  await act(() => result.current.upload([file]));
  expect(result.current.error).toContain('不支持的图片地址');
  expect(editor.getJSON().content?.some((node) => node.type === 'image')).toBe(false);
});
