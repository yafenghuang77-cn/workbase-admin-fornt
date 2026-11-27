import type { QuestionTypeId } from '../question-types';
import { isQuestionTypeId } from '../question-types';

/** 可拖拽实体类型：组件库题型条目。 */
export const PALETTE_ITEM_DRAG_TYPE = 'questionnaire-palette-item';

/** 可拖拽实体类型：组件库中的容器组件条目。 */
export const CANVAS_BLOCK_DRAG_TYPE = 'questionnaire-canvas-block';

/** 画布整体投放区标识：用于末尾追加与空态投放。 */
export const CANVAS_DROP_ID = 'questionnaire-canvas';

/** 插入位标识前缀，后缀为目标插入下标。 */
const INSERTION_ID_PREFIX = 'questionnaire-canvas-insert-';

/** 生成插入位标识。 */
export const getInsertionDropId = (index: number) => `${INSERTION_ID_PREFIX}${index}`;

/** 解析插入位标识对应的下标；非插入位返回 undefined。 */
export const readInsertionIndex = (id: unknown): number | undefined => {
  if (typeof id !== 'string' || !id.startsWith(INSERTION_ID_PREFIX)) return undefined;
  const index = Number(id.slice(INSERTION_ID_PREFIX.length));
  return Number.isInteger(index) && index >= 0 ? index : undefined;
};

/** 容器题目投放区标识前缀，后缀为容器区块标识。 */
const QUESTION_DROP_ID_PREFIX = 'questionnaire-question-drop-';

/** 生成容器题目投放区标识。 */
export const getQuestionDropId = (blockId: string) => `${QUESTION_DROP_ID_PREFIX}${blockId}`;

/** 解析题目投放区对应的容器标识；非投放区返回 undefined。 */
export const readQuestionDropBlockId = (id: unknown): string | undefined => {
  if (typeof id !== 'string' || !id.startsWith(QUESTION_DROP_ID_PREFIX)) return undefined;
  const blockId = id.slice(QUESTION_DROP_ID_PREFIX.length);
  return blockId.length > 0 ? blockId : undefined;
};

/** 可容纳题目的容器类型：题目组与追问区。 */
export const canAcceptQuestions = (kind: string) => kind === 'group' || kind === 'follow-up';

/** 题型拖拽载荷。 */
export interface PaletteDragData {
  type: QuestionTypeId;
  label: string;
}

/** 从拖拽源数据中解析题型标识，非法数据返回 undefined。 */
export const readDraggedQuestionType = (data: unknown): QuestionTypeId | undefined => {
  if (typeof data !== 'object' || data === null) return undefined;
  const { type } = data as { type?: unknown };
  return typeof type === 'string' && isQuestionTypeId(type) ? type : undefined;
};

/**
 * 参考 SurveyDesign 的落点解析：
 * 命中插入位直接取间隙下标；只命中画布空白处时沿用最近一次有效索引。
 */
export const computeInsertionGap = (options: {
  slotIndex?: number | undefined;
  overCanvas: boolean;
  fallback: number | null;
}): number | null => {
  const { slotIndex, overCanvas, fallback } = options;
  if (slotIndex !== undefined) return slotIndex;
  return overCanvas ? fallback : null;
};

/** 将插入下标钳制到 [0, length]，非法值回退为末尾。 */
export const clampInsertionIndex = (index: number | undefined, length: number): number => {
  if (index === undefined || !Number.isInteger(index) || index < 0) return length;
  return Math.min(index, length);
};
