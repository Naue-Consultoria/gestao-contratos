import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { RateLimitService } from './rate-limit.service';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'contract_assignment' | 'permission_change' | 'contract_expiring' | 'payment_overdue' | 'service_comment' | 'service_status_change' | 'new_contract' | 'new_user' | 'security_alert' | 'approval_required' | 'system_event';
  title: string;
  message: string;
  timestamp: Date;
  isRead?: boolean;
  persistent?: boolean;
  link?: string;
  icon?: string;
  duration?: number;
  priority?: 'normal' | 'high';
  metadata?: any;
  action?: {
    label: string;
    callback: () => void;
  };
}

export interface ApiNotificationResponse {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  priority?: string;
  metadata?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
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

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = `${environment.apiUrl}/notifications`;
  private readonly POLLING_INTERVAL = 60000; // 60 segundos
  private readonly MAX_STORED_NOTIFICATIONS = 50;

  private toastQueue = new BehaviorSubject<Notification[]>([]);
  public toastQueue$ = this.toastQueue.asObservable();

  private notificationHistory = new BehaviorSubject<Notification[]>([]);
  public notificationHistory$ = this.notificationHistory.asObservable();

  private unreadCount = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCount.asObservable();

  private currentPage = 1;
  private readonly pageSize = 20;
  private totalPages = 1;
  private isLoading = false;
  private isInitialized = false;
  private pollingInterval: any = null;

  private defaultDuration = 5000;
  private maxToasts = 3;

  constructor(
    private http: HttpClient,
    private rateLimitService: RateLimitService
  ) {
    this.loadNotificationsFromStorage();
  }

  success(message: string, title: string = 'Sucesso!', options?: NotificationOptions): void { this.show({ type: 'success', title, message, icon: 'fas fa-check-circle', ...options }); }
  error(message: string, title: string = 'Erro!', options?: NotificationOptions): void { this.show({ type: 'error', title, message, icon: 'fas fa-exclamation-circle', duration: 7000, ...options }); }
  warning(message: string, title: string = 'Atenção!', options?: NotificationOptions): void { this.show({ type: 'warning', title, message, icon: 'fas fa-exclamation-triangle', ...options }); }
  info(message: string, title: string = 'Informação', options?: NotificationOptions): void { this.show({ type: 'info', title, message, icon: 'fas fa-info-circle', ...options }); }

  private show(config: Partial<Notification>): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'info',
      title: '',
      message: '',
      timestamp: new Date(),
      isRead: false,
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
          const serverNotifications = response.notifications.map(this.mapApiNotificationToClient);

          if (page === 1) {
            this.notificationHistory.next(serverNotifications);
          } else {
            const current = this.notificationHistory.value;
            this.notificationHistory.next([...current, ...serverNotifications]);
          }

