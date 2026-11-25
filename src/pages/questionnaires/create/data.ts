/** 题型标识：覆盖基础题型、打分题、矩阵题与容器块。 */
export type QuestionType =
  | 'email'
  | 'number'
  | 'date'
  | 'multi-blank'
  | 'rating'
  | 'nps'
  | 'bi-rating'
  | 'multi-rating'
  | 'multi-bi-rating'
  | 'matrix-single'
  | 'matrix-multi'
  | 'matrix-rating'
  | 'matrix-bi-rating'
  | 'group'
  | 'follow-up'
  | 'guide';

/** 左侧题库面板中的题型条目。 */
export interface PaletteItem {
  type: QuestionType;
  label: string;
  /** 容器块的用途说明，如“编排题目”。 */
  hint?: string;
}

/** 左侧题库面板的题型分组。 */
export interface PaletteGroup {
  key: string;
  label: string;
  items: PaletteItem[];
  /** 是否可折叠；缺省可折叠，设为 false 时条目直接平铺展示。 */
  collapsible?: boolean;
}

/** 画布中的题目。 */
export interface DesignerQuestion {
  id: string;
  type: QuestionType;
  title: string;
  required?: boolean;
  /** 打分题的量程上限。 */
  scaleMax?: number;
  /** 量表两端的说明文案。 */
  scaleLabels?: [string, string];
  /** 矩阵题的行标题。 */
  rows?: string[];
  /** 矩阵题的列（选项）。 */
  options?: string[];
  /** 演示用预填答案：行索引 -> 列索引。 */
  previewAnswers?: Record<number, number>;
}

/** 引导语块。 */
export interface GuideBlock {
  id: string;
  kind: 'guide';
  title: string;
  content: string;
}

/** 追问区块。 */
export interface FollowUpBlock {
  id: string;
  kind: 'follow-up';
  title: string;
  placeholder: string;
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

/** 左侧题库分组与题型清单。 */
export const paletteGroups: PaletteGroup[] = [
  {
    key: 'basic',
    label: '基础',
    items: [
      { type: 'email', label: '邮箱' },
      { type: 'number', label: '数值' },
      { type: 'date', label: '日期' },
      { type: 'multi-blank', label: '多项填空' },
    ],
  },
  {
    key: 'rating',
    label: '打分题',
    items: [
      { type: 'rating', label: '打分题' },
      { type: 'nps', label: 'NPS' },
      { type: 'bi-rating', label: '双向打分' },
      { type: 'multi-rating', label: '多项打分' },
      { type: 'multi-bi-rating', label: '多项双向打分' },
    ],
  },
  {
    key: 'matrix',
    label: '矩阵题',
    items: [
      { type: 'matrix-single', label: '矩阵单选' },
      { type: 'matrix-multi', label: '矩阵多选' },
      { type: 'matrix-rating', label: '矩阵打分' },
      { type: 'matrix-bi-rating', label: '矩阵双向打分' },
    ],
  },
  {
    key: 'container',
    label: '容器块',
    collapsible: false,
    items: [
      { type: 'group', label: '题目组', hint: '编排题目' },
      { type: 'follow-up', label: '追问区', hint: '继续追问' },
      { type: 'guide', label: '引导语', hint: '开场说明' },
    ],
  },
];

const typeLabelMap = new Map<QuestionType, string>(
  paletteGroups.flatMap((group) => group.items.map((item) => [item.type, item.label])),
);

/** 按题型获取展示名称。 */
export const getQuestionTypeLabel = (type: QuestionType) => typeLabelMap.get(type) ?? type;
