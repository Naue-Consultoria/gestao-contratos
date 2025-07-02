import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrls: ['./settings-page.css']
})
export class SettingsPageComponent {
  activeTab = 'general';
  
  // Dados do usuário
  usuario = {
    nome: 'João Silva',
    email: 'joao.silva@naue.com.br',
    ultimoLogin: new Date('2025-01-02T14:30:00'),
    dataCriacao: new Date('2023-03-15T10:00:00')
  };
  
  // Configurações de tema
  tema = {
    modo: 'light' // light, dark, auto
  };
  
  // Configurações de notificações
  notificacoes = {
    email: true,
    contratoVencendo: true,
    novoContrato: true,
    pagamentoPendente: true,
    relatorioMensal: false,
    diasAntecedencia: 7
  };
  
  // Configurações de segurança
  seguranca = {
    autenticacaoDoisFatores: false,
    tempoSessao: 30,
    senhaExpira: 90,
    ultimaAlteracaoSenha: new Date('2024-11-15T10:30:00')
  };
  
  // Abas
  tabs = [
    { id: 'general', label: 'Geral', icon: 'fas fa-cog' },
    { id: 'notifications', label: 'Notificações', icon: 'fas fa-bell' },
    { id: 'security', label: 'Segurança', icon: 'fas fa-shield-alt' }
  ];
  
  private router = inject(Router);
  
  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }
  
  salvarConfiguracoes() {
    console.log('Salvando configurações:', {
      usuario: this.usuario,
      tema: this.tema
    });
    alert('Configurações salvas com sucesso!');
  }
  
  salvarNotificacoes() {
    console.log('Salvando notificações:', this.notificacoes);
    alert('Preferências de notificação salvas com sucesso!');
  }
  
  aplicarTema() {
    const body = document.body;
    
    if (this.tema.modo === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    
    console.log('Tema aplicado:', this.tema.modo);
  }
  
  salvarSeguranca() {
    console.log('Salvando configurações de segurança:', this.seguranca);
    alert('Configurações de segurança salvas com sucesso!');
  }
  
  alterarSenha() {
    this.router.navigate(['/change-password']);
  }
  
  ativar2FA() {
    if (this.seguranca.autenticacaoDoisFatores) {
      console.log('Ativando autenticação de dois fatores');
      alert('Um código QR seria exibido aqui para configurar o autenticador');
    }
  }
  
  formatarData(data: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  }
  
  calcularDiasExpiracao(): number {
    const hoje = new Date();
    const ultimaAlteracao = new Date(this.seguranca.ultimaAlteracaoSenha);
    const diasPassados = Math.floor((hoje.getTime() - ultimaAlteracao.getTime()) / (1000 * 60 * 60 * 24));
    return this.seguranca.senhaExpira - diasPassados;
  }
}