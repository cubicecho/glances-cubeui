import { DetailLevel, isShownAt } from './detail-level.ts';
import type { Disk, NetworkInterface } from './reading.ts';

/** The loopback interface, whose traffic never leaves the machine. */
export const LOOPBACK_INTERFACE = 'lo';
/** Interfaces a container engine makes: one end of a veth pair per container, and the bridges they join. */
const CONTAINER_INTERFACE = /^(veth|docker|br-[0-9a-f]{12}$|cni|flannel|cali|kube|podman|lxcbr|lxdbr|incusbr)/;
/** Interfaces made in software on top of a real one: bridges, VLANs, taps and VPN tunnels. */
const VIRTUAL_INTERFACE = /^(br|virbr|vmbr|vnet|macvtap|macvlan|ipvlan|vlan|tap|tun|wg|tailscale|zt|dummy)|[.@]/;
/** Block devices made in software: device mapper, ZFS volumes, RAID, loop and RAM devices, optical drives. */
const VIRTUAL_DISK = /^(dm-|zd|md|loop|ram|zram|nbd|sr|fd)/;
/** A partition of a whole disk, such as sda1, nvme0n1p2 or mmcblk0p1. */
const PARTITION = /^((sd|vd|xvd|hd)[a-z]+\d+|(nvme\d+n\d+|mmcblk\d+)p\d+)$/;

/**
 * Finds the lowest detail level a network interface appears at.
 *
 * @param name - The interface name, such as eth0.
 * @returns Summary for a physical interface or bond, Useful for a virtual one, All for a container's or loopback.
 */
export function interfaceDetail(name: string): DetailLevel {
  if (name === LOOPBACK_INTERFACE || CONTAINER_INTERFACE.test(name)) {
    return DetailLevel.All;
  }
  if (VIRTUAL_INTERFACE.test(name)) {
    return DetailLevel.Useful;
  }
  return DetailLevel.Summary;
}

/**
 * Finds the lowest detail level a disk appears at.
 *
 * @param name - The disk name, such as sda.
 * @returns Summary for a whole disk, Useful for a software device, All for a partition.
 */
export function diskDetail(name: string): DetailLevel {
  if (VIRTUAL_DISK.test(name)) {
    return DetailLevel.Useful;
  }
  if (PARTITION.test(name)) {
    return DetailLevel.All;
  }
  return DetailLevel.Summary;
}

/**
 * Picks the network interfaces a view shows.
 *
 * @param interfaces - Every interface of a reading.
 * @param detail - How much to show.
 * @returns The interfaces that appear at that level, in their order.
 */
export function viewInterfaces(interfaces: readonly NetworkInterface[], detail: DetailLevel): NetworkInterface[] {
  return interfaces.filter((network) => isShownAt(interfaceDetail(network.name), detail));
}

/**
 * Picks the disks a view shows.
 *
 * @param disks - Every disk of a reading.
 * @param detail - How much to show.
 * @returns The disks that appear at that level, in their order.
 */
export function viewDisks(disks: readonly Disk[], detail: DetailLevel): Disk[] {
  return disks.filter((disk) => isShownAt(diskDetail(disk.name), detail));
}

/**
 * Picks the interfaces whose traffic adds up to the machine's.
 *
 * @param interfaces - Every interface of a reading.
 * @returns The physical interfaces, or every one but loopback on a machine where none looks physical.
 *
 * @remarks
 * A packet to a container crosses the physical interface, a bridge and a veth, so adding all three counts it thrice.
 */
export function uplinkInterfaces(interfaces: readonly NetworkInterface[]): NetworkInterface[] {
  const physical = viewInterfaces(interfaces, DetailLevel.Summary);
  if (physical.length > 0) {
    return physical;
  }
  return interfaces.filter((network) => network.name !== LOOPBACK_INTERFACE);
}
