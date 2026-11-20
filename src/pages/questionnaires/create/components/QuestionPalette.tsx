import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  CalendarOutlined,
  FieldNumberOutlined,
  FileTextOutlined,
  FolderOutlined,
  FormOutlined,
  HeartOutlined,
  MailOutlined,
  MessageOutlined,
  SearchOutlined,
  StarOutlined,
  SwapOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Input, Tabs } from 'antd';
import clsx from 'clsx';

import type { QuestionType } from '../data';
import { paletteGroups } from '../data';

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

const groupIcons: Record<string, ReactNode> = {
  basic: <FormOutlined />,
  rating: <StarOutlined />,
  matrix: <TableOutlined />,
  container: <FolderOutlined />,
};

/** 左侧题库面板：题型/题库切换、搜索与分组题型列表。 */
export const QuestionPalette = () => {
  const [activeTab, setActiveTab] = useState('types');
  const [keyword, setKeyword] = useState('');
  const [collapsedKeys, setCollapsedKeys] = useState<string[]>([]);

  const visibleGroups = useMemo(() => {
    const query = keyword.trim();
    return paletteGroups
      .map((group) => ({
        ...group,
        items: query ? group.items.filter((item) => item.label.includes(query)) : group.items,
      }))
      .filter((group) => group.items.length > 0);
  }, [keyword]);

  const toggleGroup = (key: string) => {
    setCollapsedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  return (
    <aside className="question-palette" aria-label="题型库">
      <Tabs
        className="question-palette__tabs"
        size="small"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'types', label: '题型' },
          { key: 'library', label: '题库' },
        ]}
      />
      <div className="question-palette__search">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索题型"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>
      <div className="question-palette__groups">
        {visibleGroups.map((group) => {
          const collapsed = collapsedKeys.includes(group.key);
          return (
            <section className="palette-group" key={group.key}>
              <button
                type="button"
                className="palette-group__head"
                aria-expanded={!collapsed}
                onClick={() => toggleGroup(group.key)}
              >
                <span className="palette-group__icon">{groupIcons[group.key]}</span>
                <span className="palette-group__name">{group.label}</span>
                <span className="palette-group__count">{group.items.length}</span>
                <span className="palette-group__toggle">{collapsed ? '展开' : '收起'}</span>
              </button>
              {collapsed ? null : (
                <div className="palette-group__items">
                  {group.items.map((item) => (
                    <button key={item.type} type="button" className="palette-item">
                      <span
                        className={clsx('palette-item__icon', `palette-item__icon--${item.type}`)}
                      >
                        {typeIcons[item.type]}
                      </span>
                      <span className="palette-item__label">{item.label}</span>
                      {item.hint ? <span className="palette-item__hint">{item.hint}</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
};
