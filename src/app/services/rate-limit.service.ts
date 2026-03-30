import { Injectable } from '@angular/core';
import { Observable, of, timer, throwError } from 'rxjs';
import { switchMap, catchError, finalize } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RateLimitService {
  private lastRequestTime: { [key: string]: number } = {};
  private activeRequests: Set<string> = new Set();
  private readonly minInterval = 1000;
  private readonly maxConcurrentRequests = 3;
  private pendingRequests: Map<string, Observable<any>> = new Map();

  constructor() {
    setInterval(() => this.cleanupOldEntries(), 60000);
  }

  /**
   * Executar request com rate limiting e dedup.
   * Se já existe um request ativo para a mesma key, retorna o mesmo Observable (dedup).
   * Respeita intervalo mínimo entre requests e limite de concorrência.
   */
  executeRequest<T>(key: string, requestFn: () => Observable<T>, _debounceMs: number = 500): Observable<T> {
    // Dedup: se já existe um request ativo para esta key, ignorar
    if (this.activeRequests.has(key)) {
      const pending = this.pendingRequests.get(key);
      if (pending) {
        return pending as Observable<T>;
      }
      return of() as unknown as Observable<T>;
    }

    // Se muitos requests ativos, aguardar e tentar de novo
    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      return timer(this.minInterval).pipe(
        switchMap(() => this.executeRequest(key, requestFn, _debounceMs))
      );
    }

    // Calcular delay necessário para respeitar rate limiting
    const now = Date.now();
    const lastRequest = this.lastRequestTime[key] || 0;
    const timeSinceLastRequest = now - lastRequest;
    const delay = timeSinceLastRequest < this.minInterval
      ? this.minInterval - timeSinceLastRequest
      : 0;

    const request$ = new Observable<T>(subscriber => {
      const delayFn = delay > 0 ? timer(delay) : of(0);

      const sub = delayFn.pipe(
        switchMap(() => {
          this.activeRequests.add(key);
          this.lastRequestTime[key] = Date.now();
          return requestFn();
        }),
        finalize(() => {
          this.activeRequests.delete(key);
          this.pendingRequests.delete(key);
        })
      ).subscribe({
        next: (result) => subscriber.next(result),
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete()
      });

      return () => sub.unsubscribe();
    });

    this.pendingRequests.set(key, request$);
    return request$;
  }

  clearQueue(key: string): void {
    delete this.lastRequestTime[key];
    this.activeRequests.delete(key);
    this.pendingRequests.delete(key);
  }

  clearAllQueues(): void {
    this.lastRequestTime = {};
    this.activeRequests.clear();
    this.pendingRequests.clear();
  }

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTime[key] || 0;
    return (now - lastRequest) >= this.minInterval;
  }

  getTimeUntilNextRequest(key: string): number {
    const now = Date.now();
    const lastRequest = this.lastRequestTime[key] || 0;
    return Math.max(0, this.minInterval - (now - lastRequest));
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000;

    Object.keys(this.lastRequestTime).forEach(key => {
      if (now - this.lastRequestTime[key] > maxAge) {
        delete this.lastRequestTime[key];
      }
    });
  }

  getStatus(): {
    activeRequests: number;
    pendingKeys: string[];
    lastRequestTimes: { [key: string]: number };
  } {
    return {
      activeRequests: this.activeRequests.size,
      pendingKeys: Array.from(this.pendingRequests.keys()),
      lastRequestTimes: { ...this.lastRequestTime }
    };
  }
}
