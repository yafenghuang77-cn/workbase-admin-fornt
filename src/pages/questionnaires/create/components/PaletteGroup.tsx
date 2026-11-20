import type { ReactNode } from 'react';

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
}

export const PaletteGroup = ({ group }: PaletteGroupProps) => (
  <details className="palette-group" open>
    <summary className="palette-group__summary">
      <span>{group.label}</span>
      <span className="palette-group__count">{group.items.length}</span>
      <DownOutlined className="palette-group__chevron" aria-hidden="true" />
    </summary>
    <ul className="palette-group__items">
      {group.items.map((item) => (
        <li className="palette-item" key={item.type}>
          <span className="palette-item__icon" aria-hidden="true">
            {typeIcons[item.type]}
          </span>
          <span>{item.label}</span>
          {item.hint ? <span className="palette-item__hint">{item.hint}</span> : null}
        </li>
      ))}
    </ul>
  </details>
);
