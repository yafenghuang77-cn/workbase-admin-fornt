export interface Task {
  id: string;
  name: string;
  owner: string;
  status: string;
  updatedAt: string;
}

export const initialTasks: Task[] = [
  {
    id: '1',
    name: '官网改版视觉设计',
    owner: '林晓雨',
    status: '进行中',
    updatedAt: '2026-11-18 09:24',
  },
  {
    id: '2',
    name: 'Q4 客户回访计划',
    owner: '陈志远',
    status: '待处理',
    updatedAt: '2026-11-17 16:02',
  },
  {
    id: '3',
    name: '供应链数据报表搭建',
    owner: '王大鹏',
    status: '进行中',
    updatedAt: '2026-11-17 11:35',
  },
  {
    id: '4',
    name: '新员工入职培训',
    owner: '赵敏',
    status: '已完成',
    updatedAt: '2026-11-16 18:47',
  },
  {
    id: '5',
    name: '服务器扩容评估',
    owner: '周宇航',
    status: '已逾期',
    updatedAt: '2026-11-15 14:10',
  },
];
