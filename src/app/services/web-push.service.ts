import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Web Push notifications.
 *
 * Fluxo:
 *   1. Após login, chamar `enableForCurrentUser()`
 *   2. Verifica suporte do navegador
 *   3. Registra service worker (/sw-push.js)
 *   4. Pede permissão ao usuário (1x)
 *   5. Cria subscription com a VAPID public key do backend
 *   6. Envia subscription para POST /api/push/subscribe
 *
 * Service worker fica em /public/sw-push.js — copiado pro dist na build.
 *
 * Push é disparado apenas para notificações de prioridade alta —
 * regra está no backend (notificationService.send).
 */
@Injectable({ providedIn: 'root' })
export class WebPushService {
  private readonly SW_PATH = '/sw-push.js';
  private subscribing = false;

  constructor(private http: HttpClient) {}

  /** Indica se o navegador suporta Web Push. */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /** Estado atual da permissão. */
  permission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Habilita push para o usuário logado. Idempotente.
   * Pede permissão se ainda não foi solicitada. Se negada, retorna false.
   */
  async enableForCurrentUser(): Promise<boolean> {
    if (!this.isSupported() || this.subscribing) return false;
    this.subscribing = true;

    try {
      // 1. Permissão
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await Notification.requestPermission();
      }
      if (perm !== 'granted') return false;

      // 2. Registra service worker
      const registration = await navigator.serviceWorker.register(this.SW_PATH, { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Public key do backend
      const keyRes = await firstValueFrom(
        this.http.get<{ success: boolean; publicKey: string }>(`${environment.apiUrl}/push/public-key`)
      );
      if (!keyRes?.publicKey) return false;

      // 4. Cria/recupera subscription (idempotente — browser cacheia)
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(keyRes.publicKey)
        });
      }

      // 5. Envia ao backend
      const json = sub.toJSON();
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/push/subscribe`, {
          endpoint: json.endpoint,
          keys: json.keys
        })
      );

      return true;
    } catch (err: any) {
      console.warn('[WebPush] Falha ao habilitar:', err?.message || err);
      return false;
    } finally {
      this.subscribing = false;
    }
  }

  /** Cancela subscription atual (no logout, por ex). */
  async disable(): Promise<void> {
    try {
      if (!this.isSupported()) return;
      const reg = await navigator.serviceWorker.getRegistration(this.SW_PATH);
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;

      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch {}

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/push/unsubscribe`, { endpoint })
      ).catch(() => {});
    } catch (err: any) {
      console.warn('[WebPush] Falha ao desabilitar:', err?.message || err);
    }
  }

  /** Converte base64 URL-safe (VAPID) em Uint8Array que o PushManager aceita. */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const out = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
    return out;
  }
}
