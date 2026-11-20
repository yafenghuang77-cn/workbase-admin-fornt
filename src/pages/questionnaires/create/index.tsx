import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { App } from 'antd';

import { DesignerCanvas } from './components/DesignerCanvas';
import { DesignerFooter } from './components/DesignerFooter';
import { DesignerHeader } from './components/DesignerHeader';
import { InspectorPanel } from './components/InspectorPanel';
import { QuestionPalette } from './components/QuestionPalette';
import { defaultSelectedQuestionId, demoBlocks } from './data';

import './index.less';

/** 问卷设计页：脱离布局组件的全屏工作台。 */
export const QuestionnaireCreatePage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedQuestionId);

  return (
    <main className="questionnaire-create-page" aria-label="问卷设计">
      <DesignerHeader />
      <div className="questionnaire-create__workspace">
        <QuestionPalette />
        <DesignerCanvas blocks={demoBlocks} selectedId={selectedId} onSelect={setSelectedId} />
        <InspectorPanel />
      </div>
      <DesignerFooter
        onCancel={() => {
          navigate({ to: '/questionnaires/list' }).catch(() => {
            message.error('无法返回问卷列表，请重试');
          });
        }}
        onSave={() => {
          navigate({ to: '/questionnaires/list' }).catch(() => {
            message.error('保存失败，请重试');
          });
        }}
      />
    </main>
  );
};
