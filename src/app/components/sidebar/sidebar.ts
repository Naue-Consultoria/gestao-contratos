// sidebar.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  id: string;
  icon: string;
  text: string;
  active: boolean;
  route?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html', // Mudança: usar arquivo separado
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
  @Input() navSections: NavSection[] = [];
  @Input() isSidebarCollapsed = false;
  @Input() isMobileSidebarOpen = false;
  
  @Output() navigateTo = new EventEmitter<string>();
  @Output() sidebarToggled = new EventEmitter<void>(); // Novo evento
  
  toggleSidebar(): void {
    this.sidebarToggled.emit();
  }
}