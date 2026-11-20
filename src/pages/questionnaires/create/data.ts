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

/** 画布演示内容，与设计稿一致；后续可替换为业务数据。 */
export const demoBlocks: DesignerBlock[] = [
  {
    id: 'guide-1',
    kind: 'guide',
    title: '问卷说明',
    content:
      '您好！本问卷旨在了解您对本次访谈服务的真实感受，问卷采用匿名形式，答案没有对错之分，请根据实际体验作答。预计耗时 3 分钟。',
  },
  {
    id: 'group-1',
    kind: 'group',
    title: '题目组 1 · 服务满意度',
    questions: [
      {
        id: 'q1',
        type: 'rating',
        title: '请对本次服务的总体满意度打分',
        required: true,
        scaleMax: 5,
      },
      {
        id: 'q2',
        type: 'nps',
        title: '您向朋友推荐我们的可能性有多大？',
        scaleLabels: ['完全不可能', '非常可能'],
      },
      {
        id: 'q3',
        type: 'matrix-single',
        title: '您对以下各方面的满意程度如何？',
        required: true,
        rows: ['响应速度', '专业程度', '服务态度'],
        options: ['非常满意', '满意', '一般', '不满意'],
        previewAnswers: { 0: 0, 1: 1 },
      },
    ],
  },
  {
    id: 'follow-up-1',
    kind: 'follow-up',
    title: '针对 Q3 的回答继续追问',
    placeholder: '拖拽题目到此区域，对前面题目的回答进行追问……',
  },
];

/** 默认选中的题目。 */
export const defaultSelectedQuestionId = 'q3';
