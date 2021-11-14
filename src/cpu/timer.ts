import { TIMER_INTERVAL } from '../constants';

export class Timer {
  private value: Uint8;

  private nextTick: number;

  constructor() {
    this.value = 0;
    this.tick = this.tick.bind(this);
  }

  public tick() {
    if (this.value > 0) {
      this.value -= 1;
      this.nextTick = window.setTimeout(this.tick, TIMER_INTERVAL);
    }
  }

  public pause() {
    window.clearTimeout(this.nextTick);
  }

  public get(): Uint8 {
    return this.value;
  }

  public set(newValue: Uint8) {
    this.value = newValue;
    this.tick();
  }
}
