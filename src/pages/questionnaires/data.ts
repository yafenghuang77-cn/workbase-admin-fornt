export type QuestionnaireStatus = 'draft' | 'published' | 'closed';

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  status: QuestionnaireStatus;
  questionCount: number;
  responseCount: number;
  creator: string;
  createdAt: string;
  publishedAt: string;
}

export const statusOptions = {
  draft: { text: '草稿', status: 'Default' },
  published: { text: '收集中', status: 'Processing' },
  closed: { text: '已结束', status: 'Success' },
};

const titles = [
  '员工满意度调查',
  '产品使用体验反馈',
  '年度培训需求调研',
  '客户服务满意度调查',
  '团队协作体验调研',
  '办公环境改善建议',
  '新员工入职体验调查',
  '品牌认知度调研',
  '内部知识库使用反馈',
  '季度活动意向征集',
  '用户功能需求调研',
  '项目复盘反馈',
  '企业文化建设建议',
  '食堂服务满意度调查',
  '远程办公体验调研',
  '年度总结会议反馈',
];

const statuses: QuestionnaireStatus[] = ['published', 'draft', 'closed'];

// 仅用于列表演示，不发送网络请求；后续可替换为业务接口。
export const mockQuestionnaires: Questionnaire[] = titles.map((title, index) => {
  const status = statuses[index % statuses.length] ?? 'draft';
  return {
    id: `WJ${String(index + 1).padStart(4, '0')}`,
    title,
    description: `欢迎参与${title}，你的反馈将帮助我们持续改进。问卷结果仅用于内部分析。`,
    status,
    questionCount: 8 + (index % 8),
    responseCount: status === 'draft' ? 0 : 36 + index * 23,
    creator: ['张敏', '李明', '王晓'][index % 3] ?? '张敏',
    createdAt: `2026-11-${String(19 - index).padStart(2, '0')} 10:00:00`,
    publishedAt:
      status === 'draft' ? '未上线' : `2026-11-${String(20 - index).padStart(2, '0')} 09:00:00`,
  };
});
