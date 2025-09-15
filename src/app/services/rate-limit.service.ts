import { Injectable } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';
import { debounceTime, switchMap, share } from 'rxjs/operators';

interface RequestQueue {
  [key: string]: Subject<any>;
}

@Injectable({
  providedIn: 'root'
})
export class RateLimitService {
  private requestQueue: RequestQueue = {};
  private lastRequestTime: { [key: string]: number } = {};
  private readonly minInterval = 500; // Mínimo 500ms entre requests para o mesmo endpoint

  constructor() {}

  /**
   * Executar request com debounce e rate limiting
   */
  executeRequest<T>(key: string, requestFn: () => Observable<T>, debounceMs: number = 300): Observable<T> {
    // Verificar se já existe uma queue para este endpoint
    if (!this.requestQueue[key]) {
      this.requestQueue[key] = new Subject<() => Observable<T>>();

      // Configurar pipeline com debounce
      this.requestQueue[key].pipe(
        debounceTime(debounceMs),
        switchMap((fn: () => Observable<T>) => {
          // Verificar rate limiting
          const now = Date.now();
          const lastRequest = this.lastRequestTime[key] || 0;
          const timeSinceLastRequest = now - lastRequest;

          if (timeSinceLastRequest < this.minInterval) {
            // Aguardar tempo mínimo antes de executar
            const waitTime = this.minInterval - timeSinceLastRequest;
            console.log(`⏱️ Rate limiting: aguardando ${waitTime}ms para ${key}`);
            return timer(waitTime).pipe(
              switchMap(() => {
                this.lastRequestTime[key] = Date.now();
                return fn();
              })
            );
          } else {
            // Executar imediatamente
            this.lastRequestTime[key] = now;
            return fn();
          }
        }),
        share() // Compartilhar resultado entre múltiplas subscrições
      ).subscribe();
    }

    // Adicionar request à queue
    this.requestQueue[key].next(requestFn);

    // Retornar observable que será resolvido quando o request for executado
    return new Observable<T>(subscriber => {
      const subscription = this.requestQueue[key].pipe(
        debounceTime(debounceMs),
        switchMap((fn: () => Observable<T>) => {
          const now = Date.now();
          const lastRequest = this.lastRequestTime[key] || 0;
          const timeSinceLastRequest = now - lastRequest;

          if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest;
            return timer(waitTime).pipe(
              switchMap(() => {
                this.lastRequestTime[key] = Date.now();
                return fn();
              })
            );
          } else {
            this.lastRequestTime[key] = now;
            return fn();
          }
        })
      ).subscribe({
        next: (result) => subscriber.next(result),
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete()
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Limpar queue para um endpoint específico
   */
  clearQueue(key: string): void {
    if (this.requestQueue[key]) {
      this.requestQueue[key].complete();
      delete this.requestQueue[key];
      delete this.lastRequestTime[key];
    }
  }

  /**
   * Limpar todas as queues
   */
  clearAllQueues(): void {
    Object.keys(this.requestQueue).forEach(key => {
      this.requestQueue[key].complete();
    });
    this.requestQueue = {};
    this.lastRequestTime = {};
  }

  /**
   * Verificar se pode fazer request para um endpoint
   */
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTime[key] || 0;
    return (now - lastRequest) >= this.minInterval;
  }

  /**
   * Obter tempo restante até poder fazer próximo request
   */
  getTimeUntilNextRequest(key: string): number {
    const now = Date.now();
    const lastRequest = this.lastRequestTime[key] || 0;
    const timeSinceLastRequest = now - lastRequest;
    return Math.max(0, this.minInterval - timeSinceLastRequest);
  }
}