// Polyfills necessários para bibliotecas Node.js no browser
import 'zone.js';
import { Buffer } from 'buffer';

// Configurar ambiente global para Node.js modules
(globalThis as any).global = globalThis;
(globalThis as any).Buffer = Buffer;

// Process polyfill também pode ser necessário
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = {
    env: {},
    nextTick: (fn: Function) => Promise.resolve().then(() => fn()),
    browser: true
  };
}