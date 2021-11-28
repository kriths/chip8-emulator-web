import {
  CLOCK_INTERVAL, MEMORY_OFFSET, MEMORY_SIZE, PIXEL_SIZE,
} from '../constants';
import { get3N, hex } from '../util/number';
import { Timer } from './timer';
import { $ } from '../util/html';
import { PIXEL_SET, PIXEL_UNSET } from '../util/color';
import FONT_SPRITES from './sprite';
import Keyboard from './keyboard';

function enableControls(running: boolean) {
  if (running) {
    $('play').setAttribute('disabled', '');
    $('pause').removeAttribute('disabled');
  } else {
    $('play').removeAttribute('disabled');
    $('pause').setAttribute('disabled', '');
  }
}

export default class CPU {
  private readonly memory: Uint8Array;

  private readonly registers: Uint8Array;

  private readonly stack: Uint16Array;

  private readonly screen: HTMLCanvasElement;

  private readonly pixelData: Uint8Array;

  private readonly pixelsX: number;

  private readonly pixelsY: number;

  private readonly delayTimer: Timer;

  private readonly soundTimer: Timer;

  private readonly keyboard: Keyboard;

  /**
   * Generic register used to store memory addresses
   */
  private regI: Uint16;

  /**
   * Program counter / instruction poitner
   */
  private pc: Uint16;

  /**
   * Stack pointer
   */
  private sp: Uint8;

  private nextTick: number;

  constructor(canvas: HTMLCanvasElement) {
    this.screen = canvas;
    this.pixelsX = canvas.width / PIXEL_SIZE;
    this.pixelsY = canvas.height / PIXEL_SIZE;
    this.pixelData = new Uint8Array(this.pixelsX * this.pixelsY);

    this.memory = new Uint8Array(MEMORY_SIZE);
    this.registers = new Uint8Array(0x10);
    this.stack = new Uint16Array(0x10);
    this.delayTimer = new Timer();
    this.soundTimer = new Timer();
    this.keyboard = new Keyboard();
    this.reset();
    this.dumpMemory();

    this.tick = this.tick.bind(this);
  }

  private reset() {
    this.memory.fill(0);
    FONT_SPRITES.forEach((sprite, i) => {
      this.memory.set(sprite, i * 5);
    });

    this.registers.fill(0);
    this.stack.fill(0);
    this.pixelData.fill(0);
    this.pc = MEMORY_OFFSET;
    this.sp = 0;
    this.regI = 0;
    this.clearScreen();
  }

