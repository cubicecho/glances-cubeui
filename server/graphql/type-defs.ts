/** The served schema, as SDL. Field names match the server's own types, so most need no resolver. */
export const TYPE_DEFS = /* GraphQL */ `
  "Whether a host is answering."
  enum HostStatus {
    "Not sampled yet."
    PENDING
    "The last sample succeeded."
    ONLINE
    "The last sample failed."
    UNREACHABLE
  }

  "One Glances server being watched."
  type Host {
    "The operator's name for the host. Unique."
    name: String!
    "Whether the last sample succeeded."
    status: HostStatus!
    "Why the last sample failed. Null when it succeeded or none was taken."
    error: String
    "The last successful reading. Kept while the host is unreachable, and null until one succeeds."
    reading: Reading
    "Recent samples, oldest first. Held in memory, so it starts empty after a restart."
    history: [Sample!]!
  }

  "The few numbers kept from each reading, for charts."
  type Sample {
    "When the reading was taken, as an ISO timestamp."
    sampledAt: String!
    "CPU use across all cores, in percent."
    cpuPercent: Float!
    "RAM in use, in percent."
    memoryPercent: Float!
    "One-minute load average. Null where the machine has none."
    load1: Float
    "Received on every interface but loopback, in bytes per second."
    receivedBytesPerSecond: Float!
    "Sent on every interface but loopback, in bytes per second."
    sentBytesPerSecond: Float!
  }

  "Everything one Glances server reported at one moment."
  type Reading {
    "When the reading was taken, as an ISO timestamp."
    sampledAt: String!
    "The Glances version that answered."
    glancesVersion: String
    "How long the machine has been up, in Glances' own words."
    uptime: String
    "What the machine is."
    system: SystemFacts!
    "CPU use across all cores."
    cpu: CpuUsage!
    "One entry per logical core, in core order."
    cores: [CoreUsage!]!
    "Load averages. Null where the machine has none (Windows)."
    load: LoadAverage
    "RAM use."
    memory: MemoryUsage!
    "Swap use. Null when the machine reports none."
    swap: SwapUsage
    "Mounted filesystems."
    filesystems: [Filesystem!]!
    "Network interfaces and their traffic."
    networkInterfaces: [NetworkInterface!]!
    "Disks and their traffic."
    disks: [Disk!]!
    "Hardware sensors. Empty where the machine exposes none."
    sensors: [Sensor!]!
    "Graphics cards. Empty where Glances found none it can read."
    gpus: [Gpu!]!
    "Containers. Empty where no container engine is reachable."
    containers: [Container!]!
    "The busiest processes, by CPU."
    processes: [Process!]!
    "How many processes there are. Null when the process plugin is off."
    processCount: ProcessCount
  }

  "What the machine is."
  type SystemFacts {
    "The machine's own hostname."
    hostname: String!
    "The operating system family, such as Linux."
    osName: String!
    "The kernel or OS version."
    osVersion: String
    "The Linux distribution, where there is one."
    distribution: String
    "Glances' one-line description of the platform."
    description: String
  }

  "CPU use across all cores, in percent of the whole machine."
  type CpuUsage {
    "Total use."
    totalPercent: Float!
    "Time in user code."
    userPercent: Float!
    "Time in the kernel."
    systemPercent: Float!
    "Time waiting on I/O. Null where the platform does not report it."
    iowaitPercent: Float
    "The processor's model name."
    name: String
    "Logical cores."
    coreCount: Int
  }

  "One logical core's use."
  type CoreUsage {
    "The core's number, from zero."
    index: Int!
    "Total use, in percent."
    totalPercent: Float!
  }

  "Load averages."
  type LoadAverage {
    "Over one minute."
    min1: Float!
    "Over five minutes."
    min5: Float!
    "Over fifteen minutes."
    min15: Float!
  }

  "RAM use."
  type MemoryUsage {
    "Installed RAM, in bytes."
    totalBytes: Float!
    "RAM in use, in bytes."
    usedBytes: Float!
    "RAM a new process could get, in bytes."
    availableBytes: Float!
    "RAM in use, in percent."
    percent: Float!
  }

  "Swap use."
  type SwapUsage {
    "Swap size, in bytes."
    totalBytes: Float!
    "Swap in use, in bytes."
    usedBytes: Float!
    "Swap in use, in percent."
    percent: Float!
  }

  "One mounted filesystem."
  type Filesystem {
    "Where it is mounted."
    mountPoint: String!
    "The device behind it."
    deviceName: String
    "The filesystem type, such as ext4."
    type: String
    "Its size, in bytes."
    sizeBytes: Float!
    "Space in use, in bytes."
    usedBytes: Float!
    "Space free, in bytes."
    freeBytes: Float!
    "Space in use, in percent."
    percent: Float!
  }

  "One network interface's traffic."
  type NetworkInterface {
    "The interface name, such as eth0."
    name: String!
    "Received, in bytes per second."
    receivedBytesPerSecond: Float!
    "Sent, in bytes per second."
    sentBytesPerSecond: Float!
  }

  "One disk's traffic."
  type Disk {
    "The disk name, such as sda."
    name: String!
    "Read, in bytes per second."
    readBytesPerSecond: Float!
    "Written, in bytes per second."
    writeBytesPerSecond: Float!
  }

  "One hardware sensor."
  type Sensor {
    "The sensor's label."
    label: String!
    "Its current value, in its unit."
    value: Float
    "The unit as Glances reports it: C, F, R (rpm), %."
    unit: String
    "Glances' sensor type, such as temperature_core or fan_speed."
    kind: String
  }

  "One graphics card. Glances reports its memory as a share only, never in bytes."
  type Gpu {
    "Glances' identifier, such as amd0 or 0."
    id: String!
    "The card's name."
    name: String
    "How busy the GPU is, 0 to 100. Null when the driver does not say."
    usagePercent: Float
    "How much of its memory is in use, 0 to 100. Null when the driver does not say."
    memoryPercent: Float
    "Degrees Celsius."
    temperature: Float
    "Fan speed, 0 to 100. Null on a card with no fan sensor."
    fanSpeedPercent: Float
  }

  "One container."
  type Container {
    "The container's name."
    name: String!
    "Its state, such as running or healthy."
    status: String
    "The engine running it, such as docker or podman."
    engine: String
    "The image it was started from."
    image: String
    "CPU use, in percent of one core."
    cpuPercent: Float
    "Memory in use, in bytes."
    memoryBytes: Float
  }

  "One process."
  type Process {
    "The process id."
    pid: Int!
    "The process name."
    name: String!
    "The user it runs as."
    user: String
    "The one-letter state Glances reports, such as R or S."
    status: String
    "CPU use, in percent of one core, so it can pass 100."
    cpuPercent: Float!
    "Memory in use, in percent of RAM."
    memoryPercent: Float!
    "Resident memory, in bytes."
    memoryBytes: Float!
  }

  "How many processes there are, by state."
  type ProcessCount {
    "All processes."
    total: Int!
    "Running now."
    running: Int!
    "Sleeping."
    sleeping: Int!
    "Threads across all processes."
    threads: Int!
  }

  type Query {
    "Every watched host, in configured order."
    hosts: [Host!]!
    "One host by name. Fails with NOT_FOUND when no host has that name."
    host(name: String!): Host!
    "How often every host is sampled, in seconds. Updates cannot arrive faster than this."
    sampleIntervalSeconds: Float!
  }

  type Subscription {
    """
    Follows hosts as they are sampled: one event per host per sample. Pass a name to follow one host.
    Pass intervalSeconds to hear of each host about that often instead: it is raised to the sample
    interval and capped at an hour, and a host going online or unreachable is still sent at once.
    """
    hostChanged(name: String, intervalSeconds: Float): Host!
  }
`;
