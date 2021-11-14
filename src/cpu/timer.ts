import { TIMER_INTERVAL } from '../constants';

export class Timer {
  private value: Uint8;

  private nextTick: number;

  constructor() {
    this.tick = this.tick.bind(this);
  }

  private tick() {
    if (this.value > 0) {
      this.value -= 1;
      this.nextTick = window.setTimeout(this.tick, TIMER_INTERVAL);
    }
  }

  public get(): Uint8 {
    return this.value;
  }

  public set(newValue: Uint8) {
    this.value = newValue;
    this.tick();
  }
}
