# CPU and GPU Worker Type Support - Implementation Plan

## Overview

This plan outlines the implementation of CPU and GPU worker type support in the vanity address generation system. The goal is to extend the existing WorkerPool architecture to support both CPU and GPU workers with optimized configurations for each type.

## Current Architecture Analysis

### Existing Systems
- **Legacy**: `crunch.ts` - Single worker with CPU/GPU support via `USE_CPU` environment variable
- **Current**: `node_manager.ts` - WorkerPool with GPU-only support, empty `worker.ts` placeholder

### Key Findings
- CPU support already exists in `crunch.ts` but not integrated into WorkerPool
- Different configurations needed for CPU vs GPU workers
- Empty `worker.ts` indicates planned worker abstraction

## Design Architecture

### 1. Worker Type System

```typescript
enum WorkerType {
  CPU = 'cpu',
  GPU = 'gpu'
}

interface WorkerConfig {
  type: WorkerType;
  kernelCount: number;
  groupCount: number;
  roundCount: number;
  capabilities: string[];
  imageTag: string;
  engine: string;
  cpuCount?: number; // For CPU workers only
}
```

### 2. Worker Class Hierarchy

```typescript
// Abstract base class
abstract class BaseWorker {
  protected config: WorkerConfig;
  abstract getConfig(): WorkerConfig;
  abstract generateCommand(params: GenerationParams): string;
  abstract validateCapabilities(exe: ExeUnit): Promise<number>; // Returns CPU count or GPU info
}

// Concrete implementations
class CPUWorker extends BaseWorker {
  // CPU-specific configuration and parallel processing logic
}

class GPUWorker extends BaseWorker {
  // GPU-specific configuration and CUDA logic
}
```

### 3. Updated WorkerPool Interface

```typescript
interface WorkerPoolParams {
  numberOfWorkers: number;
  rentalDurationSeconds: number;
  budgetGlm: number;
  workerType: WorkerType; // New parameter
}
```

## Implementation Plan

### Phase 1: Core Architecture (High Priority)

#### Task 1: Design worker type abstraction and interfaces
- Define `WorkerType` enum
- Create `WorkerConfig` interface  
- Design `BaseWorker` abstract class
- Update `WorkerPoolParams` interface

#### Task 2: Implement base Worker class with type support
- Create abstract `BaseWorker` class in `src/worker.ts`
- Define common methods: `getConfig()`, `generateCommand()`, `validateCapabilities()`
- Add worker identification and lifecycle management

#### Task 3: Create CPUWorker and GPUWorker implementations
- Implement `CPUWorker` class with CPU-specific configuration
- Implement `GPUWorker` class with GPU-specific configuration
- Port CPU logic from `crunch.ts` to `CPUWorker`

#### Task 4: Update WorkerPool to support worker types
- Modify `WorkerPool` constructor to accept worker type
- Update `getOrder()` method to use worker-specific configurations
- Modify worker acquisition logic for different types

### Phase 2: Integration (Medium Priority)

#### Task 5: Integrate CPU/GPU configuration logic from crunch.ts
- Move CPU detection logic (`nproc` command) to `CPUWorker`
- Migrate GPU validation logic (`nvidia-smi`) to `GPUWorker`
- Update command generation for both worker types

#### Task 6: Add worker type selection to CLI interface
- Add `--worker-type` CLI option to generate command
- Update CLI help documentation
- Add validation for worker type parameter

#### Task 7: Update command generation for worker types
- Implement CPU parallel command generation
- Implement GPU single-process command generation
- Handle different parameter sets (kernel/group/round counts)

### Phase 3: Testing and Documentation (Low Priority)

#### Task 8: Add tests for worker type functionality
- Unit tests for `CPUWorker` and `GPUWorker` classes
- Integration tests for `WorkerPool` with different worker types
- Command generation tests

## Key Configuration Differences

### GPU Workers
- **Image**: `nvidia/cuda-x-crunch:${version}`
- **Capabilities**: `["!exp:gpu"]`
- **Engine**: `vm-nvidia`
- **Parameters**: 
  - Kernel count: 64
  - Group count: 1000  
  - Round count: 1000
- **Command**: `profanity_cuda -k 64 -g 1000 -r 1000 -p {prefix} -b {budget} -z {pubkey}`
- **Validation**: `nvidia-smi` command

### CPU Workers
- **Image**: Same as GPU (contains both CPU and GPU binaries)
- **Capabilities**: Standard VM capabilities (no GPU requirement)
- **Engine**: `vm` (standard VM engine)
- **Parameters**:
  - Kernel count: 1
  - Group count: 1
  - Round count: 20000 (higher for CPU compensation)
- **Command**: `parallel profanity_cuda --cpu -k 1 -g 1 -r 20000 -b {budget} -z {pubkey} -p {} ::: {prefixes}`
- **Validation**: `nproc` command to detect CPU count
- **Parallelization**: Uses GNU `parallel` with multiple prefix instances

## Implementation Benefits

1. **Clean Separation**: Worker-specific logic contained in respective classes
2. **Extensibility**: Easy to add new worker types or mixed pools
3. **Performance**: Optimized configurations per worker type
4. **Maintainability**: Clear abstractions and interfaces
5. **Backward Compatibility**: Existing GPU functionality preserved
6. **Scalability**: Support for multiple workers of each type

## Migration Strategy

1. Implement new worker classes alongside existing code
2. Gradually migrate WorkerPool to use new worker abstraction
3. Preserve existing functionality during transition
4. Remove legacy code once new system is validated
5. Update CLI to default to GPU workers for backward compatibility

## Success Criteria

- [ ] CPU and GPU workers can be selected via CLI
- [ ] WorkerPool supports both worker types
- [ ] Performance matches or exceeds current implementation
- [ ] All existing functionality preserved
- [ ] Comprehensive test coverage
- [ ] Clear documentation and examples

## Files to Modify

- `src/worker.ts` - Implement worker class hierarchy
- `src/node_manager.ts` - Update WorkerPool for worker types
- `src/index.ts` - Add CLI worker type selection
- `src/crunch.ts` - Potentially deprecate after migration
- `package.json` - Add any new dependencies if needed
- Tests and documentation files

## Environment Variables

- `USE_CPU` - Maintain for backward compatibility, map to worker type selection
- `CRUNCHER_VERSION` - Continue using for image version selection

