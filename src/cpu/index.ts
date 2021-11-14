import { CLOCK_INTERVAL, MEMORY_OFFSET, MEMORY_SIZE } from '../constants';

export default class CPU {
  private readonly memory: Uint8Array;

  private readonly registers: Uint8Array;

  private nextTick: number;

  constructor() {
    this.memory = new Uint8Array(MEMORY_SIZE);
    this.registers = new Uint8Array(0x10);

    this.tick = this.tick.bind(this);
  }

  private tick() {
    // TODO
    this.nextTick = window.setTimeout(this.tick, CLOCK_INTERVAL);
  }

  public loadExecutable(executable: Uint8Array) {
    this.pause();
    this.memory.fill(0); // Reset memory
    this.memory.set(executable, MEMORY_OFFSET);
  }

  public run() {
    this.tick();
  }

  public pause() {
    window.clearTimeout(this.nextTick);
  }
}
