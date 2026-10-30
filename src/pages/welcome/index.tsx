import type { CSSProperties } from 'react';

import { ArrowUpOutlined } from '@ant-design/icons';
import { Card, theme } from 'antd';

import './index.css';

const resources = [
  {
    number: '01',
    title: 'Ant Design',
    description: '了解设计语言与基础组件，构建一致、清晰的使用体验。',
    href: 'https://ant.design/index-cn',
  },
  {
    number: '02',
    title: 'ProComponents',
    description: '探索面向管理系统的高级组件，让复杂页面更简单。',
    href: 'https://procomponents.ant.design',
  },
  {
    number: '03',
    title: 'TanStack Router',
    description: '了解页面导航与路由组织，连接工作台中的每个入口。',
    href: 'https://tanstack.com/router/latest',
  },
];

const sections = [
  { title: 'Dashboard', description: '分析、监控与工作台', detail: '从全局视角开启日常工作。' },
  { title: '页面模板', description: '表单、列表与详情', detail: '按不同工作场景找到对应入口。' },
  { title: '个人空间', description: '个人中心与个人设置', detail: '集中管理与你相关的信息。' },
];

type WelcomeStyles = CSSProperties & Record<`--welcome-${string}`, string>;

export default function WelcomePage() {
  const { token } = theme.useToken();
  const styles: WelcomeStyles = {
    '--welcome-primary': token.colorPrimary,
    '--welcome-primary-bg': token.colorPrimaryBg,
    '--welcome-text': token.colorText,
    '--welcome-secondary': token.colorTextSecondary,
    '--welcome-border': token.colorBorderSecondary,
    '--welcome-radius': `${token.borderRadiusLG}px`,
    '--welcome-gap': `${token.marginLG}px`,
  };

  return (
    <div className="welcome-page" style={styles}>
      <div className="welcome-intro">
        <p className="welcome-eyebrow">WORKBASE · 企业级工作台</p>
        <h2 className="welcome-heading">欢迎使用 Workbase</h2>
        <p className="welcome-description">一个清晰、有序的工作空间，让日常管理更从容。</p>
      </div>

      <div className="welcome-resources" aria-label="学习资源">
        {resources.map((resource) => (
          <a
            key={resource.title}
            className="welcome-resource-link"
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${resource.title} 官方文档（在新标签页打开）`}
          >
            <Card
              hoverable
              className="welcome-resource"
              classNames={{ body: 'welcome-resource-body' }}
            >
              <span className="welcome-resource-number" aria-hidden="true">
                {resource.number}
              </span>
              <div className="welcome-resource-copy">
                <h3 className="welcome-resource-title">{resource.title}</h3>
                <p className="welcome-resource-description">{resource.description}</p>
              </div>
              <ArrowUpOutlined className="welcome-resource-arrow" aria-hidden="true" />
            </Card>
          </a>
        ))}
      </div>

      <Card classNames={{ body: 'welcome-guide-body' }}>
        <div className="welcome-guide-heading">
          <h2 className="welcome-guide-title">从这里开始</h2>
          <p className="welcome-description">
            通过左侧菜单浏览功能目录，点击「欢迎」即可随时回到这里。
          </p>
        </div>
        <div className="welcome-sections">
          {sections.map((section) => (
            <div key={section.title} className="welcome-section">
              <h3 className="welcome-section-title">{section.title}</h3>
              <p className="welcome-section-description">{section.description}</p>
              <p className="welcome-section-detail">{section.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
