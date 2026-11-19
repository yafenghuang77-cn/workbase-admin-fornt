import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { PageContainer } from '@ant-design/pro-components';
import { Button, ConfigProvider, Form, theme } from 'antd';

import type { RichTextValue } from '@/components/rich-text-editor';
import { isRichTextEmpty, RichTextEditor, RichTextViewer } from '@/components/rich-text-editor';

import { createMockUploads } from './mock-upload';

import './index.less';

interface ArticleValues {
  body: RichTextValue;
}

const initialContent: RichTextValue = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '让内容表达更清晰' }] },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '从一则公告、一篇文章开始。选择文字调整格式，插入表格整理信息，右侧随时查看展示效果。',
        },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '统一的排版与展示体验' }] },
          ],
        },
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '支持表单校验、回填与重置' }] },
          ],
        },
      ],
    },
  ],
};

const DemoLayout = ({ children }: { children: ReactNode }) => {
  const { token } = theme.useToken();
  return (
    <section
      aria-label="富文本编辑器演示"
      className="rich-text-demo"
      style={{ background: token.colorBgLayout, color: token.colorText }}
    >
      {children}
    </section>
  );
};

export const RichTextEditorPage = () => {
  const [form] = Form.useForm<ArticleValues>();
  const body = Form.useWatch<RichTextValue>('body', form);
  const [dark, setDark] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [uploads] = useState(createMockUploads);

  useEffect(() => uploads.clear, [uploads]);

  return (
    <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <DemoLayout>
        <PageContainer
          title="富文本编辑器"
          content="在此体验排版、图片、视频、附件与实时预览。"
          breadcrumbRender={false}
          extra={[
            <Button key="theme" htmlType="button" onClick={() => setDark((current) => !current)}>
              {dark ? '浅色模式' : '深色模式'}
            </Button>,
            <Button
              key="disable"
              htmlType="button"
              onClick={() => setDisabled((current) => !current)}
            >
              {disabled ? '启用编辑' : '禁用编辑'}
            </Button>,
          ]}
        >
          <div className="rich-text-demo__columns">
            <section className="rich-text-demo__panel" aria-label="编辑区域">
              <Form<ArticleValues>
                form={form}
                name="rich-text-demo"
                layout="vertical"
                initialValues={{ body: initialContent }}
                disabled={disabled}
              >
                <Form.Item<ArticleValues> name="body" label="文章正文" rules={[]}>
                  <RichTextEditor
                    aria-label="文章正文"
                    maxLength={20000}
                    imageUpload={uploads.imageUpload}
                    videoUpload={uploads.videoUpload}
                    fileUpload={uploads.fileUpload}
                  />
                </Form.Item>
              </Form>
              <div className="rich-text-demo__actions">
                <Button
                  htmlType="button"
                  type="primary"
                  onClick={() => {
                    form.validateFields().catch(() => undefined);
                  }}
                >
                  校验内容
                </Button>
                <Button
                  htmlType="button"
                  onClick={() => {
                    form.resetFields();
                    uploads.clear();
                  }}
                >
                  重置内容
                </Button>
                <Button
                  htmlType="button"
                  onClick={() => {
                    form.resetFields(['body']);
                    form.setFieldValue('body', null);
                    uploads.clear();
                  }}
                >
                  清空内容
                </Button>
              </div>
            </section>
            <section className="rich-text-demo__panel" aria-label="展示预览">
              <h2 className="rich-text-demo__heading">展示预览</h2>
              {isRichTextEmpty(body) ? (
                <p>编辑左侧内容，在此查看效果。</p>
              ) : (
                <RichTextViewer value={body} aria-label="文章展示预览" />
              )}
            </section>
          </div>
        </PageContainer>
      </DemoLayout>
    </ConfigProvider>
  );
};
