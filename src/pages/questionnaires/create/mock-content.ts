import type { RichTextValue } from '@/components/rich-text-editor';

import type { QuestionTypeId } from '../question-types';
import { getQuestionTypeDefinition, getQuestionTypeLabel } from '../question-types';

import type { DesignerBlock, DesignerQuestion } from './data';

/**
 * 画布容器演示内容工厂。
 *
 * 当前只覆盖容器组件（引导语、题目组、追问区）的本地 mock 结构，
 * 题目组内为占位题目，具体题型内容待题型编辑能力接入后补齐；
 * 接入服务端后由接口返回值替换，工厂本身不发起请求。
 */

/** 容器组件标识：由统一题型标识派生。 */
type ContainerTypeId = Extract<QuestionTypeId, `container.${string}`>;

const isContainerTypeId = (type: QuestionTypeId): type is ContainerTypeId =>
  type.startsWith('container.');

let sequence = 0;

/** 生成画布内稳定且唯一的本地标识。 */
const createLocalId = (prefix: string) => {
  sequence += 1;
  return `${prefix}-${sequence}`;
};

/**
 * 按拖入的题型生成画布区块。
 *
 * 容器题型生成对应容器；普通题型生成仅含该题的题目组，
 * 选项与矩阵行列带默认内容，题型 UI 由业务组件渲染。
 */
export const createMockBlock = (type: QuestionTypeId): DesignerBlock | undefined => {
  if (!isContainerTypeId(type)) return undefined;
  const id = createLocalId('block');

  switch (type) {
    case 'container.group':
      return {
        id,
        kind: 'group',
        title: '题目组',
        questions: [],
      };
    case 'container.follow-up':
      return {
        id,
        kind: 'follow-up',
        title: '追问区',
        placeholder: '请补充说明你的想法……',
        questions: [],
      };
    case 'container.guide': {
      const content = '感谢你参与本次问卷，请根据实际情况作答，全程约需 3 分钟。';
      return {
        id,
        kind: 'guide',
        title: '引导语',
        content,
        contentDoc: textToDoc(content),
        displayTime: DEFAULT_GUIDE_DISPLAY_TIME,
      };
    }
  }
};

/** 引导语默认显示时长（秒）。 */
export const DEFAULT_GUIDE_DISPLAY_TIME = 30;

/** 将纯文本按行转换为最小富文本文档，供编辑器回显。 */
export const textToDoc = (text: string): RichTextValue => ({
  type: 'doc',
  content: text
    .split('\n')
    .map((line) =>
      line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' },
    ),
});

/**
 * 生成一道题目；容器类题型返回 undefined。
 *
 * 题目只能放入题目组或追问区，因此不产生独立区块。
 */
export const createMockQuestion = (
  type: QuestionTypeId,
  ordinal: number,
): DesignerQuestion | undefined => {
  const definition = getQuestionTypeDefinition(type);
  if (!definition || definition.kind === 'container') return undefined;

  return {
    id: createLocalId('question'),
    type,
    title: `第 ${ordinal} 题：${getQuestionTypeLabel(type)}`,
    ...(definition.kind === 'choice' || definition.kind === 'matrix'
      ? { options: ['选项 1', '选项 2', '选项 3'] }
      : {}),
    ...(definition.kind === 'matrix' ? { rows: ['行 1', '行 2', '行 3'] } : {}),
    ...(definition.kind === 'media' ? { mediaItems: [{ id: 'media-1' }] } : {}),
  };
};

/** 统计画布区块内的题目总数。 */
export const countQuestions = (blocks: DesignerBlock[]): number =>
  blocks.reduce(
    (total, block) =>
      total + (block.kind === 'group' || block.kind === 'follow-up' ? block.questions.length : 0),
    0,
  );
