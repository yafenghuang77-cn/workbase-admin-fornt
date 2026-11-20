import { useNavigate } from '@tanstack/react-router';
import { App } from 'antd';

import { DesignerCanvas } from './components/DesignerCanvas';
import { DesignerFooter } from './components/DesignerFooter';
import { DesignerHeader } from './components/DesignerHeader';
import { InspectorPanel } from './components/InspectorPanel';
import { QuestionPalette } from './components/QuestionPalette';

import './index.less';

/** 问卷设计页：脱离布局组件的全屏工作台。 */
export const QuestionnaireCreatePage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const returnToList = () => {
    navigate({ to: '/questionnaires/list' }).catch(() => {
      message.error('无法返回问卷列表，请重试');
    });
  };

  return (
    <main className="questionnaire-create-page" aria-label="问卷设计">
      <DesignerHeader onBack={returnToList} />
      <div className="questionnaire-create__workspace">
        <QuestionPalette />
        <DesignerCanvas />
        <InspectorPanel />
      </div>
      <DesignerFooter onCancel={returnToList} />
    </main>
  );
};
