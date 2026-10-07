/** How much of a host's filesystems, interfaces and disks a caller wants to see. */
export const DetailLevel = {
  /** Only what the machine is built from: storage pools, physical interfaces, whole disks. */
  Summary: 'SUMMARY',
  /** Adds what a person set up on top of that, and leaves out what a container engine made. */
  Useful: 'USEFUL',
  /** Everything Glances reports. */
  All: 'ALL',
} as const;
export type DetailLevel = (typeof DetailLevel)[keyof typeof DetailLevel];

/** The levels from least to most detail. */
const LEVELS_BY_DETAIL: readonly DetailLevel[] = [DetailLevel.Summary, DetailLevel.Useful, DetailLevel.All];

/**
 * Says whether an item belongs in a view.
 *
 * @param firstShownAt - The lowest level the item appears at.
 * @param wanted - The level the caller asked for.
 * @returns True when the wanted level has at least that much detail.
 */
export function isShownAt(firstShownAt: DetailLevel, wanted: DetailLevel): boolean {
  return LEVELS_BY_DETAIL.indexOf(firstShownAt) <= LEVELS_BY_DETAIL.indexOf(wanted);
}
