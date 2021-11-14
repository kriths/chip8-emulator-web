export function hex(num: number, nibbles: number = 2): string {
  return num.toString(16).padStart(nibbles, '0');
}

/**
 * Parse three nibbles from two consecutive bytes.
 * This functions is mostly used to parse an address from two
 * instruction bytes.
 */
export function get3N(num1: Uint8, num2: Uint8): Uint16 {
  return ((num1 & 0xf) << 8) | num2;
}
