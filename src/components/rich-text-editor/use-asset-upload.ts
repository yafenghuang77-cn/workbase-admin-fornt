import { useCallback, useEffect, useRef, useState } from 'react';

import type { Editor } from '@tiptap/core';

import type { UploadServices } from './asset-upload';
import {
  bindUploadEvents,
  inferUploadKind,
  insertUploadedAsset,
  UPLOAD_LABELS,
  validateUpload,
} from './asset-upload';
import type { RichTextUploadKind } from './types';

interface UploadState {
  kind: RichTextUploadKind | null;
  progress: number | null;
  error: string;
}

const IDLE: UploadState = { kind: null, progress: null, error: '' };

export const useAssetUpload = (editor: Editor | null, services: UploadServices) => {
  const active = useRef<AbortController | null>(null);
  const [state, setState] = useState<UploadState>(IDLE);
  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setState(IDLE);
  }, []);

  useEffect(() => cancel, [cancel, editor]);

  const upload = useCallback(
    (files: File[], requestedKind?: RichTextUploadKind): Promise<void> => {
      const kind = requestedKind ?? inferUploadKind(files[0]);
      if (!editor || editor.isDestroyed || !editor.isEditable || active.current)
        return Promise.resolve();
      const error = validateUpload(files, kind, services);
      const file = files[0];
      if (error || !file) {
        setState({ ...IDLE, error });
        return Promise.resolve();
      }
      const controller = new AbortController();
      active.current = controller;
      setState({ kind, progress: null, error: '' });
      return insertUploadedAsset(editor, file, kind, services, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (
            active.current !== controller ||
            controller.signal.aborted ||
            editor.isDestroyed ||
            !Number.isFinite(percent)
          )
            return;
          setState((current) => ({
            ...current,
            progress: Math.max(
              current.progress ?? 0,
              Math.min(100, Math.max(0, Math.round(percent))),
            ),
          }));
        },
      })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setState({
              ...IDLE,
              error:
                cause instanceof Error ? cause.message : `${UPLOAD_LABELS[kind]}上传失败，请重试`,
            });
        })
        .finally(() => {
          if (active.current === controller) {
            active.current = null;
            if (!editor.isDestroyed)
              setState((current) => ({ ...current, kind: null, progress: null }));
          }
        });
    },
    [editor, services],
  );

  // useEditor 使用会话依赖时不会更新 editorProps，文件事件必须显式绑定到当前上传回调。
  useEffect(() => {
    if (!editor) return;
    return bindUploadEvents(editor, upload);
  }, [editor, upload]);

  return { upload, cancel, ...state };
};
