const localUrls = new Set<string>();

/** 本地预览只信任由此入口从 File 创建的 URL；外部 JSON 中任意 blob 地址仍被拒绝。 */
export const createLocalAsset = (file: File) => {
  const url = URL.createObjectURL(file);
  localUrls.add(url);
  return {
    url,
    release: () => {
      if (!localUrls.delete(url)) return;
      URL.revokeObjectURL(url);
    },
  };
};

export const isLocalAssetUrl = (url: string): boolean => {
  return localUrls.has(url);
};
