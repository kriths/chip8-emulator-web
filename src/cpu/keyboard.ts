const KEY_MAPPING: Record<string, Uint4> = {
  Digit1: 0x1,
  Digit2: 0x2,
  Digit3: 0x3,
  Digit4: 0xc,
  KeyQ: 0x4,
  KeyW: 0x5,
  KeyE: 0x6,
  KeyR: 0xD,
  KeyA: 0x7,
  KeyS: 0x8,
  KeyD: 0x9,
  KeyF: 0xe,
  KeyZ: 0xa,
  KeyX: 0x0,
  KeyC: 0xb,
  KeyV: 0xf,
};

type KeyCallback = (pressed: Uint4) => void;

export default class Keyboard {
  private readonly pressed: boolean[];

  private callback?: KeyCallback;

  constructor() {
    this.pressed = new Array(Object.values(KEY_MAPPING).length).fill(false);

    window.onkeydown = this.onKeyDown.bind(this);
    window.onkeyup = this.onKeyUp.bind(this);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!(e.code in KEY_MAPPING)) return;
    const key = KEY_MAPPING[e.code];
    this.pressed[key] = true;

    if (this.callback) {
      this.callback(key);
      this.callback = undefined;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (!(e.code in KEY_MAPPING)) return;
    const key = KEY_MAPPING[e.code];
    this.pressed[key] = false;
  }

  public isPressed(key: Uint4): boolean {
    return this.pressed[key];
  }

  public waitForKeypress(callback: KeyCallback) {
    this.callback = callback;
  }
}
