import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap } from 'rxjs/operators';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const maxRetries = 3;

  // Calcular delay baseado no tipo de erro
  const getRetryDelay = (error: HttpErrorResponse, attemptIndex: number): number => {
    if (error.status === 429) {
      // Para 429, usar backoff mais agressivo: 2s, 5s, 10s
      return [2000, 5000, 10000][attemptIndex] || 10000;
    }
    // Para outros erros, usar backoff normal: 1s, 2s, 3s
    return 1000 * (attemptIndex + 1);
  };

  // Verificar se é um erro que vale a pena tentar novamente
  const shouldRetry = (error: HttpErrorResponse, attemptIndex: number): boolean => {
    return attemptIndex < maxRetries &&
           isResourceError(error) &&
           (error.status === 0 || error.status === 429 || error.status >= 500);
  };

  // Verificar se é um erro de recursos/conectividade
  const isResourceError = (error: HttpErrorResponse): boolean => {
    return error.status === 0 ||
           error.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
           error.message?.includes('ERR_NETWORK') ||
           error.status === 429 || // Too Many Requests
           error.status === 503 || // Service Unavailable
           error.status === 502 || // Bad Gateway
           error.status === 504;   // Gateway Timeout
  };

  return next(req).pipe(
    retryWhen(errors =>
      errors.pipe(
        mergeMap((error, index) => {
          if (shouldRetry(error, index)) {
            const delay = getRetryDelay(error, index);
            const statusText = error.status === 429 ? 'Rate Limited' : 'Network Error';
            console.warn(`🔄 ${statusText} - Tentativa ${index + 1}/${maxRetries} para ${req.url} falhou, tentando novamente em ${delay}ms...`);
            return timer(delay);
          }

          // Se não vale a pena tentar novamente, propagar o erro
          return throwError(() => error);
        })
      )
    ),
    catchError((error: HttpErrorResponse) => {
      // Log do erro final para debug
      if (isResourceError(error)) {
        const errorType = error.status === 429 ? 'Rate Limiting' : 'Recursos';
        console.error(`❌ Erro de ${errorType} após todas as tentativas:`, {
          url: req.url,
          status: error.status,
          message: error.message
        });
      }

      return throwError(() => error);
    })
  );
};