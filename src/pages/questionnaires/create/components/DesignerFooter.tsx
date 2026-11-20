import { Button } from 'antd';

interface DesignerFooterProps {
  onCancel?: () => void;
  onSave?: () => void;
}

/** 底栏：取消与保存并返回。 */
export const DesignerFooter = ({ onCancel, onSave }: DesignerFooterProps) => (
  <footer className="designer-footer">
    <Button onClick={onCancel}>取消</Button>
    <Button type="primary" onClick={onSave}>
      保存并返回
    </Button>
  </footer>
);
