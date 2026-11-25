import type { ReactNode, SyntheticEvent } from 'react';

import {
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  DownOutlined,
  EditOutlined,
  FieldNumberOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FolderOutlined,
  FormOutlined,
  HeartOutlined,
  MailOutlined,
  MessageOutlined,
  MobileOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  StarOutlined,
  SwapOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

import type { QuestionTypeCategory, QuestionTypeId } from '../../question-types';
import type { PaletteGroup as PaletteSection } from '../data';

const typeIcons: Record<QuestionTypeId, ReactNode> = {
  'choice.single': <CheckCircleOutlined />,
  'choice.multiple': <CheckSquareOutlined />,
  'choice.image-single': <PictureOutlined />,
  'choice.image-multiple': <FileImageOutlined />,
  'input.text': <EditOutlined />,
  'input.phone': <MobileOutlined />,
  'input.email': <MailOutlined />,
  'input.number': <FieldNumberOutlined />,
  'input.date': <CalendarOutlined />,
  'input.multi': <FormOutlined />,
  'rating.scale': <StarOutlined />,
  'rating.nps': <HeartOutlined />,
  'rating.bi': <SwapOutlined />,
  'rating.multi': <StarOutlined />,
  'rating.multi-bi': <SwapOutlined />,
  'matrix.single': <TableOutlined />,
  'matrix.multiple': <TableOutlined />,
  'matrix.rating': <TableOutlined />,
  'matrix.bi': <TableOutlined />,
  'media.video': <PlayCircleOutlined />,
  'media.image': <PictureOutlined />,
  'container.group': <FolderOutlined />,
  'container.follow-up': <MessageOutlined />,
  'container.guide': <FileTextOutlined />,
};

const categoryIcons: Record<QuestionTypeCategory, ReactNode> = {
  choice: <UnorderedListOutlined />,
  input: <EditOutlined />,
  rating: <StarOutlined />,
  matrix: <TableOutlined />,
  media: <AppstoreOutlined />,
  container: <FolderOutlined />,
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
        <span className="palette-group__icon" aria-hidden="true">
          {categoryIcons[group.key]}
        </span>
        <span>{group.label}</span>
        <span className="palette-group__count">{group.items.length}</span>
        <DownOutlined className="palette-group__chevron" aria-hidden="true" />
      </summary>
      {items}
    </details>
  );
};
