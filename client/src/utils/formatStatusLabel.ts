export const formatStatusLabel = (value?: string | null) => {
  if (!value?.trim()) return 'Not recorded';

  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word === word.toUpperCase()
      ? word
      : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
};
