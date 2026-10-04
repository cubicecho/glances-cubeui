import { z } from 'zod';

/** A number Glances may leave out or send as null, read as zero. */
const quantity = z
  .number()
  .nullish()
  .transform((value) => value ?? 0);
/** A number Glances may leave out, kept as null. */
const optionalQuantity = z
  .number()
  .nullish()
  .transform((value) => value ?? null);
/** A string Glances may leave out, kept as null. */
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? null);
/** A list plugin that may be switched off, read as empty. */
const pluginList = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((items) => items ?? []);

const systemSchema = z.object({
  hostname: z.string(),
  os_name: z.string(),
  os_version: optionalText,
  linux_distro: optionalText,
  hr_name: optionalText,
});

const cpuSchema = z.object({
  total: quantity,
  user: quantity,
  system: quantity,
  iowait: optionalQuantity,
  cpucore: optionalQuantity,
});

const coreSchema = z.object({ cpu_number: z.number(), total: quantity });

const loadSchema = z.object({ min1: quantity, min5: quantity, min15: quantity });

const memorySchema = z.object({ total: quantity, used: quantity, available: quantity, percent: quantity });

const swapSchema = z.object({ total: quantity, used: quantity, percent: quantity });

const filesystemSchema = z.object({
  mnt_point: z.string(),
  device_name: optionalText,
  fs_type: optionalText,
  size: quantity,
  used: quantity,
  free: quantity,
  percent: quantity,
});

const networkSchema = z.object({
  interface_name: z.string(),
  bytes_recv_rate_per_sec: quantity,
  bytes_sent_rate_per_sec: quantity,
});

const diskSchema = z.object({
  disk_name: z.string(),
  read_bytes_rate_per_sec: quantity,
  write_bytes_rate_per_sec: quantity,
});

const sensorSchema = z.object({ label: z.string(), value: optionalQuantity, unit: optionalText, type: optionalText });

const gpuSchema = z.object({
  gpu_id: z.union([z.string(), z.number()]),
  name: optionalText,
  proc: optionalQuantity,
  mem: optionalQuantity,
  temperature: optionalQuantity,
  fan_speed: optionalQuantity,
});

const containerSchema = z.object({
  name: z.string(),
  status: optionalText,
  engine: optionalText,
  image: z
    .union([z.string(), z.array(z.string())])
    .nullish()
    .transform((image) => (Array.isArray(image) ? (image[0] ?? null) : (image ?? null))),
  cpu_percent: optionalQuantity,
  memory_usage: optionalQuantity,
});

const processSchema = z.object({
  pid: z.number(),
  name: z.string(),
  username: optionalText,
  status: optionalText,
  cpu_percent: quantity,
  memory_percent: quantity,
  memory_info: z
    .object({ rss: quantity })
    .nullish()
    .transform((info) => info?.rss ?? 0),
});

const processCountSchema = z.object({ total: quantity, running: quantity, sleeping: quantity, thread: quantity });

/** The plugins read from `GET /api/4/all`. Anything else in the payload is ignored. */
const payloadSchema = z.object({
  system: systemSchema,
  cpu: cpuSchema,
  mem: memorySchema,
  version: optionalText,
  uptime: optionalText,
  quicklook: z.object({ cpu_name: optionalText }).nullish(),
  percpu: pluginList(coreSchema),
  load: loadSchema.nullish(),
  memswap: swapSchema.nullish(),
  fs: pluginList(filesystemSchema),
  network: pluginList(networkSchema),
  diskio: pluginList(diskSchema),
  sensors: pluginList(sensorSchema),
  gpu: pluginList(gpuSchema),
  containers: pluginList(containerSchema),
  processlist: pluginList(processSchema),
  processcount: processCountSchema.nullish(),
});
type Payload = z.infer<typeof payloadSchema>;

