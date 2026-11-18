import type { Editor, JSONContent } from '@tiptap/core';
import type { Transaction } from '@tiptap/pm/state';
import { NodeSelection, Selection, TextSelection } from '@tiptap/pm/state';
import type { EditorProps } from '@tiptap/pm/view';

import { isSafeUrl } from './content';
import type {
  FileUploadOptions,
  ImageUploadOptions,
  RichTextUploadContext,
  RichTextUploadKind,
  VideoUploadOptions,
} from './types';

export interface UploadServices {
  image?: ImageUploadOptions | undefined;
  video?: VideoUploadOptions | undefined;
  file?: FileUploadOptions | undefined;
}

export const UPLOAD_LABELS = { image: '图片', video: '视频', file: '附件' };
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/ogg';
const DEFAULT_MAX_SIZE = { image: 5 * 1024 ** 2, video: 100 * 1024 ** 2, file: 20 * 1024 ** 2 };

/** 绑定命令式编辑器的文件事件，仅在仍持有处理器时恢复原配置。 */
export const bindUploadEvents = (editor: Editor, upload: (files: File[]) => Promise<void>) => {
  const previous = editor.options.editorProps;
  const handlePaste: NonNullable<EditorProps['handlePaste']> = (_view, event) => {
    const files = event.clipboardData?.files;
    if (!files?.length) return false;
    if (editor.isEditable) upload(Array.from(files)).catch(() => undefined);
    return true;
  };
  const handleDrop: NonNullable<EditorProps['handleDrop']> = (view, event, _slice, moved) => {
    if (moved || !event.dataTransfer?.files.length) return false;
    if (editor.isEditable) {
      const position = view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (position) editor.commands.setTextSelection(position.pos);
      upload(Array.from(event.dataTransfer.files)).catch(() => undefined);
    }
    return true;
  };
  editor.setOptions({ editorProps: { ...previous, handlePaste, handleDrop } });
  return () => {
    if (editor.isDestroyed) return;
    const next = { ...editor.options.editorProps };
    if (next.handlePaste === handlePaste) {
      if (previous.handlePaste) next.handlePaste = previous.handlePaste;
      else delete next.handlePaste;
    }
    if (next.handleDrop === handleDrop) {
      if (previous.handleDrop) next.handleDrop = previous.handleDrop;
      else delete next.handleDrop;
    }
    editor.setOptions({ editorProps: next });
  };
};

export const inferUploadKind = (file: File | undefined): RichTextUploadKind => {
  if (file?.type.startsWith('image/')) return 'image';
  if (file?.type.startsWith('video/')) return 'video';
  return 'file';
};

export const getUploadAccept = (kind: RichTextUploadKind, services: UploadServices) => {
  if (kind === 'image') return IMAGE_ACCEPT;
  if (kind === 'video') return VIDEO_ACCEPT;
  return services.file?.accept;
};

/** accept 同时约束选择、粘贴及拖入；这里只做交互校验，文件内容仍由后端验证。 */
const matchesAccept = (file: File, accept: string): boolean => {
  return accept.split(',').some((entry) => {
    const rule = entry.trim().toLowerCase();
    if (!rule) return false;
    if (rule === '*/*') return true;
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
    const type = file.type.toLowerCase();
    return rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : type === rule;
  });
};

export const validateUpload = (
  files: File[],
  kind: RichTextUploadKind,
  services: UploadServices,
): string => {
  const label = UPLOAD_LABELS[kind];
  const options = services[kind];
  if (!options) return `尚未配置${label}上传服务`;
  const file = files[0];
  if (!file || files.length !== 1) return '一次请选择一个文件';
  const accept = getUploadAccept(kind, services);
  if (accept && !matchesAccept(file, accept)) return `${label}类型不支持，请选择 ${accept}`;
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE[kind];
  if (!Number.isFinite(maxSize) || maxSize <= 0) return `${label}上传大小限制配置无效`;
  if (!file.size || file.size > maxSize)
    return `${label}不能为空，且不能超过 ${Number((maxSize / 1024 ** 2).toFixed(2))} MiB`;
  return '';
};

/** 将上传期间的编辑事务映射到原选区，取消和任何退出路径均清理监听器。 */
export const insertUploadedAsset = async (
  editor: Editor,
  file: File,
  kind: RichTextUploadKind,
  services: UploadServices,
  context: RichTextUploadContext,
): Promise<void> => {
  const options = services[kind];
  if (!options) throw new Error(`尚未配置${UPLOAD_LABELS[kind]}上传服务`);
  const { signal } = context;
  let bookmark = editor.state.selection.getBookmark();
  const mapSelection = ({ transaction }: { transaction: Transaction }) => {
    bookmark = bookmark.map(transaction.mapping);
  };
  editor.on('transaction', mapSelection);
  const stop = () => editor.off('transaction', mapSelection);
  signal.addEventListener('abort', stop, { once: true });
  try {
    const asset = await options.upload(file, context);
    if (signal.aborted || editor.isDestroyed || !editor.isEditable) return;
    if (!isSafeUrl(asset.url, kind))
      throw new Error(`上传接口返回了不支持的${UPLOAD_LABELS[kind]}地址`);
    const name = asset.name?.trim() || file.name;
    let node: JSONContent;
    if (kind === 'image') {
      const alt = 'alt' in asset && typeof asset.alt === 'string' ? asset.alt : name;
      node = { type: 'image', attrs: { src: asset.url, alt } };
    } else if (kind === 'video') {
      const poster = 'poster' in asset ? asset.poster : undefined;
      if (poster !== undefined && !isSafeUrl(poster, 'image'))
        throw new Error('上传接口返回了不支持的视频封面地址');
      node = { type: 'video', attrs: { src: asset.url, title: name, poster: poster ?? null } };
    } else {
      node = { type: 'attachment', attrs: { href: asset.url, name, size: file.size } };
    }
    const selection = bookmark.resolve(editor.state.doc);
    const before = editor.state.doc;
    const inserted = editor
      .chain()
      .insertContentAt({ from: selection.from, to: selection.to }, node)
      .command(({ tr }) => {
        // 原子节点位于文末时默认会被选中；把光标放到后方，避免连续上传替换前一份文件。
        if (!(tr.selection instanceof NodeSelection) || tr.selection.node.type.name !== node.type)
          return true;
        const position = tr.selection.to;
        const after = Selection.near(tr.doc.resolve(position), 1);
        if (after instanceof TextSelection) {
          tr.setSelection(after);
          return true;
        }
        const paragraph = editor.schema.nodes['paragraph']?.create();
        if (!paragraph) return false;
        tr.insert(position, paragraph);
        tr.setSelection(TextSelection.create(tr.doc, position + 1));
        return true;
      })
      .run();
    // ProseMirror 插件拒绝事务时，命令仍可能返回 true。
    if (!inserted || editor.state.doc === before)
      throw new Error(`${UPLOAD_LABELS[kind]}插入失败，请检查内容长度限制`);
  } finally {
    stop();
    signal.removeEventListener('abort', stop);
  }
};
