import type { SyntheticEvent } from 'react';
import { useState } from 'react';

import { SearchOutlined } from '@ant-design/icons';
import { Empty, Input, Tabs } from 'antd';

import { paletteGroups } from '../data';

import { PaletteGroup } from './PaletteGroup';

import './question-palette.less';

const QuestionTypes = () => {
  const [keyword, setKeyword] = useState('');
  const query = keyword.trim().toLowerCase();
  const visibleGroups = paletteGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(query)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="question-palette__body">
      <div className="question-palette__search">
        <Input
          allowClear
          prefix={<SearchOutlined aria-hidden="true" />}
          aria-label="搜索题型"
          placeholder="搜索题型"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>
      {visibleGroups.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配题型" />
      ) : (
        <div className="question-palette__groups">
          {visibleGroups.map((group) => {
            const open = query ? true : undefined;

            return (
              <PaletteGroup
                key={`${query ? 'search' : 'browse'}-${group.key}`}
                group={group}
                open={open}
                onToggle={
                  open === undefined
                    ? undefined
                    : (event: SyntheticEvent<HTMLDetailsElement>) => {
                        // 搜索态强制展开，忽略手动收起
                        if (!event.currentTarget.open) event.currentTarget.open = true;
                      }
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

/** 题库页签：暂未开放，提供与题型一致的固定搜索框（禁用）。 */
const QuestionLibrary = () => (
  <div className="question-palette__body">
    <div className="question-palette__search">
      <Input
        allowClear
        disabled
        prefix={<SearchOutlined aria-hidden="true" />}
        aria-label="搜索题库"
        placeholder="搜索题库"
      />
    </div>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="题库暂未开放" />
  </div>
);

export const QuestionPalette = () => (
  <aside className="question-palette" aria-label="组件库">
    <Tabs
      className="question-palette__tabs"
      size="small"
      items={[
        { key: 'types', label: '题型', children: <QuestionTypes /> },
        { key: 'library', label: '题库', children: <QuestionLibrary /> },
      ]}
    />
  </aside>
);
