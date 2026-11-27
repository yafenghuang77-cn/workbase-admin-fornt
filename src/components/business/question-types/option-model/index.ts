import type { QuestionTypeId } from '@/pages/questionnaires/question-types';

import type { BlankItem, QuestionOptionItem, RatingScale, ScoreItem } from '../types';

/** 默认选项文案数量：设计器不出现空白题目。 */
const DEFAULT_OPTION_COUNT = 3;

/** 追加式命名：选项 1、选项 2…… */
export const createOptionLabel = (ordinal: number) => `选项 ${ordinal}`;

/** 生成默认选项列表。 */
export const createDefaultOptions = (count = DEFAULT_OPTION_COUNT): QuestionOptionItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `option-${index + 1}`,
    label: createOptionLabel(index + 1),
  }));

/** 在末尾追加一个选项，序号取当前长度 + 1。 */
export const appendOption = (options: QuestionOptionItem[]): QuestionOptionItem[] => [
  ...options,
  {
    id: `option-${Date.now()}-${options.length + 1}`,
    label: createOptionLabel(options.length + 1),
  },
];

/**
 * 删除指定下标的选项；至少保留一项，下标非法时返回原数组。
 * 保留原数组引用，便于调用方跳过无变化的状态更新。
 */
export const removeOptionAt = (
  options: QuestionOptionItem[],
  index: number,
): QuestionOptionItem[] => {
  if (options.length <= 1 || index < 0 || index >= options.length) return options;
  return options.filter((_, current) => current !== index);
};

/** 文本选项文案转带标识的选项列表。 */
export const toOptionItems = (labels: string[]): QuestionOptionItem[] =>
  labels.map((label, index) => ({ id: `option-${index}`, label }));

/** 默认量表：NPS 为 0–10，其余打分题为 1–5。 */
export const getDefaultScale = (type: QuestionTypeId): RatingScale =>
  type === 'rating.nps' ? { min: 0, max: 10 } : { min: 1, max: 5 };

/** 生成量表分值序列。 */
export const createScaleValues = ({ min, max }: RatingScale): number[] =>
  Array.from({ length: Math.max(max - min + 1, 0) }, (_, index) => min + index);

/** 默认多项填空项。 */
export const createDefaultBlanks = (): BlankItem[] => [
  { id: 'blank-1', title: '填空项 1' },
  { id: 'blank-2', title: '填空项 2' },
];

/** 默认多项打分项。 */
export const createDefaultScoreItems = (): ScoreItem[] => [
  { id: 'score-1', title: '打分项 1' },
  { id: 'score-2', title: '打分项 2' },
];

/** 默认矩阵行标题。 */
export const DEFAULT_MATRIX_ROWS = ['行 1', '行 2', '行 3'];

/** 默认矩阵列标题。 */
export const DEFAULT_MATRIX_COLUMNS = ['列 1', '列 2', '列 3'];
