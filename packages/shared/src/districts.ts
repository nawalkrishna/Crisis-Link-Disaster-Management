/**
 * The 14 districts of Kerala.
 *
 * In the 2024 version every district had its own copy-pasted component
 * (Kannur.js, Kannur1.js, Kannur2.js ...). Now there is ONE list of data,
 * and the UI renders whatever is in it.
 */
export const DISTRICTS = [
  { slug: 'thiruvananthapuram', name: 'Thiruvananthapuram' },
  { slug: 'kollam', name: 'Kollam' },
  { slug: 'pathanamthitta', name: 'Pathanamthitta' },
  { slug: 'alappuzha', name: 'Alappuzha' },
  { slug: 'kottayam', name: 'Kottayam' },
  { slug: 'idukki', name: 'Idukki' },
  { slug: 'ernakulam', name: 'Ernakulam' },
  { slug: 'thrissur', name: 'Thrissur' },
  { slug: 'palakkad', name: 'Palakkad' },
  { slug: 'malappuram', name: 'Malappuram' },
  { slug: 'kozhikode', name: 'Kozhikode' },
  { slug: 'wayanad', name: 'Wayanad' },
  { slug: 'kannur', name: 'Kannur' },
  { slug: 'kasaragod', name: 'Kasaragod' },
] as const;

/** `as const` lets TypeScript derive a union type: 'thiruvananthapuram' | 'kollam' | ... */
export type DistrictSlug = (typeof DISTRICTS)[number]['slug'];
export type District = (typeof DISTRICTS)[number];
