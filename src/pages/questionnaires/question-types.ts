/**
 * 问卷题型统一领域定义。
 *
 * 企业级约定：
 * - 题型标识采用命名空间字符串（`类别.名称`），作为前后端传输、存储与埋点的稳定契约；
 * - 标识一经发布不得重命名或复用，新增题型只增补注册表；
 * - 分类、展示名、组件库分组均以本注册表为唯一事实源，UI 与接口层不得散落硬编码。
 */

/** 题型分类。 */
export const QUESTION_TYPE_CATEGORIES = [
  'choice',
  'input',
  'rating',
  'matrix',
  'media',
  'container',
] as const;

export type QuestionTypeCategory = (typeof QUESTION_TYPE_CATEGORIES)[number];

/** 分类展示名。 */
export const QUESTION_TYPE_CATEGORY_LABELS: Record<QuestionTypeCategory, string> = {
  choice: '选择题',
  input: '填空题',
  rating: '打分题',
  matrix: '矩阵题',
  media: '其他',
  container: '容器组件',
};

/** 题型渲染类别：决定画布预览形态与编辑器配置面板。 */
export type QuestionTypeKind =
  | 'choice'
  | 'image-choice'
  | 'text-input'
  | 'multi-input'
  | 'rating'
  | 'nps'
  | 'matrix'
  | 'media'
  | 'container';

/** 题型注册条目。 */
export interface QuestionTypeDefinition {
  /** 稳定标识，命名空间字符串。 */
  readonly id: string;
  readonly category: QuestionTypeCategory;
  readonly kind: QuestionTypeKind;
  readonly label: string;
  /** 组件库中的用途说明。 */
  readonly hint?: string;
}

const defineQuestionType = <const T extends QuestionTypeDefinition>(definition: T): T => definition;

/** 题型注册表：组件库与画布的唯一事实源。 */
export const QUESTION_TYPE_DEFINITIONS = {
  singleChoice: defineQuestionType({
    id: 'choice.single',
    category: 'choice',
    kind: 'choice',
    label: '单选题',
  }),
  multipleChoice: defineQuestionType({
    id: 'choice.multiple',
    category: 'choice',
    kind: 'choice',
    label: '多选题',
  }),
  imageSingleChoice: defineQuestionType({
    id: 'choice.image-single',
    category: 'choice',
    kind: 'image-choice',
    label: '图片单选',
  }),
  imageMultipleChoice: defineQuestionType({
    id: 'choice.image-multiple',
    category: 'choice',
    kind: 'image-choice',
    label: '图片多选',
  }),
  textInput: defineQuestionType({
    id: 'input.text',
    category: 'input',
    kind: 'text-input',
    label: '文本填空',
  }),
  phoneInput: defineQuestionType({
    id: 'input.phone',
    category: 'input',
    kind: 'text-input',
    label: '手机号',
  }),
  emailInput: defineQuestionType({
    id: 'input.email',
    category: 'input',
    kind: 'text-input',
    label: '邮箱',
  }),
  numberInput: defineQuestionType({
    id: 'input.number',
    category: 'input',
    kind: 'text-input',
    label: '数值',
  }),
  dateInput: defineQuestionType({
    id: 'input.date',
    category: 'input',
    kind: 'text-input',
    label: '日期',
  }),
  multiInput: defineQuestionType({
    id: 'input.multi',
    category: 'input',
    kind: 'multi-input',
    label: '多项填空',
  }),
  rating: defineQuestionType({
    id: 'rating.scale',
    category: 'rating',
    kind: 'rating',
    label: '打分题',
  }),
  nps: defineQuestionType({ id: 'rating.nps', category: 'rating', kind: 'nps', label: 'NPS' }),
  biRating: defineQuestionType({
    id: 'rating.bi',
    category: 'rating',
    kind: 'rating',
    label: '双向打分',
  }),
  multiRating: defineQuestionType({
    id: 'rating.multi',
    category: 'rating',
    kind: 'rating',
    label: '多项打分',
  }),
  multiBiRating: defineQuestionType({
    id: 'rating.multi-bi',
    category: 'rating',
    kind: 'rating',
    label: '多项双向打分',
  }),
  matrixSingle: defineQuestionType({
    id: 'matrix.single',
    category: 'matrix',
    kind: 'matrix',
    label: '矩阵单选',
  }),
  matrixMultiple: defineQuestionType({
    id: 'matrix.multiple',
    category: 'matrix',
    kind: 'matrix',
    label: '矩阵多选',
  }),
  matrixRating: defineQuestionType({
    id: 'matrix.rating',
    category: 'matrix',
    kind: 'matrix',
    label: '矩阵打分',
  }),
  matrixBiRating: defineQuestionType({
    id: 'matrix.bi',
    category: 'matrix',
    kind: 'matrix',
    label: '矩阵双向打分',
  }),
  videoDisplay: defineQuestionType({
    id: 'media.video',
    category: 'media',
    kind: 'media',
    label: '视频展示',
  }),
  imageDisplay: defineQuestionType({
    id: 'media.image',
    category: 'media',
    kind: 'media',
    label: '图片展示',
  }),
  group: defineQuestionType({
    id: 'container.group',
    category: 'container',
    kind: 'container',
    label: '题目组',
    hint: '编排题目',
  }),
  followUp: defineQuestionType({
    id: 'container.follow-up',
    category: 'container',
    kind: 'container',
    label: '追问区',
    hint: '继续追问',
  }),
  guide: defineQuestionType({
    id: 'container.guide',
    category: 'container',
    kind: 'container',
    label: '引导语',
    hint: '开场说明',
  }),
} as const;

/** 题型标识联合类型，由注册表派生，避免手写散落。 */
export type QuestionTypeId =
  (typeof QUESTION_TYPE_DEFINITIONS)[keyof typeof QUESTION_TYPE_DEFINITIONS]['id'];

/** 注册表条目联合类型，保留字面量标识与分类。 */
type RegisteredQuestionType =
  (typeof QUESTION_TYPE_DEFINITIONS)[keyof typeof QUESTION_TYPE_DEFINITIONS];

const definitionList: readonly RegisteredQuestionType[] = Object.values(QUESTION_TYPE_DEFINITIONS);

const definitionById = new Map<string, QuestionTypeDefinition>(
  definitionList.map((definition) => [definition.id, definition]),
);

/** 判断字符串是否为已注册题型标识。 */
export const isQuestionTypeId = (value: string): value is QuestionTypeId =>
  definitionById.has(value);

/** 按标识获取题型定义；未注册返回 undefined。 */
export const getQuestionTypeDefinition = (id: string): QuestionTypeDefinition | undefined =>
  definitionById.get(id);

/** 按标识获取展示名；未注册回退为标识本身。 */
export const getQuestionTypeLabel = (id: string): string => definitionById.get(id)?.label ?? id;

/** 按分类获取题型定义，保持注册顺序与字面量标识类型。 */
export const getQuestionTypesByCategory = <C extends QuestionTypeCategory>(
  category: C,
): Array<Extract<RegisteredQuestionType, { category: C }>> =>
  definitionList.filter(
    (definition): definition is Extract<RegisteredQuestionType, { category: C }> =>
      definition.category === category,
  );
