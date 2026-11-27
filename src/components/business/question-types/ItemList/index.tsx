import type { ReactNode } from 'react';

import './index.less';

interface ItemListProps {
  items: Array<{ id: string; title: string }>;
  /** 每个子项的内容渲染。 */
  children: (item: { id: string; title: string }) => ReactNode;
}

/** 多项列表：带标题的子项纵向排列，供多项填空与多项打分复用。 */
export const ItemList = ({ items, children }: ItemListProps) => (
  <div className="question-type__items">
    {items.map((item) => (
      <div className="question-type__item" key={item.id}>
        <span className="question-type__item-title">{item.title}</span>
        {children(item)}
      </div>
    ))}
  </div>
);
