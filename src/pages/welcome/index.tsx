import { ArrowUpOutlined } from '@ant-design/icons';
import { Card } from 'antd';

import './index.less';

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

export default function WelcomePage() {
  return (
    <main className="welcome-page">
      <div className="welcome-intro">
        <p className="welcome-eyebrow">WORKBASE · 企业级工作台</p>
        <h1 className="welcome-heading">欢迎使用 Workbase</h1>
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
    </main>
  );
}
