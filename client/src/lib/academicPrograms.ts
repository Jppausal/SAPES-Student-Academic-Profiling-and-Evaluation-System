export const TECHNOLOGY_PROGRAMS = [
  { value: 'Bachelor of Information Technology', label: 'Bachelor of Information Technology (IT)' },
  { value: 'Entertainment and Multimedia Computing', label: 'Entertainment and Multimedia Computing (EMC)' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Food Technology', label: 'Food Technology' },
  { value: 'Automotive Technology', label: 'Automotive Technology' },
] as const;

export const DEPARTMENT_PROGRAMS: Record<string, string> = {
  IT: 'Bachelor of Information Technology',
  EMC: 'Entertainment and Multimedia Computing',
  ELECTRONICS: 'Electronics',
  FOODTECH: 'Food Technology',
  AUTOMOTIVE: 'Automotive Technology',
};