import {
  PaperClipOutlined,
  PictureOutlined,
  StopOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Button, Tooltip, Upload } from 'antd';

import type { UploadServices } from './asset-upload';
import { getUploadAccept, UPLOAD_LABELS } from './asset-upload';
import type { RichTextUploadKind } from './types';

interface UploadToolsProps {
  services: UploadServices;
  disabled: boolean;
  uploading: RichTextUploadKind | null;
  upload: (files: File[], kind: RichTextUploadKind) => Promise<void>;
  cancel: () => void;
}

const TOOLS = [
  { kind: 'image', label: '上传图片', icon: <PictureOutlined /> },
  { kind: 'video', label: '上传视频', icon: <VideoCameraOutlined /> },
  { kind: 'file', label: '上传附件', icon: <PaperClipOutlined /> },
] as const;

export function UploadTools({ services, disabled, uploading, upload, cancel }: UploadToolsProps) {
  return (
    <>
      {TOOLS.map(({ kind, label, icon }) => {
        const unavailable = disabled || Boolean(uploading) || !services[kind];
        const accept = getUploadAccept(kind, services);
        const button = (
          <Button
            htmlType="button"
            type="text"
            className="rich-text-editor__tool"
            aria-label={label}
            disabled={unavailable}
            loading={uploading === kind}
            icon={icon}
            onMouseDown={(event) => event.preventDefault()}
          />
        );
        return (
          <Tooltip
            key={kind}
            title={services[kind] ? label : `尚未配置${UPLOAD_LABELS[kind]}上传服务`}
          >
            <span className="rich-text-editor__upload-trigger">
              {services[kind] ? (
                <Upload
                  {...(accept === undefined ? {} : { accept })}
                  showUploadList={false}
                  disabled={unavailable}
                  beforeUpload={(file) => {
                    upload([file], kind).catch(() => undefined);
                    return Upload.LIST_IGNORE;
                  }}
                >
                  {button}
                </Upload>
              ) : (
                button
              )}
            </span>
          </Tooltip>
        );
      })}
      {uploading && (
        <Tooltip title="取消上传">
          <Button
            htmlType="button"
            type="text"
            className="rich-text-editor__tool"
            aria-label="取消上传"
            icon={<StopOutlined />}
            onMouseDown={(event) => event.preventDefault()}
            onClick={cancel}
          />
        </Tooltip>
      )}
    </>
  );
}
