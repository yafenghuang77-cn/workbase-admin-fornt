import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { App } from 'antd';
import clsx from 'clsx';

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
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  const returnToList = () => {
    navigate({ to: '/questionnaires/list' }).catch(() => {
      message.error('无法返回问卷列表，请重试');
    });
  };

  return (
    <main className="questionnaire-create-page" aria-label="问卷设计">
      <DesignerHeader
        onBack={returnToList}
        paletteCollapsed={paletteCollapsed}
        onExpandPalette={() => setPaletteCollapsed(false)}
      />
      <div
        className={clsx(
          'questionnaire-create__workspace',
          paletteCollapsed && 'questionnaire-create__workspace--palette-hidden',
        )}
      >
        <QuestionPalette collapsed={paletteCollapsed} onCollapsedChange={setPaletteCollapsed} />
        <DesignerCanvas paletteCollapsed={paletteCollapsed} />
        <InspectorPanel />
      </div>
      <DesignerFooter onCancel={returnToList} />
    </main>
  );
};
