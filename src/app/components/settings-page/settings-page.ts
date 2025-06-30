import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrls: ['./settings-page.css']
})
export class SettingsPageComponent {
  // Current active tab
  activeTab = 'general';
  
  // Settings data
  settings = {
    companyName: 'NAUE Consultoria',
    contactEmail: 'contato@naue.com.br',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR'
  };
  
  // Tab options
  tabs = [
    { id: 'general', label: 'Geral', icon: 'fas fa-cog' },
    { id: 'notifications', label: 'Notificações', icon: 'fas fa-bell' },
    { id: 'security', label: 'Segurança', icon: 'fas fa-shield-alt' },
    { id: 'backup', label: 'Backup', icon: 'fas fa-database' }
  ];
  
  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }
  
  saveSettings() {
    console.log('Saving settings:', this.settings);
    // Aqui você implementaria a lógica de salvamento
    alert('Configurações salvas com sucesso!');
  }
}