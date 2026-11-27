import { PictureOutlined } from '@ant-design/icons';

import { MediaPlaceholderList } from '../MediaPlaceholderList';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

const defaultItems = [{ id: 'image-1' }];

/** 图片展示：多个正方形素材位，超出自动换行。 */
export const ImageDisplayQuestion = ({ mediaItems }: QuestionTypeComponentProps) => (
  <div className="image-display-question">
    <MediaPlaceholderList
      items={mediaItems?.length ? mediaItems : defaultItems}

      icon={<PictureOutlined />}
      text="图片待上传"
      kind="image"
    />
  </div>
);
