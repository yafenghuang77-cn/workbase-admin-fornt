import { useState } from 'react';

import { BellOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import { AutoComplete, Avatar, Button, Input, Popover } from 'antd';

import { navigation } from './navigation';

export const HeaderActions = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  return (
    <div className="workbase-header-actions">
      <AutoComplete
        className="workbase-search"
        value={search}
        onChange={setSearch}
        options={
          search.trim()
            ? navigation
                .filter((item) => !item.hideInMenu)
                .flatMap((item) => item.children ?? [item])
                .filter((item) => item.name?.includes(search.trim()))
                .map((item) => ({ value: item.path ?? '/', label: item.name }))
            : []
        }
        onSelect={(path) => {
          navigate({ to: path }).catch(() => undefined);
          setSearch('');
        }}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索功能、客户或任务"
          aria-label="搜索功能"
          allowClear
        />
      </AutoComplete>
      <Popover trigger="click" title="通知" content="暂无新通知">
        <Button type="text" icon={<BellOutlined />} aria-label="查看通知" />
      </Popover>
      <div className="workbase-user" role="group" aria-label="当前用户">
        <Avatar className="workbase-avatar">王</Avatar>
        <span className="workbase-user-name">王小明</span>
      </div>
    </div>
  );
};
