/**
 * PR-XRay: Air-Gapped Client Telemetry & Hardware Profiler
 * Dynamically probes WebGPU, Logical Cores, V8 Heap Pressure, and Battery States
 * to calibrate safe in-memory execution boundaries.
 */

export interface GpuCapabilities {
  supported: boolean;
  adapterName?: string;
  vendor?: string;
  architecture?: string;
  maxBufferSizeMB: number;
  maxComputeWorkgroupSizeX: number;
  features: string[];
}

export interface MemoryProfile {
  deviceMemoryGB: number;
  heapLimitMB: number;
  heapAllocatedMB: number;
  heapUsedMB: number;
  heapPressurePct: number;
  isMemoryConstrained: boolean;
}

export interface BatteryState {
  supported: boolean;
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  isLowPowerMode: boolean;
}

export interface NetworkTelemetry {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  rttMs: number;
  downlinkMbps: number;
  saveData: boolean;
}

export interface SystemHardwareProfile {
  logicalCores: number;
  optimalWorkerCount: number;
  gpu: GpuCapabilities;
  memory: MemoryProfile;
  battery: BatteryState;
  network: NetworkTelemetry;
  recommendedEngine: 'WEBGPU_ACCELERATED' | 'WASM_THREADED' | 'WASM_SINGLE_FALLBACK';
  timestamp: number;
}

interface WebGPUAdapterMock {
  limits: {
    maxBufferSize: number;
    maxComputeWorkgroupSizeX?: number;
  };
  features: Set<string> | string[];
  requestAdapterInfo?: () => Promise<{ description?: string; vendor?: string; architecture?: string }>;
}

interface ExtendedNavigator extends Navigator {
  gpu?: {
    requestAdapter: (options?: { powerPreference?: string }) => Promise<WebGPUAdapterMock | null>;
  };
  deviceMemory?: number;
  connection?: {
    effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
    rtt?: number;
    downlink?: number;
    saveData?: boolean;
  };
  getBattery?: () => Promise<{
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    addEventListener: (type: string, listener: EventListener) => void;
  }>;
}

interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

export async function probeGpuCapabilities(): Promise<GpuCapabilities> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      maxBufferSizeMB: 0,
      maxComputeWorkgroupSizeX: 0,
      features: [],
    };
  }

  const extNav = navigator as ExtendedNavigator;
  if (!extNav.gpu) {
    return {
      supported: false,
      maxBufferSizeMB: 0,
      maxComputeWorkgroupSizeX: 0,
      features: [],
    };
  }

  try {
    const adapter = await extNav.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      return {
        supported: false,
        maxBufferSizeMB: 0,
        maxComputeWorkgroupSizeX: 0,
        features: [],
      };
    }

    const limits = adapter.limits;
    const maxBufferSizeMB = Math.floor(limits.maxBufferSize / (1024 * 1024));
    const maxComputeWorkgroupSizeX = limits.maxComputeWorkgroupSizeX || 256;
    const features: string[] = [];

    if (adapter.features && typeof adapter.features.forEach === 'function') {
      adapter.features.forEach((feat: string) => features.push(feat));
    }

    let adapterName = 'Standard WebGPU Adapter';
    let vendor = 'Generic';
    let architecture = 'Standard';

    if (typeof adapter.requestAdapterInfo === 'function') {
      try {
        const info = await adapter.requestAdapterInfo();
        adapterName = info.description || adapterName;
        vendor = info.vendor || vendor;
        architecture = info.architecture || architecture;
      } catch {
        // Fallback gracefully
      }
    }

    return {
      supported: true,
      adapterName,
      vendor,
      architecture,
      maxBufferSizeMB,
      maxComputeWorkgroupSizeX,
      features,
    };
  } catch {
    return {
      supported: false,
      maxBufferSizeMB: 0,
      maxComputeWorkgroupSizeX: 0,
      features: [],
    };
  }
}

