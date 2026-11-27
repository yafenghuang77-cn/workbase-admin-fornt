import type { RichTextValue } from '@/components/rich-text-editor';

import type {
  QuestionTypeCategory,
  QuestionTypeDefinition,
  QuestionTypeId,
} from '../question-types';
import {
  getQuestionTypesByCategory,
  QUESTION_TYPE_CATEGORIES,
  QUESTION_TYPE_CATEGORY_LABELS,
} from '../question-types';

export type { QuestionTypeId } from '../question-types';

/** 左侧题库面板中的题型条目。 */
export interface PaletteItem {
  type: QuestionTypeId;
  label: string;
  /** 容器块的用途说明，如“编排题目”。 */
  hint?: string;
}

/** 左侧题库面板的题型分组。 */
export interface PaletteGroup {
  key: QuestionTypeCategory;
  label: string;
  items: PaletteItem[];
  /** 是否可折叠；缺省可折叠，设为 false 时条目直接平铺展示。 */
  collapsible?: boolean;
}

/** 画布中的题目。 */
export interface DesignerQuestion {
  id: string;
  type: QuestionTypeId;
  title: string;
  required?: boolean;
  /** 选择类题型的选项文案。 */
  options?: string[];
  /** 打分题的量程上限。 */
  scaleMax?: number;
  /** 量表两端的说明文案。 */
  scaleLabels?: [string, string];
  /** 矩阵题的行标题。 */
  rows?: string[];
  /** 媒体展示的素材项，支持多个。 */
  mediaItems?: Array<{ id: string; url?: string }>;
  /** 演示用预填答案：行索引 -> 列索引。 */
  previewAnswers?: Record<number, number>;
}

/** 引导语块。 */
export interface GuideBlock {
  id: string;
  kind: 'guide';
  title: string;
  content: string;
  /** 富文本引导语文档，作为编辑与展示的内容源。 */
  contentDoc?: RichTextValue;
  /** 显示时长（秒），默认 30。 */
  displayTime?: number;
}

/** 追问区块：与题目组一样可容纳题目。 */
export interface FollowUpBlock {
  id: string;
  kind: 'follow-up';
  title: string;
  placeholder: string;
  questions: DesignerQuestion[];
}

/** 题目组容器。 */
export interface QuestionGroup {
  id: string;
  kind: 'group';
  title: string;
  questions: DesignerQuestion[];
}

/** 画布区块：引导语、题目组或追问区。 */
export type DesignerBlock = GuideBlock | FollowUpBlock | QuestionGroup;

/** 左侧组件库分组：由统一注册表按分类派生，容器组件平铺展示。 */
export const paletteGroups: PaletteGroup[] = QUESTION_TYPE_CATEGORIES.map((category) => ({
  key: category,
  label: QUESTION_TYPE_CATEGORY_LABELS[category],
  collapsible: category !== 'container',
  items: getQuestionTypesByCategory(category).map((definition) => {
    const meta: QuestionTypeDefinition = definition;
    return {
      type: definition.id,
      label: meta.label,
      ...(meta.hint ? { hint: meta.hint } : {}),
    };
  }),
}));

export type { QuestionTypeKind } from '../question-types';