          this.currentPage = response.page;
          this.totalPages = response.totalPages;
          this.saveNotificationsToStorage();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Falha ao buscar notificacoes", err);
        this.isLoading = false;
      }
    });
  }

  fetchUnreadCount() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.rateLimitService.executeRequest(
      'notifications-unread-count',
      () => this.http.get<{ success: boolean, unreadCount: number }>(`${this.API_URL}/unread-count`),
      2000
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.unreadCount.next(response.unreadCount);
        }
      },
      error: (err) => console.error("Falha ao buscar contador de nao lidas", err)
    });
  }

  markAsRead(id: string): void {
    const history = this.notificationHistory.value.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();

    const numericId = this.extractServerId(id);
    if (numericId) {
      this.http.patch(`${this.API_URL}/${numericId}/read`, {}).subscribe({
        next: () => this.fetchUnreadCount(),
        error: (err) => console.error('Erro ao marcar notificacao como lida:', err)
      });
    }
  }

  markAllAsRead(): void {
    const history = this.notificationHistory.value.map(n => ({ ...n, isRead: true }));
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();

    this.http.patch(`${this.API_URL}/read-all`, {}).subscribe({
      next: () => this.fetchUnreadCount(),
      error: (err) => console.error('Erro ao marcar todas como lidas:', err)
    });
  }

  clearHistory(): void {
    this.notificationHistory.next([]);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();

    this.http.delete(`${this.API_URL}/delete-all`).subscribe({
      next: () => this.fetchUnreadCount(),
      error: (err) => console.error('Erro ao deletar notificacoes do servidor:', err)
    });
  }

  deleteOldNotifications(daysOld: number = 30): void {
    this.http.delete(`${this.API_URL}/delete-old?days=${daysOld}`).subscribe({
      next: () => this.refreshNotifications(),
      error: (err) => console.error('Erro ao deletar notificacoes antigas:', err)
    });
  }

  resetNotificationState(): void {
    this.stopPolling();
    this.isInitialized = false;
    this.isLoading = false;
    this.currentPage = 1;
    this.totalPages = 1;
    this.notificationHistory.next([]);
    this.unreadCount.next(0);
    this.toastQueue.next([]);
  }

  private updateUnreadCount(): void {
    this.unreadCount.next(this.notificationHistory.value.filter(n => !n.isRead).length);
  }

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
        const history = JSON.parse(stored).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
        this.notificationHistory.next(history.slice(0, this.MAX_STORED_NOTIFICATIONS));
        this.updateUnreadCount();
      }
    } catch (e) {
      console.error('Erro ao carregar notificacoes', e);
      localStorage.removeItem('notification_history');
    }
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapApiNotificationToClient = (apiNotification: ApiNotificationResponse): Notification => {
    return {
      id: `server-${apiNotification.id}`,
      type: this.mapNotificationType(apiNotification.type),
      title: apiNotification.title,
      message: apiNotification.message,
      timestamp: new Date(apiNotification.created_at),
      isRead: apiNotification.is_read,
      persistent: true,
      link: apiNotification.link,
      icon: this.getNotificationIcon(apiNotification.type),
      priority: apiNotification.priority as 'normal' | 'high' || 'normal',
      metadata: apiNotification.metadata
    };
  }

  private mapNotificationType(serverType: string): Notification['type'] {
    const typeMap: Record<string, Notification['type']> = {
      'contract_assignment': 'contract_assignment',
      'permission_change': 'permission_change',
      'contract_expiring': 'contract_expiring',
      'payment_overdue': 'payment_overdue',
      'service_comment': 'service_comment',
      'service_status_change': 'service_status_change',
      'new_contract': 'new_contract',
      'new_user': 'new_user',
      'security_alert': 'security_alert',
      'approval_required': 'approval_required',
      'system_event': 'system_event'
    };
    return typeMap[serverType] || 'info';
  }

  private getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'contract_assignment': 'fas fa-file-contract',
      'permission_change': 'fas fa-user-shield',
      'contract_expiring': 'fas fa-calendar-times',
      'payment_overdue': 'fas fa-exclamation-triangle',
      'service_comment': 'fas fa-comment',
      'service_status_change': 'fas fa-tasks',
      'new_contract': 'fas fa-file-plus',
      'new_user': 'fas fa-user-plus',
      'security_alert': 'fas fa-shield-alt',
      'approval_required': 'fas fa-check-double',
      'system_event': 'fas fa-cog',
      'success': 'fas fa-check-circle',
      'error': 'fas fa-exclamation-circle',
      'warning': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle'
    };
    return iconMap[type] || 'fas fa-bell';
  }

  private extractServerId(clientId: string): number | null {
    const match = clientId.match(/^server-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

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

  initializeNotifications(): void {
    if (this.isInitialized) return;

    this.isInitialized = true;

    setTimeout(() => {
      this.fetchUserNotifications();
    }, 1000);

    setTimeout(() => {
      this.fetchUnreadCount();
    }, 2000);

    this.startPolling();
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.fetchUnreadCount();
    }, this.POLLING_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
