import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

interface NotificationGroup {
  label: string;
  items: Notification[];
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.html',
  styleUrls: ['./notification-center.css']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  displayedGroups: NotificationGroup[] = [];
  unreadCount = 0;
  totalCount = 0;
  activeFilter: 'all' | 'unread' = 'all';
  isLoading = false;
  hasMoreNotifications = true;
  dismissingIds = new Set<string>();

  private subscription = new Subscription();
  private scrollThrottleTimer?: any;
  private readonly DISMISS_ANIMATION_MS = 220;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(_event: Event) {
    if (this.isOpen) this.close.emit();
  }

  ngOnInit() {
    this.loadNotifications();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.scrollThrottleTimer) clearTimeout(this.scrollThrottleTimer);
  }

  private setupSubscriptions() {
    this.subscription.add(
      this.notificationService.notificationHistory$.subscribe(notifications => {
        this.notifications = this.deduplicateByGroupKey(notifications);
        this.totalCount = this.notifications.length;
        this.updateDisplayedNotifications();
      })
    );

    this.subscription.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );
  }

  private loadNotifications() {
    this.isLoading = true;
    this.notificationService.refreshNotifications();
    setTimeout(() => { this.isLoading = false; }, 500);
  }

  /**
   * Deduplica por groupKey mantendo o registro mais recente.
   * Cobre dados legados antes do backend usar anti_spam=aggregate.
   */
  private deduplicateByGroupKey(notifications: Notification[]): Notification[] {
    const latestByGroup = new Map<string, Notification>();
    const withoutGroup: Notification[] = [];

    for (const n of notifications) {
      if (!n.groupKey) {
        withoutGroup.push(n);
        continue;
      }
      const existing = latestByGroup.get(n.groupKey);
      if (!existing || n.timestamp.getTime() > existing.timestamp.getTime()) {
        latestByGroup.set(n.groupKey, n);
      }
    }

    const merged = [...latestByGroup.values(), ...withoutGroup];
    merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return merged;
  }

  private updateDisplayedNotifications() {
    this.filteredNotifications = this.activeFilter === 'unread'
      ? this.notifications.filter(n => !n.isRead)
      : this.notifications;

    this.displayedGroups = this.groupByDate(this.filteredNotifications);
    this.hasMoreNotifications = this.notificationService.hasMoreNotifications();
  }

  /**
   * Agrupa por período preservando ordem cronológica decrescente.
   */
  private groupByDate(notifications: Notification[]): NotificationGroup[] {
    if (notifications.length === 0) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 7 * 86400000;

    const groups: NotificationGroup[] = [
      { label: 'Hoje', items: [] },
      { label: 'Ontem', items: [] },
      { label: 'Esta semana', items: [] },
      { label: 'Mais antigas', items: [] }
    ];

    for (const n of notifications) {
      const t = n.timestamp.getTime();
      if (t >= startOfToday) groups[0].items.push(n);
      else if (t >= startOfYesterday) groups[1].items.push(n);
      else if (t >= startOfWeek) groups[2].items.push(n);
      else groups[3].items.push(n);
    }

    return groups.filter(g => g.items.length > 0);
  }

  setFilter(filter: 'all' | 'unread') {
    this.activeFilter = filter;
    this.updateDisplayedNotifications();
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
    }
  }

  onScroll(event: Event) {
    if (this.scrollThrottleTimer) return;

    this.scrollThrottleTimer = setTimeout(() => {
      const element = event.target as HTMLElement;
      const threshold = 200;
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - threshold;

      if (atBottom && this.hasMoreNotifications && !this.isLoading) {
        this.loadMoreNotifications();
      }

      this.scrollThrottleTimer = null;
    }, 100);
  }

  private loadMoreNotifications() {
    if (this.isLoading || !this.hasMoreNotifications) return;

    this.isLoading = true;
    this.notificationService.loadMoreNotifications();

    setTimeout(() => {
      this.isLoading = false;
      this.hasMoreNotifications = this.notificationService.hasMoreNotifications();
    }, 800);
  }

  handleNotificationClick(notification: Notification) {
    this.markAsRead(notification);
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
      this.close.emit();
    }
  }

  markAsRead(notification: Notification, event?: Event) {
    if (event) event.stopPropagation();
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  markAllAsRead() {
    if (this.unreadCount === 0) return;
    if (confirm(`Marcar todas as ${this.unreadCount} notificações como lidas?`)) {
      this.notificationService.markAllAsRead();
    }
  }

  /**
   * Remove uma notificação individual com animação de saída suave.
   * Marca o id como "dismissing" → CSS aplica slide-out → após anim, deleta de fato.
   */
  dismissNotification(notification: Notification, event: Event) {
    event.stopPropagation();
    if (this.dismissingIds.has(notification.id)) return; // evita double-click
    this.dismissingIds.add(notification.id);
    setTimeout(() => {
      this.notificationService.deleteNotifications([notification.id]);
      this.dismissingIds.delete(notification.id);
    }, this.DISMISS_ANIMATION_MS);
  }

  isDismissing(id: string): boolean {
    return this.dismissingIds.has(id);
  }

  clearAllNotifications() {
    if (this.totalCount === 0) return;
    const confirmMessage = `Tem certeza que deseja DELETAR todas as ${this.totalCount} notificações?\n\nEsta ação não pode ser desfeita e todas as notificações serão permanentemente removidas.`;
    if (confirm(confirmMessage)) {
      this.notificationService.clearHistory();
      setTimeout(() => this.close.emit(), 500);
    }
  }

  trackById(index: number, notification: Notification): string {
    return notification.id;
  }

  trackByLabel(index: number, group: NotificationGroup): string {
    return group.label;
  }

  hasLink(notification: Notification): boolean {
    return !!(notification.link && notification.link.length > 0);
  }

  aggregateCount(notification: Notification): number {
    return notification.metadata?.aggregate_count || 0;
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;

    return timestamp.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
