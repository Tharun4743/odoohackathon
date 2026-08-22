// Query string and param helper functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const qs = (value: any): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return String(value);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const qsNum = (value: any, defaultVal?: number): number | undefined => {
  const str = qs(value);
  if (str === undefined) return defaultVal;
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultVal : num;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const q = (query: any): Record<string, string> => query as Record<string, string>;
