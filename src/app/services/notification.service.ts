import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { RateLimitService } from './rate-limit.service';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// ─── Tipos ───────────────────────────────────────────────────────────────

export type NotificationType =
  | 'success' | 'error' | 'warning' | 'info'
  | 'contract_assignment' | 'permission_change' | 'contract_expiring'
  | 'payment_overdue' | 'service_comment' | 'service_status_change'
  | 'new_contract' | 'new_user' | 'security_alert'
  | 'proposal_signed' | 'approval_required' | 'system_event';

export type NotificationPriority = 'low' | 'medium' | 'high';
export type DisplayCategory = 'success' | 'info' | 'warning' | 'alert';

export interface Notification {
  id: string;
  type: NotificationType;
  displayCategory: DisplayCategory;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  persistent: boolean;
  link?: string;
  icon?: string;
  duration?: number;
  priority?: NotificationPriority;
  metadata?: any;
  actorName?: string;
  archived?: boolean;
  entityType?: string;
  entityId?: string;
  groupKey?: string;
  action?: {
    label: string;
    callback: () => void;
  };
}

export interface ApiNotificationResponse {
  id: string;
  user_id: string;
  actor_id?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  priority?: string;
  entity_type?: string;
  entity_id?: string;
  group_key?: string;
  metadata?: any;
  is_read: boolean;
  archived: boolean;
  read_at?: string;
  created_at: string;
  actor?: { id: string; name: string } | null;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: ApiNotificationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationOptions {
  duration?: number;
  persistent?: boolean;
  icon?: string;
  action?: {
    label: string;
    callback: () => void;
  };
}

// Mapa de tipo -> categoria de exibição
const NOTIFICATION_DISPLAY_MAP: Record<string, DisplayCategory> = {
  contract_assignment: 'info',
  permission_change: 'info',
  contract_expiring: 'warning',
  payment_overdue: 'alert',
  service_comment: 'info',
  service_status_change: 'info',
  new_contract: 'info',
  new_user: 'info',
  security_alert: 'alert',
  proposal_signed: 'success',
  approval_required: 'warning',
  system_event: 'warning',
};

// ─── Service ─────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private readonly API_URL = `${environment.apiUrl}/notifications`;
  private readonly MAX_STORED_NOTIFICATIONS = 50;

  // Supabase Realtime
  private realtimeChannel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;

  // Observables
  private toastQueue = new BehaviorSubject<Notification[]>([]);
  public toastQueue$ = this.toastQueue.asObservable();

  private notificationHistory = new BehaviorSubject<Notification[]>([]);
  public notificationHistory$ = this.notificationHistory.asObservable();

  private unreadCount = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCount.asObservable();

  // Paginação
  private currentPage = 1;
  private readonly pageSize = 20;
  private totalPages = 1;
  private isLoading = false;
  private isInitialized = false;

  // Toast config
  private defaultDuration = 5000;
  private maxToasts = 3;

  constructor(
    private http: HttpClient,
    private rateLimitService: RateLimitService
  ) {
    this.loadNotificationsFromStorage();
  }

  ngOnDestroy(): void {
    this.disconnectRealtime();
  }

  // ─── Toast Methods (notificações locais/efêmeras) ──────────────────────

  success(message: string, title: string = 'Sucesso!', options?: NotificationOptions): void {
    this.show({ type: 'success', displayCategory: 'success', title, message, icon: 'fas fa-check-circle', ...options });
  }

  error(message: string, title: string = 'Erro!', options?: NotificationOptions): void {
    this.show({ type: 'error', displayCategory: 'alert', title, message, icon: 'fas fa-exclamation-circle', duration: 7000, ...options });
  }

  warning(message: string, title: string = 'Atenção!', options?: NotificationOptions): void {
    this.show({ type: 'warning', displayCategory: 'warning', title, message, icon: 'fas fa-exclamation-triangle', ...options });
  }

  info(message: string, title: string = 'Informação', options?: NotificationOptions): void {
    this.show({ type: 'info', displayCategory: 'info', title, message, icon: 'fas fa-info-circle', ...options });
  }

