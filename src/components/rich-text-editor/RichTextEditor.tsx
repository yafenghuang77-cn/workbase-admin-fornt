import { lazy, Suspense } from 'react';

import { Spin } from 'antd';

import type { RichTextEditorProps, RichTextViewerProps } from './types';

const Editor = lazy(() =>
  import('./EditorSurface').then((module) => ({ default: module.RichTextEditorImpl })),
);
const Viewer = lazy(() =>
  import('./EditorSurface').then((module) => ({ default: module.RichTextViewerImpl })),
);

export function RichTextEditor(props: RichTextEditorProps) {
  return (
    <Suspense
      fallback={
        <Spin description="正在加载编辑器">
          <div style={{ minHeight: 160 }} />
        </Spin>
      }
    >
      <Editor {...props} />
    </Suspense>
  );
}

export function RichTextViewer(props: RichTextViewerProps) {
  return (
    <Suspense fallback={<Spin />}>
      <Viewer {...props} />
    </Suspense>
  );
}
