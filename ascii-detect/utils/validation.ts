export const sanitizeString = (input: string, maxLength: number = 100): string => {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).replace(/[<>]/g, '');
};

export const validateHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const sanitizeDensityString = (input: string): string => {
  if (typeof input !== 'string') return '';
  // Allow printable ASCII characters, limit length
  return input.slice(0, 200).replace(/[^\x20-\x7E]/g, '');
};

