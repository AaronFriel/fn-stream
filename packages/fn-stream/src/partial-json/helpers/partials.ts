/* eslint-disable @typescript-eslint/ban-types */
import { parseStateSymbol } from '../../types';

export function partial<T extends object>(value: T): T {
  value[parseStateSymbol] = 'partial';
  return value;
}

export function complete<T extends object>(value: T): T {
  value[parseStateSymbol] = 'complete';
  return value;
}
