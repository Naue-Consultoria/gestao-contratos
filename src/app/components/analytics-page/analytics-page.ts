import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics-page.html',
  styleUrls: ['./analytics-page.css']
})
export class AnalyticsPageComponent {
  // Analytics data
  successRate = 92;
  topService = 'OKR';
  topServicePercentage = 25;
  
  // Service distribution data
  services = [
    { name: 'Diagnóstico Organizacional', value: 25, color: '#1DD882' },
    { name: 'OKR', value: 20, color: '#6366f1' },
    { name: 'Mentoria', value: 18, color: '#ec4899' },
    { name: 'RH', value: 15, color: '#fb923c' },
    { name: 'Outros', value: 22, color: '#94a3b8' }
  ];
}