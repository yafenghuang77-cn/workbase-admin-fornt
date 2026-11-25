import { PictureOutlined, PlayCircleOutlined, StarOutlined } from '@ant-design/icons';
import clsx from 'clsx';

import { getQuestionTypeDefinition } from '../../question-types';
import type { DesignerQuestion } from '../data';

interface QuestionPreviewProps {
  question: DesignerQuestion;
}

const ChoicePreview = ({ question }: QuestionPreviewProps) => {
  const multiple = question.type === 'choice.multiple';
  const options = question.options ?? ['选项 1', '选项 2', '选项 3'];

  return (
    <ul className="question-preview__options">
      {options.map((option) => (
        <li className="question-preview__option" key={option}>
          <span
            className={clsx('question-preview__mark', multiple && 'question-preview__mark--square')}
          />
          <span>{option}</span>
        </li>
      ))}
    </ul>
  );
};

const ImageChoicePreview = ({ question }: QuestionPreviewProps) => {
  const options = question.options ?? ['图片 1', '图片 2'];

  return (
    <div className="question-preview__image-options">
      {options.map((option) => (
        <div className="question-preview__image-option" key={option}>
          <span className="question-preview__image-thumb">
            <PictureOutlined />
          </span>
          <span className="question-preview__image-caption">{option}</span>
        </div>
      ))}
    </div>
  );
};

const MultiInputPreview = () => (
  <div className="question-preview__fields">
    <div className="question-preview__field" />
    <div className="question-preview__field" />
  </div>
);

const MediaPreview = ({ question }: QuestionPreviewProps) => (
  <div className="question-preview__media">
    {question.type === 'media.video' ? <PlayCircleOutlined /> : <PictureOutlined />}
  </div>
);

const RatingPreview = ({ question }: QuestionPreviewProps) => (
  <div className="question-preview__stars">
    {Array.from({ length: question.scaleMax ?? 5 }, (_, index) => (
      <StarOutlined key={index} />
    ))}
  </div>
);

const NpsPreview = ({ question }: QuestionPreviewProps) => (
  <div>
    <div className="question-preview__nps">
      {Array.from({ length: 11 }, (_, index) => (
        <span key={index}>{index}</span>
      ))}
    </div>
    {question.scaleLabels ? (
      <div className="question-preview__nps-labels">
        <span>{question.scaleLabels[0]}</span>
        <span>{question.scaleLabels[1]}</span>
      </div>
    ) : null}
  </div>
);

const MatrixPreview = ({ question }: QuestionPreviewProps) => {
  const rows = question.rows ?? [];
  const options = question.options ?? [];
  return (
    <table className="question-preview__matrix">
      <thead>
        <tr>
          <th className="question-preview__corner" />
          {options.map((option) => (
            <th key={option} scope="col">
              {option}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={row}>
            <th className="question-preview__row-label" scope="row">
              {row}
            </th>
            {options.map((option, colIndex) => (
              <td key={option}>
                <span
                  className={clsx(
                    'question-preview__radio',
                    question.previewAnswers?.[rowIndex] === colIndex && 'is-on',
                  )}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const renderPreview = (question: DesignerQuestion) => {
  switch (getQuestionTypeDefinition(question.type)?.kind) {
    case 'choice':
      return <ChoicePreview question={question} />;
    case 'image-choice':
      return <ImageChoicePreview question={question} />;
    case 'multi-input':
      return <MultiInputPreview />;
    case 'rating':
      return <RatingPreview question={question} />;
    case 'nps':
      return <NpsPreview question={question} />;
    case 'matrix':
      return question.rows && question.options ? (
        <MatrixPreview question={question} />
      ) : (
        <div className="question-preview__field" />
      );
    case 'media':
      return <MediaPreview question={question} />;
    case 'text-input':
    case 'container':
    case undefined:
      return <div className="question-preview__field" />;
  }
};

/** 题目卡片内的题型预览占位，仅作视觉呈现。 */
export const QuestionPreview = ({ question }: QuestionPreviewProps) => (
  <div className="question-preview" aria-hidden="true">
    {renderPreview(question)}
  </div>
);
