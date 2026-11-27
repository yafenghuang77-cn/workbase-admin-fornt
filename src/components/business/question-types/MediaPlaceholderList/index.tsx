import type { ReactNode } from 'react';

import { Image } from 'antd';

import type { MediaItem } from '../types';

import './index.less';

interface MediaPlaceholderListProps {
  items: MediaItem[];
  /** 占位图标。 */
  icon: ReactNode;
  /** 占位文案，如「图片待上传」。 */
  text: string;
  /** 素材类型：视频暂以占位呈现，图片可直接展示。 */
  kind: 'image' | 'video';
}

/** 媒体占位列表：正方形卡片横向排列，一行放不下自动换行。 */
export const MediaPlaceholderList = ({ items, icon, text, kind }: MediaPlaceholderListProps) => (
  <ul className="media-placeholder-list">
    {items.map((item) => (
      <li className="media-placeholder-list__item" key={item.id}>
        {kind === 'image' && item.url ? (
          <Image
            className="media-placeholder-list__thumb"
            src={item.url}
            alt={text}
            width="100%"
            height="100%"
            preview={false}
          />
        ) : (
          <span className="media-placeholder-list__empty">
            {icon}
            <span className="media-placeholder-list__text">{text}</span>
          </span>
        )}
      </li>
    ))}
  </ul>
);
