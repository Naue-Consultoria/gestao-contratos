import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Linha de links LGPD inline para ser inserida dentro do rodapé existente
 * de cada página pública. Não tem background nem borda — herda visualmente
 * o estilo do rodapé hospedeiro (escuro/claro), apenas adiciona os links.
 */
@Component({
  selector: 'app-public-lgpd-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="lgpd-links" aria-label="Privacidade e Termos">
      <a routerLink="/politica-privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
      <span class="sep" aria-hidden="true">·</span>
      <a routerLink="/termos-uso" target="_blank" rel="noopener">Termos de Uso</a>
      <span class="sep" aria-hidden="true">·</span>
      <a routerLink="/encarregado-dados" target="_blank" rel="noopener">Direitos do Titular</a>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .lgpd-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
      font-size: 0.78rem;
    }
    .lgpd-links a {
      color: #ffffff;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      padding-bottom: 1px;
      transition: border-color 0.15s ease;
    }
    .lgpd-links a:hover {
      border-bottom-color: #ffffff;
    }
    .lgpd-links .sep {
      color: rgba(255, 255, 255, 0.5);
    }
  `]
})
export class PublicLgpdFooterComponent {}
