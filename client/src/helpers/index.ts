export function bytesToHumanReadableString(size: number) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    Number((size / Math.pow(1024, i)).toFixed(2)) * 1 +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

export const types = ["png", "jpeg", "jpg", "webp"];

export const maxSize = 1;

export const checkType = (file: File, types: Array<string>): boolean => {
  const extension = file.name.split(".").pop();
  if (extension) {
    return types.includes(extension.toLowerCase());
  }

  return false;
};

export const getFileSizeMB = (size: number): number => {
  return size / 1024 / 1024;
};

export function isValidMongoObjectId(id: string): boolean {
  const objectIdRegex = /^[a-f\d]{24}$/i;
  return objectIdRegex.test(id);
}
