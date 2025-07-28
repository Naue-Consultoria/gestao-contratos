import { Component, Output, EventEmitter, Input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

interface Notification {
  id: number;
  time: string;
  content: string;
  isUnread: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  @Input() userName = '';
  @Input() userRole = '';
  @Input() userInitials = '';
  @Input() isDarkMode = false;
  @Input() notifications: Notification[] = [];
  @Input() unreadNotificationsCount = 0;
  @Input() isNotificationOpen = false;
  
  @Output() toggleMobileSidebar = new EventEmitter<void>();
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() toggleNotifications = new EventEmitter<void>();
  @Output() clearNotifications = new EventEmitter<void>();
  @Output() performSearch = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();
  
  @ViewChild('mobileSearchInput') mobileSearchInput!: ElementRef;
  
  globalSearchTerm = '';
  isSearchActive = false;
  isUserMenuOpen = false;

  constructor(private router: Router) {}
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const userInfo = document.querySelector('.user-info');
    if (userInfo && !userInfo.contains(event.target as Node)) {
      this.isUserMenuOpen = false;
    }
  }
  
  toggleSearch(): void {
    this.isSearchActive = !this.isSearchActive;
    if (this.isSearchActive) {
      this.isUserMenuOpen = false;
      
      setTimeout(() => {
        this.mobileSearchInput?.nativeElement?.focus();
      }, 100);
    }
  }
  
  closeSearch(): void {
    this.isSearchActive = false;
    this.globalSearchTerm = '';
    this.onSearch();
  }
  
  onSearch(): void {
    this.performSearch.emit(this.globalSearchTerm);
  }
  
  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isSearchActive = false;
  }
  
  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }
  
  // navigateToProfile(event: Event): void {
  //   event.preventDefault();
  //   this.router.navigate(['/home/settings']);
  //   this.closeUserMenu();
  // }
  
  navigateToSettings(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/home/settings']);
    this.closeUserMenu();
  }
  
  handleLogout(event: Event): void {
    event.preventDefault();
    this.logout.emit();
    this.closeUserMenu();
  }
  
  viewAllNotifications(event: Event): void {
    event.preventDefault();
    console.log('Ver todas as notificações');
  }
  
  markAsRead(notification: Notification): void {
    if (notification.isUnread) {
      notification.isUnread = false;
      this.toggleNotifications.emit();
    }
  }
}