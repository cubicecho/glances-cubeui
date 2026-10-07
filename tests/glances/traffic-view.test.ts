import { DetailLevel } from '../../server/glances/detail-level.ts';
import type { Disk, NetworkInterface } from '../../server/glances/reading.ts';
import { uplinkInterfaces, viewDisks, viewInterfaces } from '../../server/glances/traffic-view.ts';

const RATE = 100;
const INTERFACES: NetworkInterface[] = [
  'lo',
  'enp191s0',
  'bond0',
  'macvtap0',
  'eth0.10',
  'docker0',
  'br-0123456789ab',
  'veth1a2b3c4',
].map((name) => ({ name, receivedBytesPerSecond: RATE, sentBytesPerSecond: RATE }));
const DISKS: Disk[] = ['nvme0n1', 'nvme0n1p1', 'sda', 'sda1', 'dm-0', 'zd0'].map((name) => ({
  name,
  readBytesPerSecond: RATE,
  writeBytesPerSecond: RATE,
}));

const names = (items: { name: string }[]) => items.map((item) => item.name);

describe('viewInterfaces', () => {
  it('shows physical interfaces and bonds at Summary', () => {
    expect(names(viewInterfaces(INTERFACES, DetailLevel.Summary))).toEqual(['enp191s0', 'bond0']);
  });

  it('adds virtual interfaces at Useful', () => {
    expect(names(viewInterfaces(INTERFACES, DetailLevel.Useful))).toEqual(['enp191s0', 'bond0', 'macvtap0', 'eth0.10']);
  });

  it('adds loopback and container interfaces at All', () => {
    expect(viewInterfaces(INTERFACES, DetailLevel.All)).toEqual(INTERFACES);
  });
});

describe('viewDisks', () => {
  it('shows whole disks at Summary', () => {
    expect(names(viewDisks(DISKS, DetailLevel.Summary))).toEqual(['nvme0n1', 'sda']);
  });

  it('adds software devices at Useful and partitions at All', () => {
    expect(names(viewDisks(DISKS, DetailLevel.Useful))).toEqual(['nvme0n1', 'sda', 'dm-0', 'zd0']);
    expect(viewDisks(DISKS, DetailLevel.All)).toEqual(DISKS);
  });
});

describe('uplinkInterfaces', () => {
  it('counts traffic on the physical interfaces only', () => {
    expect(names(uplinkInterfaces(INTERFACES))).toEqual(['enp191s0', 'bond0']);
  });

  it('falls back to everything but loopback where nothing looks physical', () => {
    const virtualOnly = INTERFACES.filter((network) => ['lo', 'docker0', 'veth1a2b3c4'].includes(network.name));
    expect(names(uplinkInterfaces(virtualOnly))).toEqual(['docker0', 'veth1a2b3c4']);
  });
});
