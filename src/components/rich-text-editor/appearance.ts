import type { CSSProperties } from 'react';

import type { GlobalToken } from 'antd';

import type { RichTextEditorProps } from './types';

interface AttributeOptions {
  props: RichTextEditorProps;
  mode: 'edit' | 'read';
  fieldId: string;
  editable: boolean;
  error: string;
  status: string | undefined;
}

export function getEditorAttributes({
  props,
  mode,
  fieldId,
  editable,
  error,
  status,
}: AttributeOptions): Record<string, string> {
  const attributes: Record<string, string> = {
    id: fieldId,
    class: 'rich-text-editor__content',
    role: mode === 'edit' ? 'textbox' : 'document',
    'aria-label': props['aria-label'] ?? '富文本内容',
    tabindex: editable ? '0' : '-1',
  };
  if (props['aria-labelledby']) attributes['aria-labelledby'] = props['aria-labelledby'];
  if (mode === 'edit') {
    Object.assign(attributes, {
      'aria-multiline': 'true',
      'aria-readonly': String(!editable),
      'aria-disabled': String(props.disabled ?? false),
      'aria-invalid': String(
        Boolean(error) ||
          props['aria-invalid'] === true ||
          props['aria-invalid'] === 'true' ||
          status === 'error',
      ),
      'aria-describedby': [props['aria-describedby'], `${fieldId}-count`, `${fieldId}-upload-error`]
        .filter(Boolean)
        .join(' '),
    });
  }
  return attributes;
}

export function getSurfaceStyle(
  token: GlobalToken,
  status: string | undefined,
  style: CSSProperties | undefined,
): CSSProperties {
  const variables: CSSProperties & Record<`--rich-${string}`, string> = {
    '--rich-border':
      status === 'error'
        ? token.colorError
        : status === 'warning'
          ? token.colorWarning
          : token.colorBorder,
    '--rich-primary': status === 'error' ? token.colorError : token.colorPrimary,
    '--rich-bg': token.colorBgContainer,
    '--rich-muted-bg': token.colorFillQuaternary,
    '--rich-color': token.colorText,
    '--rich-muted': token.colorTextDescription,
    '--rich-tool-color': token.colorTextSecondary,
    '--rich-active-bg': token.controlItemBgActive,
    '--rich-radius': `${token.borderRadius}px`,
    '--rich-font': token.fontFamily,
    '--rich-error': token.colorError,
    ...style,
  };
  return variables;
}