export function probeMemoryProfile(): MemoryProfile {
  if (typeof window === 'undefined') {
    return {
      deviceMemoryGB: 4,
      heapLimitMB: 2048,
      heapAllocatedMB: 0,
      heapUsedMB: 0,
      heapPressurePct: 0,
      isMemoryConstrained: false,
    };
  }

  const extNav = navigator as ExtendedNavigator;
  const deviceMemoryGB = extNav.deviceMemory || 4;

  const perf = window.performance as unknown as { memory?: PerformanceMemory };
  if (perf && perf.memory) {
    const mem = perf.memory;
    const heapLimitMB = Math.floor(mem.jsHeapSizeLimit / (1024 * 1024));
    const heapAllocatedMB = Math.floor(mem.totalJSHeapSize / (1024 * 1024));
    const heapUsedMB = Math.floor(mem.usedJSHeapSize / (1024 * 1024));
    const heapPressurePct = heapLimitMB > 0 ? Number(((heapUsedMB / heapLimitMB) * 100).toFixed(1)) : 0;

    return {
      deviceMemoryGB,
      heapLimitMB,
      heapAllocatedMB,
      heapUsedMB,
      heapPressurePct,
      isMemoryConstrained: heapPressurePct > 75 || deviceMemoryGB <= 2,
    };
  }

  return {
    deviceMemoryGB,
    heapLimitMB: 2048,
    heapAllocatedMB: 0,
    heapUsedMB: 0,
    heapPressurePct: 0,
    isMemoryConstrained: deviceMemoryGB <= 2,
  };
}

export async function probeBatteryState(): Promise<BatteryState> {
  const fallback: BatteryState = {
    supported: false,
    level: 1.0,
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    isLowPowerMode: false,
  };

  if (typeof window === 'undefined') return fallback;

  const extNav = navigator as ExtendedNavigator;
  if (!extNav.getBattery) return fallback;

  try {
    const battery = await extNav.getBattery();
    const isLowPowerMode = !battery.charging && battery.level <= 0.20;

    return {
      supported: true,
      level: Number(battery.level.toFixed(2)),
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
      isLowPowerMode,
    };
  } catch {
    return fallback;
  }
}

export function probeNetworkTelemetry(): NetworkTelemetry {
  const fallback: NetworkTelemetry = {
    effectiveType: 'unknown',
    rttMs: 50,
    downlinkMbps: 10,
    saveData: false,
  };

  if (typeof window === 'undefined') return fallback;

  const extNav = navigator as ExtendedNavigator;
  if (!extNav.connection) return fallback;

  const conn = extNav.connection;
  return {
    effectiveType: conn.effectiveType || 'unknown',
    rttMs: conn.rtt || 50,
    downlinkMbps: conn.downlink || 10,
    saveData: Boolean(conn.saveData),
  };
}

export async function compileHardwareProfile(): Promise<SystemHardwareProfile> {
  const logicalCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;

  const [gpu, battery] = await Promise.all([
    probeGpuCapabilities(),
    probeBatteryState(),
  ]);

  const memory = probeMemoryProfile();
  const network = probeNetworkTelemetry();

  let optimalWorkerCount: number;

  if (logicalCores <= 2) {
    optimalWorkerCount = 1;
  } else if (battery.isLowPowerMode || memory.isMemoryConstrained) {
    optimalWorkerCount = Math.max(1, Math.floor(logicalCores * 0.5));
  } else {
    optimalWorkerCount = Math.max(1, Math.floor(logicalCores * 0.75));
  }

  let recommendedEngine: 'WEBGPU_ACCELERATED' | 'WASM_THREADED' | 'WASM_SINGLE_FALLBACK';

  if (gpu.supported && gpu.maxBufferSizeMB >= 256 && !battery.isLowPowerMode) {
    recommendedEngine = 'WEBGPU_ACCELERATED';
  } else if (optimalWorkerCount > 1 && !memory.isMemoryConstrained) {
    recommendedEngine = 'WASM_THREADED';
  } else {
    recommendedEngine = 'WASM_SINGLE_FALLBACK';
  }

  return {
    logicalCores,
    optimalWorkerCount,
    gpu,
    memory,
    battery,
    network,
    recommendedEngine,
    timestamp: Date.now(),
  };
}