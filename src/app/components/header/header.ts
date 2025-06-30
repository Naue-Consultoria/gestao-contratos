import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Notification {
  id: number;
  time: string;
  content: string;
  isUnread: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleMobileSidebar = new EventEmitter<void>();
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() toggleNotifications = new EventEmitter<void>();
  @Output() clearNotifications = new EventEmitter<void>();
  @Output() performSearch = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();
  
  isSearchActive = false;
  globalSearchTerm = '';
  
  toggleSearch() {
    this.isSearchActive = !this.isSearchActive;
  }
  
  onSearch() {
    this.performSearch.emit(this.globalSearchTerm);
  }
}