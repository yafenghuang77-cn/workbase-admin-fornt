import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import type { SelectionBookmark } from '@tiptap/pm/state';
import { Form, Input, Modal } from 'antd';

import { isSafeUrl } from './content';

export interface LinkSelection {
  document: Node;
  bookmark: SelectionBookmark;
  href: string;
}

interface LinkDialogProps {
  editor: Editor;
  selection: LinkSelection;
  onClose: () => void;
}

export const LinkDialog = ({ editor, selection, onClose }: LinkDialogProps) => {
  const [form] = Form.useForm<{ href: string }>();
  const submit = ({ href }: { href: string }) => {
    // 弹窗期间文档被外部替换时，旧选区作废。
    if (!editor.isDestroyed && editor.isEditable && editor.state.doc === selection.document) {
      const range = selection.bookmark.resolve(editor.state.doc);
      const chain = editor.chain().focus().setTextSelection({ from: range.from, to: range.to });
      if (href.trim()) {
        chain.extendMarkRange('link').setLink({ href: href.trim() }).run();
      } else {
        chain.extendMarkRange('link').unsetLink().run();
      }
    }
    onClose();
  };

  return (
    <Modal
      open
      title="编辑链接"
      okText="确定"
      cancelText="取消"
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ href: selection.href }}
        onFinish={submit}
      >
        <Form.Item
          name="href"
          label="链接地址"
          extra="支持 https、http、mailto、tel 和以 / 开头的站内路径；留空可移除链接。"
          rules={[
            {
              validator: (_rule, value: string | undefined) =>
                !value?.trim() || isSafeUrl(value.trim(), 'link')
                  ? Promise.resolve()
                  : Promise.reject(new Error('请输入有效的链接地址')),
            },
          ]}
        >
          <Input placeholder="https://example.com" autoComplete="off" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
