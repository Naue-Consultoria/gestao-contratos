import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
  persistent?: boolean;
  icon?: string;
  isRead?: boolean;
}

export interface NotificationOptions {
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = `${environment.apiUrl}/notifications`;
  
  // Fila de notificações toast
  private toastQueue = new BehaviorSubject<Notification[]>([]);
  public toastQueue$ = this.toastQueue.asObservable();

  // Histórico de notificações persistentes
  private notificationHistory = new BehaviorSubject<Notification[]>([]);
  public notificationHistory$ = this.notificationHistory.asObservable();

  // Contador de notificações não lidas
  private unreadCount = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCount.asObservable();

  // Configurações padrão
  private defaultDuration = 5000; // 5 segundos
  private maxToasts = 3; // máximo de toasts visíveis simultaneamente
  private soundEnabled = false; // Som desabilitado por padrão

  constructor(private http: HttpClient) {
    this.loadNotificationsFromStorage();
    // A chamada a fetchUserNotifications pode ser movida para depois do login
    // this.fetchUserNotifications(); 
  }

  /**
   * Mostrar notificação de sucesso
   */
  success(message: string, title: string = 'Sucesso!', options?: NotificationOptions): void {
    this.show({
      type: 'success',
      title,
      message,
      icon: options?.icon || 'fas fa-check-circle',
      ...options
    });
  }

  /**
   * Mostrar notificação de erro
   */
  error(message: string, title: string = 'Erro!', options?: NotificationOptions): void {
    this.show({
      type: 'error',
      title,
      message,
      icon: options?.icon || 'fas fa-exclamation-circle',
      duration: options?.duration || 7000, // Erros ficam mais tempo
      ...options
    });
  }

  /**
   * Mostrar notificação de aviso
   */
  warning(message: string, title: string = 'Atenção!', options?: NotificationOptions): void {
    this.show({
      type: 'warning',
      title,
      message,
      icon: options?.icon || 'fas fa-exclamation-triangle',
      ...options
    });
  }

  /**
   * Mostrar notificação informativa
   */
  info(message: string, title: string = 'Informação', options?: NotificationOptions): void {
    this.show({
      type: 'info',
      title,
      message,
      icon: options?.icon || 'fas fa-info-circle',
      ...options
    });
  }

  /**
   * Mostrar notificação genérica
   */
  private show(config: Partial<Notification> & { type: Notification['type']; title: string; message: string }): void {
    const notification: Notification = {
      id: this.generateId(),
      timestamp: new Date(),
      duration: config.duration ?? this.defaultDuration,
      persistent: config.persistent ?? false,
      isRead: false,
      ...config
    };

    // Adicionar à fila de toasts
    this.addToToastQueue(notification);

    // Se for persistente, adicionar ao histórico
    if (notification.persistent) {
      this.addToHistory(notification);
    }

    // Tocar som se habilitado
    if (this.soundEnabled && !this.isSilentMode()) {
      this.playSound();
    }

    // Auto-remover após duração (se não for persistente)
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeToast(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Adicionar à fila de toasts
   */
  private addToToastQueue(notification: Notification): void {
    const currentToasts = this.toastQueue.value;
    
    if (currentToasts.length >= this.maxToasts) {
      currentToasts.shift();
    }
    
    this.toastQueue.next([...currentToasts, notification]);
  }

  /**
   * Adicionar ao histórico
   */
  private addToHistory(notification: Notification): void {
    const history = this.notificationHistory.value;
    const updatedHistory = [notification, ...history];
    
    if (updatedHistory.length > 100) {
      updatedHistory.pop();
    }
    
    this.notificationHistory.next(updatedHistory);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Remover toast
   */
  removeToast(id: string): void {
    const currentToasts = this.toastQueue.value.filter(n => n.id !== id);
    this.toastQueue.next(currentToasts);
  }

  /**
   * Buscar notificações do servidor.
   */
  fetchUserNotifications() {
    this.http.get<any>(this.API_URL).subscribe({
      next: (response) => {
        if (response.success && response.notifications) {
          const serverNotifications = response.notifications.map((n: any) => ({
            ...n,
            persistent: true,
            timestamp: new Date(n.created_at)
          }));
          
          this.notificationHistory.next(serverNotifications);
          this.updateUnreadCount();
          this.saveNotificationsToStorage();
        }
      },
      error: (err) => console.error("Falha ao buscar notificações", err)
    });
  }

  /**
   * Marcar notificação como lida
   */
  markAsRead(id: string): void {
    const numericId = parseInt(id.replace('notification-', ''));
    if (isNaN(numericId)) return;

    const history = this.notificationHistory.value.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();

    this.http.patch(`${this.API_URL}/${numericId}/read`, {}).subscribe();
  }

  /**
   * Marcar todas como lidas
   */
  markAllAsRead(): void {
    const history = this.notificationHistory.value.map(n => ({ ...n, isRead: true }));
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Limpar histórico
   */
  clearHistory(): void {
    this.notificationHistory.next([]);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Limpar notificações antigas
   */
  clearOldNotifications(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const history = this.notificationHistory.value.filter(n => 
      n.timestamp > sevenDaysAgo
    );
    
    this.notificationHistory.next(history);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Atualizar contador de não lidas
   */
  private updateUnreadCount(): void {
    const unread = this.notificationHistory.value.filter(n => !n.isRead).length;
    this.unreadCount.next(unread);
  }

  /**
   * Salvar notificações no localStorage
   */
  private saveNotificationsToStorage(): void {
    try {
      const history = this.notificationHistory.value;
      localStorage.setItem('notification_history', JSON.stringify(history));
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
    }
  }

  /**
   * Carregar notificações do localStorage
   */
  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem('notification_history');
      if (stored) {
        const history = JSON.parse(stored);
        const parsedHistory = history.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notificationHistory.next(parsedHistory);
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }

  /**
   * Verificar modo silencioso
   */
  private isSilentMode(): boolean {
    return localStorage.getItem('notification_silent_mode') === 'true';
  }

  /**
   * Alternar modo silencioso
   */
  toggleSilentMode(): void {
    const current = this.isSilentMode();
    localStorage.setItem('notification_silent_mode', (!current).toString());
  }

  /**
   * Tocar som de notificação
   */
  private playSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.debug('Som de notificação não disponível:', error);
    }
  }

  /**
   * Gerar ID único
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Habilitar/Desabilitar som
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }
}