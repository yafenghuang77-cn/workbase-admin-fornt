import { FileTextOutlined } from '@ant-design/icons';
import { Empty } from 'antd';

export const CanvasEmptyState = () => (
  <div className="designer-canvas__empty">
    <Empty
      image={<FileTextOutlined className="designer-canvas__empty-icon" aria-hidden="true" />}
      classNames={{ image: 'designer-canvas__empty-image' }}
      description={
        <>
          <h3>暂无数据</h3>
          <p>当前问卷尚未配置题目或内容区块，从左侧组件库挑选题型，开始搭建问卷。</p>
        </>
      }
    />
  </div>
);
