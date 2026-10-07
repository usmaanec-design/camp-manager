import { Building } from '../types';

export interface ParsedRoomInfo {
  buildingPrefix: string;
  cleanRoom: string;
  fullRoom: string;
}

/**
 * Intelligently parses room string into building identifier and room number.
 * Examples:
 * - "A-1", "A-44", "B-11", "C-24", "D-13", "E-30"
 * - "A - 1", "A_1", "A/1", "A:1"
 * - "Building A-1", "Block B-03", "مبنى C-12"
 * - "A101", "C24"
 * - "A 1", "B 24"
 */
export function parseBuildingAndRoom(roomStr: string): ParsedRoomInfo {
  const raw = (roomStr || '').trim();
  if (!raw) return { buildingPrefix: '', cleanRoom: '', fullRoom: '' };

  // Strip prefixes like "Building", "Block", "مبنى", "بلوك", "عمارة"
  const clean = raw.replace(/^(building|block|مبنى|بلوك|عمارة)\s*[-_:]?\s*/i, '').trim();

  // Pattern 1: Hyphen or separator e.g. "A-24", "C - 12", "B_05", "D/13"
  const sepMatch = clean.match(/^([a-zA-Z0-9\u0600-\u06FF]+)\s*[-_/:]\s*(.+)$/);
  if (sepMatch) {
    return {
      buildingPrefix: sepMatch[1].trim(),
      cleanRoom: sepMatch[2].trim(),
      fullRoom: raw,
    };
  }

  // Pattern 2: Whitespace separation e.g. "A 24", "B 101"
  const spaceMatch = clean.match(/^([a-zA-Z0-9\u0600-\u06FF]+)\s+([0-9a-zA-Z]+)$/);
  if (spaceMatch) {
    return {
      buildingPrefix: spaceMatch[1].trim(),
      cleanRoom: spaceMatch[2].trim(),
      fullRoom: raw,
    };
  }

  // Pattern 3: Letters followed immediately by digits e.g. "A24", "C105"
  const letterDigitMatch = clean.match(/^([a-zA-Z\u0600-\u06FF]+)(\d+)$/);
  if (letterDigitMatch) {
    return {
      buildingPrefix: letterDigitMatch[1].trim(),
      cleanRoom: letterDigitMatch[2].trim(),
      fullRoom: raw,
    };
  }

  return {
    buildingPrefix: clean,
    cleanRoom: clean,
    fullRoom: raw,
  };
}

/**
 * Normalizes a building name or code for robust matching.
 * e.g. "Building A" -> "a", "Block B" -> "b", "A" -> "a", "مبنى C" -> "c"
 */
export function normalizeBuildingName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/^(building|block|مبنى|بلوك|عمارة)\s*/i, '')
    .replace(/\s*(building|block|مبنى|بلوك|عمارة)$/i, '')
    .trim();
}

/**
 * Finds the building matching the room number prefix from a list of buildings.
 */
export function matchBuildingForRoom(
  roomStr: string,
  buildings: Building[]
): Building | undefined {
  if (!roomStr || !buildings || buildings.length === 0) return undefined;

  const { buildingPrefix } = parseBuildingAndRoom(roomStr);
  if (!buildingPrefix) return undefined;

  const target = normalizeBuildingName(buildingPrefix);

  // 1. Exact match on normalized name (e.g. prefix "A" vs building name "A" or "Building A")
  let match = buildings.find((b) => normalizeBuildingName(b.name) === target);
  if (match) return match;

  // 2. Exact match on buildingNumber (e.g. prefix "B-058", "058", "B-009")
  match = buildings.find((b) => {
    const bNum = (b.buildingNumber || '').toLowerCase().trim();
    const cleanBNum = bNum.replace(/^b-?/i, '');
    const cleanTarget = target.replace(/^b-?/i, '');
    return bNum === target || (cleanBNum && cleanBNum === cleanTarget);
  });
  if (match) return match;

  // 3. Word boundary match in building name
  match = buildings.find((b) => {
    const norm = normalizeBuildingName(b.name);
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${target}([^a-zA-Z0-9]|$)`, 'i');
    return regex.test(norm);
  });
  if (match) return match;

  // 4. StartsWith / Includes fallback
  match = buildings.find((b) => {
    const norm = normalizeBuildingName(b.name);
    return norm.startsWith(target) || target.startsWith(norm);
  });
  if (match) return match;

  return undefined;
}
