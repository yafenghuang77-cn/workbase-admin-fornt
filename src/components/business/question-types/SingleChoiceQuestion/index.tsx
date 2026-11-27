import { createDefaultOptions, toOptionItems } from '../option-model';
import { OptionList } from '../OptionList';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 单选题：纵向选项列表，支持添加与删除选项。 */
export const SingleChoiceQuestion = ({
  options,
  onAddOption,
  onRemoveOption,
}: QuestionTypeComponentProps) => (
  <div className="single-choice-question">
    <OptionList
      options={options?.length ? toOptionItems(options) : createDefaultOptions()}
      multiple={false}
      onAddOption={onAddOption}
      onRemoveOption={onRemoveOption}
    />
  </div>
);
