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
  template: `
    <nav class="sidebar" [class.collapsed]="isSidebarCollapsed" [class.active]="isMobileSidebarOpen">
      <ul class="nav-menu">
        <div *ngFor="let section of navSections" class="nav-section">
          <div class="nav-section-title">{{ section.title }}</div>
          <a 
            *ngFor="let item of section.items"
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-item">
            <i [class]="item.icon + ' nav-icon'"></i>
            <span class="nav-text">{{ item.text }}</span>
          </a>
        </div>
      </ul>
    </nav>
  `,
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
  @Input() navSections: NavSection[] = [];
  @Input() isSidebarCollapsed = false;
  @Input() isMobileSidebarOpen = false;
  
  @Output() navigateTo = new EventEmitter<string>();
}