// Polyfills necessários para bibliotecas Node.js no browser
import 'zone.js';
import { Buffer } from 'buffer';

// Configurar ambiente global para Node.js modules
(globalThis as any).global = globalThis;
(globalThis as any).Buffer = Buffer;

// Garantir que Buffer.isBuffer funciona corretamente
if (!Buffer.isBuffer || typeof Buffer.isBuffer !== 'function') {
  Buffer.isBuffer = function(obj: any): obj is Buffer {
    if (obj == null) return false;
    
    // Verificar se é uma instância de Buffer
    if (obj instanceof Buffer) return true;
    
    // Verificar se tem a estrutura de um Buffer
    if (obj && typeof obj === 'object' && 
        typeof obj.constructor === 'function' &&
        obj.constructor.name === 'Buffer') {
      return true;
    }
    
    // Verificar se é um Uint8Array (base do Buffer)
    if (obj instanceof Uint8Array && obj.constructor.name === 'Buffer') {
      return true;
    }
    
    return false;
  };
}

// Garantir que está disponível no window também
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

// Process polyfill também pode ser necessário
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = {
    env: {},
    nextTick: (fn: Function) => Promise.resolve().then(() => fn()),
    browser: true
  };
}