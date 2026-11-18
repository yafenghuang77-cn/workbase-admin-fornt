import { useState } from 'react';

import {
  BoldOutlined,
  ClearOutlined,
  CodeOutlined,
  FontColorsOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  SnippetsOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { Button, ColorPicker, theme, Tooltip } from 'antd';
import clsx from 'clsx';

import type { UploadServices } from './asset-upload';
import type { LinkSelection } from './LinkDialog';
import { LinkDialog } from './LinkDialog';
import { TableMenu, TextStyleMenus } from './ToolbarMenus';
import type { RichTextUploadKind } from './types';
import { UploadTools } from './UploadTools';

interface ToolbarProps {
  editor: Editor;
  disabled: boolean;
  services: UploadServices;
  uploading: RichTextUploadKind | null;
  upload: (files: File[], kind: RichTextUploadKind) => Promise<void>;
  cancelUpload: () => void;
}

export const Toolbar = ({
  editor,
  disabled,
  services,
  uploading,
  upload,
  cancelUpload,
}: ToolbarProps) => {
  const { token } = theme.useToken();
  const [link, setLink] = useState<LinkSelection | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      link: current.isActive('link'),
      strike: current.isActive('strike'),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      codeBlock: current.isActive('codeBlock'),
      blockquote: current.isActive('blockquote'),
      canUndo: current.can().undo(),
      color: (current.getAttributes('textStyle')['color'] ?? token.colorText) as string,
      backgroundColor: (current.getAttributes('textStyle')['backgroundColor'] ??
        token.colorWarning) as string,
    }),
  });
  const actions = [
    {
      label: '粗体',
      icon: <BoldOutlined />,
      active: state.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: '斜体',
      icon: <ItalicOutlined />,
      active: state.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: '下划线',
      icon: <UnderlineOutlined />,
      active: state.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: '删除线',
      icon: <StrikethroughOutlined />,
      active: state.strike,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: '清除格式',
      icon: <ClearOutlined />,
      active: false,
      run: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
    },
  ];

  const blockActions = [
    {
      label: '无序列表',
      icon: <UnorderedListOutlined />,
      active: state.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: '有序列表',
      icon: <OrderedListOutlined />,
      active: state.orderedList,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '引用',
      icon: <SnippetsOutlined />,
      active: state.blockquote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '代码块',
      icon: <CodeOutlined />,
      active: state.codeBlock,
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ];

  return (
    <>
      <div className="rich-text-editor__toolbar" role="group" aria-label="富文本工具栏">
        <div className="rich-text-editor__tool-group">
          <Tooltip title="撤销">
            <Button
              htmlType="button"
              type="text"
              className="rich-text-editor__tool"
              aria-label="撤销"
              disabled={disabled || !state.canUndo}
              icon={<UndoOutlined />}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().undo().run()}
            />
          </Tooltip>
        </div>
        <div className="rich-text-editor__tool-group">
          {actions.map((action) => (
            <Tooltip key={action.label} title={action.label}>
              <Button
                htmlType="button"
                type="text"
                className={clsx('rich-text-editor__tool', {
                  'rich-text-editor__tool--active': action.active,
                })}
                aria-label={action.label}
                aria-pressed={action.active}
                disabled={disabled}
                icon={action.icon}
                onMouseDown={(event) => event.preventDefault()}
                onClick={action.run}
              />
            </Tooltip>
          ))}
        </div>
        <div className="rich-text-editor__tool-group">
          <ColorPicker
            disabled={disabled}
            value={state.color}
            allowClear
            onClear={() => editor.chain().focus().unsetColor().run()}
            onChangeComplete={(color) => editor.chain().focus().setColor(color.toHexString()).run()}
          >
            <Button
              htmlType="button"
              type="text"
              className="rich-text-editor__tool"
              disabled={disabled}
              aria-label="文字颜色"
              title="文字颜色"
              onMouseDown={(event) => event.preventDefault()}
              icon={
                <span className="rich-text-editor__color-icon" aria-hidden="true">
                  <FontColorsOutlined />
                  <span
                    className="rich-text-editor__color-bar"
                    style={{ backgroundColor: state.color }}
                  />
                </span>
              }
            />
          </ColorPicker>
          <ColorPicker
            disabled={disabled}
            value={state.backgroundColor}
            allowClear
            onClear={() => editor.chain().focus().unsetBackgroundColor().run()}
            onChangeComplete={(color) =>
              editor.chain().focus().setBackgroundColor(color.toHexString()).run()
            }
          >
            <Button
              htmlType="button"
              type="text"
              className="rich-text-editor__tool"
              disabled={disabled}
              aria-label="文字背景色"
              title="文字背景色"
              onMouseDown={(event) => event.preventDefault()}
              icon={
                <span className="rich-text-editor__color-icon" aria-hidden="true">
                  <HighlightOutlined />
                  <span
                    className="rich-text-editor__color-bar"
                    style={{ backgroundColor: state.backgroundColor }}
                  />
                </span>
              }
            />
          </ColorPicker>
        </div>
        <div className="rich-text-editor__tool-group">
          <TextStyleMenus editor={editor} disabled={disabled} />
        </div>
        <div className="rich-text-editor__tool-group">
          {blockActions.map((action) => (
            <Tooltip key={action.label} title={action.label}>
              <Button
                htmlType="button"
                type="text"
                className={clsx('rich-text-editor__tool', {
                  'rich-text-editor__tool--active': action.active,
                })}
                aria-label={action.label}
                aria-pressed={action.active}
                disabled={disabled}
                icon={action.icon}
                onMouseDown={(event) => event.preventDefault()}
                onClick={action.run}
              />
            </Tooltip>
          ))}
        </div>
        <div className="rich-text-editor__tool-group rich-text-editor__tool-group--last">
          <UploadTools
            services={services}
            disabled={disabled}
            uploading={uploading}
            upload={upload}
            cancel={cancelUpload}
          />
          <Tooltip title="编辑链接">
            <Button
              htmlType="button"
              type="text"
              className={clsx('rich-text-editor__tool', {
                'rich-text-editor__tool--active': state.link,
              })}
              aria-label="编辑链接"
              aria-pressed={state.link}
              disabled={disabled}
              icon={<LinkOutlined />}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const href: unknown = editor.getAttributes('link')['href'];
                setLink({
                  document: editor.state.doc,
                  bookmark: editor.state.selection.getBookmark(),
                  href: typeof href === 'string' ? href : '',
                });
              }}
            />
          </Tooltip>
          <TableMenu editor={editor} disabled={disabled} />
        </div>
      </div>
      {link && <LinkDialog editor={editor} selection={link} onClose={() => setLink(null)} />}
    </>
  );
};
