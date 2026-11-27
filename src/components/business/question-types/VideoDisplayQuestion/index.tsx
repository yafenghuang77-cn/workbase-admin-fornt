import { PlayCircleOutlined } from '@ant-design/icons';

import { MediaPlaceholderList } from '../MediaPlaceholderList';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

const defaultItems = [{ id: 'video-1' }];

/** 视频展示：多个正方形素材位，超出自动换行。 */
export const VideoDisplayQuestion = ({ mediaItems }: QuestionTypeComponentProps) => (
  <div className="video-display-question">
    <MediaPlaceholderList
      items={mediaItems?.length ? mediaItems : defaultItems}
      icon={<PlayCircleOutlined />}
      text="视频待上传"
      kind="video"
    />
  </div>
);
