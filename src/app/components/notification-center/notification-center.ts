import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-center" [class.open]="isOpen">
      <div class="notification-center-header">
        <h3 class="notification-center-title">
          <i class="fas fa-bell"></i>
          Notificações
          <span class="unread-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
        </h3>
        
        <div class="notification-center-actions">
          <button 
            class="action-button"
            (click)="markAllAsRead()"
            [disabled]="unreadCount === 0"
            title="Marcar todas como lidas">
            <i class="fas fa-check-double"></i>
          </button>
          
          <button 
            class="action-button"
            (click)="refreshNotifications()"
            title="Atualizar">
            <i class="fas fa-sync-alt"></i>
          </button>
          
          <button 
            class="action-button"
            (click)="clearAll()"
            [disabled]="notifications.length === 0"
            title="Limpar todas">
            <i class="fas fa-trash"></i>
          </button>
          
          <button 
            class="close-button"
            (click)="close.emit()"
            title="Fechar">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="notification-center-filters">
        <button 
          class="filter-button"
          [class.active]="currentFilter === 'all'"
          (click)="setFilter('all')">
          Todas ({{ notifications.length }})
        </button>
        
        <button 
          class="filter-button"
          [class.active]="currentFilter === 'unread'"
          (click)="setFilter('unread')">
          Não lidas ({{ unreadCount }})
        </button>
        
        <button 
          class="filter-button"
          [class.active]="currentFilter === 'today'"
          (click)="setFilter('today')">
          Hoje ({{ todayCount }})
        </button>
      </div>
      
      <div class="notification-center-content">
        <div *ngIf="filteredNotifications.length === 0" class="empty-state">
          <i class="fas fa-bell-slash"></i>
          <p>Nenhuma notificação {{ getEmptyMessage() }}</p>
        </div>
        
        <div class="notification-list">
          <div 
            *ngFor="let notification of filteredNotifications; trackBy: trackById"
            class="notification-item"
            [class.unread]="!notification.isRead"
            [class.high-priority]="notification.priority === 'high'"
            [class.success]="notification.type === 'success'"
            [class.error]="notification.type === 'error'"
            [class.warning]="notification.type === 'warning'"
            [class.info]="notification.type === 'info'"
            [class.contract-assignment]="notification.type === 'contract_assignment'"
            [class.permission-change]="notification.type === 'permission_change'"
            [class.contract-expiring]="notification.type === 'contract_expiring'"
            [class.payment-overdue]="notification.type === 'payment_overdue'"
            [class.service-comment]="notification.type === 'service_comment'"
            [class.service-status-change]="notification.type === 'service_status_change'"
            (click)="handleNotificationClick(notification)">
            
            <div class="notification-item-icon">
              <i [class]="notification.icon"></i>
            </div>
            
            <div class="notification-item-content">
              <div class="notification-item-header">
                <h4 class="notification-item-title">{{ notification.title }}</h4>
                <div class="notification-item-meta">
                  <span class="notification-item-time">{{ formatTime(notification.timestamp) }}</span>
                  <span *ngIf="notification.priority === 'high'" class="priority-badge">Alta Prioridade</span>
                </div>
              </div>
              
              <p class="notification-item-message">{{ notification.message }}</p>
              
              <button 
                *ngIf="notification.action"
                class="notification-item-action"
                (click)="executeAction(notification, $event)">
                {{ notification.action.label }}
              </button>
            </div>
            
            <div class="notification-item-indicator" *ngIf="!notification.isRead"></div>
          </div>
        
        <div class="load-more" *ngIf="canLoadMore" (click)="loadMoreNotifications()">
          <button class="load-more-button">
            <i class="fas fa-chevron-down"></i>
            Carregar mais notificações
          </button>
        </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./notification-center.css']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  unreadCount = 0;
  todayCount = 0;
  currentFilter: 'all' | 'unread' | 'today' = 'all';
  canLoadMore = false;
  
  private subscriptions = new Subscription();
  
  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}
  
  ngOnInit() {
    // Subscrever ao histórico de notificações
    this.subscriptions.add(
      this.notificationService.notificationHistory$.subscribe(notifications => {
        this.notifications = notifications;
        this.applyFilter();
        this.updateCounts();
        this.updateLoadMoreState();
      })
    );
    
    // Subscrever ao contador de não lidas
    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  
  trackById(index: number, notification: Notification): string {
    return notification.id;
  }
  
  setFilter(filter: 'all' | 'unread' | 'today') {
    this.currentFilter = filter;
    this.applyFilter();
  }
  
  applyFilter() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (this.currentFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.isRead);
        break;
      case 'today':
        this.filteredNotifications = this.notifications.filter(n => 
          n.timestamp >= today
        );
        break;
      default:
        this.filteredNotifications = [...this.notifications];
    }
  }
  
  updateCounts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.todayCount = this.notifications.filter(n => n.timestamp >= today).length;
  }
  
  handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    
    // Navegar para o link se existir
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
      this.close.emit(); // Fechar o centro de notificações
    }
  }
  
  executeAction(notification: Notification, event: Event) {
    event.stopPropagation();
    if (notification.action) {
      notification.action.callback();
      this.close.emit();
    }
  }
  
  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }
  
  clearAll() {
    if (confirm('Tem certeza que deseja limpar todas as notificações?')) {
      this.notificationService.clearHistory();
    }
  }
  
  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Há ${days} dia${days > 1 ? 's' : ''}`;
    
    return timestamp.toLocaleDateString('pt-BR');
  }
  
  getEmptyMessage(): string {
    switch (this.currentFilter) {
      case 'unread':
        return 'não lida';
      case 'today':
        return 'de hoje';
      default:
        return '';
    }
  }

  refreshNotifications() {
    this.notificationService.refreshNotifications();
  }

  loadMoreNotifications() {
    this.notificationService.loadMoreNotifications();
  }

  private updateLoadMoreState() {
    this.canLoadMore = this.notificationService.hasMoreNotifications();
  }
}