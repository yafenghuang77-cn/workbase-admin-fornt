import { useId } from 'react';

import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  BgColorsOutlined,
  BranchesOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented, Tooltip } from 'antd';

interface DesignerHeaderProps {
  onBack: () => void;
  /** 组件库是否已收起。 */
  paletteCollapsed: boolean;
  onExpandPalette: () => void;
}

const viewOptions = [
  { label: '内容', value: 'content', icon: <FileTextOutlined /> },
  { label: '逻辑', value: 'logic', icon: <BranchesOutlined />, disabled: true },
  { label: '样式', value: 'style', icon: <BgColorsOutlined />, disabled: true },
];

const modeOptions = [
  { label: '编辑', value: 'edit', icon: <EditOutlined /> },
  { label: '预览', value: 'preview', icon: <EyeOutlined />, disabled: true },
];

export const DesignerHeader = ({
  onBack,
  paletteCollapsed,
  onExpandPalette,
}: DesignerHeaderProps) => {
  const titleId = useId();

  return (
    <header className="designer-header">
      <div className="designer-header__identity">
        <Button
          className="designer-header__back"
          type="text"
          icon={<ArrowLeftOutlined />}
          aria-label="返回问卷列表"
          onClick={onBack}
        />
        {paletteCollapsed ? (
          <Tooltip title="展开组件库">
            <Button
              className="designer-header__palette-toggle"
              type="text"
              icon={<AppstoreOutlined />}
              aria-label="展开组件库"
              aria-expanded={false}
              onClick={onExpandPalette}
            />
          </Tooltip>
        ) : null}
        <div className="designer-header__title-field">
          <Input id={titleId} maxLength={120} placeholder="未命名问卷" aria-label="问卷名称" />
        </div>
      </div>
      <div className="designer-header__navigation">
        <Segmented aria-label="工作区" value="content" options={viewOptions} />
        <Segmented aria-label="设计模式" value="edit" options={modeOptions} />
      </div>
    </header>
  );
};
