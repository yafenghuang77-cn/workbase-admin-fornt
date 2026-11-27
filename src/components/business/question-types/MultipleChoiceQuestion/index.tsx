import { createDefaultOptions, toOptionItems } from '../option-model';
import { OptionList } from '../OptionList';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 多选题：复选控件的纵向选项列表。 */
export const MultipleChoiceQuestion = ({
  options,
  onAddOption,
  onRemoveOption,
}: QuestionTypeComponentProps) => (
  <div className="multiple-choice-question">
    <OptionList
      options={options?.length ? toOptionItems(options) : createDefaultOptions()}
      multiple
      onAddOption={onAddOption}
      onRemoveOption={onRemoveOption}
    />
  </div>
);
