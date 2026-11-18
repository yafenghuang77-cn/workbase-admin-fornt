import type { CSSProperties, Ref } from 'react';

import type { JSONContent } from '@tiptap/core';

export type RichTextValue = JSONContent | null;

export interface UploadedFile {
  url: string;
  name?: string;
}

export interface UploadedImage extends UploadedFile {
  alt?: string;
}

export interface UploadedVideo extends UploadedFile {
  poster?: string;
}

export interface RichTextUploadContext {
  signal: AbortSignal;
  /** 可选上报 0–100 的进度；忽略非法值。 */
  onProgress: (percent: number) => void;
}

interface AssetUploadOptions<Result> {
  /** 接入业务上传服务；必须传递 signal，以便切换文档或卸载时取消。 */
  upload: (file: File, context: RichTextUploadContext) => Promise<Result>;
  maxSize?: number;
}

export interface ImageUploadOptions extends AssetUploadOptions<UploadedImage> {
  /** 默认 5 MiB。仅允许 PNG、JPEG、GIF、WebP。 */
  maxSize?: number;
}

export interface VideoUploadOptions extends AssetUploadOptions<UploadedVideo> {
  /** 默认 100 MiB。仅允许 MP4、WebM、Ogg。 */
  maxSize?: number;
}

export interface FileUploadOptions extends AssetUploadOptions<UploadedFile> {
  /** 默认 20 MiB。 */
  maxSize?: number;
  /** 与原生文件选择器一致，例如 .pdf,.docx,application/zip；默认不限类型。 */
  accept?: string;
}

export type RichTextUploadKind = 'image' | 'video' | 'file';

export interface RichTextEditorRef {
  focus: () => void;
}

export interface RichTextEditorProps {
  /** JSON 文档是唯一内容源；null / undefined 表示空文档。 */
  value?: RichTextValue;
  onChange?: (value: RichTextValue) => void;
  onBlur?: () => void;
  ref?: Ref<RichTextEditorRef>;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  disabled?: boolean;
  placeholder?: string;
  /** 按 Unicode 码点计数；已有超限文档保留原文，允许删减。 */
  maxLength?: number;
  imageUpload?: ImageUploadOptions;
  videoUpload?: VideoUploadOptions;
  fileUpload?: FileUploadOptions;
  className?: string;
  style?: CSSProperties;
}

export interface RichTextViewerProps {
  value?: RichTextValue;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}
