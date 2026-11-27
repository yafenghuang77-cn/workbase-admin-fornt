import { describe, expect, it } from 'vitest';

import {
  CANVAS_DROP_ID,
  clampInsertionIndex,
  computeInsertionGap,
  getInsertionDropId,
  PALETTE_ITEM_DRAG_TYPE,
  readDraggedQuestionType,
  readInsertionIndex,
} from '@/pages/questionnaires/create/drag-drop';
import { countQuestions, createMockBlock } from '@/pages/questionnaires/create/mock-content';

describe('画布容器 mock 工厂', () => {
  it('三种容器生成对应区块且标识唯一', () => {
    const group = createMockBlock('container.group');
    const followUp = createMockBlock('container.follow-up');
    const guide = createMockBlock('container.guide');

    expect(group?.kind).toBe('group');
    expect(followUp?.kind).toBe('follow-up');
    expect(guide?.kind).toBe('guide');
    expect(new Set([group?.id, followUp?.id, guide?.id]).size).toBe(3);
  });

  it('题目组为空容器，说明块带默认文案', () => {
    const group = createMockBlock('container.group');
    expect(group?.kind === 'group' && group.questions).toHaveLength(0);
    expect(group?.kind === 'group' && group.title).toBe('题目组');

    const followUp = createMockBlock('container.follow-up');
    expect(followUp?.kind === 'follow-up' && followUp.placeholder).toContain('补充');

    const guide = createMockBlock('container.guide');
    expect(guide?.kind === 'guide' && guide.content).toContain('问卷');
  });

  it('非容器题型暂不生成区块', () => {
    expect(createMockBlock('choice.single')).toBeUndefined();
    expect(createMockBlock('input.email')).toBeUndefined();
    expect(createMockBlock('matrix.single')).toBeUndefined();
  });

  it('题目计数只统计题目组内的题目', () => {
    const blocks = [
      createMockBlock('container.guide'),
      createMockBlock('container.follow-up'),
      createMockBlock('container.group'),
    ].filter((block) => block !== undefined);
    expect(countQuestions(blocks)).toBe(0);
    expect(countQuestions([{ id: 'g1', kind: 'group', title: '题目组', questions: [] }])).toBe(0);
    expect(countQuestions([])).toBe(0);
  });
});

describe('拖拽载荷解析', () => {
  it('接受已注册题型并拒绝非法数据', () => {
    expect(readDraggedQuestionType({ type: 'container.group', label: '题目组' })).toBe(
      'container.group',
    );
    expect(readDraggedQuestionType({ type: 'choice.unknown' })).toBeUndefined();
    expect(readDraggedQuestionType({ label: '题目组' })).toBeUndefined();
    expect(readDraggedQuestionType(null)).toBeUndefined();
    expect(readDraggedQuestionType('container.group')).toBeUndefined();
  });

  it('拖拽类型与投放标识保持稳定契约', () => {
    expect(PALETTE_ITEM_DRAG_TYPE).toBe('questionnaire-palette-item');
    expect(CANVAS_DROP_ID).toBe('questionnaire-canvas');
  });
});

describe('插入位解析', () => {
  it('插入位标识与下标可互相解析', () => {
    expect(readInsertionIndex(getInsertionDropId(0))).toBe(0);
    expect(readInsertionIndex(getInsertionDropId(3))).toBe(3);
    expect(readInsertionIndex(CANVAS_DROP_ID)).toBeUndefined();
    expect(readInsertionIndex('questionnaire-canvas-insert--1')).toBeUndefined();
    expect(readInsertionIndex('questionnaire-canvas-insert-x')).toBeUndefined();
    expect(readInsertionIndex(12)).toBeUndefined();
  });

  it('落点解析：插槽优先，空白沿用最近值', () => {
    const base = { overCanvas: false, fallback: null };
    expect(computeInsertionGap({ ...base, slotIndex: 2 })).toBe(2);
    expect(computeInsertionGap({ ...base, overCanvas: true, fallback: 3 })).toBe(3);
    expect(computeInsertionGap(base)).toBeNull();
  });

  it('插入下标钳制到有效范围，缺省追加末尾', () => {
    expect(clampInsertionIndex(0, 3)).toBe(0);
    expect(clampInsertionIndex(2, 3)).toBe(2);
    expect(clampInsertionIndex(9, 3)).toBe(3);
    expect(clampInsertionIndex(-1, 3)).toBe(3);
    expect(clampInsertionIndex(undefined, 3)).toBe(3);
    expect(clampInsertionIndex(undefined, 0)).toBe(0);
  });
});