/** Everything one Glances server reported at one moment. */
export interface Reading {
  /** When this server took the reading, as an ISO timestamp. */
  sampledAt: string;
  /** The Glances version that answered, or null when it did not say. */
  glancesVersion: string | null;
  /** How long the machine has been up, in Glances' own words ("3 days, 4:05:06"). */
  uptime: string | null;
  system: SystemFacts;
  cpu: CpuUsage;
  /** One entry per logical core, in core order. */
  cores: CoreUsage[];
  /** Null on a machine with no load average (Windows). */
  load: LoadAverage | null;
  memory: MemoryUsage;
  /** Null when the machine has no swap plugin. */
  swap: SwapUsage | null;
  filesystems: Filesystem[];
  networkInterfaces: NetworkInterface[];
  disks: Disk[];
  sensors: Sensor[];
  /** Graphics cards. Empty where Glances found none it can read. */
  gpus: Gpu[];
  containers: Container[];
  /** The busiest processes, by CPU. */
  processes: Process[];
  /** Null when the process plugin is off. */
  processCount: ProcessCount | null;
}

/** What the machine is. */
export interface SystemFacts {
  hostname: string;
  osName: string;
  osVersion: string | null;
  distribution: string | null;
  /** Glances' one-line description of the platform. */
  description: string | null;
}

/** CPU use across all cores, in percent of the whole machine. */
export interface CpuUsage {
  totalPercent: number;
  userPercent: number;
  systemPercent: number;
  /** Null where the platform does not report it. */
  iowaitPercent: number | null;
  /** The processor's model name. */
  name: string | null;
  /** Logical cores. */
  coreCount: number | null;
}

/** One logical core's use. */
export interface CoreUsage {
  index: number;
  totalPercent: number;
}

/** Load averages over one, five and fifteen minutes. */
export interface LoadAverage {
  min1: number;
  min5: number;
  min15: number;
}

/** RAM use, in bytes. */
export interface MemoryUsage {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  percent: number;
}

/** Swap use, in bytes. */
export interface SwapUsage {
  totalBytes: number;
  usedBytes: number;
  percent: number;
}

/** One mounted filesystem. */
export interface Filesystem {
  mountPoint: string;
  deviceName: string | null;
  type: string | null;
  sizeBytes: number;
  usedBytes: number;
  freeBytes: number;
  percent: number;
}

/** One network interface's traffic, in bytes per second. */
export interface NetworkInterface {
  name: string;
  receivedBytesPerSecond: number;
  sentBytesPerSecond: number;
}

/** One disk's traffic, in bytes per second. */
export interface Disk {
  name: string;
  readBytesPerSecond: number;
  writeBytesPerSecond: number;
}

/** One hardware sensor. */
export interface Sensor {
  label: string;
  value: number | null;
  /** "C", "F", "R" (rpm), "%" and so on, as Glances reports it. */
  unit: string | null;
  /** Glances' sensor type, such as "temperature_core" or "fan_speed". */
  kind: string | null;
}

/** One graphics card. Glances reports its memory as a share only, never in bytes. */
export interface Gpu {
  /** Glances' identifier, such as "amd0" or "0". */
  id: string;
  name: string | null;
  /** How busy the GPU is, 0 to 100. Null when the driver does not say. */
  usagePercent: number | null;
  /** How much of its memory is in use, 0 to 100. Null when the driver does not say. */
  memoryPercent: number | null;
  /** Degrees Celsius. */
  temperature: number | null;
  /** Fan speed, 0 to 100. Null on a card with no fan sensor. */
  fanSpeedPercent: number | null;
}

/** One container. */
export interface Container {
  name: string;
  status: string | null;
  engine: string | null;
  image: string | null;
  cpuPercent: number | null;
  memoryBytes: number | null;
}

/** One process. */
export interface Process {
  pid: number;
  name: string;
  user: string | null;
  /** The one-letter state Glances reports ("R", "S"). */
  status: string | null;
  /** Percent of one core, so it can pass 100. */
  cpuPercent: number;
  memoryPercent: number;
  /** Resident memory. */
  memoryBytes: number;
}

/** How many processes there are, by state. */
export interface ProcessCount {
  total: number;
  running: number;
  sleeping: number;
  threads: number;
}

/**
 * Picks the busiest processes.
 *
 * @param processes - Every process Glances listed.
 * @param count - How many to keep.
 * @returns The top ones by CPU, then by memory.
 */
