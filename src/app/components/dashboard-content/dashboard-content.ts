// src/app/components/dashboard-content/dashboard-content.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatCard {
  label: string;
  value: number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  progress: number;
}

interface Activity {
  time: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-content.html',
  styleUrls: ['./dashboard-content.css']
})
export class DashboardContentComponent {
  // Dados movidos do HomeComponent
  statCards: StatCard[] = [
    {
      label: 'Total de Contratos',
      value: 24,
      change: '+12% este mês',
      changeType: 'positive',
      icon: 'fas fa-file-contract',
      progress: 75
    },
    {
      label: 'Contratos Ativos',
      value: 18,
      change: '75% do total',
      changeType: 'positive',
      icon: 'fas fa-clipboard-check',
      progress: 75
    },
    {
      label: 'Serviços em Andamento',
      value: 42,
      change: 'Em 18 contratos',
      changeType: 'positive',
      icon: 'fas fa-spinner',
      progress: 60
    },
    {
      label: 'Próximas Atividades',
      value: 8,
      change: '3 urgentes',
      changeType: 'negative',
      icon: 'fas fa-clock',
      progress: 40
    }
  ];

  recentActivities: Activity[] = [
    { 
      time: 'Há 2 horas', 
      title: 'Diagnóstico Organizacional - Empresa ABC', 
      description: 'Reunião inicial realizada com sucesso' 
    },
    { 
      time: 'Há 5 horas', 
      title: 'OKR - Tech Solutions', 
      description: 'Workshop de definição de objetivos concluído' 
    },
    { 
      time: 'Ontem', 
      title: 'Mentoria Individual - Startup XYZ', 
      description: 'Sessão agendada para próxima semana' 
    }
  ];
}