  private tick() {
    // Read next instruction to execute and increment PC
    const instr1: Uint8 = this.memory[this.pc];
    const instr2: Uint8 = this.memory[this.pc + 1];
    this.pc += 2;

    const instrClass: Uint4 = instr1 >> 4;
    switch (instrClass) {
      case 0x0: {
        switch (instr2) {
          case 0xe0: // 00E0 - CLS
            this.clearScreen();
            break;
          case 0xee: // 00EE - RET
            this.pc = this.stack[this.sp];
            this.sp -= 1;
            break;
          default:
            this.failOnInstruction(this.pc - 2, instr1, instr2);
            return;
        }
        break;
      }
      case 0x1: { // 1nnn - JP addr
        this.pc = get3N(instr1, instr2);
        break;
      }
      case 0x2: { // 2nnn - CALL addr
        this.sp += 1;
        this.stack[this.sp] = this.pc;
        this.pc = get3N(instr1, instr2);
        break;
      }
      case 0x3: { // 3xkk - SE Vx, byte
        const reg: Uint4 = instr1 & 0x0f;
        if (this.registers[reg] === instr2) {
          this.pc += 2;
        }
        break;
      }
      case 0x4: { // 4xkk - SNE Vx, byte
        const reg: Uint4 = instr1 & 0x0f;
        if (this.registers[reg] !== instr2) {
          this.pc += 2;
        }
        break;
      }
      case 0x5: { // 5xy0 - SE Vx, Vy
        const reg: Uint4 = instr1 & 0x0f;
        const reg2: Uint4 = instr2 >> 4;
        if (this.registers[reg] === this.registers[reg2]) {
          this.pc += 2;
        }
        break;
      }
      case 0x6: { // 6xkk - LD Vx, byte
        const reg: Uint4 = instr1 & 0x0f;
        this.registers[reg] = instr2;
        break;
      }
      case 0x7: { // 7xkk - ADD Vx, byte
        const reg: Uint4 = instr1 & 0x0f;
        this.registers[reg] += instr2 & 0xff;
        break;
      }
      case 0x8: { // Different arithmetic operations, mapped by last nibble
        const operation: Uint4 = instr2 & 0x0f;
        const x: Uint4 = instr1 & 0x0f;
        const y: Uint4 = instr2 >> 4;
        switch (operation) {
          case 0x0: // 8xy0 - LD Vx, Vy
            this.registers[x] = this.registers[y];
            break;
          case 0x1: // 8xy1 - OR Vx, Vy
            this.registers[x] |= this.registers[y];
            break;
          case 0x2: // 8xy2 - AND Vx, Vy
            this.registers[x] &= this.registers[y];
            break;
          case 0x3: // 8xy3 - XOR Vx, Vy
            this.registers[x] ^= this.registers[y];
            break;
          case 0x4: { // 8xy4 - ADD Vx, Vy
            const result = this.registers[x] + this.registers[y];
            this.registers[x] = result & 0xff;
            this.registers[0xf] = result > 0xff ? 1 : 0;
            break;
          }
          case 0x5: { // 8xy5 - SUB Vx, Vy
            const result = this.registers[x] - this.registers[y];
            this.registers[x] = result & 0xff;
            this.registers[0xf] = result > 0 ? 1 : 0;
            break;
          }
          case 0x6: // 8xy6 - SHR Vx {, Vy}
            this.registers[0xf] = this.registers[x] & 1;
            this.registers[x] >>= 1;
            break;
          case 0x7: { // 8xy7 - SUBN Vx, Vy
            const result = this.registers[y] - this.registers[x];
            this.registers[x] = result & 0xff;
            this.registers[0xf] = result > 0 ? 1 : 0;
            break;
          }
          case 0xe: // 8xyE - SHL Vx {, Vy}
            this.registers[0xf] = (this.registers[x] >> 7) & 1;
            this.registers[x] <<= 1;
            break;
          default:
            this.failOnInstruction(this.pc - 2, instr1, instr2);
            return;
        }
        break;
      }
      case 0x9: { // 9xy0 - SNE Vx, Vy
        const reg: Uint4 = instr1 & 0x0f;
        const reg2: Uint4 = instr2 >> 4;
        if (this.registers[reg] !== this.registers[reg2]) {
          this.pc += 2;
        }
        break;
      }
      case 0xa: { // Annn - LD I, addr
        this.regI = ((instr1 & 0x0f) << 8) | instr2;
        break;
      }
      case 0xb: { // Bnnn - JP V0, addr
        this.pc = get3N(instr1, instr1) + this.registers[0];
        break;
      }
      case 0xc: { // Cxkk - RND Vx, byte
        const reg: Uint4 = instr1 & 0x0f;
        this.registers[reg] = Math.floor(Math.random() * 0x100);
        break;
      }
      case 0xd: { // Dxyn - DRW Vx, Vy, nibble
        const x: Uint4 = instr1 & 0xf;
        const y: Uint4 = instr2 >> 4;
        const size: Uint4 = instr2 & 0xf;
        const sprite = this.memory.slice(this.regI, this.regI + size);
        const unset = this.drawSprite(this.registers[x], this.registers[y], sprite);
        this.registers[0xf] = unset ? 1 : 0;
        break;
      }
      case 0xe: { // Keyboard listeners
        const x: Uint4 = instr1 & 0xf;
        const vx: Uint8 = this.registers[x];
        switch (instr2) {
          case 0x9e: // Ex9E - SKP Vx
            if (this.keyboard.isPressed(vx)) {
              this.pc += 2;
            }
            break;
          case 0xa1: // ExA1 - SKNP Vx
            if (!this.keyboard.isPressed(vx)) {
              this.pc += 2;
            }
            break;
          default:
            this.failOnInstruction(this.pc - 2, instr1, instr2);
            return;
        }
        break;
      }
      case 0xf: { // Various instructions
        const x: Uint4 = instr1 & 0xf;
        switch (instr2) {
          case 0x07: // Fx07 - LD Vx, DT
            this.registers[x] = this.delayTimer.get();
            break;
          case 0x0a: // Fx0A - LD Vx, K
            this.keyboard.waitForKeypress((key) => {
              this.registers[x] = key;
              this.tick();
            });
            return;
          case 0x15: // Fx15 - LD DT, Vx
            this.delayTimer.set(this.registers[x]);
            break;
          case 0x18: // Fx18 - LD ST, Vx
            this.soundTimer.set(this.registers[x]);
            break;
          case 0x1e: // Fx1E - ADD I, Vx
            this.regI += this.registers[x];
            break;
          case 0x29: // LD F, Vx
            this.regI = this.registers[x] * 5;
            break;
          case 0x33: { // LD B, Vx
            const reg = this.registers[x];
            this.memory[this.regI] = reg / 100;
            this.memory[this.regI] = (reg / 10) % 10;
            this.memory[this.regI] = reg % 10;
            break;
          }
          case 0x55: // Fx55 - LD [I], Vx
            this.memory.set(this.registers.slice(0, x + 1), this.regI);
            break;
          case 0x65: // Fx65 - LD Vx, [I]
            this.registers.set(this.memory.slice(this.regI, this.regI + x + 1));
            break;
          default:
            this.failOnInstruction(this.pc - 2, instr1, instr2);
            return;
        }
        break;
      }
      default:
        this.failOnInstruction(this.pc - 2, instr1, instr2);
        return;
    }

    this.nextTick = window.setTimeout(this.tick, CLOCK_INTERVAL);
  }

