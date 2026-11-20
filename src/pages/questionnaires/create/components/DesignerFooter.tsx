import { Button } from 'antd';

interface DesignerFooterProps {
  onCancel: () => void;
}

export const DesignerFooter = ({ onCancel }: DesignerFooterProps) => (
  <footer className="designer-footer">
    <Button onClick={onCancel}>取消</Button>
    <Button type="primary" disabled>
      保存并返回
    </Button>
  </footer>
);
