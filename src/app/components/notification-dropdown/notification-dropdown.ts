// src/app/components/notification-dropdown/notification-dropdown.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

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
  private subscription?: Subscription;
  
  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.subscription = this.notificationService.notificationHistory$.subscribe(
      notifications => {
        this.notifications = notifications.filter(n => n.persistent);
      }
    );
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  
  trackById(index: number, notification: Notification): string {
    return notification.id;
  }
  
  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    
    // Navegar para o link se existir
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
      this.close.emit();
    }
  }
  
  clearAll() {
    if (confirm('Limpar todas as notificações?')) {
      this.notificationService.clearHistory();
    }
  }
  
  viewAll(event: Event) {
    event.preventDefault();
    this.viewAllClick.emit();
    this.close.emit();
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
}