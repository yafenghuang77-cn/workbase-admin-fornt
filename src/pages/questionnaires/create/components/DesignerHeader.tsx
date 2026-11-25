import { useId } from 'react';

import {
  ArrowLeftOutlined,
  BgColorsOutlined,
  BranchesOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented } from 'antd';

interface DesignerHeaderProps {
  onBack: () => void;
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

export const DesignerHeader = ({ onBack }: DesignerHeaderProps) => {
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
