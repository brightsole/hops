export const normalizeWord = (input: string): string =>
  encodeURIComponent(input.trim().toLowerCase());
