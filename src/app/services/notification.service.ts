import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from './websocket.service';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead?: boolean;
  persistent?: boolean;
  link?: string;
  icon?: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
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

  private toastQueue = new BehaviorSubject<Notification[]>([]);
  public toastQueue$ = this.toastQueue.asObservable();

  private notificationHistory = new BehaviorSubject<Notification[]>([]);
  public notificationHistory$ = this.notificationHistory.asObservable();

  private unreadCount = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCount.asObservable();

  private defaultDuration = 5000;
  private maxToasts = 3;

  constructor(
    private http: HttpClient,
    private websocketService: WebsocketService
  ) {
    this.loadNotificationsFromStorage();
    this.fetchUserNotifications();
    this.listenForRealTimeNotifications();
  }

  private listenForRealTimeNotifications(): void {
    this.websocketService.listenForNewNotifications().subscribe(notificationFromServer => {
      const newNotification: Notification = {
        ...notificationFromServer,
        id: this.generateId(),
        timestamp: new Date(notificationFromServer.timestamp),
        isRead: false,
        persistent: true,
        type: 'info',
        icon: 'fas fa-bell'
      };
      this.addToHistory(newNotification);
      this.show(newNotification);
    });
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

  private addToHistory(notification: Notification): void {
    const history = [notification, ...this.notificationHistory.value];
    this.notificationHistory.next(history.slice(0, 100));
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  fetchUserNotifications() {
    this.http.get<{ success: boolean, notifications: Notification[] }>(this.API_URL).subscribe({
      next: (response) => {
        if (response.success && response.notifications) {
          const serverNotifications = response.notifications.map(n => ({
            ...n,
            id: this.generateId(),
            persistent: true,
            timestamp: new Date(n.timestamp)
          }));
          this.notificationHistory.next(serverNotifications);
          this.updateUnreadCount();
          this.saveNotificationsToStorage();
        }
      },
      error: (err) => console.error("Falha ao buscar notificações", err)
    });
  }

  markAsRead(id: string): void {
    const history = this.notificationHistory.value.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
    const numericId = id.split('-')[1];
    if (numericId) this.http.patch(`${this.API_URL}/${numericId}/read`, {}).subscribe();
  }

  markAllAsRead(): void {
    const history = this.notificationHistory.value.map(n => ({ ...n, isRead: true }));
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  clearHistory(): void {
    this.notificationHistory.next([]);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  clearOldNotifications(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const history = this.notificationHistory.value.filter(n => new Date(n.timestamp) > sevenDaysAgo);
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  private updateUnreadCount(): void {
    this.unreadCount.next(this.notificationHistory.value.filter(n => !n.isRead).length);
  }

  private saveNotificationsToStorage(): void {
    try { localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory.value)); }
    catch (e) { console.error('Erro ao salvar notificações', e); }
  }

  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem('notification_history');
      if (stored) {
        const history = JSON.parse(stored).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
        this.notificationHistory.next(history);
        this.updateUnreadCount();
      }
    } catch (e) { console.error('Erro ao carregar notificações', e); }
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}