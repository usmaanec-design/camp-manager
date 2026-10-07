import { FIXED_NATIONALITIES } from '../types';
export { FIXED_NATIONALITIES } from '../types';

export const getNationalityDef = (nat?: string) => {
  if (!nat) return FIXED_NATIONALITIES[0];
  const s = nat.toLowerCase().trim();
  if (s.includes('pak') || s.includes('باكستان')) return FIXED_NATIONALITIES[0];
  if (s.includes('ind') || s.includes('هند')) return FIXED_NATIONALITIES[1];
  if (s.includes('bang') || s.includes('beng') || s.includes('بنغل') || s.includes('بنغال')) return FIXED_NATIONALITIES[2];
  if (s.includes('egy') || s.includes('مصر')) return FIXED_NATIONALITIES[3];
  if (s.includes('pal') || s.includes('فلسطين')) return FIXED_NATIONALITIES[4];
  if (s.includes('sod') || s.includes('sud') || s.includes('سودان')) return FIXED_NATIONALITIES[5];
  if (s.includes('syr') || s.includes('sor') || s.includes('سور')) return FIXED_NATIONALITIES[6];
  return FIXED_NATIONALITIES[0];
};

export const getNationalityLabel = (nat?: string, isRTL: boolean = false): string => {
  const def = getNationalityDef(nat);
  return isRTL ? def.labelAr : def.labelEn;
};

export const getNationalityFlag = (nat?: string): string => {
  const def = getNationalityDef(nat);
  return def.flag;
};
