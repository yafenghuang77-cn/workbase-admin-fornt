import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/rich-text-editor')({
  component: lazyRouteComponent(() => import('@/pages/rich-text-editor'), 'RichTextEditorPage'),
});
