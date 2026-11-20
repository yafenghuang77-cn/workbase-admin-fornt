import type { ReactNode } from 'react';

interface DesignerPanelHeadingProps {
  icon: ReactNode;
  title: string;
  description: string;
  extra?: ReactNode;
}

export const DesignerPanelHeading = ({
  icon,
  title,
  description,
  extra,
}: DesignerPanelHeadingProps) => (
  <header className="designer-panel-heading">
    <span className="designer-panel-heading__icon" aria-hidden="true">
      {icon}
    </span>
    <div className="designer-panel-heading__text">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    {extra}
  </header>
);
