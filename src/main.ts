import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

// Polyfill para Buffer em produção
import { Buffer } from 'buffer';

// Garantir que Buffer.isBuffer está disponível globalmente
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  
  // Adicionar isBuffer se não existir
  if (!Buffer.isBuffer) {
    Buffer.isBuffer = function(obj: any): obj is Buffer {
      return obj != null && obj.constructor != null &&
        typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj);
    };
  }
}

// Garantir compatibilidade global
if (typeof global !== 'undefined') {
  (global as any).Buffer = Buffer;
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err)), {
  providers: [
    provideRouter(routes),
    // outros providers...
  ]
};
