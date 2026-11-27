import { ImageOptionList } from '../OptionList';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

const defaultImageOptions = [
  { id: 'image-1', label: '图片 1' },
  { id: 'image-2', label: '图片 2' },
];

/** 图片多选：图片卡片 + 复选控件。 */
export const ImageMultipleChoiceQuestion = ({
  imageOptions,
  onAddOption,
  onRemoveOption,
}: QuestionTypeComponentProps) => (
  <div className="image-multiple-choice-question">
    <ImageOptionList
      options={imageOptions?.length ? imageOptions : defaultImageOptions}
      multiple
      onAddOption={onAddOption}
      onRemoveOption={onRemoveOption}
    />
  </div>
);
