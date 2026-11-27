/**
 * 问卷题型业务组件的渲染契约。
 *
 * 约定：一个题型对应一个组件，组件只负责自身 UI；
 * 题型分发与是否渲染由调用方（页面）通过注册表决定，组件内不做类型判断。
 * 本目录不包含题目配置面板、校验规则与服务端交互。
 */

/** 选择题选项。 */
export interface QuestionOptionItem {
  /** 稳定标识，用作列表 key 与控件 value。 */
  id: string;
  label: string;
}

/** 图片选择题选项。 */
export interface ImageOptionItem extends QuestionOptionItem {
  /** 图片地址；缺省时展示占位图。 */
  url?: string | undefined;
}

/** 多项填空的填空项。 */
export interface BlankItem {
  id: string;
  title: string;
}

/** 多项打分的打分项。 */
export interface ScoreItem {
  id: string;
  title: string;
}

/** 媒体展示项：图片或视频。 */
export interface MediaItem {
  id: string;
  /** 素材地址；缺省时展示占位。 */
  url?: string | undefined;
}

/** 打分量程。 */
export interface RatingScale {
  /** 起始分值，NPS 为 0，其余为 1。 */
  min: number;
  /** 结束分值。 */
  max: number;
}

/**
 * 题型组件统一入参：各组件只取用自身需要的字段。
 * 统一签名便于页面按注册表直接渲染，无需为每个题型写分支。
 */
export interface QuestionTypeComponentProps {
  /** 选择题选项文案。 */
  options?: string[] | undefined;
  /** 图片选择题选项。 */
  imageOptions?: ImageOptionItem[] | undefined;
  /** 多项填空的填空项。 */
  blanks?: BlankItem[] | undefined;
  /** 多项打分的打分项。 */
  scoreItems?: ScoreItem[] | undefined;
  /** 打分量程。 */
  scale?: RatingScale | undefined;
  /** 量表两端说明文案。 */
  scaleLabels?: [string, string] | undefined;
  /** 媒体展示项，支持多个。 */
  mediaItems?: MediaItem[] | undefined;
  /** 矩阵行标题。 */
  rows?: string[] | undefined;
  /** 矩阵列标题。 */
  columns?: string[] | undefined;
  /** 新增选项；未传入时不展示添加入口。 */
  onAddOption?: (() => void) | undefined;
  /** 删除选项；未传入时不展示删除入口。 */
  onRemoveOption?: ((index: number) => void) | undefined;
  /** 矩阵新增行；未传入时不展示入口。 */
  onAddRow?: (() => void) | undefined;
  /** 矩阵新增列；未传入时不展示入口。 */
  onAddColumn?: (() => void) | undefined;
}