function busiest(processes: Payload['processlist'], count: number): Process[] {
  return processes
    .toSorted((a, b) => b.cpu_percent - a.cpu_percent || b.memory_percent - a.memory_percent)
    .slice(0, count)
    .map((process) => ({
      pid: process.pid,
      name: process.name,
      user: process.username,
      status: process.status,
      cpuPercent: process.cpu_percent,
      memoryPercent: process.memory_percent,
      memoryBytes: process.memory_info,
    }));
}

/**
 * Reads a Glances `/api/4/all` payload into a reading.
 *
 * @param payload - The parsed JSON body, untrusted.
 * @param sampledAt - When the payload was fetched.
 * @param topProcessCount - How many processes to keep.
 * @returns The reading.
 * @throws When the payload lacks the system, cpu or mem plugin, or one has the wrong shape.
 */
export function parseReading(payload: unknown, sampledAt: Date, topProcessCount: number): Reading {
  const result = payloadSchema.safeParse(payload);
  if (result.success === false) {
    const [issue] = result.error.issues;
    const where = issue?.path.join('.') ?? '';
    throw new Error(
      `The Glances payload is not what API version 4 sends (at "${where}": ${issue?.message}). Check the host runs Glances 4 with the system, cpu and mem plugins enabled.`,
    );
  }
  const { system, cpu, mem, memswap, load, processcount, ...plugins } = result.data;
  return {
    sampledAt: sampledAt.toISOString(),
    glancesVersion: plugins.version,
    uptime: plugins.uptime,
    system: {
      hostname: system.hostname,
      osName: system.os_name,
      osVersion: system.os_version,
      distribution: system.linux_distro,
      description: system.hr_name,
    },
    cpu: {
      totalPercent: cpu.total,
      userPercent: cpu.user,
      systemPercent: cpu.system,
      iowaitPercent: cpu.iowait,
      name: plugins.quicklook?.cpu_name ?? null,
      coreCount: cpu.cpucore,
    },
    cores: plugins.percpu.map((core) => ({ index: core.cpu_number, totalPercent: core.total })),
    load: load ?? null,
    memory: { totalBytes: mem.total, usedBytes: mem.used, availableBytes: mem.available, percent: mem.percent },
    swap: memswap ? { totalBytes: memswap.total, usedBytes: memswap.used, percent: memswap.percent } : null,
    filesystems: plugins.fs.map((fs) => ({
      mountPoint: fs.mnt_point,
      deviceName: fs.device_name,
      type: fs.fs_type,
      sizeBytes: fs.size,
      usedBytes: fs.used,
      freeBytes: fs.free,
      percent: fs.percent,
    })),
    networkInterfaces: plugins.network.map((network) => ({
      name: network.interface_name,
      receivedBytesPerSecond: network.bytes_recv_rate_per_sec,
      sentBytesPerSecond: network.bytes_sent_rate_per_sec,
    })),
    disks: plugins.diskio.map((disk) => ({
      name: disk.disk_name,
      readBytesPerSecond: disk.read_bytes_rate_per_sec,
      writeBytesPerSecond: disk.write_bytes_rate_per_sec,
    })),
    sensors: plugins.sensors.map((sensor) => ({
      label: sensor.label,
      value: sensor.value,
      unit: sensor.unit,
      kind: sensor.type,
    })),
    gpus: plugins.gpu.map((gpu) => ({
      id: String(gpu.gpu_id),
      name: gpu.name,
      usagePercent: gpu.proc,
      memoryPercent: gpu.mem,
      temperature: gpu.temperature,
      fanSpeedPercent: gpu.fan_speed,
    })),
    containers: plugins.containers.map((container) => ({
      name: container.name,
      status: container.status,
      engine: container.engine,
      image: container.image,
      cpuPercent: container.cpu_percent,
      memoryBytes: container.memory_usage,
    })),
    processes: busiest(plugins.processlist, topProcessCount),
    processCount: processcount
      ? {
          total: processcount.total,
          running: processcount.running,
          sleeping: processcount.sleeping,
          threads: processcount.thread,
        }
      : null,
  };
}
