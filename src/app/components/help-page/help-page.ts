import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-help-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './help-page.html',
  styleUrls: ['./help-page.css']
})
export class HelpPageComponent {
  searchQuery = '';
  
  helpCards = [
    {
      icon: 'fas fa-book',
      iconBackground: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
      iconColor: '#6366f1',
      title: 'Documentação',
      description: 'Acesse o manual completo do sistema',
      buttonText: 'Acessar Documentação',
      buttonIcon: 'fas fa-external-link-alt'
    },
    {
      icon: 'fas fa-video',
      iconBackground: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)',
      iconColor: '#ec4899',
      title: 'Tutoriais em Vídeo',
      description: 'Assista tutoriais passo a passo',
      buttonText: 'Ver Tutoriais',
      buttonIcon: 'fas fa-play-circle'
    },
    {
      icon: 'fas fa-headset',
      iconBackground: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(251, 146, 60, 0.1) 100%)',
      iconColor: '#fb923c',
      title: 'Suporte Online',
      description: 'Fale com nossa equipe de suporte',
      buttonText: 'Iniciar Chat',
      buttonIcon: 'fas fa-comments'
    }
  ];
  
  onHelpAction(action: string) {
    console.log('Help action:', action);
    // Implementar a lógica específica para cada ação
    switch(action) {
      case 'Documentação':
        // Abrir documentação
        window.open('/docs', '_blank');
        break;
      case 'Tutoriais em Vídeo':
        // Abrir página de tutoriais
        window.open('/tutorials', '_blank');
        break;
      case 'Suporte Online':
        // Iniciar chat de suporte
        alert('Iniciando chat de suporte...');
        break;
    }
  }
}