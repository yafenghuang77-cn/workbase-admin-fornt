import { delay } from 'es-toolkit/promise';

import type { RichTextUploadContext, UploadedFile } from '@/components/rich-text-editor';
import { createLocalAsset } from '@/components/rich-text-editor/local-assets';

/** 仅供演示页使用；真实接口可按同一上传回调协议替换。 */
export function createMockUploads() {
  const assets = new Set<ReturnType<typeof createLocalAsset>>();
  let lifetime = new AbortController();

  const upload = async (
    file: File,
    { signal, onProgress }: RichTextUploadContext,
  ): Promise<UploadedFile> => {
    const activeSignal = AbortSignal.any([signal, lifetime.signal]);
    for (const percent of [10, 35, 65, 90, 100]) {
      await delay(160, { signal: activeSignal });
      onProgress(percent);
    }
    activeSignal.throwIfAborted();
    const asset = createLocalAsset(file);
    assets.add(asset);
    return { url: asset.url, name: file.name };
  };

  return {
    imageUpload: { upload },
    videoUpload: { upload },
    fileUpload: { upload },
    clear: () => {
      lifetime.abort();
      lifetime = new AbortController();
      assets.forEach((asset) => asset.release());
      assets.clear();
    },
  };
}
