import type { ComponentType } from 'react';

import type { QuestionTypeId } from '@/pages/questionnaires/question-types';

import { BidirectionalScaleQuestion } from './BidirectionalScaleQuestion';
import { DateQuestion } from './DateQuestion';
import { EmailQuestion } from './EmailQuestion';
import { ImageDisplayQuestion } from './ImageDisplayQuestion';
import { ImageMultipleChoiceQuestion } from './ImageMultipleChoiceQuestion';
import { ImageSingleChoiceQuestion } from './ImageSingleChoiceQuestion';
import { MatrixBidirectionalScaleQuestion } from './MatrixBidirectionalScaleQuestion';
import { MatrixMultipleQuestion } from './MatrixMultipleQuestion';
import { MatrixScaleQuestion } from './MatrixScaleQuestion';
import { MatrixSingleQuestion } from './MatrixSingleQuestion';
import { MultiBidirectionalScaleQuestion } from './MultiBidirectionalScaleQuestion';
import { MultiInputQuestion } from './MultiInputQuestion';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { MultiScaleQuestion } from './MultiScaleQuestion';
import { NpsQuestion } from './NpsQuestion';
import { NumberQuestion } from './NumberQuestion';
import { PhoneQuestion } from './PhoneQuestion';
import { ScaleQuestion } from './ScaleQuestion';
import { SingleChoiceQuestion } from './SingleChoiceQuestion';
import { TextQuestion } from './TextQuestion';
import type { QuestionTypeComponentProps } from './types';
import { VideoDisplayQuestion } from './VideoDisplayQuestion';

/**
 * 题型 → 组件注册表。
 *
 * 一个题型一个目录，目录内自带样式；容器题型不在此登记，
 * 调用方查不到组件即不渲染，是否显示由调用方决定。
 */
export const QUESTION_TYPE_COMPONENTS = {
  'choice.single': SingleChoiceQuestion,
  'choice.multiple': MultipleChoiceQuestion,
  'choice.image-single': ImageSingleChoiceQuestion,
  'choice.image-multiple': ImageMultipleChoiceQuestion,
  'input.text': TextQuestion,
  'input.phone': PhoneQuestion,
  'input.email': EmailQuestion,
  'input.number': NumberQuestion,
  'input.date': DateQuestion,
  'input.multi': MultiInputQuestion,
  'rating.scale': ScaleQuestion,
  'rating.nps': NpsQuestion,
  'rating.bi': BidirectionalScaleQuestion,
  'rating.multi': MultiScaleQuestion,
  'rating.multi-bi': MultiBidirectionalScaleQuestion,
  'matrix.single': MatrixSingleQuestion,
  'matrix.multiple': MatrixMultipleQuestion,
  'matrix.rating': MatrixScaleQuestion,
  'matrix.bi': MatrixBidirectionalScaleQuestion,
  'media.image': ImageDisplayQuestion,
  'media.video': VideoDisplayQuestion,
} as const satisfies Partial<Record<QuestionTypeId, ComponentType<QuestionTypeComponentProps>>>;

type QuestionTypeComponentMap = Partial<
  Record<QuestionTypeId, ComponentType<QuestionTypeComponentProps>>
>;

/** 按题型取组件；未登记（如容器）返回 undefined，由调用方决定是否渲染。 */
export const getQuestionTypeComponent = (
  type: QuestionTypeId,
): ComponentType<QuestionTypeComponentProps> | undefined =>
  (QUESTION_TYPE_COMPONENTS as QuestionTypeComponentMap)[type];
