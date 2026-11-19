import { PageContainer } from '@ant-design/pro-components';
import { useParams } from '@tanstack/react-router';
import { Empty } from 'antd';

import { navigationLinks } from '@/layout/navigation';

export const ModulePage = () => {
  const { section } = useParams({ from: '/_app/modules/$section' });

  const title =
    navigationLinks.find((item) => item.path === `/modules/${section}`)?.name ?? '业务模块';

  return (
    <PageContainer title={title} breadcrumbRender={false}>
      <div role="status" aria-label="暂无数据">
        <Empty description="暂无数据" />
      </div>
    </PageContainer>
  );
};
