import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import clsx from 'clsx';

import { UPLOAD_LABELS } from './asset-upload';
import type { RichTextUploadKind } from './types';

interface EditorFooterProps {
  editor: Editor | null;
  fieldId: string;
  limit: number | undefined;
  uploading: RichTextUploadKind | null;
  progress: number | null;
  canUpload: boolean;
}

/** 单独订阅计数，输入时不让整个编辑器外壳重新渲染。 */
export function EditorFooter({
  editor,
  fieldId,
  limit,
  uploading,
  progress,
  canUpload,
}: EditorFooterProps) {
  const count =
    useEditorState({
      editor,
      selector: ({ editor: current }) => current?.storage.characterCount.characters() ?? 0,
    }) ?? 0;
  return (
    <div className="rich-text-editor__footer">
      <span role="status">
        {uploading
          ? `${UPLOAD_LABELS[uploading]}上传中${progress === null ? '…' : ` ${progress}%`}`
          : canUpload
            ? '支持粘贴、拖入或选择文件'
            : ''}
      </span>
      <span
        id={`${fieldId}-count`}
        className={clsx({ 'rich-text-editor__over-limit': limit !== undefined && count > limit })}
      >
        {count}
        {limit ? ` / ${limit}` : ''} 字
      </span>
    </div>
  );
}