  private show(config: Partial<Notification>): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'info',
      displayCategory: 'info',
      title: '',
      message: '',
      timestamp: new Date(),
      isRead: false,
      persistent: false,
      duration: this.defaultDuration,
      ...config
    };
    if (!notification.persistent) {
      this.addToToastQueue(notification);
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => this.removeToast(notification.id), notification.duration);
      }
    }
  }

  private addToToastQueue(notification: Notification): void {
    const currentToasts = this.toastQueue.value;
    if (currentToasts.length >= this.maxToasts) currentToasts.shift();
    this.toastQueue.next([...currentToasts, notification]);
  }

  public removeToast(id: string): void {
    this.toastQueue.next(this.toastQueue.value.filter(n => n.id !== id));
  }

  // ─── API Methods ───────────────────────────────────────────────────────

  fetchUserNotifications(page: number = 1) {
    if (this.isLoading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    this.isLoading = true;

    const requestKey = `notifications-page-${page}`;
    this.rateLimitService.executeRequest(
      requestKey,
      () => this.http.get<NotificationListResponse>(`${this.API_URL}?page=${page}&limit=${this.pageSize}`),
      1500
    ).subscribe({
      next: (response) => {
        if (response.success && response.notifications) {
          const serverNotifications = response.notifications.map(n => this.mapApiNotification(n));

          if (page === 1) {
            this.notificationHistory.next(serverNotifications);
          } else {
            const current = this.notificationHistory.value;
            const existingIds = new Set(current.map(n => n.id));
            const newOnly = serverNotifications.filter(n => !existingIds.has(n.id));
            this.notificationHistory.next([...current, ...newOnly]);
          }

          this.currentPage = response.page;
          this.totalPages = response.totalPages;
          this.saveNotificationsToStorage();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Falha ao buscar notificacoes', err);
        this.isLoading = false;
      }
    });
  }

  fetchUnreadCount() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.rateLimitService.executeRequest(
      'notifications-unread-count',
      () => this.http.get<{ success: boolean; unreadCount: number }>(`${this.API_URL}/unread-count`),
      2000
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.unreadCount.next(response.unreadCount);
        }
      },
      error: (err) => console.error('Falha ao buscar contador de nao lidas', err)
    });
  }

  markAsRead(id: string): void {
    const history = this.notificationHistory.value.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.notificationHistory.next(history);
    this.saveNotificationsToStorage();

    const serverId = this.extractServerId(id);
    if (serverId) {
      this.http.patch(`${this.API_URL}/read`, { ids: [serverId] }).subscribe({
        next: () => this.fetchUnreadCount(),
        error: (err) => console.error('Erro ao marcar notificacao como lida:', err)
      });
    }
  }

  markAllAsRead(): void {
    const history = this.notificationHistory.value.map(n => ({ ...n, isRead: true }));
    this.notificationHistory.next(history);
    this.saveNotificationsToStorage();

    this.http.patch(`${this.API_URL}/read-all`, {}).subscribe({
      next: () => {
        this.unreadCount.next(0);
      },
      error: (err) => console.error('Erro ao marcar todas como lidas:', err)
    });
  }

  archiveNotifications(ids: string[]): void {
    const serverIds = ids.map(id => this.extractServerId(id)).filter(Boolean);
    if (serverIds.length === 0) return;

    // Remover do histórico local
    const history = this.notificationHistory.value.filter(n => !ids.includes(n.id));
    this.notificationHistory.next(history);
    this.saveNotificationsToStorage();

    this.http.patch(`${this.API_URL}/archive`, { ids: serverIds }).subscribe({
      next: () => this.fetchUnreadCount(),
      error: (err) => console.error('Erro ao arquivar notificacoes:', err)
    });
  }

  deleteNotifications(ids: string[]): void {
    const serverIds = ids.map(id => this.extractServerId(id)).filter(Boolean);
    if (serverIds.length === 0) return;

    // Remover do histórico local
    const history = this.notificationHistory.value.filter(n => !ids.includes(n.id));
    this.notificationHistory.next(history);
    this.saveNotificationsToStorage();

    this.http.post(`${this.API_URL}/delete`, { ids: serverIds }).subscribe({
      next: () => this.fetchUnreadCount(),
      error: (err) => console.error('Erro ao deletar notificacoes:', err)
    });
  }

  clearHistory(): void {
    this.notificationHistory.next([]);
    this.unreadCount.next(0);
    this.saveNotificationsToStorage();

    this.http.delete(`${this.API_URL}/delete-all`).subscribe({
      error: (err) => console.error('Erro ao deletar notificacoes do servidor:', err)
    });
  }

  deleteOldNotifications(daysOld: number = 30): void {
    this.http.delete(`${this.API_URL}/delete-old?days=${daysOld}`).subscribe({
      next: () => this.refreshNotifications(),
      error: (err) => console.error('Erro ao deletar notificacoes antigas:', err)
    });
  }

  // ─── Inicialização e Realtime ──────────────────────────────────────────

  initializeNotifications(userId: string): void {
    if (this.isInitialized && this.currentUserId === userId) return;

    this.currentUserId = userId;
    this.isInitialized = true;

    // Carregar notificações iniciais
    setTimeout(() => this.fetchUserNotifications(), 500);
    setTimeout(() => this.fetchUnreadCount(), 1000);

    // Conectar ao Supabase Realtime
    this.connectRealtime(userId);
  }

  private connectRealtime(userId: string): void {
    // Desconectar canal anterior se existir
    this.disconnectRealtime();

    try {
      this.realtimeChannel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            const raw = payload.new as any;
            const notification = this.mapRealtimePayload(raw);

            // Adicionar ao histórico (com dedup)
            const currentHistory = this.notificationHistory.value;
            const alreadyExists = currentHistory.some(n => n.id === notification.id);
            if (!alreadyExists) {
              this.notificationHistory.next(
                [notification, ...currentHistory].slice(0, this.MAX_STORED_NOTIFICATIONS)
              );
              this.saveNotificationsToStorage();

              // Incrementar contador de não lidas
              this.unreadCount.next(this.unreadCount.value + 1);

              // Mostrar toast para tipos importantes
              this.showToastForNotification(notification);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            const raw = payload.new as any;
            const updatedNotification = this.mapRealtimePayload(raw);

            // Atualizar no histórico (para aggregates que foram atualizados)
            const currentHistory = this.notificationHistory.value;
            const index = currentHistory.findIndex(n => n.id === updatedNotification.id);

            if (index >= 0) {
              const updated = [...currentHistory];
              updated[index] = updatedNotification;
              // Reordenar para o topo se foi atualizado
              updated.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
              this.notificationHistory.next(updated);
              this.saveNotificationsToStorage();
            } else {
              // É um aggregate que já existia mas não estava no histórico local
              this.notificationHistory.next(
                [updatedNotification, ...currentHistory].slice(0, this.MAX_STORED_NOTIFICATIONS)
              );
              this.saveNotificationsToStorage();
            }
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Conectado ao canal de notificações');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('[Realtime] Erro no canal de notificações');
          }
        });
    } catch (error) {
      console.error('[Realtime] Erro ao conectar:', error);
    }
  }

  private disconnectRealtime(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  resetNotificationState(): void {
    this.disconnectRealtime();
    this.isInitialized = false;
    this.isLoading = false;
    this.currentPage = 1;
    this.totalPages = 1;
    this.currentUserId = null;
    this.notificationHistory.next([]);
    this.unreadCount.next(0);
    this.toastQueue.next([]);
    localStorage.removeItem('notification_history');
  }

  // ─── Paginação ─────────────────────────────────────────────────────────

  hasMoreNotifications(): boolean {
    return this.currentPage < this.totalPages;
  }

  loadMoreNotifications(): void {
    if (this.hasMoreNotifications() && !this.isLoading) {
      this.fetchUserNotifications(this.currentPage + 1);
    }
  }

  refreshNotifications(): void {
    this.currentPage = 1;
    this.fetchUserNotifications(1);
    this.fetchUnreadCount();
  }

  // ─── Mapeamento ────────────────────────────────────────────────────────

  private mapApiNotification(raw: ApiNotificationResponse): Notification {
    return {
      id: `server-${raw.id}`,
      type: this.mapNotificationType(raw.type),
      displayCategory: NOTIFICATION_DISPLAY_MAP[raw.type] || 'info',
      title: raw.title,
      message: raw.message,
      timestamp: new Date(raw.created_at),
      isRead: raw.is_read,
      persistent: true,
      link: raw.link,
      icon: this.getNotificationIcon(raw.type),
      priority: (raw.priority as NotificationPriority) || 'medium',
      metadata: raw.metadata,
      actorName: raw.actor?.name || undefined,
      archived: raw.archived,
      entityType: raw.entity_type,
      entityId: raw.entity_id,
      groupKey: raw.group_key,
    };
  }

  private mapRealtimePayload(raw: any): Notification {
    return {
      id: `server-${raw.id}`,
      type: this.mapNotificationType(raw.type),
      displayCategory: NOTIFICATION_DISPLAY_MAP[raw.type] || 'info',
      title: raw.title,
      message: raw.message,
      timestamp: new Date(raw.created_at),
      isRead: raw.is_read || false,
      persistent: true,
      link: raw.link,
      icon: this.getNotificationIcon(raw.type),
      priority: (raw.priority as NotificationPriority) || 'medium',
      metadata: raw.metadata,
      archived: raw.archived || false,
      entityType: raw.entity_type,
      entityId: raw.entity_id,
      groupKey: raw.group_key,
    };
  }

  private mapNotificationType(serverType: string): NotificationType {
    const validTypes: NotificationType[] = [
      'contract_assignment', 'permission_change', 'contract_expiring',
      'payment_overdue', 'service_comment', 'service_status_change',
      'new_contract', 'new_user', 'security_alert',
      'proposal_signed', 'approval_required', 'system_event'
    ];
    return validTypes.includes(serverType as NotificationType)
      ? serverType as NotificationType
      : 'info';
  }

  private getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      contract_assignment: 'fas fa-file-contract',
      permission_change: 'fas fa-user-shield',
      contract_expiring: 'fas fa-calendar-times',
      payment_overdue: 'fas fa-exclamation-triangle',
      service_comment: 'fas fa-comment',
      service_status_change: 'fas fa-tasks',
      new_contract: 'fas fa-file-plus',
      new_user: 'fas fa-user-plus',
      security_alert: 'fas fa-shield-alt',
      proposal_signed: 'fas fa-file-signature',
      approval_required: 'fas fa-check-double',
      system_event: 'fas fa-cog',
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
    };
    return iconMap[type] || 'fas fa-bell';
  }

  private showToastForNotification(notification: Notification): void {
    const showToastTypes: NotificationType[] = [
      'contract_assignment',
      'payment_overdue',
      'contract_expiring',
      'security_alert',
      'proposal_signed',
      'approval_required',
    ];

    if (showToastTypes.includes(notification.type)) {
      this.show({
        ...notification,
        persistent: false,
        duration: notification.priority === 'high' ? 7000 : 5000,
      });
    }
  }

  // ─── Storage ───────────────────────────────────────────────────────────

  private saveNotificationsToStorage(): void {
    try {
      const toSave = this.notificationHistory.value.slice(0, this.MAX_STORED_NOTIFICATIONS);
      localStorage.setItem('notification_history', JSON.stringify(toSave));
    } catch (e) {
      console.error('Erro ao salvar notificacoes', e);
    }
  }

  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem('notification_history');
      if (stored) {
        const history = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        this.notificationHistory.next(history.slice(0, this.MAX_STORED_NOTIFICATIONS));
        this.unreadCount.next(history.filter((n: any) => !n.isRead).length);
      }
    } catch (e) {
      console.error('Erro ao carregar notificacoes', e);
      localStorage.removeItem('notification_history');
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractServerId(clientId: string): string | null {
    const match = clientId.match(/^server-(.+)$/);
    return match ? match[1] : null;
  }
}
