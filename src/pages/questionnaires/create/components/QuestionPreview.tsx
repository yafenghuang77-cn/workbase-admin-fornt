import { StarOutlined } from '@ant-design/icons';
import clsx from 'clsx';

import type { DesignerQuestion } from '../data';

interface QuestionPreviewProps {
  question: DesignerQuestion;
}

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
  if (question.type === 'rating' || question.type === 'multi-rating') {
    return <RatingPreview question={question} />;
  }
  if (question.type === 'nps') {
    return <NpsPreview question={question} />;
  }
  if (question.type.startsWith('matrix') && question.rows && question.options) {
    return <MatrixPreview question={question} />;
  }
  return <div className="question-preview__field" />;
};

/** 题目卡片内的题型预览占位，仅作视觉呈现。 */
export const QuestionPreview = ({ question }: QuestionPreviewProps) => (
  <div className="question-preview" aria-hidden="true">
    {renderPreview(question)}
  </div>
);
