import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { QuestionTypeComponentProps } from '@/components/business/question-types';
import {
  appendOption,
  createDefaultOptions,
  createScaleValues,
  getDefaultScale,
  getQuestionTypeComponent,
  QUESTION_TYPE_COMPONENTS,
  removeOptionAt,
} from '@/components/business/question-types';
import type { QuestionTypeId } from '@/pages/questionnaires/question-types';
import { QUESTION_TYPE_DEFINITIONS } from '@/pages/questionnaires/question-types';

/** 按注册表渲染指定题型，模拟页面侧的显示控制。 */
const renderType = (type: QuestionTypeId, props: QuestionTypeComponentProps = {}) => {
  const Component = getQuestionTypeComponent(type);
  if (!Component) throw new Error(`题型未登记组件：${type}`);
  return render(<Component {...props} />);
};

describe('选项模型', () => {
  it('默认选项按序号命名，追加与删除保持至少一项', () => {
    const options = createDefaultOptions();
    expect(options.map((option) => option.label)).toEqual(['选项 1', '选项 2', '选项 3']);

    const appended = appendOption(options);
    expect(appended).toHaveLength(4);
    expect(appended[3]?.label).toBe('选项 4');

    expect(removeOptionAt(appended, 0)).toHaveLength(3);
    expect(removeOptionAt(appended, -1)).toBe(appended);
    expect(removeOptionAt(appended, 9)).toBe(appended);
    const single = createDefaultOptions(1);
    expect(removeOptionAt(single, 0)).toBe(single);
  });

  it('量表按题型取默认量程并生成分值序列', () => {
    expect(getDefaultScale('rating.nps')).toEqual({ min: 0, max: 10 });
    expect(getDefaultScale('rating.scale')).toEqual({ min: 1, max: 5 });
    expect(createScaleValues({ min: 0, max: 10 })).toHaveLength(11);
    expect(createScaleValues({ min: 1, max: 5 })).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('题型组件注册表', () => {
  it('每个非容器题型都有独立组件，容器题型不登记', () => {
    const questionTypes = Object.values(QUESTION_TYPE_DEFINITIONS).filter(
      (definition) => definition.category !== 'container',
    );
    expect(questionTypes).toHaveLength(21);
    expect(Object.keys(QUESTION_TYPE_COMPONENTS)).toHaveLength(21);
    for (const definition of questionTypes) {
      expect(getQuestionTypeComponent(definition.id)).toBeTypeOf('function');
    }
    expect(getQuestionTypeComponent('container.group')).toBeUndefined();
    expect(getQuestionTypeComponent('container.guide')).toBeUndefined();
  });

  it('每种题型组件都渲染出对应的代表性元素', () => {
    // 各题型的代表性无障碍元素或文案，验证组件确实产出自身 UI
    const expectations: Partial<Record<QuestionTypeId, () => void>> = {
      'choice.single': () => expect(screen.getAllByRole('radio').length).toBeGreaterThan(0),
      'choice.multiple': () => expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0),
      'choice.image-single': () => expect(screen.getAllByRole('radio').length).toBeGreaterThan(0),
      'choice.image-multiple': () =>
        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0),
      'input.text': () => expect(screen.getByRole('textbox')).toBeInTheDocument(),
      'input.phone': () => expect(screen.getByLabelText('手机号')).toBeInTheDocument(),
      'input.email': () => expect(screen.getByLabelText('邮箱')).toBeInTheDocument(),
      'input.number': () => expect(screen.getByLabelText('数值')).toBeInTheDocument(),
      'input.date': () => expect(screen.getByPlaceholderText('请选择日期')).toBeInTheDocument(),
      'input.multi': () => expect(screen.getByText('填空项 1')).toBeInTheDocument(),
      // 除 NPS 外，打分题默认用五角星（每颗星为 radio 角色）
      'rating.scale': () => expect(screen.getAllByRole('radio')).toHaveLength(5),
      'rating.nps': () => expect(screen.getByText('10')).toBeInTheDocument(),
      'rating.bi': () => expect(screen.getByText('双向分值')).toBeInTheDocument(),
      'rating.multi': () => expect(screen.getByText('打分项 1')).toBeInTheDocument(),
      'rating.multi-bi': () => expect(screen.getAllByText('双向分值').length).toBeGreaterThan(0),
      'matrix.single': () => expect(screen.getByText('题项')).toBeInTheDocument(),
      'matrix.multiple': () => expect(screen.getByText('题项')).toBeInTheDocument(),
      'matrix.rating': () => expect(screen.getByText('题项')).toBeInTheDocument(),
      'matrix.bi': () => expect(screen.getByText('双向分值')).toBeInTheDocument(),
      'media.image': () => expect(screen.getAllByText('图片待上传')).toHaveLength(1),
      'media.video': () => expect(screen.getAllByText('视频待上传')).toHaveLength(1),
    };

    const types = Object.keys(QUESTION_TYPE_COMPONENTS) as QuestionTypeId[];
    expect(types).toHaveLength(21);
    for (const type of types) {
      const { unmount } = renderType(type);
      const assert = expectations[type];
      expect(assert, `缺少 ${type} 的断言`).toBeTypeOf('function');
      assert?.();
      unmount();
    }
  });
});

describe('题型组件 UI', () => {
  it('单选题渲染禁用选项，并提供添加与删除入口', async () => {
    const onAddOption = vi.fn();
    const onRemoveOption = vi.fn();
    renderType('choice.single', {
      options: ['选项 1', '选项 2'],
      onAddOption,
      onRemoveOption,
    });

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '添加选项' }));
    expect(onAddOption).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: '删除选项 1' }));
    expect(onRemoveOption).toHaveBeenCalledWith(0);
  });

  it('多选题使用复选控件，仅剩一个选项时禁用删除', () => {
    renderType('choice.multiple', {
      options: ['选项 1'],
      onAddOption: () => {},
      onRemoveOption: () => {},
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '删除选项 1' })).toBeDisabled();
  });

  it('未传回调时不展示添加与删除入口', () => {
    renderType('choice.single');
    expect(screen.queryByRole('button', { name: '添加选项' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('图片选择题展示图片占位并支持添加选项', () => {
    renderType('choice.image-single', { onAddOption: () => {} });
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '添加选项' })).toBeInTheDocument();
  });

  it('NPS 保留 0 到 10 数字块，不使用五角星', () => {
    renderType('rating.nps');
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('矩阵单选渲染行标题与列标题', () => {
    renderType('matrix.single', { rows: ['环境', '服务'], columns: ['满意', '一般'] });
    expect(screen.getByText('题项')).toBeInTheDocument();
    expect(screen.getByText('环境')).toBeInTheDocument();
    expect(screen.getByText('满意')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('矩阵多选与矩阵打分使用各自单元格控件', () => {
    const { unmount } = renderType('matrix.multiple', {
      rows: ['行 1'],
      columns: ['列 1', '列 2'],
    });
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    unmount();

    // 评分控件每颗星为 radio 角色，5 档共 5 个
    renderType('matrix.rating', { rows: ['行 1'], columns: ['列 1'] });
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('媒体展示默认一个素材位，传入多个时全部渲染', () => {
    const { unmount } = renderType('media.image');
    expect(screen.getAllByText('图片待上传')).toHaveLength(1);
    unmount();

    renderType('media.video', {
      mediaItems: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }, { id: 'v4' }],
    });
    expect(screen.getAllByText('视频待上传')).toHaveLength(4);
  });
});
