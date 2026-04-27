// src/app/components/notification-dropdown/notification-dropdown.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

interface NotificationGroup {
  label: string;
  items: Notification[];
}

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.html',
  styleUrls: ['./notification-dropdown.css']
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() viewAllClick = new EventEmitter<void>();

  notifications: Notification[] = [];
  displayedGroups: NotificationGroup[] = [];
  displayedCount = 0;
  isLoading = false;
  hasMoreNotifications = true;
  unreadCount = 0;
  dismissingIds = new Set<string>();

  private maxItemsToShow = 5;
  private subscription = new Subscription();
  private lastScrollTop = 0;
  private readonly DISMISS_ANIMATION_MS = 220;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  // Fechar com ESC
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    if (this.isOpen) this.close.emit();
  }

  ngOnInit() {
    this.subscription.add(
      this.notificationService.notificationHistory$.subscribe(notifications => {
        const persistent = notifications.filter(n => n.persistent);
        this.notifications = this.deduplicateByGroupKey(persistent);
        this.updateDisplay();
      })
    );

    this.subscription.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Deduplica notificações pelo groupKey mantendo apenas a mais recente.
   * Cobre dados legados (anteriores ao backend usar anti_spam=aggregate).
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

  private updateDisplay() {
    const visible = this.notifications.slice(0, this.maxItemsToShow);
    this.displayedCount = visible.length;
    this.displayedGroups = this.groupByDate(visible);
    this.hasMoreNotifications = this.notifications.length > this.maxItemsToShow;
  }

  /**
   * Agrupa por período: Hoje / Ontem / Esta semana / Mais antigas.
   * Retorna apenas grupos não-vazios, preservando ordem cronológica.
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

  onScroll(event: Event) {
    const element = event.target as HTMLElement;
    const currentScrollTop = element.scrollTop;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    if (distanceFromBottom < 30 &&
        currentScrollTop > this.lastScrollTop &&
        !this.isLoading &&
        this.hasMoreNotifications) {
      this.loadMoreNotifications();
    }
    this.lastScrollTop = currentScrollTop;
  }

  private loadMoreNotifications() {
    if (this.isLoading) return;
    this.isLoading = true;

    setTimeout(() => {
      this.maxItemsToShow += 5;
      this.updateDisplay();
      this.isLoading = false;
    }, 100);
  }

  trackById(index: number, notification: Notification): string {
    return notification.id;
  }

  trackByLabel(index: number, group: NotificationGroup): string {
    return group.label;
  }

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
      this.close.emit();
    }
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    if (this.unreadCount === 0) return;
    this.notificationService.markAllAsRead();
  }

  /**
   * Remove uma notificação individual com animação de saída suave.
   */
  dismissNotification(notification: Notification, event: Event) {
    event.stopPropagation();
    if (this.dismissingIds.has(notification.id)) return;
    this.dismissingIds.add(notification.id);
    setTimeout(() => {
      this.notificationService.deleteNotifications([notification.id]);
      this.dismissingIds.delete(notification.id);
    }, this.DISMISS_ANIMATION_MS);
  }

  isDismissing(id: string): boolean {
    return this.dismissingIds.has(id);
  }

  hasLink(notification: Notification): boolean {
    return !!(notification.link && notification.link.length > 0);
  }

  clearAll(event: Event) {
    event.stopPropagation();
    const totalNotifications = this.notifications.length;
    if (totalNotifications === 0) return;

    const confirmMessage = `Tem certeza que deseja deletar todas as ${totalNotifications} notificações? Esta ação não pode ser desfeita.`;
    if (confirm(confirmMessage)) {
      this.notificationService.clearHistory();
      setTimeout(() => this.close.emit(), 500);
    }
  }

  viewAll(event: Event) {
    event.preventDefault();
    this.viewAllClick.emit();
    this.close.emit();
  }

  /**
   * Formato curto relativo para <24h, data absoluta para mais antigo.
   */
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

  aggregateCount(notification: Notification): number {
    return notification.metadata?.aggregate_count || 0;
  }

  remainingCount(): number {
    return Math.max(0, this.notifications.length - this.displayedCount);
  }
}
