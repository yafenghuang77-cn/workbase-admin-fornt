import type { ReactNode, SyntheticEvent } from 'react';

import {
  CalendarOutlined,
  DownOutlined,
  FieldNumberOutlined,
  FileTextOutlined,
  FolderOutlined,
  FormOutlined,
  HeartOutlined,
  MailOutlined,
  MessageOutlined,
  StarOutlined,
  SwapOutlined,
  TableOutlined,
} from '@ant-design/icons';

import type { PaletteGroup as PaletteSection, QuestionType } from '../data';

const typeIcons: Record<QuestionType, ReactNode> = {
  email: <MailOutlined />,
  number: <FieldNumberOutlined />,
  date: <CalendarOutlined />,
  'multi-blank': <FormOutlined />,
  rating: <StarOutlined />,
  nps: <HeartOutlined />,
  'bi-rating': <SwapOutlined />,
  'multi-rating': <StarOutlined />,
  'multi-bi-rating': <SwapOutlined />,
  'matrix-single': <TableOutlined />,
  'matrix-multi': <TableOutlined />,
  'matrix-rating': <TableOutlined />,
  'matrix-bi-rating': <TableOutlined />,
  group: <FolderOutlined />,
  'follow-up': <MessageOutlined />,
  guide: <FileTextOutlined />,
};

interface PaletteGroupProps {
  group: PaletteSection;
  /** 强制展开（搜索态）；缺省时默认折叠，可手动展开。 */
  open?: boolean | undefined;
  onToggle?: ((event: SyntheticEvent<HTMLDetailsElement>) => void) | undefined;
}

export const PaletteGroup = ({ group, open, onToggle }: PaletteGroupProps) => {
  const items = (
    <ul className="palette-group__items">
      {group.items.map((item) => (
        <li className="palette-item" key={item.type}>
          <span className="palette-item__icon" aria-hidden="true">
            {typeIcons[item.type]}
          </span>
          <span className="palette-item__text">
            <span className="palette-item__label">{item.label}</span>
            {item.hint ? <span className="palette-item__hint">{item.hint}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );

  if (group.collapsible === false) {
    return (
      <section className="palette-group palette-group--flat" aria-label={group.label}>
        {items}
      </section>
    );
  }

  return (
    <details className="palette-group" open={open} onToggle={onToggle}>
      <summary className="palette-group__summary">
        <span>{group.label}</span>
        <span className="palette-group__count">{group.items.length}</span>
        <DownOutlined className="palette-group__chevron" aria-hidden="true" />
      </summary>
      {items}
    </details>
  );
};
