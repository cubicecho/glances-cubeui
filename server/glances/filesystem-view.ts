import { DetailLevel } from './detail-level.ts';
import type { Filesystem } from './reading.ts';

/** What a filesystem is for, as far as its paths tell. */
const FilesystemRole = {
  /** Somewhere a person keeps things. */
  Data: 'data',
  /** A container engine's own storage. */
  Container: 'container',
  /** What the operating system boots from and keeps for itself. */
  System: 'system',
} as const;
type FilesystemRole = (typeof FilesystemRole)[keyof typeof FilesystemRole];

/** One row of a filesystem view: a filesystem, or a pool totalled from several. */
export interface FilesystemRow extends Filesystem {
  /** The filesystems a summary row totals that the view shows, when there is more than one. Empty on any other row. */
  datasets: FilesystemRow[];
}

/** What a filesystem view shows. */
export interface FilesystemViewOptions {
  /** How much to show. */
  detail: DetailLevel;
  /** Whether to leave out what the operating system boots from and keeps for itself. */
  hideSystem: boolean;
}

/** A filesystem with what it was found to be. */
interface Member {
  filesystem: Filesystem;
  role: FilesystemRole;
}

/** Where a containerised Glances has the host's root mounted. */
const HOST_ROOT = '/rootfs';
const ROOT = '/';
const SEPARATOR = '/';
const ZFS = 'zfs';
const OVERLAY = 'overlay';
const PERCENT = 100;
const PERCENT_DECIMALS = 1;
/** Single files Docker mounts into every container, each reported as a filesystem of its own. */
const CONTAINER_FILE_MOUNTS: readonly string[] = ['/etc/resolv.conf', '/etc/hostname', '/etc/hosts'];
/** Where the boot loader and kernel live. */
const BOOT_MOUNTS: readonly string[] = ['/boot', '/boot/efi', '/efi'];
/** Path segments that mark a container engine's storage, in a mount point or a dataset name. */
const CONTAINER_SEGMENTS: readonly string[] = [
  'docker',
  'containers',
  'containerd',
  'kubelet',
  'k3s',
  'lxc',
  'lxd',
  'incus',
  'ix-applications',
  '.ix-apps',
  '.ix-virt',
];
/** Path segments that mark an appliance's own datasets (TrueNAS). */
const SYSTEM_SEGMENTS: readonly string[] = ['.system'];

/**
 * Rewrites a mount point seen through a containerised Glances to where the host has it.
 *
 * @param mountPoint - The mount point as Glances reports it.
 * @returns The path with the host-root prefix removed, or unchanged when it has none.
 */
function hostPath(mountPoint: string): string {
  if (mountPoint === HOST_ROOT) {
    return ROOT;
  }
  if (mountPoint.startsWith(`${HOST_ROOT}${SEPARATOR}`)) {
    return mountPoint.slice(HOST_ROOT.length);
  }
  return mountPoint;
}

/**
 * Removes what a containerised Glances adds to a host's filesystems.
 *
 * @param filesystems - The filesystems as Glances reports them.
 * @returns The same list without Docker's file mounts that repeat a device, and with host paths.
 *
 * @remarks
 * A file mount is kept when it is the only row of its device, since it is then the only word on that disk.
 */
export function tidyFilesystems(filesystems: readonly Filesystem[]): Filesystem[] {
  const isFileMount = (filesystem: Filesystem) => CONTAINER_FILE_MOUNTS.includes(filesystem.mountPoint);
  const mountedDevices = new Set(
    filesystems.filter((filesystem) => isFileMount(filesystem) === false).map((filesystem) => filesystem.deviceName),
  );
  const hasHostRoot = filesystems.some((filesystem) => filesystem.mountPoint === HOST_ROOT);
  const kept: Filesystem[] = [];
  for (const filesystem of filesystems) {
    const repeatsDevice = isFileMount(filesystem) && mountedDevices.has(filesystem.deviceName);
    if (repeatsDevice) {
      continue;
    }
    if (isFileMount(filesystem)) {
      mountedDevices.add(filesystem.deviceName);
    }
    kept.push(hasHostRoot ? { ...filesystem, mountPoint: hostPath(filesystem.mountPoint) } : filesystem);
  }
  return kept;
}

/**
 * Tells what a filesystem is for from its paths.
 *
 * @param filesystem - A tidied filesystem.
 * @returns Its role.
 */
function roleOf(filesystem: Filesystem): FilesystemRole {
  const segments = [...filesystem.mountPoint.split(SEPARATOR), ...(filesystem.deviceName ?? '').split(SEPARATOR)];
  const isContainerStorage =
    filesystem.type === OVERLAY || segments.some((segment) => CONTAINER_SEGMENTS.includes(segment));
  if (isContainerStorage) {
    return FilesystemRole.Container;
  }
  const isSystemStorage =
    BOOT_MOUNTS.includes(filesystem.mountPoint) || segments.some((segment) => SYSTEM_SEGMENTS.includes(segment));
  if (isSystemStorage) {
    return FilesystemRole.System;
  }
  return FilesystemRole.Data;
}

