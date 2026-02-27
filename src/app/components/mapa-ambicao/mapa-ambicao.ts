import { Component, Input, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { MentoriaService } from '../../services/mentoria.service';
import { ToastrService } from 'ngx-toastr';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import Chart from 'chart.js/auto';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-mapa-ambicao',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyMaskDirective],
  template: `
<!-- ═══ NAV ═══ -->
<nav class="ma-nav-bar" #navBar>
  <button *ngFor="let tab of tabs; let i = index"
          class="ma-nav-tab"
          [class.active]="activeTab === tab.id"
          (click)="showTab(tab.id)">
    <span class="ma-tab-num">{{ i + 1 }}</span>{{ tab.label }}
  </button>
</nav>

<!-- ═══ MAIN ═══ -->
<div class="ma-main-content">

<!-- ═══ TAB 1 — DASHBOARD ═══ -->
<div *ngIf="activeTab === 'dashboard'" class="ma-tab-panel">
  <!-- Info Strip -->
  <div class="ma-info-strip ma-mb-24">
    <div class="ma-field-group">
      <label class="ma-field-label">Nome</label>
      <input type="text" [(ngModel)]="dados.ceoNome" (input)="onFieldChange()" placeholder="Seu nome completo" [disabled]="readOnly">
    </div>
    <div class="ma-field-group">
      <label class="ma-field-label">Cargo Atual</label>
      <input type="text" [(ngModel)]="dados.ceoCargo" (input)="onFieldChange()" placeholder="Ex: CEO, Diretor, Sócio..." [disabled]="readOnly">
    </div>
    <div class="ma-field-group">
      <label class="ma-field-label">Data de Preenchimento</label>
      <input type="date" [(ngModel)]="dados.ceoData" (input)="onFieldChange()" [disabled]="readOnly">
    </div>
  </div>

  <!-- KPI Row 1 -->
  <div class="ma-grid-3 ma-mb-20">
    <div class="ma-kpi-card">
      <div class="ma-kpi-label">Custo Anual da Vida Ideal</div>
      <div class="ma-kpi-value">{{ fmtBRL(totalAnual) }}</div>
      <div class="ma-kpi-sub">Definido em Estilo de Vida</div>
    </div>
    <div class="ma-kpi-card">
      <div class="ma-kpi-label">Patrimônio Necessário</div>
      <div class="ma-kpi-value">{{ fmtBRL(patrimonioNecessario) }}</div>
      <div class="ma-kpi-sub">Rendimentos de 6% a.a.</div>
    </div>
    <div class="ma-kpi-card ma-kpi-highlight">
      <div class="ma-kpi-label">Progresso Alcançado</div>
      <div class="ma-kpi-value">{{ progressoPct.toFixed(1) }}%</div>
      <div class="ma-kpi-sub">do patrimônio necessário</div>
      <div class="ma-progress-wrap">
        <div class="ma-progress-bg"><div class="ma-progress-fill" [style.width.%]="Math.min(100, progressoPct)"></div></div>
      </div>
    </div>
  </div>

  <!-- KPI Row 2 -->
  <div class="ma-grid-3 ma-mb-24">
    <div class="ma-kpi-card">
      <div class="ma-kpi-label">Patrimônio Atual</div>
      <div class="ma-kpi-value">{{ fmtBRL(patrimonioAtual) }}</div>
      <div class="ma-kpi-sub">Soma da Estratificação</div>
    </div>
    <div class="ma-kpi-card">
      <div class="ma-kpi-label">Diferença a Acumular</div>
      <div class="ma-kpi-value">{{ fmtBRL(diferenca) }}</div>
      <div class="ma-kpi-sub">Para atingir a meta</div>
    </div>
    <div class="ma-kpi-card">
      <div class="ma-kpi-label">Tempo Estimado</div>
      <div class="ma-kpi-value">{{ tempoEstimado }}</div>
      <div class="ma-kpi-sub">Com base na renda anual</div>
    </div>
  </div>

  <!-- Charts -->
  <div class="ma-grid-2 ma-mb-24">
    <div class="ma-chart-card">
      <div class="ma-chart-title">Composição de Despesas por Categoria</div>
      <div class="ma-chart-wrap">
        <canvas #chartExpenses></canvas>
        <div *ngIf="!hasExpenseData" class="ma-chart-empty">Preencha o <strong>Estilo de Vida</strong><br>para visualizar o gráfico</div>
      </div>
    </div>
    <div class="ma-chart-card">
      <div class="ma-chart-title">Patrimônio: Atual vs. Necessário</div>
      <div class="ma-chart-wrap">
        <canvas #chartPatrimonio></canvas>
        <div *ngIf="!hasPatrimonioData" class="ma-chart-empty">Informe o patrimônio<br>para visualizar o gráfico</div>
      </div>
    </div>
  </div>

  <!-- Financial Inputs + Projeção -->
  <div class="ma-grid-2 ma-mb-24">
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Dados Financeiros</div>
      <div class="ma-field-group ma-mb-16">
        <label class="ma-field-label">Patrimônio Atual (R$) — calculado da aba Estratificação</label>
        <input type="text" appCurrencyMask [ngModel]="patrimonioAtual" readonly class="ma-input-readonly">
      </div>
      <div class="ma-field-group">
        <label class="ma-field-label">Renda Anual para Acumulação (R$)</label>
        <input type="text" appCurrencyMask [(ngModel)]="dados.rendaAnual" (ngModelChange)="onFieldChange(); recalcDashboard()" placeholder="R$ 0,00" [disabled]="readOnly">
      </div>
    </div>
    <div class="ma-chart-card">
      <div class="ma-chart-title">Projeção de Crescimento Patrimonial</div>
      <div class="ma-chart-wrap" style="height:220px">
        <canvas #chartProjecao></canvas>
        <div *ngIf="!hasProjecaoData" class="ma-chart-empty">Informe patrimônio e renda<br>para ver a projeção</div>
      </div>
    </div>
  </div>

  <!-- Insights -->
  <div class="ma-grid-2">
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Reflexão</div>
      <h3>Maior bloqueio</h3>
      <p class="ma-desc">O que mais impede você de alcançar a vida ideal?</p>
      <textarea [(ngModel)]="dados.dashBloqueio" (input)="onFieldChange()" rows="4" placeholder="Descreva seus bloqueios..." [disabled]="readOnly"></textarea>
    </div>
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Ação</div>
      <h3>Próximo passo concreto</h3>
      <p class="ma-desc">Algo específico que pode fazer nos próximos 7 dias.</p>
      <textarea [(ngModel)]="dados.dashAcao" (input)="onFieldChange()" rows="4" placeholder="Descreva sua próxima ação..." [disabled]="readOnly"></textarea>
    </div>
  </div>

  <!-- Nav buttons -->
  <div class="ma-tab-nav-buttons">
    <div></div>
    <button class="ma-btn-next" (click)="showTab('proposito')">Propósito e Visão <i class="fa-solid fa-arrow-right"></i></button>
  </div>
</div>

<!-- ═══ TAB 2 — PROPÓSITO E VISÃO ═══ -->
<div *ngIf="activeTab === 'proposito'" class="ma-tab-panel">
  <div class="ma-grid-2 ma-mb-20">
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Pergunta 1</div>
      <h3>Visão Ideal (5-10 anos)</h3>
      <p class="ma-desc">Se dinheiro, tempo e responsabilidades não fossem um problema, o que você faria?</p>
      <textarea [(ngModel)]="dados.p1Visao" (input)="onFieldChange()" rows="6" placeholder="Vá além da sua cadeira atual — o que realmente deseja?" [disabled]="readOnly"></textarea>
    </div>
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Pergunta 2</div>
      <h3>Satisfação Profunda</h3>
      <p class="ma-desc">Quais atividades ou projetos lhe trazem satisfação profunda, mesmo que não sejam fáceis?</p>
      <textarea [(ngModel)]="dados.p1Atividades" (input)="onFieldChange()" rows="6" placeholder="O que realmente importa, não só o lucrativo..." [disabled]="readOnly"></textarea>
    </div>
  </div>

  <div class="ma-grid-2 ma-mb-20">
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Pergunta 3</div>
      <h3>Legado e Impacto</h3>
      <p class="ma-desc">Que legado você gostaria de deixar? O que quer que as pessoas digam sobre você?</p>
      <textarea [(ngModel)]="dados.p1Legado" (input)="onFieldChange()" rows="6" placeholder="Um propósito maior e duradouro..." [disabled]="readOnly"></textarea>
    </div>
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Pergunta 4</div>
      <h3>Causas e Propósito Social</h3>
      <p class="ma-desc">Quais causas ou problemas no mundo despertam sua vontade genuína de ajudar?</p>
      <textarea [(ngModel)]="dados.p1Causas" (input)="onFieldChange()" rows="6" placeholder="Alinhe ambições pessoais com contribuição social..." [disabled]="readOnly"></textarea>
    </div>
  </div>

  <div class="ma-card">
    <div class="ma-card-label">Pergunta 5</div>
    <h3>Um Dia Perfeito</h3>
    <p class="ma-desc">Descreva, com máximo de detalhes, como seria um "dia perfeito" na sua vida ideal.</p>
    <textarea [(ngModel)]="dados.p1Dia" (input)="onFieldChange()" rows="7" placeholder="Torne a visão concreta e tangível..." [disabled]="readOnly"></textarea>
  </div>

  <!-- Nav buttons -->
  <div class="ma-tab-nav-buttons">
    <button class="ma-btn-prev" (click)="showTab('dashboard')"><i class="fa-solid fa-arrow-left"></i> Dashboard</button>
    <button class="ma-btn-next" (click)="showTab('estilo')">Estilo de Vida <i class="fa-solid fa-arrow-right"></i></button>
  </div>
</div>

<!-- ═══ TAB 3 — ESTILO DE VIDA ═══ -->
<div *ngIf="activeTab === 'estilo'" class="ma-tab-panel">

  <div class="ma-card">
    <div class="ma-expense-header">
      <span>Categoria de Despesa</span>
      <span>Custo Mensal (R$)</span>
      <span>Custo Anual (R$)</span>
      <span>Observações</span>
    </div>

    <div *ngFor="let section of expenseSections" class="ma-expense-section">
      <div class="ma-expense-section-title">{{ section.title }}</div>

      <div *ngFor="let item of section.items">
        <div *ngIf="item.type === 'monthly'" class="ma-expense-row">
          <span class="ma-expense-name">{{ item.label }}</span>
          <input type="text" appCurrencyMask [ngModel]="dados.expenses[item.id]" (ngModelChange)="dados.expenses[item.id]=$event; calcExpenses()" placeholder="R$ 0,00" [disabled]="readOnly">
          <div class="ma-annual-value">{{ fmtBRL((dados.expenses[item.id] || 0) * 12) }}</div>
          <input type="text" [(ngModel)]="dados.expenseObs[item.id]" (input)="onFieldChange()" placeholder="Obs..." [disabled]="readOnly">
        </div>
        <div *ngIf="item.type === 'travel'" class="ma-travel-calc">
          <span class="ma-expense-name">{{ item.label }}</span>
          <input type="number" [ngModel]="dados.expenses[item.id + '-qtd']" (ngModelChange)="dados.expenses[item.id + '-qtd']=$event; calcExpenses()" placeholder="Qtd/ano" [disabled]="readOnly">
          <span class="ma-travel-x">&times;</span>
          <input type="text" appCurrencyMask [ngModel]="dados.expenses[item.id + '-custo']" (ngModelChange)="dados.expenses[item.id + '-custo']=$event; calcExpenses()" placeholder="R$ 0,00" [disabled]="readOnly">
          <div class="ma-annual-value">{{ fmtBRL(getTravelAnnual(item.id)) }}</div>
          <input type="text" [(ngModel)]="dados.expenseObs[item.id]" (input)="onFieldChange()" placeholder="Obs..." [disabled]="readOnly">
        </div>
        <div *ngIf="item.type === 'annual'" class="ma-expense-row">
          <span class="ma-expense-name">{{ item.label }}</span>
          <input type="text" appCurrencyMask [ngModel]="dados.expenses[item.id]" (ngModelChange)="dados.expenses[item.id]=$event; calcExpenses()" placeholder="R$ 0,00" [disabled]="readOnly">
          <div class="ma-annual-value">{{ fmtBRL(dados.expenses[item.id] || 0) }}</div>
          <input type="text" [(ngModel)]="dados.expenseObs[item.id]" (input)="onFieldChange()" placeholder="Obs..." [disabled]="readOnly">
        </div>
      </div>
    </div>

    <div class="ma-total-row">
      <span class="ma-total-label">Custo Anual Total da Vida Ideal</span>
      <span></span>
      <span class="ma-total-value">{{ fmtBRL(totalAnual) }}</span>
      <span></span>
    </div>

    <div class="ma-patrimonio-banner">
      <div>
        <div class="ma-pat-label">Patrimônio Necessário</div>
        <div class="ma-pat-sub">Para viver dos rendimentos a 6% a.a.</div>
      </div>
      <div class="ma-pat-value">{{ fmtBRL(patrimonioNecessario) }}</div>
    </div>
  </div>

  <!-- Nav buttons -->
  <div class="ma-tab-nav-buttons">
    <button class="ma-btn-prev" (click)="showTab('proposito')"><i class="fa-solid fa-arrow-left"></i> Propósito e Visão</button>
    <button class="ma-btn-next" (click)="showTab('plano')">Plano de Ação <i class="fa-solid fa-arrow-right"></i></button>
  </div>
</div>

<!-- ═══ TAB 4 — PLANO DE AÇÃO ═══ -->
<div *ngIf="activeTab === 'plano'" class="ma-tab-panel">

  <div class="ma-card">
    <div class="ma-card-label">Pergunta 1</div>
    <h3>Sua Cadeira Atual</h3>
    <p class="ma-desc">Seu cargo atual é o veículo para alcançar sua vida ideal, ou se tornou um fim em si mesmo?</p>
    <textarea [(ngModel)]="dados.p3Negocio" (input)="onFieldChange()" rows="5" placeholder="Clarifique a relação entre sua cadeira atual e sua vida pessoal..." [disabled]="readOnly"></textarea>
  </div>

  <div class="ma-card">
    <div class="ma-card-label">Pergunta 2</div>
    <h3>Patrimônio Necessário</h3>
    <p class="ma-desc">Quanto você precisa acumular para que os rendimentos cubram seu "Número da Liberdade Anual"?</p>
    <div class="ma-plano-pat-badge">
      <span>Patrimônio Necessário (calculado)</span>
      <span>{{ fmtBRL(patrimonioNecessario) }}</span>
    </div>
  </div>

  <div class="ma-grid-2 ma-mb-20 ma-mt-20">
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Pergunta 3</div>
      <h3>Ações Concretas para Hoje</h3>
      <p class="ma-desc">O que você pode fazer HOJE para alinhar sua vida com a visão?</p>
      <textarea [(ngModel)]="dados.p3Acoes" (input)="onFieldChange()" rows="6" placeholder="Transforme visão em movimento imediato..." [disabled]="readOnly"></textarea>
    </div>
    <div class="ma-card ma-card-key" style="margin:0">
      <div class="ma-card-label">Pergunta-Chave</div>
      <h3>Depois da Meta</h3>
      <p class="ma-desc">Quando atingir o patrimônio, o que fará? Continuará na cadeira atual? Se dedicará à filantropia?</p>
      <textarea [(ngModel)]="dados.p3Depois" (input)="onFieldChange()" rows="6" placeholder="Evite que o objetivo se torne uma meta infinita..." [disabled]="readOnly"></textarea>
    </div>
  </div>

  <div class="ma-card">
    <div class="ma-card-label">Pergunta 5</div>
    <h3>Limites e Prioridades</h3>
    <p class="ma-desc">Quais são seus limites não-negociáveis? O que NÃO fará, mesmo que lucrativo?</p>
    <textarea [(ngModel)]="dados.p3Limites" (input)="onFieldChange()" rows="5" placeholder="Defina valores e limites éticos/pessoais..." [disabled]="readOnly"></textarea>
  </div>

  <!-- Nav buttons -->
  <div class="ma-tab-nav-buttons">
    <button class="ma-btn-prev" (click)="showTab('estilo')"><i class="fa-solid fa-arrow-left"></i> Estilo de Vida</button>
    <button class="ma-btn-next" (click)="showTab('patrimonio')">Estratificação do Patrimônio <i class="fa-solid fa-arrow-right"></i></button>
  </div>
</div>

<!-- ═══ TAB 5 — ESTRATIFICAÇÃO DO PATRIMÔNIO ═══ -->
<div *ngIf="activeTab === 'patrimonio'" class="ma-tab-panel">

  <div class="ma-grid-2-1 ma-mb-24">
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Composição Patrimonial</div>
      <div class="ma-pat-strat-header">
        <span>Categoria de Ativo</span>
        <span>Valor Atual (R$)</span>
        <span>% do Total</span>
      </div>

      <div *ngFor="let asset of assetCategories" class="ma-pat-strat-row">
        <div class="ma-ps-name">
          <span class="ma-ps-dot" [style.background]="asset.color"></span>{{ asset.label }}
        </div>
        <input type="text" appCurrencyMask [ngModel]="dados.assets[asset.id]" (ngModelChange)="dados.assets[asset.id]=$event; calcPatrimonio()" placeholder="R$ 0,00" [disabled]="readOnly">
        <div class="ma-ps-pct">{{ getAssetPct(asset.id) }}%</div>
      </div>

      <div class="ma-pat-strat-total">
        <span class="ma-pst-label">Patrimônio Total</span>
        <span class="ma-pst-value">{{ fmtBRL(patrimonioAtual) }}</span>
        <span class="ma-pst-value" style="font-size:16px">100%</span>
      </div>
    </div>

    <div class="ma-chart-card" style="display:flex;flex-direction:column;">
      <div class="ma-chart-title">Distribuição do Patrimônio</div>
      <div class="ma-chart-wrap" style="flex:1;min-height:300px;">
        <canvas #chartPatStrat></canvas>
        <div *ngIf="!hasAssetData" class="ma-chart-empty">Preencha os valores<br>para visualizar o gráfico</div>
      </div>
    </div>
  </div>

  <div class="ma-card">
    <div class="ma-card-label">Observações sobre o Patrimônio</div>
    <h3>Notas e detalhes adicionais</h3>
    <p class="ma-desc">Registre informações relevantes sobre seus ativos.</p>
    <textarea [(ngModel)]="dados.patObservacoes" (input)="onFieldChange()" rows="5" placeholder="Detalhes sobre a composição do patrimônio..." [disabled]="readOnly"></textarea>
  </div>

  <!-- Nav buttons -->
  <div class="ma-tab-nav-buttons">
    <button class="ma-btn-prev" (click)="showTab('plano')"><i class="fa-solid fa-arrow-left"></i> Plano de Ação</button>
    <button class="ma-btn-next" (click)="showTab('planofinanceiro')">Plano Financeiro <i class="fa-solid fa-arrow-right"></i></button>
  </div>
</div>

<!-- ═══ TAB 6 — PLANO DE AÇÃO FINANCEIRO ═══ -->
<div *ngIf="activeTab === 'planofinanceiro'" class="ma-tab-panel">

  <div class="ma-grid-3 ma-mb-24">
    <div class="ma-kpi-card">
      <div class="ma-kpi-label">Patrimônio Atual</div>
      <div class="ma-kpi-value">{{ fmtBRL(patrimonioAtual) }}</div>
      <div class="ma-kpi-sub">Ponto de partida</div>
    </div>
    <div class="ma-kpi-card">
      <div class="ma-kpi-label">Meta de Patrimônio</div>
      <div class="ma-kpi-value">{{ fmtBRL(patrimonioNecessario) }}</div>
      <div class="ma-kpi-sub">Número da liberdade</div>
    </div>
    <div class="ma-kpi-card ma-kpi-highlight">
      <div class="ma-kpi-label">Gap a Fechar</div>
      <div class="ma-kpi-value">{{ fmtBRL(diferenca) }}</div>
      <div class="ma-kpi-sub">Diferença total</div>
    </div>
  </div>

  <div class="ma-card" style="padding:2rem 2.5rem">
    <div class="ma-card-label">Linha do Tempo — Metas Parciais e Ações</div>
    <div class="ma-timeline-container">

      <!-- CURTO PRAZO -->
      <div class="ma-timeline-phase">
        <div class="ma-timeline-dot dot-short">1</div>
        <div class="ma-phase-header">
          <span class="ma-phase-badge badge-short">Curto Prazo</span>
          <span class="ma-phase-title">1 Ano</span>
        </div>
        <p class="ma-phase-subtitle">Ações imediatas e resultados rápidos para construir momentum.</p>
        <div class="ma-meta-parcial-banner banner-short">
          <div><div class="ma-mpb-label">Meta de Patrimônio — Ano 1</div></div>
          <div><input type="text" appCurrencyMask [(ngModel)]="dados.pfMeta1" (ngModelChange)="onFieldChange(); updateRoadmapChart()" placeholder="R$ 0,00" class="ma-meta-input" [disabled]="readOnly"></div>
        </div>
        <div class="ma-action-header"><span>Ação / Iniciativa</span><span>Prazo</span><span>Status</span><span></span></div>
        <div *ngFor="let action of dados.actionsShort; let i = index" class="ma-action-row">
          <textarea [(ngModel)]="action.descricao" (input)="onFieldChange()" placeholder="Descreva a ação concreta..." [disabled]="readOnly"></textarea>
          <input type="text" [(ngModel)]="action.prazo" (input)="onFieldChange()" placeholder="Ex: Mar/2027" [disabled]="readOnly">
          <select [(ngModel)]="action.status" (change)="onFieldChange()" [disabled]="readOnly">
            <option value="">Selecionar</option><option value="pendente">Pendente</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option>
          </select>
          <button *ngIf="!readOnly" class="ma-btn-remove-action" (click)="removeAction('short', i)" title="Excluir ação"><i class="fa-solid fa-trash"></i></button>
        </div>
        <button *ngIf="!readOnly" class="ma-btn-add" (click)="addAction('short')"><i class="fa-solid fa-plus"></i> Adicionar ação</button>
      </div>

      <!-- MÉDIO PRAZO -->
      <div class="ma-timeline-phase">
        <div class="ma-timeline-dot dot-medium">3</div>
        <div class="ma-phase-header">
          <span class="ma-phase-badge badge-medium">Médio Prazo</span>
          <span class="ma-phase-title">3 Anos</span>
        </div>
        <p class="ma-phase-subtitle">Estratégias de crescimento sustentável e consolidação.</p>
        <div class="ma-meta-parcial-banner banner-medium">
          <div><div class="ma-mpb-label">Meta de Patrimônio — Ano 3</div></div>
          <div><input type="text" appCurrencyMask [(ngModel)]="dados.pfMeta3" (ngModelChange)="onFieldChange(); updateRoadmapChart()" placeholder="R$ 0,00" class="ma-meta-input" [disabled]="readOnly"></div>
        </div>
        <div class="ma-action-header"><span>Ação / Iniciativa</span><span>Prazo</span><span>Status</span><span></span></div>
        <div *ngFor="let action of dados.actionsMedium; let i = index" class="ma-action-row">
          <textarea [(ngModel)]="action.descricao" (input)="onFieldChange()" placeholder="Descreva a ação estratégica..." [disabled]="readOnly"></textarea>
          <input type="text" [(ngModel)]="action.prazo" (input)="onFieldChange()" placeholder="Ex: 2028" [disabled]="readOnly">
          <select [(ngModel)]="action.status" (change)="onFieldChange()" [disabled]="readOnly">
            <option value="">Selecionar</option><option value="pendente">Pendente</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option>
          </select>
          <button *ngIf="!readOnly" class="ma-btn-remove-action" (click)="removeAction('medium', i)" title="Excluir ação"><i class="fa-solid fa-trash"></i></button>
        </div>
        <button *ngIf="!readOnly" class="ma-btn-add" (click)="addAction('medium')"><i class="fa-solid fa-plus"></i> Adicionar ação</button>
      </div>

      <!-- LONGO PRAZO -->
      <div class="ma-timeline-phase">
        <div class="ma-timeline-dot dot-long">5</div>
        <div class="ma-phase-header">
          <span class="ma-phase-badge badge-long">Longo Prazo</span>
          <span class="ma-phase-title">5 Anos</span>
        </div>
        <p class="ma-phase-subtitle">Visão de chegada — atingir o patrimônio necessário e a liberdade financeira plena.</p>
        <div class="ma-meta-parcial-banner banner-long">
          <div><div class="ma-mpb-label">Meta de Patrimônio — Ano 5 (meta final)</div></div>
          <div class="ma-mpb-final-value">{{ fmtBRL(patrimonioNecessario) }}</div>
        </div>
        <div class="ma-action-header"><span>Ação / Iniciativa</span><span>Prazo</span><span>Status</span><span></span></div>
        <div *ngFor="let action of dados.actionsLong; let i = index" class="ma-action-row">
          <textarea [(ngModel)]="action.descricao" (input)="onFieldChange()" placeholder="Descreva a ação de longo prazo..." [disabled]="readOnly"></textarea>
          <input type="text" [(ngModel)]="action.prazo" (input)="onFieldChange()" placeholder="Ex: 2030" [disabled]="readOnly">
          <select [(ngModel)]="action.status" (change)="onFieldChange()" [disabled]="readOnly">
            <option value="">Selecionar</option><option value="pendente">Pendente</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option>
          </select>
          <button *ngIf="!readOnly" class="ma-btn-remove-action" (click)="removeAction('long', i)" title="Excluir ação"><i class="fa-solid fa-trash"></i></button>
        </div>
        <button *ngIf="!readOnly" class="ma-btn-add" (click)="addAction('long')"><i class="fa-solid fa-plus"></i> Adicionar ação</button>
      </div>
    </div>
  </div>

  <div class="ma-chart-card ma-mt-20">
    <div class="ma-chart-title">Roadmap Patrimonial — Evolução até a Meta</div>
    <div class="ma-chart-wrap" style="height:280px">
      <canvas #chartRoadmap></canvas>
      <div *ngIf="!hasRoadmapData" class="ma-chart-empty">Preencha as metas parciais<br>para visualizar o roadmap</div>
    </div>
  </div>

  <div class="ma-card ma-mt-20">
    <div class="ma-card-label">Observações do Plano</div>
    <h3>Premissas e considerações</h3>
    <p class="ma-desc">Registre premissas de crescimento, cenários alternativos, riscos e oportunidades.</p>
    <textarea [(ngModel)]="dados.pfObservacoes" (input)="onFieldChange()" rows="4" placeholder="Ex: Considerei crescimento de X% na renda..." [disabled]="readOnly"></textarea>
  </div>

  <!-- Nav buttons -->
  <div class="ma-tab-nav-buttons">
    <button class="ma-btn-prev" (click)="showTab('patrimonio')"><i class="fa-solid fa-arrow-left"></i> Estratificação do Patrimônio</button>
    <button class="ma-btn-next" (click)="showTab('rastreamento')">Rastreamento <i class="fa-solid fa-arrow-right"></i></button>
  </div>
</div>

<!-- ═══ TAB 7 — RASTREAMENTO ═══ -->
<div *ngIf="activeTab === 'rastreamento'" class="ma-tab-panel">

  <div class="ma-card ma-mb-20">
    <div class="ma-card-label">Rastreamento Mensal</div>
    <table class="ma-tracking-table">
      <thead>
        <tr>
          <th style="width:150px">Data</th>
          <th style="width:190px">Patrimônio Atual (R$)</th>
          <th style="width:90px">% da Meta</th>
          <th>Notas / Progresso</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let row of dados.tracking">
          <td><input type="date" [(ngModel)]="row.data" (input)="onFieldChange()" [disabled]="readOnly"></td>
          <td><input type="text" appCurrencyMask [(ngModel)]="row.patrimonio" (ngModelChange)="onFieldChange()" placeholder="R$ 0,00" [disabled]="readOnly"></td>
          <td style="text-align:center">
            <span class="ma-pct-badge" [ngClass]="getTrackingPctClass(row.patrimonio)">{{ getTrackingPct(row.patrimonio) }}</span>
          </td>
          <td><input type="text" [(ngModel)]="row.notas" (input)="onFieldChange()" placeholder="Observações..." [disabled]="readOnly"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="ma-grid-2">
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Reflexão</div>
      <h3>Maior aprendizado preenchendo o Mapa de Ambição</h3>
      <textarea [(ngModel)]="dados.refAprendizado" (input)="onFieldChange()" rows="5" placeholder="O que de mais importante você aprendeu..." [disabled]="readOnly"></textarea>
    </div>
    <div class="ma-card" style="margin:0">
      <div class="ma-card-label">Próximos Passos</div>
      <h3>Próximos passos</h3>
      <textarea [(ngModel)]="dados.refProximos" (input)="onFieldChange()" rows="5" placeholder="Passos concretos para os próximos meses..." [disabled]="readOnly"></textarea>
    </div>
  </div>

  <!-- Nav buttons -->
  <div class="ma-tab-nav-buttons">
    <button class="ma-btn-prev" (click)="showTab('planofinanceiro')"><i class="fa-solid fa-arrow-left"></i> Plano Financeiro</button>
    <button class="ma-btn-next" (click)="showTab('dashboard')"><i class="fa-solid fa-rotate-left"></i> Voltar ao Dashboard</button>
  </div>
</div>

</div>

<!-- Saving indicator -->
<div *ngIf="salvando" class="ma-saving-indicator">
  <i class="fa-solid fa-spinner fa-spin"></i> Salvando...
</div>
  `,
  styles: [`
:host {
  display: block;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  color: #1a202c;
  line-height: 1.6;
}

/* ══════════════════════════════════
   NAV TABS
   ══════════════════════════════════ */
.ma-nav-bar {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 6px;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  margin-bottom: 2.5rem;
}
.ma-nav-tab {
  padding: 12px 18px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ma-nav-tab:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.06); }
.ma-nav-tab.active { color: #022c22; background: white; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.ma-tab-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,255,255,0.1);
  font-size: 11px; font-weight: 700;
  transition: all 0.3s;
}
.ma-nav-tab.active .ma-tab-num { background: #022c22; color: white; }

/* ══════════════════════════════════
   LAYOUT
   ══════════════════════════════════ */
.ma-main-content { max-width: 1200px; margin: 0 auto; }
.ma-tab-panel { animation: maFadeIn 0.4s ease-out; }
@keyframes maFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

.ma-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.ma-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.ma-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }

/* ══════════════════════════════════
   CARDS
   ══════════════════════════════════ */
.ma-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
}
.ma-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
.ma-card + .ma-card { margin-top: 1.25rem; }
.ma-card-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #00B74F;
  margin-bottom: 0.75rem;
}
.ma-card h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #022c22;
  margin: 0 0 0.25rem 0;
}
.ma-desc {
  font-size: 0.875rem;
  color: #4a5568;
  margin-bottom: 1rem;
  line-height: 1.6;
}
.ma-card-key {
  border-left: 4px solid #00B74F;
  background: white;
}

/* ══════════════════════════════════
   FORM INPUTS
   ══════════════════════════════════ */
textarea, input[type="text"], input[type="number"], input[type="date"] {
  width: 100%;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.875rem 1rem;
  font-family: inherit;
  font-size: 0.9375rem;
  color: #022c22;
  background: #f9fafb;
  transition: all 0.3s;
  outline: none;
}
textarea:focus, input:focus {
  border-color: #00B74F;
  background: white;
  box-shadow: 0 0 0 4px rgba(0, 183, 79, 0.1);
}
textarea::placeholder, input::placeholder { color: rgba(2, 44, 34, 0.35); }
textarea { min-height: 100px; resize: vertical; line-height: 1.6; }
input:not([type="checkbox"]):not([type="radio"]) { height: 50px; box-sizing: border-box; }
input[type="number"] { font-variant-numeric: tabular-nums; }
.ma-field-label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
.ma-field-group { display: flex; flex-direction: column; }
.ma-input-readonly { background: #f0f0f0 !important; cursor: default; color: #666; }
select {
  width: 100%; border: 2px solid #e5e7eb; border-radius: 12px;
  padding: 0.75rem 1rem; font-family: inherit; font-size: 0.875rem;
  color: #022c22; background: #f9fafb; outline: none; cursor: pointer;
  transition: all 0.3s;
}
select:focus { border-color: #00B74F; box-shadow: 0 0 0 4px rgba(0,183,79,0.1); }

/* ══════════════════════════════════
   INFO STRIP
   ══════════════════════════════════ */
.ma-info-strip {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 1.75rem 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

/* ══════════════════════════════════
   KPI CARDS
   ══════════════════════════════════ */
.ma-kpi-card {
  background: white;
  border: 2px solid rgba(2, 44, 34, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}
.ma-kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(2, 44, 34, 0.15);
  border-color: rgba(2, 44, 34, 0.25);
}
.ma-kpi-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #666;
  margin-bottom: 0.5rem;
}
.ma-kpi-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #022c22;
  line-height: 1.15;
}
.ma-kpi-sub {
  font-size: 0.75rem;
  color: #999;
  margin-top: 0.35rem;
}
.ma-kpi-highlight {
  background: #022c22 !important;
  border-color: transparent !important;
}
.ma-kpi-highlight .ma-kpi-label { color: rgba(255,255,255,0.5); }
.ma-kpi-highlight .ma-kpi-value { color: white; }
.ma-kpi-highlight .ma-kpi-sub { color: rgba(255,255,255,0.4); }
.ma-progress-wrap { margin-top: 1rem; }
.ma-progress-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.12); border-radius: 3px; overflow: hidden; }
.ma-progress-fill { height: 100%; background: #00B74F; border-radius: 3px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

/* ══════════════════════════════════
   CHARTS
   ══════════════════════════════════ */
.ma-chart-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.ma-chart-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #00B74F;
  margin-bottom: 1.25rem;
}
.ma-chart-wrap { position: relative; width: 100%; height: 280px; display: flex; align-items: center; justify-content: center; }
.ma-chart-wrap canvas { width: 100% !important; }
.ma-chart-empty { color: #999; font-size: 0.875rem; text-align: center; line-height: 1.6; }

/* ══════════════════════════════════
   EXPENSE TABLE
   ══════════════════════════════════ */
.ma-expense-section { margin-bottom: 1.5rem; }
.ma-expense-section-title {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.2px; color: #022c22;
  padding: 0.75rem 0; border-bottom: 2px solid rgba(2,44,34,0.1); margin-bottom: 0.5rem;
}
.ma-expense-header {
  display: grid; grid-template-columns: 1fr 150px 150px 180px; gap: 10px;
  padding: 0.75rem 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 0.5rem;
}
.ma-expense-header span { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; }
.ma-expense-header span:nth-child(2), .ma-expense-header span:nth-child(3) { text-align: right; }
.ma-expense-row {
  display: grid; grid-template-columns: 1fr 150px 150px 180px; gap: 10px;
  align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0;
}
.ma-expense-name { font-size: 0.875rem; color: #374151; }
.ma-expense-row input { padding: 0.625rem 0.75rem; font-size: 0.875rem; }
.ma-expense-row input:nth-child(2) { text-align: right; }
.ma-expense-row input:last-child { text-align: left; font-size: 0.8rem; }
.ma-annual-value {
  text-align: right; font-size: 0.875rem; color: #666;
  font-variant-numeric: tabular-nums; padding: 0.625rem 0.75rem;
  background: #f3f4f6; border-radius: 10px;
}
.ma-travel-calc {
  display: grid; grid-template-columns: 1fr 100px 30px 100px 150px 180px; gap: 8px;
  align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0;
}
.ma-travel-x { text-align: center; color: #999; font-size: 0.875rem; font-weight: 600; }
.ma-total-row {
  display: grid; grid-template-columns: 1fr 150px 150px 180px; gap: 10px;
  padding: 1.25rem 0 0; border-top: 3px solid #022c22; margin-top: 0.75rem;
}
.ma-total-label { font-weight: 700; font-size: 1rem; color: #022c22; }
.ma-total-value { text-align: right; font-size: 1.375rem; font-weight: 800; color: #022c22; }

.ma-patrimonio-banner {
  background: linear-gradient(135deg, #022c22 0%, #014d3a 100%);
  border-radius: 16px; padding: 1.5rem 2rem; margin-top: 1.5rem;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 8px 24px rgba(2,44,34,0.3);
}
.ma-pat-label { color: rgba(255,255,255,0.6); font-size: 0.8rem; font-weight: 500; }
.ma-pat-sub { color: rgba(255,255,255,0.35); font-size: 0.7rem; margin-top: 0.15rem; }
.ma-pat-value { color: white; font-size: 1.75rem; font-weight: 800; }

/* ══════════════════════════════════
   PATRIMONIO STRATEGY TABLE
   ══════════════════════════════════ */
.ma-pat-strat-header {
  display: grid; grid-template-columns: 1fr 200px 200px; gap: 12px;
  padding: 0.75rem 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 0.5rem;
}
.ma-pat-strat-header span { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; }
.ma-pat-strat-header span:not(:first-child) { text-align: right; }
.ma-pat-strat-row {
  display: grid; grid-template-columns: 1fr 200px 200px; gap: 12px;
  align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #f0f0f0;
}
.ma-ps-name { font-size: 0.9rem; color: #374151; display: flex; align-items: center; gap: 10px; }
.ma-ps-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.ma-pat-strat-row input { text-align: right; padding: 0.75rem 1rem; font-size: 0.9375rem; }
.ma-ps-pct {
  text-align: right; font-size: 0.875rem; font-weight: 700; color: #666;
  padding: 0.75rem 1rem; background: #f3f4f6; border-radius: 10px; font-variant-numeric: tabular-nums;
}
.ma-pat-strat-total {
  display: grid; grid-template-columns: 1fr 200px 200px; gap: 12px;
  padding: 1.25rem 0 0; border-top: 3px solid #022c22; margin-top: 0.75rem;
}
.ma-pst-label { font-weight: 700; font-size: 1.05rem; color: #022c22; }
.ma-pst-value { text-align: right; font-size: 1.375rem; font-weight: 800; color: #022c22; }

/* ══════════════════════════════════
   PLANO PAT BADGE
   ══════════════════════════════════ */
.ma-plano-pat-badge {
  background: linear-gradient(135deg, rgba(0,183,79,0.08) 0%, rgba(2,44,34,0.04) 100%);
  border: 2px solid rgba(2,44,34,0.15); border-radius: 14px;
  padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center;
}
.ma-plano-pat-badge span:first-child { color: #022c22; font-weight: 500; font-size: 0.9rem; }
.ma-plano-pat-badge span:last-child { font-size: 1.375rem; font-weight: 800; color: #022c22; }

/* ══════════════════════════════════
   TIMELINE
   ══════════════════════════════════ */
.ma-timeline-container { position: relative; }
.ma-timeline-phase { position: relative; padding-left: 40px; padding-bottom: 2.5rem; }
.ma-timeline-phase:last-child { padding-bottom: 0; }
.ma-timeline-phase::before { content: ''; position: absolute; left: 14px; top: 36px; bottom: 0; width: 2px; background: #e5e7eb; }
.ma-timeline-phase:last-child::before { display: none; }
.ma-timeline-dot {
  position: absolute; left: 4px; top: 6px; width: 22px; height: 22px; border-radius: 50%;
  display: grid; place-items: center; font-size: 10px; font-weight: 700; color: white; z-index: 1;
}
.ma-timeline-dot.dot-short { background: #022c22; }
.ma-timeline-dot.dot-medium { background: #047857; }
.ma-timeline-dot.dot-long { background: #00B74F; }
.ma-phase-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
.ma-phase-badge {
  font-size: 0.65rem; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; padding: 0.25rem 0.75rem; border-radius: 20px;
}
.ma-phase-badge.badge-short { background: rgba(2,44,34,0.1); color: #022c22; }
.ma-phase-badge.badge-medium { background: rgba(4,120,87,0.1); color: #047857; }
.ma-phase-badge.badge-long { background: rgba(0,183,79,0.1); color: #00B74F; }
.ma-phase-title { font-size: 1.25rem; font-weight: 700; color: #022c22; }
.ma-phase-subtitle { font-size: 0.85rem; color: #4a5568; margin-bottom: 1rem; }
.ma-meta-parcial-banner {
  border-radius: 14px; padding: 1rem 1.25rem; display: flex;
  justify-content: space-between; align-items: center; margin-bottom: 1rem;
}
.ma-meta-parcial-banner.banner-short { background: rgba(2,44,34,0.06); border: 2px solid rgba(2,44,34,0.12); }
.ma-meta-parcial-banner.banner-medium { background: rgba(4,120,87,0.06); border: 2px solid rgba(4,120,87,0.12); }
.ma-meta-parcial-banner.banner-long { background: rgba(0,183,79,0.06); border: 2px solid rgba(0,183,79,0.12); }
.ma-mpb-label { font-size: 0.85rem; font-weight: 600; color: #022c22; }
.ma-mpb-final-value { font-size: 1.25rem; font-weight: 800; color: #022c22; }
.ma-meta-input { text-align: right; width: 200px; font-size: 1rem; font-weight: 700; padding: 0.75rem 1rem; }
.ma-action-header {
  display: grid; grid-template-columns: 1fr 140px 130px 36px; gap: 10px;
  padding: 0.625rem 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 0.25rem;
}
.ma-action-header span { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; }
.ma-action-row {
  display: grid; grid-template-columns: 1fr 140px 130px 36px; gap: 10px;
  align-items: start; padding: 0.75rem 0; border-bottom: 1px solid #f0f0f0;
}
.ma-action-row textarea { min-height: 44px; padding: 0.625rem 0.875rem; font-size: 0.85rem; resize: vertical; }
.ma-action-row input[type="text"] { padding: 0.625rem 0.875rem; font-size: 0.85rem; }
.ma-action-row select { font-size: 0.8rem; padding: 0.5rem 0.5rem; min-width: 0; }
.ma-btn-remove-action {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; margin-top: 6px;
  border: none; border-radius: 6px; cursor: pointer;
  background: #fee2e2; color: #dc2626; font-size: 0.8rem;
  transition: background 0.2s;
}
.ma-btn-remove-action:hover { background: #fca5a5; }

/* ══════════════════════════════════
   BUTTONS
   ══════════════════════════════════ */
.ma-btn-add {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0.75rem 1.25rem; margin-top: 0.75rem;
  background: rgba(2,44,34,0.08); border: 2px solid rgba(2,44,34,0.15);
  border-radius: 12px; color: #022c22; cursor: pointer;
  font-family: inherit; font-size: 0.8rem; font-weight: 600;
  transition: all 0.3s ease;
}
.ma-btn-add:hover { background: rgba(2,44,34,0.15); border-color: #014d3a; transform: translateY(-2px); }

/* ══════════════════════════════════
   TRACKING TABLE
   ══════════════════════════════════ */
.ma-tracking-table { width: 100%; border-collapse: collapse; }
.ma-tracking-table thead tr { background: #022c22; color: white; }
.ma-tracking-table th {
  padding: 0.875rem 0.75rem; font-weight: 600;
  border: 1px solid rgba(2,44,34,0.3); font-size: 0.8rem; text-align: left;
}
.ma-tracking-table th:nth-child(3) { text-align: center; }
.ma-tracking-table td { border: 1px solid #e5e7eb; padding: 0.5rem; vertical-align: middle; }
.ma-tracking-table td input { border-radius: 8px; padding: 0.5rem 0.625rem; font-size: 0.85rem; }
.ma-pct-badge {
  display: inline-block; padding: 0.2rem 0.625rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 700; text-align: center; min-width: 52px;
}
.ma-pct-badge.pct-low { background: #f3f4f6; color: #999; }
.ma-pct-badge.pct-mid { background: rgba(4,120,87,0.1); color: #047857; }
.ma-pct-badge.pct-high { background: rgba(0,183,79,0.15); color: #022c22; }

/* ══════════════════════════════════
   SAVING INDICATOR
   ══════════════════════════════════ */
.ma-saving-indicator {
  position: fixed; bottom: 20px; right: 20px;
  background: #022c22; color: white;
  padding: 0.75rem 1.5rem; border-radius: 12px;
  font-size: 0.875rem; font-weight: 500;
  z-index: 1000; box-shadow: 0 8px 24px rgba(2,44,34,0.3);
  display: flex; align-items: center; gap: 8px;
}

/* ══════════════════════════════════
   TAB NAV BUTTONS
   ══════════════════════════════════ */
.ma-tab-nav-buttons {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 2.5rem; padding-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.15);
}
.ma-btn-prev, .ma-btn-next {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0.75rem 1.5rem; border-radius: 12px;
  font-size: 0.9rem; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.2s ease;
  border: 2px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.1); color: white;
}
.ma-btn-prev:hover, .ma-btn-next:hover {
  background: white; color: #022c22;
  border-color: white;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.ma-btn-next {
  margin-left: auto;
}
.ma-btn-prev i, .ma-btn-next i { font-size: 0.8rem; }

/* ══════════════════════════════════
   UTILITIES
   ══════════════════════════════════ */
.ma-mb-16 { margin-bottom: 1rem; }
.ma-mb-20 { margin-bottom: 1.25rem; }
.ma-mb-24 { margin-bottom: 1.5rem; }
.ma-mt-20 { margin-top: 1.25rem; }

/* ══════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════ */
@media(max-width:900px) {
  .ma-nav-bar { flex-wrap: wrap; }
  .ma-nav-tab { padding: 10px 14px; font-size: 12px; }
  .ma-grid-2, .ma-grid-3, .ma-grid-2-1 { grid-template-columns: 1fr; }
  .ma-info-strip { grid-template-columns: 1fr; }
  .ma-expense-row, .ma-expense-header, .ma-total-row { grid-template-columns: 1fr 110px 110px 140px; gap: 6px; }
  .ma-travel-calc { grid-template-columns: 1fr; gap: 6px; }
  .ma-patrimonio-banner { flex-direction: column; gap: 0.5rem; text-align: center; }
  .ma-pat-strat-row, .ma-pat-strat-header, .ma-pat-strat-total { grid-template-columns: 1fr 140px 140px; gap: 8px; }
}
  `]
})
export class MapaAmbicaoComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() token: string = '';
  @Input() readOnly: boolean = false;
  @Input() nomeMentorado: string = '';
  @Input() cargoMentorado: string = '';

  @ViewChild('navBar') navBarRef!: ElementRef;
  @ViewChild('chartExpenses') chartExpensesRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPatrimonio') chartPatrimonioRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartProjecao') chartProjecaoRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPatStrat') chartPatStratRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartRoadmap') chartRoadmapRef!: ElementRef<HTMLCanvasElement>;

  Math = Math;
  activeTab: string = 'dashboard';

  tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'proposito', label: 'Propósito e Visão' },
    { id: 'estilo', label: 'Estilo de Vida' },
    { id: 'plano', label: 'Plano de Ação' },
    { id: 'patrimonio', label: 'Estratificação do Patrimônio' },
    { id: 'planofinanceiro', label: 'Plano de Ação Financeiro' },
    { id: 'rastreamento', label: 'Rastreamento' }
  ];

  dados: any = this.getDefaultDados();
  mapaAmbicaoId: number | null = null;
  salvando: boolean = false;
  exportando: boolean = false;

  totalAnual: number = 0;
  patrimonioNecessario: number = 0;
  patrimonioAtual: number = 0;
  progressoPct: number = 0;
  diferenca: number = 0;
  tempoEstimado: string = '— anos';

  hasExpenseData: boolean = false;
  hasPatrimonioData: boolean = false;
  hasProjecaoData: boolean = false;
  hasAssetData: boolean = false;
  hasRoadmapData: boolean = false;

  private chartExpenses: Chart | null = null;
  private chartPatrimonio: Chart | null = null;
  private chartProjecao: Chart | null = null;
  private chartPatStrat: Chart | null = null;
  private chartRoadmap: Chart | null = null;

  private saveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  expenseSections = [
    {
      title: 'Despesas Básicas de Alto Padrão',
      items: [
        { id: 'moradia', label: 'Moradia (aluguel/manutenção, impostos, funcionários)', type: 'monthly', cat: 'basicas' },
        { id: 'contas', label: 'Contas (água, luz, gás, internet, segurança)', type: 'monthly', cat: 'basicas' },
        { id: 'alimentacao', label: 'Alimentação e Bebidas Premium', type: 'monthly', cat: 'basicas' },
        { id: 'transporte', label: 'Transporte (combustível, manutenção, motorista)', type: 'monthly', cat: 'basicas' },
        { id: 'seguros', label: 'Seguros (residencial, veículos, vida)', type: 'monthly', cat: 'basicas' }
      ]
    },
    {
      title: 'Saúde e Bem-estar',
      items: [
        { id: 'saude-plano', label: 'Planos de Saúde Premium', type: 'monthly', cat: 'saude' },
        { id: 'saude-tratamentos', label: 'Tratamentos e Procedimentos Médicos', type: 'monthly', cat: 'saude' },
        { id: 'saude-personal', label: 'Personal Trainer e Academia', type: 'monthly', cat: 'saude' },
        { id: 'saude-terapia', label: 'Terapias (psicológica, coaching, etc.)', type: 'monthly', cat: 'saude' },
        { id: 'saude-spa', label: 'Spa, Massagem e Bem-estar', type: 'monthly', cat: 'saude' }
      ]
    },
    {
      title: 'Viagens e Lazer',
      items: [
        { id: 'viagem-int', label: 'Viagens internacionais', type: 'travel', cat: 'viagens' },
        { id: 'viagem-nac', label: 'Viagens nacionais', type: 'travel', cat: 'viagens' },
        { id: 'lazer', label: 'Lazer e Entretenimento (cinemas, shows, etc.)', type: 'monthly', cat: 'viagens' }
      ]
    },
    {
      title: 'Filantropia e Legado',
      items: [{ id: 'filantropia', label: 'Doações e Investimentos em Causas Sociais', type: 'monthly', cat: 'filantropia' }]
    },
    {
      title: 'Hobbies e Paixões',
      items: [{ id: 'hobbies', label: 'Carros, Barcos, Arte, Vinhos, Esportes', type: 'monthly', cat: 'hobbies' }]
    },
    {
      title: 'Família e Educação',
      items: [
        { id: 'educacao', label: 'Educação dos Filhos (escolas, cursos, etc.)', type: 'monthly', cat: 'familia' },
        { id: 'familia', label: 'Ajuda a Familiares', type: 'monthly', cat: 'familia' }
      ]
    },
    {
      title: 'Fundo para Loucuras',
      items: [{ id: 'loucuras', label: 'Desejos e Compras Não Planejadas (valor anual)', type: 'annual', cat: 'loucuras' }]
    }
  ];

  assetCategories = [
    { id: 'imoveis', label: 'Imóveis', color: '#022c22' },
    { id: 'investimentos', label: 'Investimentos Bancários (CDB, LCI, Fundos)', color: '#014d3a' },
    { id: 'acoes', label: 'Ações e Renda Variável', color: '#047857' },
    { id: 'saldos', label: 'Saldos em Contas (corrente, poupança)', color: '#00B74F' },
    { id: 'societaria', label: 'Participação Societária / Empresas', color: '#34d399' },
    { id: 'veiculos', label: 'Veículos (carros, motos, embarcações)', color: '#6ee7b7' },
    { id: 'previdencia', label: 'Previdência Privada', color: '#a7f3d0' },
    { id: 'outros', label: 'Outros Ativos (arte, joias, coleções, etc.)', color: '#d1fae5' }
  ];

  constructor(
    private mentoriaService: MentoriaService,
    private toastr: ToastrService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.saveSubject.pipe(
      debounceTime(2000),
      takeUntil(this.destroy$)
    ).subscribe(() => this.salvar());

    if (this.token) this.carregarDados();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
  }

  getDefaultDados(): any {
    return {
      ceoNome: '', ceoCargo: '', ceoData: new Date().toISOString().split('T')[0],
      rendaAnual: null, dashBloqueio: '', dashAcao: '',
      p1Visao: '', p1Atividades: '', p1Legado: '', p1Causas: '', p1Dia: '',
      p3Negocio: '', p3Acoes: '', p3Depois: '', p3Limites: '',
      expenses: {} as Record<string, number>,
      expenseObs: {} as Record<string, string>,
      assets: {} as Record<string, number>,
      patObservacoes: '',
      pfMeta1: null, pfMeta3: null, pfObservacoes: '',
      actionsShort: [{ descricao: '', prazo: '', status: '' }, { descricao: '', prazo: '', status: '' }, { descricao: '', prazo: '', status: '' }],
      actionsMedium: [{ descricao: '', prazo: '', status: '' }, { descricao: '', prazo: '', status: '' }, { descricao: '', prazo: '', status: '' }],
      actionsLong: [{ descricao: '', prazo: '', status: '' }, { descricao: '', prazo: '', status: '' }, { descricao: '', prazo: '', status: '' }],
      tracking: Array.from({ length: 12 }, () => ({ data: '', patrimonio: null, notas: '' })),
      refAprendizado: '', refProximos: ''
    };
  }

  carregarDados(): void {
    this.mentoriaService.obterMapaAmbicaoPublico(this.token).subscribe({
      next: (response: any) => {
        if (response.success && response.data && response.data.dados) {
          this.mapaAmbicaoId = response.data.id;
          const saved = response.data.dados;
          this.dados = { ...this.getDefaultDados(), ...saved };
          if (saved.expenses) this.dados.expenses = { ...this.getDefaultDados().expenses, ...saved.expenses };
          if (saved.expenseObs) this.dados.expenseObs = { ...this.getDefaultDados().expenseObs, ...saved.expenseObs };
          if (saved.assets) this.dados.assets = { ...this.getDefaultDados().assets, ...saved.assets };
          if (saved.actionsShort) this.dados.actionsShort = saved.actionsShort;
          if (saved.actionsMedium) this.dados.actionsMedium = saved.actionsMedium;
          if (saved.actionsLong) this.dados.actionsLong = saved.actionsLong;
          if (saved.tracking) this.dados.tracking = saved.tracking;
          this.calcExpenses();
          this.calcPatrimonio();
          this.recalcDashboard();
          setTimeout(() => this.updateAllCharts(), 300);
        }
        // Preencher nome e cargo da mentoria se campos estiverem vazios
        if (!this.dados.ceoNome && this.nomeMentorado) {
          this.dados.ceoNome = this.nomeMentorado;
        }
        if (!this.dados.ceoCargo && this.cargoMentorado) {
          this.dados.ceoCargo = this.cargoMentorado;
        }
      },
      error: (error: any) => console.warn('Erro ao carregar Mapa de Ambição:', error)
    });
  }

  onFieldChange(): void { this.saveSubject.next(); }

  salvar(): void {
    if (!this.token || this.readOnly) return;
    this.salvando = true;
    this.mentoriaService.salvarMapaAmbicao(this.token, this.dados).subscribe({
      next: (response: any) => {
        if (response.data?.id) this.mapaAmbicaoId = response.data.id;
        this.salvando = false;
      },
      error: (error: any) => {
        console.error('Erro ao salvar Mapa de Ambição:', error);
        this.toastr.error('Erro ao salvar Mapa de Ambição');
        this.salvando = false;
      }
    });
  }

  showTab(id: string): void {
    this.activeTab = id;
    setTimeout(() => {
      if (this.navBarRef?.nativeElement) {
        this.navBarRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        this.elementRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Fallback: scroll do window para o topo caso esteja em contexto de página inteira
      window.scrollTo({ top: this.elementRef.nativeElement.offsetTop, behavior: 'smooth' });
    }, 50);
    setTimeout(() => {
      if (id === 'dashboard') this.updateDashboardCharts();
      if (id === 'patrimonio') this.updatePatChart();
      if (id === 'planofinanceiro') this.updateRoadmapChart();
    }, 150);
  }

  fmtBRL(v: number | null | undefined): string {
    if (!v || isNaN(v)) return 'R$ 0';
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  fmtCompact(v: number): string {
    if (!v || v === 0) return 'R$ 0';
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' mi';
    if (v >= 1e3) return 'R$ ' + (v / 1e3).toFixed(0) + ' mil';
    return this.fmtBRL(v);
  }

  getTravelAnnual(id: string): number {
    return (this.dados.expenses[id + '-qtd'] || 0) * (this.dados.expenses[id + '-custo'] || 0);
  }

  calcExpenses(): void {
    let total = 0;
    for (const section of this.expenseSections) {
      for (const item of section.items) {
        if (item.type === 'monthly') total += (this.dados.expenses[item.id] || 0) * 12;
        else if (item.type === 'travel') total += this.getTravelAnnual(item.id);
        else if (item.type === 'annual') total += this.dados.expenses[item.id] || 0;
      }
    }
    this.totalAnual = total;
    this.patrimonioNecessario = total > 0 ? total / 0.06 : 0;
    this.recalcDashboard();
    this.onFieldChange();
  }

  calcPatrimonio(): void {
    let total = 0;
    for (const asset of this.assetCategories) total += this.dados.assets[asset.id] || 0;
    this.patrimonioAtual = total;
    this.recalcDashboard();
    this.onFieldChange();
    if (this.activeTab === 'patrimonio') setTimeout(() => this.updatePatChart(), 100);
  }

  getAssetPct(id: string): string {
    if (this.patrimonioAtual <= 0) return '0.0';
    return ((this.dados.assets[id] || 0) / this.patrimonioAtual * 100).toFixed(1);
  }

  recalcDashboard(): void {
    const ra = this.dados.rendaAnual || 0;
    this.diferenca = Math.max(0, this.patrimonioNecessario - this.patrimonioAtual);
    this.progressoPct = this.patrimonioNecessario > 0 ? Math.min(100, (this.patrimonioAtual / this.patrimonioNecessario) * 100) : 0;
    this.tempoEstimado = ra > 0 ? (this.diferenca / ra).toFixed(1) + ' anos' : '— anos';
    this.hasExpenseData = this.totalAnual > 0;
    this.hasPatrimonioData = this.patrimonioAtual > 0 || this.patrimonioNecessario > 0;
    this.hasProjecaoData = this.patrimonioAtual > 0 && ra > 0;
    this.hasAssetData = this.patrimonioAtual > 0;
    this.hasRoadmapData = (this.dados.pfMeta1 > 0 || this.dados.pfMeta3 > 0 || this.patrimonioNecessario > 0);
  }

  getTrackingPct(patrimonio: number | null): string {
    if (!patrimonio || patrimonio <= 0 || this.patrimonioNecessario <= 0) return '—';
    return ((patrimonio / this.patrimonioNecessario) * 100).toFixed(1) + '%';
  }

  getTrackingPctClass(patrimonio: number | null): string {
    if (!patrimonio || patrimonio <= 0 || this.patrimonioNecessario <= 0) return 'pct-low';
    const p = (patrimonio / this.patrimonioNecessario) * 100;
    return p < 30 ? 'pct-low' : p < 70 ? 'pct-mid' : 'pct-high';
  }

  addAction(phase: string): void {
    const action = { descricao: '', prazo: '', status: '' };
    if (phase === 'short') this.dados.actionsShort.push(action);
    else if (phase === 'medium') this.dados.actionsMedium.push(action);
    else if (phase === 'long') this.dados.actionsLong.push(action);
    this.onFieldChange();
  }

  removeAction(phase: string, index: number): void {
    if (phase === 'short') this.dados.actionsShort.splice(index, 1);
    else if (phase === 'medium') this.dados.actionsMedium.splice(index, 1);
    else if (phase === 'long') this.dados.actionsLong.splice(index, 1);
    this.onFieldChange();
  }

  // ═══ CHARTS ═══

  private destroyAllCharts(): void {
    [this.chartExpenses, this.chartPatrimonio, this.chartProjecao, this.chartPatStrat, this.chartRoadmap]
      .forEach(c => { if (c) c.destroy(); });
    this.chartExpenses = this.chartPatrimonio = this.chartProjecao = this.chartPatStrat = this.chartRoadmap = null;
  }

  private updateAllCharts(): void {
    this.updateDashboardCharts();
    this.updatePatChart();
    this.updateRoadmapChart();
  }

  private getCategoryTotals(): Record<string, number> {
    const cats: Record<string, number> = {
      'Despesas Básicas': 0, 'Saúde e Bem-estar': 0, 'Viagens e Lazer': 0,
      'Filantropia': 0, 'Hobbies': 0, 'Família e Educação': 0, 'Fundo Loucuras': 0
    };
    const catMap: Record<string, string> = {
      'basicas': 'Despesas Básicas', 'saude': 'Saúde e Bem-estar', 'viagens': 'Viagens e Lazer',
      'filantropia': 'Filantropia', 'hobbies': 'Hobbies', 'familia': 'Família e Educação', 'loucuras': 'Fundo Loucuras'
    };
    for (const section of this.expenseSections) {
      for (const item of section.items) {
        const cat = catMap[item.cat] || 'Despesas Básicas';
        if (item.type === 'monthly') cats[cat] += (this.dados.expenses[item.id] || 0) * 12;
        else if (item.type === 'travel') cats[cat] += this.getTravelAnnual(item.id);
        else if (item.type === 'annual') cats[cat] += this.dados.expenses[item.id] || 0;
      }
    }
    return cats;
  }

  private chartOpts(extra: any = {}): any {
    return { responsive: true, maintainAspectRatio: false, ...extra };
  }

  updateDashboardCharts(): void {
    const COLORS = ['#022c22', '#014d3a', '#047857', '#00B74F', '#34d399', '#6ee7b7', '#a7f3d0'];

    // Donut - Expenses
    if (this.chartExpensesRef?.nativeElement && this.hasExpenseData) {
      const cats = this.getCategoryTotals();
      const labels = Object.keys(cats).filter((_, i) => Object.values(cats)[i] > 0);
      const values = Object.values(cats).filter(v => v > 0);
      const colors = COLORS.filter((_, i) => Object.values(cats)[i] > 0);
      if (this.chartExpenses) this.chartExpenses.destroy();
      this.chartExpenses = new Chart(this.chartExpensesRef.nativeElement, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
        options: this.chartOpts({
          cutout: '65%',
          plugins: {
            legend: { position: 'right' as const, labels: { boxWidth: 10, boxHeight: 10, padding: 12, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' as const } },
            tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.label + ': ' + this.fmtBRL(ctx.parsed) + '/ano' } }
          }
        })
      });
    }

    // Bar - Patrimônio
    if (this.chartPatrimonioRef?.nativeElement && this.hasPatrimonioData) {
      if (this.chartPatrimonio) this.chartPatrimonio.destroy();
      this.chartPatrimonio = new Chart(this.chartPatrimonioRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Patrimônio Atual', 'Diferença', 'Patrimônio Necessário'],
          datasets: [{ data: [this.patrimonioAtual, this.diferenca, this.patrimonioNecessario], backgroundColor: ['#00B74F', '#047857', '#022c22'], borderRadius: 8, barThickness: 48 }]
        },
        options: this.chartOpts({
          indexAxis: 'y' as const,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ' ' + this.fmtBRL(ctx.parsed.x) } } },
          scales: { x: { ticks: { callback: (v: any) => this.fmtCompact(v as number) } }, y: { grid: { display: false } } }
        })
      });
    }

    // Line - Projeção
    if (this.chartProjecaoRef?.nativeElement && this.hasProjecaoData) {
      const ra = this.dados.rendaAnual || 0;
      const yrs: string[] = []; const pv: number[] = []; const ml: (number | null)[] = [];
      let acum = this.patrimonioAtual;
      const mx = Math.min(30, this.patrimonioNecessario > 0 ? Math.ceil((this.patrimonioNecessario - this.patrimonioAtual) / ra) + 3 : 15);
      for (let y = 0; y <= mx; y++) { yrs.push('Ano ' + y); pv.push(Math.round(acum)); ml.push(this.patrimonioNecessario > 0 ? this.patrimonioNecessario : null); acum += ra; }
      if (this.chartProjecao) this.chartProjecao.destroy();
      this.chartProjecao = new Chart(this.chartProjecaoRef.nativeElement, {
        type: 'line',
        data: { labels: yrs, datasets: [
          { label: 'Patrimônio Projetado', data: pv, borderColor: '#022c22', backgroundColor: 'rgba(2,44,34,0.06)', fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2.5 },
          { label: 'Meta', data: ml, borderColor: '#00B74F', borderDash: [6, 4], pointRadius: 0, borderWidth: 2, fill: false }
        ] },
        options: this.chartOpts({
          plugins: { legend: { labels: { boxWidth: 12, font: { size: 10.5 } } }, tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.dataset.label + ': ' + this.fmtBRL(ctx.parsed.y) } } },
          scales: { x: { grid: { display: false }, ticks: { maxRotation: 0 } }, y: { ticks: { callback: (v: any) => this.fmtCompact(v as number) } } }
        })
      });
    }
  }

  updatePatChart(): void {
    if (!this.chartPatStratRef?.nativeElement || !this.hasAssetData) return;
    const vals = this.assetCategories.map(a => this.dados.assets[a.id] || 0);
    const labels = this.assetCategories.filter((_, i) => vals[i] > 0).map(a => a.label);
    const fVals = vals.filter(v => v > 0);
    const fColors = this.assetCategories.filter((_, i) => vals[i] > 0).map(a => a.color);
    if (this.chartPatStrat) this.chartPatStrat.destroy();
    this.chartPatStrat = new Chart(this.chartPatStratRef.nativeElement, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: fVals, backgroundColor: fColors, borderWidth: 2, borderColor: '#fff' }] },
      options: this.chartOpts({
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom' as const, labels: { boxWidth: 10, boxHeight: 10, padding: 10, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' as const } },
          tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.label + ': ' + this.fmtBRL(ctx.parsed) } }
        }
      })
    });
  }

  updateRoadmapChart(): void {
    if (!this.chartRoadmapRef?.nativeElement) return;
    const pa = this.patrimonioAtual; const m1 = this.dados.pfMeta1 || 0; const m3 = this.dados.pfMeta3 || 0; const pn = this.patrimonioNecessario;
    this.hasRoadmapData = (m1 > 0 || m3 > 0 || pn > 0);
    if (!this.hasRoadmapData) { if (this.chartRoadmap) { this.chartRoadmap.destroy(); this.chartRoadmap = null; } return; }
    const labels = ['Hoje', 'Ano 1', 'Ano 2', 'Ano 3', 'Ano 4', 'Ano 5'];
    const interp: (number | null)[] = [pa, m1 || null, null, m3 || null, null, pn > 0 ? pn : null];
    if (interp[1] && interp[3]) interp[2] = Math.round(((interp[1] as number) + (interp[3] as number)) / 2);
    else if (interp[1]) interp[2] = interp[1];
    if (interp[3] && interp[5]) interp[4] = Math.round(((interp[3] as number) + (interp[5] as number)) / 2);
    else if (interp[3]) interp[4] = interp[3];
    if (!interp[2] && interp[0]) interp[2] = interp[0];
    if (!interp[4] && interp[3]) interp[4] = interp[3];
    const metaLine = labels.map(() => pn > 0 ? pn : null);
    if (this.chartRoadmap) this.chartRoadmap.destroy();
    this.chartRoadmap = new Chart(this.chartRoadmapRef.nativeElement, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Metas Parciais', data: interp, borderColor: '#022c22', backgroundColor: 'rgba(2,44,34,0.08)', fill: true, tension: 0.35,
          pointRadius: [6, m1 ? 6 : 0, 0, m3 ? 6 : 0, 0, pn ? 6 : 0],
          pointBackgroundColor: ['#022c22', '#022c22', '#022c22', '#047857', '#047857', '#00B74F'],
          pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 3 },
        { label: 'Meta Final (Liberdade)', data: metaLine, borderColor: '#00B74F', borderDash: [6, 4], pointRadius: 0, borderWidth: 2, fill: false }
      ] },
      options: this.chartOpts({
        plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 }, padding: 14 } }, tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.dataset.label + ': ' + this.fmtBRL(ctx.parsed.y) } } },
        scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v: any) => this.fmtCompact(v as number) } } }
      })
    });
  }

  // ═══ PDF EXPORT ═══

  async exportarPDF(): Promise<void> {
    this.exportando = true;
    try {
      const container = this.criarContainerPDFVisualizacao();
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = imgWidth * 0.264583;
      const pdfHeight = imgHeight * 0.264583;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`mapa-ambicao-${this.dados.ceoNome || 'mentoria'}-${Date.now()}.pdf`);
    } finally {
      this.exportando = false;
    }
  }

  criarContainerPDFVisualizacao(): HTMLElement {
    const c = document.createElement('div');
    c.style.cssText = 'position:absolute;left:-9999px;top:0;width:1100px;font-family:Inter,Arial,sans-serif;color:#1a202c;line-height:1.6;background:#fff;padding:48px;';

    const chartImg = (chart: Chart | null): string => chart ? chart.toBase64Image('image/png', 1) : '';

    const h = (text: string, icon = '') => `<div style="background:linear-gradient(135deg,#022c22,#014d3a);color:white;padding:20px 28px;border-radius:16px;margin:40px 0 20px 0;">
      <h2 style="margin:0;font-size:22px;font-weight:200;letter-spacing:-0.5px;">${icon} ${text}</h2></div>`;

    const card = (content: string) => `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">${content}</div>`;

    const field = (label: string, value: string) => {
      const v = value || '<span style="color:#999;">—</span>';
      return `<div style="margin-bottom:14px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#00B74F;margin-bottom:6px;">${label}</div><div style="font-size:14px;color:#374151;white-space:pre-wrap;">${v}</div></div>`;
    };

    const kpi = (label: string, value: string, sub = '') => `<div style="text-align:center;padding:18px;background:#f9fafb;border:2px solid rgba(2,44,34,0.1);border-radius:14px;">
      <div style="font-size:22px;font-weight:700;color:#022c22;">${value}</div>
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#666;margin-top:4px;">${label}</div>
      ${sub ? '<div style="font-size:11px;color:#999;margin-top:2px;">' + sub + '</div>' : ''}
    </div>`;

    // ═══ HEADER ═══
    let html = `<div style="text-align:center;margin-bottom:40px;padding-bottom:30px;border-bottom:3px solid #022c22;">
      <h1 style="font-size:32px;font-weight:200;color:#022c22;margin:0 0 8px 0;letter-spacing:-1px;">Mapa de Ambição</h1>
      <p style="font-size:16px;color:#666;margin:0;">Planejamento Estratégico de Vida e Patrimônio</p>
      <div style="display:flex;justify-content:center;gap:32px;margin-top:20px;font-size:14px;color:#374151;">
        <span><strong>Nome:</strong> ${this.dados.ceoNome || '—'}</span>
        <span><strong>Cargo:</strong> ${this.dados.ceoCargo || '—'}</span>
        <span><strong>Data:</strong> ${this.dados.ceoData ? new Date(this.dados.ceoData + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
      </div>
    </div>`;

    // ═══ 1. DASHBOARD ═══
    html += h('Dashboard', '<i class="fa-solid fa-chart-line"></i>');
    html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
      ${kpi('Custo Anual Vida Ideal', this.fmtCompact(this.totalAnual))}
      ${kpi('Patrimônio Necessário', this.fmtCompact(this.patrimonioNecessario), 'Para viver dos rendimentos')}
      ${kpi('Patrimônio Atual', this.fmtCompact(this.patrimonioAtual))}
      ${kpi('Progresso', this.progressoPct.toFixed(1) + '%', this.tempoEstimado + ' estimados')}
    </div>`;

    // Dashboard charts
    const expImg = chartImg(this.chartExpenses);
    const patBarImg = chartImg(this.chartPatrimonio);
    const projImg = chartImg(this.chartProjecao);
    if (expImg || patBarImg || projImg) {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">`;
      if (expImg) html += card(`<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px;">Distribuição de Despesas</div><img src="${expImg}" style="width:100%;max-height:250px;object-fit:contain;">`);
      if (patBarImg) html += card(`<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px;">Patrimônio Atual vs Necessário</div><img src="${patBarImg}" style="width:100%;max-height:250px;object-fit:contain;">`);
      html += `</div>`;
      if (projImg) html += card(`<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px;">Projeção de Crescimento Patrimonial</div><img src="${projImg}" style="width:100%;max-height:280px;object-fit:contain;">`);
    }

    if (this.dados.dashBloqueio || this.dados.dashAcao) {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">`;
      html += card(field('Maior Bloqueio Atual', this.dados.dashBloqueio));
      html += card(field('Próxima Ação Imediata', this.dados.dashAcao));
      html += `</div>`;
    }

    // ═══ 2. PROPÓSITO E VISÃO ═══
    html += h('Propósito e Visão de Mundo Ideal', '<i class="fa-solid fa-compass"></i>');
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">`;
    html += card(field('Visão de Mundo Ideal', this.dados.p1Visao));
    html += card(field('Atividades e Ocupação', this.dados.p1Atividades));
    html += card(field('Legado e Impacto', this.dados.p1Legado));
    html += card(field('Causas e Contribuições', this.dados.p1Causas));
    html += `</div>`;
    html += card(field('Um Dia Perfeito', this.dados.p1Dia));

    // ═══ 3. ESTILO DE VIDA ═══
    html += h('Custo do Estilo de Vida dos Sonhos', '<i class="fa-solid fa-gem"></i>');
    for (const section of this.expenseSections) {
      let rows = '';
      for (const item of section.items) {
        let mensal = 0, anual = 0;
        if (item.type === 'monthly') { mensal = this.dados.expenses[item.id] || 0; anual = mensal * 12; }
        else if (item.type === 'travel') { anual = this.getTravelAnnual(item.id); }
        else if (item.type === 'annual') { anual = this.dados.expenses[item.id] || 0; }
        if (anual > 0) {
          const obs = this.dados.expenseObs[item.id] || '';
          rows += `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${item.label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;">${item.type === 'monthly' ? this.fmtBRL(mensal) + '/mês' : '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:600;">${this.fmtBRL(anual)}/ano</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666;">${obs}</td></tr>`;
        }
      }
      if (rows) {
        html += card(`<div style="font-size:13px;font-weight:700;color:#022c22;margin-bottom:12px;">${section.title}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f9fafb;"><th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Item</th><th style="text-align:right;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Mensal</th><th style="text-align:right;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Anual</th><th style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Obs</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`);
      }
    }
    html += `<div style="background:#022c22;color:white;padding:18px 24px;border-radius:14px;display:flex;justify-content:space-between;align-items:center;margin:12px 0;">
      <span style="font-size:15px;font-weight:600;">Custo Anual Total da Vida Ideal</span>
      <span style="font-size:22px;font-weight:700;">${this.fmtBRL(this.totalAnual)}</span>
    </div>`;
    html += `<div style="background:#014d3a;color:white;padding:14px 24px;border-radius:14px;display:flex;justify-content:space-between;align-items:center;">
      <div><span style="font-size:13px;">Patrimônio Necessário</span><br><span style="font-size:11px;opacity:0.7;">Para viver dos rendimentos a 6% a.a.</span></div>
      <span style="font-size:20px;font-weight:700;">${this.fmtBRL(this.patrimonioNecessario)}</span>
    </div>`;

    // ═══ 4. PLANO DE AÇÃO ═══
    html += h('Plano de Ação e Limites', '<i class="fa-solid fa-chess"></i>');
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">`;
    html += card(field('Negócio / Fonte Principal de Renda', this.dados.p3Negocio));
    html += card(field('Principais Ações nos Próximos 12 Meses', this.dados.p3Acoes));
    html += card(field('Depois de Atingir a Liberdade Financeira', this.dados.p3Depois));
    html += card(field('Limites e Prioridades', this.dados.p3Limites));
    html += `</div>`;

    // ═══ 5. ESTRATIFICAÇÃO DO PATRIMÔNIO ═══
    html += h('Estratificação do Patrimônio', '<i class="fa-solid fa-building-columns"></i>');
    let assetRows = '';
    for (const asset of this.assetCategories) {
      const v = this.dados.assets[asset.id] || 0;
      if (v > 0) {
        assetRows += `<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${asset.color};margin-right:8px;vertical-align:middle;"></span>${asset.label}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;font-weight:600;">${this.fmtBRL(v)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#666;">${this.getAssetPct(asset.id)}%</td></tr>`;
      }
    }
    const patChartImg = chartImg(this.chartPatStrat);
    html += `<div style="display:grid;grid-template-columns:${patChartImg ? '1fr 1fr' : '1fr'};gap:16px;">`;
    html += card(`<table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f9fafb;"><th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Ativo</th><th style="text-align:right;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Valor</th><th style="text-align:right;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">%</th></tr></thead>
      <tbody>${assetRows}</tbody>
      <tfoot><tr style="background:#022c22;color:white;"><td style="padding:12px 14px;font-weight:700;border-radius:0 0 0 12px;">Total</td><td style="padding:12px 14px;text-align:right;font-weight:700;">${this.fmtBRL(this.patrimonioAtual)}</td><td style="padding:12px 14px;text-align:right;font-weight:700;border-radius:0 0 12px 0;">100%</td></tr></tfoot>
    </table>`);
    if (patChartImg) html += card(`<div style="text-align:center;"><img src="${patChartImg}" style="width:100%;max-height:300px;object-fit:contain;"></div>`);
    html += `</div>`;
    if (this.dados.patObservacoes) html += card(field('Observações sobre o Patrimônio', this.dados.patObservacoes));

    // ═══ 6. PLANO FINANCEIRO ═══
    html += h('Plano de Ação Financeiro', '<i class="fa-solid fa-bullseye"></i>');
    const renderActions = (title: string, badge: string, meta: number | null, actions: any[]) => {
      let content = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span style="padding:4px 12px;background:#022c22;color:white;border-radius:20px;font-size:12px;font-weight:600;">${badge}</span>
        <span style="font-size:16px;font-weight:600;color:#022c22;">${title}</span>
      </div>`;
      if (meta) content += `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 16px;margin-bottom:14px;font-size:13px;"><strong>Meta de Patrimônio:</strong> ${this.fmtBRL(meta)}</div>`;
      const filled = actions.filter((a: any) => a.descricao);
      if (filled.length > 0) {
        content += `<table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f9fafb;"><th style="text-align:left;padding:8px;font-size:11px;text-transform:uppercase;color:#999;">Ação</th><th style="padding:8px;font-size:11px;text-transform:uppercase;color:#999;">Prazo</th><th style="padding:8px;font-size:11px;text-transform:uppercase;color:#999;">Status</th></tr></thead><tbody>`;
        for (const a of filled) {
          const statusLabel = a.status === 'concluido' ? 'Concluído' : a.status === 'andamento' ? 'Em andamento' : a.status === 'pendente' ? 'Pendente' : '—';
          const statusColor = a.status === 'concluido' ? '#00B74F' : a.status === 'andamento' ? '#f59e0b' : '#999';
          content += `<tr><td style="padding:8px;border-bottom:1px solid #f0f0f0;font-size:13px;">${a.descricao}</td>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;">${a.prazo || '—'}</td>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;"><span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${statusColor}22;color:${statusColor};">${statusLabel}</span></td></tr>`;
        }
        content += `</tbody></table>`;
      }
      return card(content);
    };
    html += renderActions('Curto Prazo — 1 Ano', 'Curto Prazo', this.dados.pfMeta1, this.dados.actionsShort);
    html += renderActions('Médio Prazo — 3 Anos', 'Médio Prazo', this.dados.pfMeta3, this.dados.actionsMedium);
    html += renderActions('Longo Prazo — 5+ Anos', 'Longo Prazo', this.patrimonioNecessario, this.dados.actionsLong);

    const roadmapImg = chartImg(this.chartRoadmap);
    if (roadmapImg) html += card(`<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px;">Roadmap Financeiro</div><img src="${roadmapImg}" style="width:100%;max-height:300px;object-fit:contain;">`);
    if (this.dados.pfObservacoes) html += card(field('Observações do Plano', this.dados.pfObservacoes));

    // ═══ 7. RASTREAMENTO ═══
    html += h('Rastreamento', '<i class="fa-solid fa-chart-line"></i>');
    const filledTracking = this.dados.tracking.filter((r: any) => r.data || r.patrimonio || r.notas);
    if (filledTracking.length > 0) {
      let trackRows = '';
      for (const r of filledTracking) {
        trackRows += `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:600;">${r.patrimonio ? this.fmtBRL(r.patrimonio) : '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;">${this.getTrackingPct(r.patrimonio)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666;">${r.notas || '—'}</td></tr>`;
      }
      html += card(`<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f9fafb;"><th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Data</th><th style="text-align:right;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Patrimônio</th><th style="text-align:center;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">% Meta</th><th style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;">Notas</th></tr></thead>
        <tbody>${trackRows}</tbody></table>`);
    }

    if (this.dados.refAprendizado || this.dados.refProximos) {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">`;
      html += card(field('Maior Aprendizado', this.dados.refAprendizado));
      html += card(field('Próximos Passos', this.dados.refProximos));
      html += `</div>`;
    }

    // ═══ FOOTER ═══
    html += `<div style="text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #e5e7eb;color:#999;font-size:11px;">
      Mapa de Ambição — Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>`;

    c.innerHTML = html;
    return c;
  }
}
