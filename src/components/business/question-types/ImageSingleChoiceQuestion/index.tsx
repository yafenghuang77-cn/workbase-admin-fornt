import { ImageOptionList } from '../OptionList';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

const defaultImageOptions = [
  { id: 'image-1', label: '图片 1' },
  { id: 'image-2', label: '图片 2' },
];

/** 图片单选：图片卡片 + 单选控件。 */
export const ImageSingleChoiceQuestion = ({
  imageOptions,
  onAddOption,
  onRemoveOption,
}: QuestionTypeComponentProps) => (
  <div className="image-single-choice-question">
    <ImageOptionList
      options={imageOptions?.length ? imageOptions : defaultImageOptions}
      multiple={false}
      onAddOption={onAddOption}
      onRemoveOption={onRemoveOption}
    />
  </div>
);