/**
 * Names the pool or device a filesystem takes its space from.
 *
 * @param filesystem - A tidied filesystem.
 * @returns The ZFS pool name, or the device, or the mount point where Glances names no device.
 */
function poolOf(filesystem: Filesystem): string {
  const device = filesystem.deviceName ?? filesystem.mountPoint;
  if (filesystem.type === ZFS) {
    return device.split(SEPARATOR)[0] ?? device;
  }
  return device;
}

/**
 * Tells what a whole pool is for.
 *
 * @param members - The pool's filesystems.
 * @returns The role every member shares, or Data when they differ.
 */
function sharedRole(members: readonly Member[]): FilesystemRole {
  const [first] = members;
  const isUniform = members.every((member) => member.role === first?.role);
  return isUniform && first !== undefined ? first.role : FilesystemRole.Data;
}

/**
 * Groups filesystems into pools, and marks the pool that only holds the operating system.
 *
 * @param filesystems - Tidied filesystems.
 * @returns Each pool's members, with a system pool's members all given the system role.
 *
 * @remarks
 * The pool mounted at the root is a system pool only when another pool holds data.
 * On a machine with one disk it is where everything is kept, so it stays data.
 */
function poolsOf(filesystems: readonly Filesystem[]): Member[][] {
  const pools = new Map<string, Member[]>();
  for (const filesystem of filesystems) {
    const pool = poolOf(filesystem);
    pools.set(pool, [...(pools.get(pool) ?? []), { filesystem, role: roleOf(filesystem) }]);
  }
  const grouped = [...pools.values()];
  const holdsRoot = (members: readonly Member[]) => members.some((member) => member.filesystem.mountPoint === ROOT);
  const dataPoolCount = grouped.filter((members) => sharedRole(members) === FilesystemRole.Data).length;
  const hasDataElsewhere = dataPoolCount > 1;
  return grouped.map((members) => {
    const isSystemPool = hasDataElsewhere && holdsRoot(members) && sharedRole(members) === FilesystemRole.Data;
    return isSystemPool ? members.map((member) => ({ ...member, role: FilesystemRole.System })) : members;
  });
}

/**
 * Totals a pool into one row.
 *
 * @param members - The pool's filesystems.
 * @param shown - The members a view may list under the row.
 * @returns The row, named after the member mounted highest.
 *
 * @remarks
 * Every ZFS dataset reports its own use plus the free space the pool shares, so the pool is the sum of the uses
 * plus that free space once. Snapshots and volumes are in neither figure. Filesystems of one ordinary device all
 * report the same device, so one of them stands for it.
 */
function totalOf(members: readonly Member[], shown: readonly Member[]): FilesystemRow {
  const filesystems = members.map((member) => member.filesystem);
  const [top] = filesystems.toSorted((a, b) => a.mountPoint.length - b.mountPoint.length);
  if (top === undefined) {
    throw new Error('A pool has no filesystems. Pools are built from filesystems, so this is a bug in poolsOf.');
  }
  const datasets = shown.length > 1 ? shown.map((member) => ({ ...member.filesystem, datasets: [] })) : [];
  if (top.type !== ZFS) {
    return { ...top, datasets };
  }
  const usedBytes = filesystems.reduce((sum, filesystem) => sum + filesystem.usedBytes, 0);
  const freeBytes = Math.max(...filesystems.map((filesystem) => filesystem.freeBytes));
  const sizeBytes = usedBytes + freeBytes;
  const percent = sizeBytes > 0 ? Number(((usedBytes / sizeBytes) * PERCENT).toFixed(PERCENT_DECIMALS)) : 0;
  return { ...top, deviceName: poolOf(top), sizeBytes, usedBytes, freeBytes, percent, datasets };
}

/**
 * Picks and totals the filesystems a view shows.
 *
 * @param filesystems - The filesystems as Glances reports them.
 * @param options - How much to show, and whether system storage is hidden.
 * @returns Summary: one row per pool with its datasets. Useful: every filesystem but container storage. All: each one.
 */
export function viewFilesystems(filesystems: readonly Filesystem[], options: FilesystemViewOptions): FilesystemRow[] {
  const { detail, hideSystem } = options;
  const hiddenRoles: FilesystemRole[] = [];
  if (hideSystem) {
    hiddenRoles.push(FilesystemRole.System);
  }
  if (detail !== DetailLevel.All) {
    hiddenRoles.push(FilesystemRole.Container);
  }
  const isShown = (member: Member) => hiddenRoles.includes(member.role) === false;
  const pools = poolsOf(tidyFilesystems(filesystems));
  if (detail === DetailLevel.Summary) {
    return pools
      .filter((members) => hiddenRoles.includes(sharedRole(members)) === false)
      .map((members) => totalOf(members, members.filter(isShown)))
      .toSorted((a, b) => a.mountPoint.localeCompare(b.mountPoint));
  }
  return pools
    .flat()
    .filter(isShown)
    .map((member) => ({ ...member.filesystem, datasets: [] }));
}
