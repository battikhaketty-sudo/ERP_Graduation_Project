const filesByUrl = new Map<string, File>();

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ReadImageError = "invalid" | "tooLarge";

export type ReadImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: ReadImageError };

const isImageFile = (file: File) =>
  file.type.startsWith("image/") ||
  /\.(jpe?g|png|webp|gif)$/i.test(file.name);

export const revokeImagePreview = (url?: string | null) => {
  if (!url?.startsWith("blob:")) return;
  URL.revokeObjectURL(url);
  filesByUrl.delete(url);
};

export const getImageFileForUpload = (value?: string | null): File | null => {
  if (!value?.startsWith("blob:")) return null;
  return filesByUrl.get(value) ?? null;
};

export const readImageFile = async (file: File): Promise<ReadImageResult> => {
  if (!isImageFile(file)) {
    return { ok: false, error: "invalid" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "tooLarge" };
  }

  try {
    const dataUrl = URL.createObjectURL(file);
    filesByUrl.set(dataUrl, file);
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: "invalid" };
  }
};
