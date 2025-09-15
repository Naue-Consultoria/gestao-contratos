import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap } from 'rxjs/operators';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const maxRetries = 3;
  const retryDelay = 1000;

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
            console.warn(`🔄 Tentativa ${index + 1}/${maxRetries} para ${req.url} falhou, tentando novamente em ${retryDelay * (index + 1)}ms...`);
            return timer(retryDelay * (index + 1));
          }

          // Se não vale a pena tentar novamente, propagar o erro
          return throwError(() => error);
        })
      )
    ),
    catchError((error: HttpErrorResponse) => {
      // Log do erro final para debug
      if (isResourceError(error)) {
        console.error('❌ Erro de recursos após todas as tentativas:', {
          url: req.url,
          status: error.status,
          message: error.message
        });
      }

      return throwError(() => error);
    })
  );
};