  private clearScreen() {
    const context = this.screen.getContext('2d');
    context.clearRect(0, 0, this.screen.width, this.screen.height);
  }

  private drawSprite(x: number, y: number, sprite: Uint8Array): boolean {
    const context = this.screen.getContext('2d');
    let unset = 0;
    sprite.forEach((spritePx, spriteY) => {
      if (spritePx === 0) return; // Nothing to do

      const screenY = (y + spriteY) % this.pixelsY;
      for (let xi = 0; xi < 7; xi += 1) { // Iterate over pixels in sprite line
        const screenX = (x + xi) % this.pixelsX;
        const index = (screenY * this.pixelsX) + screenX;
        const newPx = (spritePx >> (7 - xi)) & 1; // Read new pixel value from sprite line
        unset |= this.pixelData[index] & newPx; // Track if pixel is being unset
        this.pixelData[index] ^= newPx;

        context.fillStyle = this.pixelData[index] ? PIXEL_SET : PIXEL_UNSET;
        context.fillRect(
          screenX * PIXEL_SIZE,
          screenY * PIXEL_SIZE,
          PIXEL_SIZE,
          PIXEL_SIZE,
        );
      }
    });

    return unset !== 0;
  }

  private failOnInstruction(pc: Uint16, instr1: Uint8, instr2: Uint8) {
    const registerContent = Array.from(this.registers).map((r) => hex(r)).join(' ');
    // eslint-disable-next-line no-console
    console.error(`Instruction not implemented 0x${hex(pc, 4)}: ${hex(instr1)}${hex(instr2)}
I: ${hex(this.regI, 4)}, SP: ${hex(this.sp)}, REGS: ${registerContent}`);
    this.pause();
  }

  private dumpMemory() {
    $('debug-pc').innerText = hex(this.pc, 4);
    $('debug-sp').innerText = hex(this.sp);
    $('debug-dt').innerText = hex(this.delayTimer.get());
    $('debug-st').innerText = hex(this.soundTimer.get());
    this.registers.forEach((val, i) => {
      $(`debug-reg-${i}`).innerText = hex(val);
    });
  }

  public loadExecutable(executable: Uint8Array) {
    this.pause();
    this.reset();
    this.memory.set(executable, MEMORY_OFFSET);
    this.dumpMemory();
    enableControls(false);
  }

  public run() {
    this.tick();
    this.delayTimer.tick();
    this.soundTimer.tick();
    enableControls(true);
  }

  public pause() {
    window.clearTimeout(this.nextTick);
    this.delayTimer.pause();
    this.soundTimer.pause();
    this.dumpMemory();
    enableControls(false);
  }
}
