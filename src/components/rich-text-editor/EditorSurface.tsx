import { useEffect, useId, useImperativeHandle, useMemo } from 'react';

import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { Alert, ConfigProvider, Form, theme } from 'antd';
import clsx from 'clsx';

import { getEditorAttributes, getSurfaceStyle } from './appearance';
import type { UploadServices } from './asset-upload';
import { isRichTextEmpty } from './content';
import { prepareDocument } from './document';
import { EditorFooter } from './EditorFooter';
import { createExtensions } from './extensions';
import { Toolbar } from './Toolbar';
import type { RichTextEditorProps, RichTextViewerProps } from './types';
import { useAssetUpload } from './use-asset-upload';
import { useEditorDocumentSync } from './use-editor-document-sync';

import './index.less';

interface EditorSurfaceProps extends RichTextEditorProps {
  mode: 'edit' | 'read';
  status?: string | undefined;
}

const EditorSurface = (props: EditorSurfaceProps) => {
  const {
    mode,
    value,
    onChange,
    onBlur,
    ref,
    id,
    disabled = false,
    placeholder = '请输入内容…',
    maxLength,
    imageUpload,
    videoUpload,
    fileUpload,
    className,
    style,
    status,
  } = props;
  const { token } = theme.useToken();
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const uploadErrorId = `${fieldId}-upload-error`;
  const editable = mode === 'edit' && !disabled;
  const limit =
    Number.isInteger(maxLength) && maxLength !== undefined && maxLength > 0 ? maxLength : undefined;
  const prepared = useMemo(() => prepareDocument(value), [value]);
  const services: UploadServices = { image: imageUpload, video: videoUpload, file: fileUpload };

  const editor = useEditor(
    {
      extensions: createExtensions(mode === 'edit' ? placeholder : '', limit),
      content: prepared.document.toJSON() as JSONContent,
      editable: editable && !prepared.error,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: getEditorAttributes({
          props,
          mode,
          fieldId,
          editable,
          error: prepared.error,
          status,
        }),
      },
      onUpdate: ({ editor: current }) => {
        const content = current.getJSON();
        onChange?.(isRichTextEmpty(content) ? null : content);
      },
    },
    [placeholder, limit, mode],
  );
  // 初始内容写入不产生 update 事件，字数等订阅会停留旧值；
  // 实例就绪后派发一个不修改文档的 meta 事务，触发订阅重新取初值。
  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta('refreshEditorState', true));
  }, [editor]);

  const assets = useAssetUpload(editor, services);
  const { cancel, upload } = assets;

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor?.commands.focus();
      },
    }),
    [editor],
  );

  useEditorDocumentSync({
    editor,
    document: prepared.document,
    editable: editable && !prepared.error,
    attributes: getEditorAttributes({
      props,
      mode,
      fieldId,
      editable,
      error: prepared.error,
      status,
    }),
    cancelUpload: cancel,
  });

  return (
    <div
      className={clsx(
        'rich-text-editor',
        { 'rich-text-editor--read': mode === 'read', 'rich-text-editor--disabled': disabled },
        className,
      )}
      style={getSurfaceStyle(token, status, style)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
      }}
    >
      {mode === 'edit' && editor && (
        <Toolbar
          editor={editor}
          disabled={!editable || Boolean(prepared.error)}
          services={services}
          uploading={assets.kind}
          upload={upload}
          cancelUpload={cancel}
        />
      )}
      {prepared.error ? (
        <Alert type="error" showIcon title="无法加载富文本内容" description={prepared.error} />
      ) : (
        <EditorContent editor={editor} />
      )}
      {mode === 'edit' && (
        <EditorFooter
          editor={editor}
          fieldId={fieldId}
          limit={limit}
          uploading={assets.kind}
          progress={assets.progress}
          canUpload={Object.values(services).some(Boolean)}
        />
      )}

      {assets.error && (
        <div id={uploadErrorId} className="rich-text-editor__error" role="alert">
          {assets.error}
        </div>
      )}
    </div>
  );
};

export const RichTextEditorImpl = (props: RichTextEditorProps) => {
  const { componentDisabled } = ConfigProvider.useConfig();
  const { status } = Form.Item.useStatus();
  return (
    <EditorSurface
      {...props}
      mode="edit"
      disabled={props.disabled ?? componentDisabled}
      status={status}
    />
  );
};

export const RichTextViewerImpl = (props: RichTextViewerProps) => {
  return <EditorSurface {...props} mode="read" />;
};
