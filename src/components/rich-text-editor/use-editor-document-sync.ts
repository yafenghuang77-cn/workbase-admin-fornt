import { useEffect } from 'react';

import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';

interface DocumentSyncOptions {
  editor: Editor | null;
  document: Node;
  editable: boolean;
  attributes: Record<string, string>;
  cancelUpload: () => void;
}

/** 将 React 的字段配置和外部快照同步到命令式编辑器，保留普通输入的撤销历史。 */
export function useEditorDocumentSync({
  editor,
  document,
  editable,
  attributes,
  cancelUpload,
}: DocumentSyncOptions) {
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({ editorProps: { ...editor.options.editorProps, attributes } });
    editor.setEditable(editable, false);
    if (!editable) cancelUpload();
  }, [editor, editable, attributes, cancelUpload]);

  useEffect(() => {
    if (!editor) return;
    // Node.eq 比较 NodeType 对象身份，外部快照需先转换到当前实例的 Schema。
    const next = editor.schema.nodeFromJSON(document.toJSON());
    if (editor.state.doc.eq(next)) return;
    cancelUpload();
    // 外部替换是新快照，清空旧文档的撤销历史和上传选区。
    editor.view.updateState(
      EditorState.create({ schema: editor.schema, doc: next, plugins: editor.state.plugins }),
    );
    editor.commands.setMeta('externalContent', true);
  }, [editor, document, cancelUpload]);
}
