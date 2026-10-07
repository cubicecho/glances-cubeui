import { DetailLevel } from '../../server/glances/detail-level.ts';
import { tidyFilesystems, viewFilesystems } from '../../server/glances/filesystem-view.ts';
import type { Filesystem } from '../../server/glances/reading.ts';
import { fixtureReading } from '../helpers.ts';

const GIB = 2 ** 30;
/** Free space every dataset of the `tank` pool reports. */
const TANK_FREE_GIB = 1000;

/**
 * Builds a filesystem as Glances reports one.
 *
 * @param mountPoint - Where it is mounted.
 * @param deviceName - The device or dataset behind it.
 * @param usedGib - Space in use, in GiB.
 * @param [freeGib] - Space free, in GiB.
 * @param [type] - The filesystem type.
 * @returns The filesystem.
 */
function filesystem(
  mountPoint: string,
  deviceName: string,
  usedGib: number,
  freeGib = TANK_FREE_GIB,
  type = 'zfs',
): Filesystem {
  const usedBytes = usedGib * GIB;
  const freeBytes = freeGib * GIB;
  return { mountPoint, deviceName, type, usedBytes, freeBytes, sizeBytes: usedBytes + freeBytes, percent: 0 };
}

/** A NAS seen through a containerised Glances: a boot pool, a data pool with app datasets, Docker's file mounts. */
const NAS: Filesystem[] = [
  filesystem('/rootfs', 'boot-pool/ROOT/1', 1, 200),
  filesystem('/rootfs/usr', 'boot-pool/ROOT/1/usr', 3, 200),
  filesystem('/rootfs/mnt/tank', 'tank', 100),
  filesystem('/rootfs/mnt/tank/media', 'tank/media', 300),
  filesystem('/rootfs/mnt/tank/.system', 'tank/.system', 2),
  filesystem('/rootfs/mnt/tank/ix-applications/k3s', 'tank/ix-applications/k3s', 50),
  filesystem('/rootfs/mnt/.ix-apps/docker', 'tank/.ix-apps/docker', 48),
  filesystem('/etc/resolv.conf', 'tank/.ix-apps/docker', 48),
  filesystem('/etc/hostname', 'tank/.ix-apps/docker', 48),
  filesystem('/etc/hosts', 'tank/.ix-apps/docker', 48),
];

/** A laptop with one disk, a boot partition and an EFI partition. */
const LAPTOP: Filesystem[] = [
  filesystem('/', '/dev/mapper/vg-root', 400, 500, 'ext4'),
  filesystem('/boot', '/dev/nvme0n1p2', 0.2, 1.7, 'ext4'),
  filesystem('/boot/efi', '/dev/nvme0n1p1', 0.1, 0.9, 'vfat'),
];

const mountPoints = (rows: Filesystem[]) => rows.map((row) => row.mountPoint);

describe('tidyFilesystems', () => {
  it("drops Docker's file mounts and shows host paths", () => {
    expect(mountPoints(tidyFilesystems(NAS))).toEqual([
      '/',
      '/usr',
      '/mnt/tank',
      '/mnt/tank/media',
      '/mnt/tank/.system',
      '/mnt/tank/ix-applications/k3s',
      '/mnt/.ix-apps/docker',
    ]);
  });

  it('keeps one file mount when nothing else speaks for its disk', () => {
    const { filesystems } = fixtureReading();
    expect(filesystems.length).toBeGreaterThan(1);
    expect(mountPoints(tidyFilesystems(filesystems))).toEqual(['/etc/resolv.conf']);
  });
});

describe('viewFilesystems', () => {
  it('totals a ZFS pool as its datasets plus the free space once', () => {
    const [bootPool, tank] = viewFilesystems(NAS, { detail: DetailLevel.Summary, hideSystem: false });
    expect(bootPool).toMatchObject({ mountPoint: '/', deviceName: 'boot-pool', usedBytes: 4 * GIB });
    expect(tank).toMatchObject({
      mountPoint: '/mnt/tank',
      deviceName: 'tank',
      usedBytes: 500 * GIB,
      freeBytes: TANK_FREE_GIB * GIB,
      sizeBytes: 1500 * GIB,
      percent: 33.3,
    });
  });

  it("lists a pool's datasets without container storage", () => {
    const [, tank] = viewFilesystems(NAS, { detail: DetailLevel.Summary, hideSystem: false });
    expect(mountPoints(tank?.datasets ?? [])).toEqual(['/mnt/tank', '/mnt/tank/media', '/mnt/tank/.system']);
  });

  it('hides the boot pool and system datasets on request', () => {
    const rows = viewFilesystems(NAS, { detail: DetailLevel.Summary, hideSystem: true });
    expect(mountPoints(rows)).toEqual(['/mnt/tank']);
    expect(mountPoints(rows[0]?.datasets ?? [])).toEqual(['/mnt/tank', '/mnt/tank/media']);
  });

  it('never hides the only disk, only its boot partitions', () => {
    const shown = viewFilesystems(LAPTOP, { detail: DetailLevel.Summary, hideSystem: false });
    const hidden = viewFilesystems(LAPTOP, { detail: DetailLevel.Summary, hideSystem: true });
    expect(mountPoints(shown)).toEqual(['/', '/boot', '/boot/efi']);
    expect(hidden).toEqual([{ ...LAPTOP[0], datasets: [] }]);
  });

  it('shows every filesystem but container storage at Useful', () => {
    const rows = viewFilesystems(NAS, { detail: DetailLevel.Useful, hideSystem: true });
    expect(mountPoints(rows)).toEqual(['/mnt/tank', '/mnt/tank/media']);
  });

  it('shows everything at All', () => {
    const rows = viewFilesystems(NAS, { detail: DetailLevel.All, hideSystem: false });
    expect(rows).toHaveLength(tidyFilesystems(NAS).length);
    expect(rows.every((row) => row.datasets.length === 0)).toBe(true);
  });
});
