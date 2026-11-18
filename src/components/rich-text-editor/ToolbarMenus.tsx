import type { ReactNode } from 'react';

import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  LineHeightOutlined,
  MenuOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import type { MenuProps } from 'antd';
import { Button, Dropdown, Tooltip } from 'antd';

import { FONT_OPTIONS, FONT_SIZES, LINE_HEIGHTS } from './content';

interface IconMenuProps {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  items: NonNullable<MenuProps['items']>;
  selectedKeys?: string[];
}

function IconMenu({ label, icon, disabled, items, selectedKeys = [] }: IconMenuProps) {
  return (
    <Dropdown
      disabled={disabled}
      trigger={['click']}
      placement="bottomLeft"
      menu={{ items, selectedKeys, selectable: true }}
    >
      <Tooltip title={label}>
        <Button
          htmlType="button"
          type="text"
          className="rich-text-editor__tool"
          aria-label={label}
          disabled={disabled}
          icon={icon}
          onMouseDown={(event) => event.preventDefault()}
        />
      </Tooltip>
    </Dropdown>
  );
}

interface EditorMenuProps {
  editor: Editor;
  disabled: boolean;
}

/** 每种排版能力在工具栏上各有一个图标，点击只展开该工具的选项。 */
export function TextStyleMenus({ editor, disabled }: EditorMenuProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      heading: [1, 2, 3].find((level) => current.isActive('heading', { level })) ?? 0,
      align: (current.getAttributes('heading')['textAlign'] ??
        current.getAttributes('paragraph')['textAlign'] ??
        'left') as string,
      fontSize: (current.getAttributes('textStyle')['fontSize'] ?? '16px') as string,
      fontFamily: (current.getAttributes('textStyle')['fontFamily'] ?? '') as string,
      lineHeight: (current.getAttributes('textStyle')['lineHeight'] ?? '1.75') as string,
    }),
  });
  return (
    <>
      <IconMenu
        label="段落样式"
        icon={<MenuOutlined />}
        disabled={disabled}
        selectedKeys={[`heading:${state.heading}`]}
        items={[
          {
            key: 'heading:0',
            label: '正文',
            onClick: () => editor.chain().focus().setParagraph().run(),
          },
          ...([1, 2, 3] as const).map((level) => ({
            key: `heading:${level}`,
            label: `标题 ${level}`,
            onClick: () => editor.chain().focus().setHeading({ level }).run(),
          })),
        ]}
      />
      <IconMenu
        label="字体"
        icon={<FontColorsOutlined />}
        disabled={disabled}
        selectedKeys={[state.fontFamily]}
        items={[
          {
            key: '',
            label: '默认字体',
            onClick: () => editor.chain().focus().unsetFontFamily().run(),
          },
          { type: 'divider' },
          ...FONT_OPTIONS.map(({ label, value }) => ({
            key: value,
            label: <span style={{ fontFamily: value }}>{label}</span>,
            onClick: () => editor.chain().focus().setFontFamily(value).run(),
          })),
        ]}
      />
      <IconMenu
        label="字号"
        icon={<FontSizeOutlined />}
        disabled={disabled}
        selectedKeys={[state.fontSize]}
        items={FONT_SIZES.map((value) => ({
          key: value,
          label: value,
          onClick: () => editor.chain().focus().setFontSize(value).run(),
        }))}
      />
      <IconMenu
        label="行高"
        icon={<LineHeightOutlined />}
        disabled={disabled}
        selectedKeys={[state.lineHeight]}
        items={LINE_HEIGHTS.map((value) => ({
          key: value,
          label: `${value} 倍`,
          onClick: () => editor.chain().focus().setLineHeight(value).run(),
        }))}
      />
      <IconMenu
        label="文字对齐"
        icon={
          state.align === 'center' ? (
            <AlignCenterOutlined />
          ) : state.align === 'right' ? (
            <AlignRightOutlined />
          ) : (
            <AlignLeftOutlined />
          )
        }
        disabled={disabled}
        selectedKeys={[state.align]}
        items={[
          { key: 'left', label: '左对齐', icon: <AlignLeftOutlined /> },
          { key: 'center', label: '居中', icon: <AlignCenterOutlined /> },
          { key: 'right', label: '右对齐', icon: <AlignRightOutlined /> },
          { key: 'justify', label: '两端对齐' },
        ].map((item) => ({
          ...item,
          onClick: () => editor.chain().focus().setTextAlign(item.key).run(),
        }))}
      />
    </>
  );
}

export function TableMenu({ editor, disabled }: EditorMenuProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      inTable: current.isActive('table'),
      addRow: current.can().addRowAfter(),
      addColumn: current.can().addColumnAfter(),
      deleteRow: current.can().deleteRow(),
      deleteColumn: current.can().deleteColumn(),
      merge: current.can().mergeCells(),
      split: current.can().splitCell(),
    }),
  });
  return (
    <IconMenu
      label="表格操作"
      icon={<TableOutlined />}
      disabled={disabled}
      items={[
        {
          key: 'insert',
          label: '插入 3 × 3 表格',
          disabled: state.inTable,
          onClick: () =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
        {
          key: 'row',
          label: '下方插入行',
          disabled: !state.addRow,
          onClick: () => editor.chain().focus().addRowAfter().run(),
        },
        {
          key: 'column',
          label: '右侧插入列',
          disabled: !state.addColumn,
          onClick: () => editor.chain().focus().addColumnAfter().run(),
        },
        {
          key: 'deleteRow',
          label: '删除当前行',
          disabled: !state.deleteRow,
          onClick: () => editor.chain().focus().deleteRow().run(),
        },
        {
          key: 'deleteColumn',
          label: '删除当前列',
          disabled: !state.deleteColumn,
          onClick: () => editor.chain().focus().deleteColumn().run(),
        },
        {
          key: 'merge',
          label: '合并单元格',
          disabled: !state.merge,
          onClick: () => editor.chain().focus().mergeCells().run(),
        },
        {
          key: 'split',
          label: '拆分单元格',
          disabled: !state.split,
          onClick: () => editor.chain().focus().splitCell().run(),
        },
        {
          key: 'delete',
          label: '删除表格',
          danger: true,
          disabled: !state.inTable,
          onClick: () => editor.chain().focus().deleteTable().run(),
        },
      ]}
    />
  );
}
