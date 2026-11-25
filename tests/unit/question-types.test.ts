import { describe, expect, it } from 'vitest';

import { paletteGroups } from '@/pages/questionnaires/create/data';
import {
  getQuestionTypeDefinition,
  getQuestionTypeLabel,
  getQuestionTypesByCategory,
  isQuestionTypeId,
  QUESTION_TYPE_CATEGORIES,
  QUESTION_TYPE_DEFINITIONS,
} from '@/pages/questionnaires/question-types';

const definitions = Object.values(QUESTION_TYPE_DEFINITIONS);

describe('问卷题型统一注册表', () => {
  it('标识唯一且符合命名空间约定', () => {
    const ids = definitions.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/u);
      expect(id.startsWith(`${definitions.find((d) => d.id === id)?.category}.`)).toBe(true);
    }
  });

  it('标识联合类型与注册表保持同步', () => {
    for (const definition of definitions) {
      expect(isQuestionTypeId(definition.id)).toBe(true);
      expect(getQuestionTypeDefinition(definition.id)?.label).toBe(definition.label);
      expect(getQuestionTypeLabel(definition.id)).toBe(definition.label);
    }
    expect(isQuestionTypeId('choice.unknown')).toBe(false);
    expect(getQuestionTypeDefinition('choice.unknown')).toBeUndefined();
    expect(getQuestionTypeLabel('choice.unknown')).toBe('choice.unknown');
  });

  it('组件库分组由注册表派生且覆盖全部题型', () => {
    expect(paletteGroups.map((group) => group.key)).toEqual([...QUESTION_TYPE_CATEGORIES]);
    const paletteTypes = paletteGroups.flatMap((group) => group.items.map((item) => item.type));
    expect(paletteTypes).toHaveLength(definitions.length);
    expect(new Set(paletteTypes).size).toBe(definitions.length);
    for (const group of paletteGroups) {
      expect(group.items.map((item) => item.type)).toEqual(
        getQuestionTypesByCategory(group.key).map((definition) => definition.id),
      );
    }
  });

  it('容器组件平铺展示，其余分组可折叠', () => {
    for (const group of paletteGroups) {
      expect(group.collapsible).toBe(group.key !== 'container');
    }
  });
});
