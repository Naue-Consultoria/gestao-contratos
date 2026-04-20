import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MentoriaService } from '../../services/mentoria.service';
import { ToastrService } from 'ngx-toastr';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LinhaDoTempoEvent {
  id: number;
  text: string;
}

interface YearRow {
  year: number;
  age: number;
  draftText: string;
}

type ViewMode = 'list' | 'visual';

@Component({
  selector: 'app-linha-do-tempo-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './linha-do-tempo-editor.component.html',
  styleUrls: ['./linha-do-tempo-editor.component.css']
})
export class LinhaDoTempoEditorComponent implements OnInit {
  @Input() token: string = '';
  @Input() readOnly: boolean = false;

  birthdate: string = '';
  events: { [ano: string]: LinhaDoTempoEvent[] } = {};
  perguntaTrajetoria: string = '';
  perguntaProximos5Anos: string = '';

  yearRows: YearRow[] = [];
  currentView: ViewMode = 'list';
  selectedYear: number | null = null;

  isLoading: boolean = false;
  isSaving: boolean = false;
  exportandoPDF: boolean = false;

  private saveTimeout: any = null;

  constructor(
    private mentoriaService: MentoriaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.token) {
      this.carregarDados();
    }
  }

  carregarDados(): void {
    this.isLoading = true;
    this.mentoriaService.obterLinhaDoTempoPublico(this.token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.birthdate = response.data.birthdate || '';
          this.events = response.data.events || {};
          this.perguntaTrajetoria = response.data.pergunta_trajetoria || '';
          this.perguntaProximos5Anos = response.data.pergunta_proximos_5_anos || '';
          if (this.birthdate) {
            this.gerarLinhaDoTempo();
          }
        }
        this.isLoading = false;
        setTimeout(() => this.autoGrowAll(), 50);
      },
      error: (error) => {
        console.error('Erro ao carregar Linha do Tempo:', error);
        this.isLoading = false;
      }
    });
  }

  gerarLinhaDoTempo(): void {
    if (!this.birthdate) {
      this.toastr.warning('Informe a data de nascimento.');
      return;
    }
    const birth = new Date(this.birthdate + 'T00:00:00');
    const hoje = new Date();
    if (birth > hoje) {
      this.toastr.warning('A data de nascimento não pode estar no futuro.');
      return;
    }

    const birthYear = birth.getFullYear();
    const currentYear = hoje.getFullYear();

    const preserved = new Map<number, YearRow>();
    this.yearRows.forEach(r => preserved.set(r.year, r));

    const novos: YearRow[] = [];
    for (let year = birthYear; year <= currentYear; year++) {
      const existing = preserved.get(year);
      novos.push({
        year,
        age: year - birthYear,
        draftText: existing?.draftText ?? ''
      });
    }
    this.yearRows = novos;
    this.scheduleSave();
  }

  selecionarAno(row: YearRow): void {
    this.selectedYear = this.selectedYear === row.year ? null : row.year;
  }

  fecharDetalhe(): void {
    this.selectedYear = null;
  }

  getSelectedRow(): YearRow | undefined {
    if (this.selectedYear === null) return undefined;
    return this.yearRows.find(r => r.year === this.selectedYear);
  }

  adicionarEvento(row: YearRow): void {
    const texto = row.draftText.trim();
    if (!texto) return;

    if (!this.events[row.year]) {
      this.events[row.year] = [];
    }
    this.events[row.year].push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: texto
    });
    row.draftText = '';
    this.scheduleSave();
  }

  removerEvento(ano: number, id: number): void {
    if (!this.events[ano]) return;
    this.events[ano] = this.events[ano].filter(e => e.id !== id);
    if (this.events[ano].length === 0) {
      delete this.events[ano];
    }
    this.scheduleSave();
  }

  onTextareaKeydown(event: KeyboardEvent, row: YearRow): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.adicionarEvento(row);
    }
  }

  setView(view: ViewMode): void {
    this.currentView = view;
  }

  getEventos(ano: number): LinhaDoTempoEvent[] {
    return this.events[ano] || [];
  }

  getYearsComEventos(): YearRow[] {
    return this.yearRows.filter(r => this.getEventos(r.year).length > 0);
  }

  ageLabel(age: number): string {
    if (age === 0) return 'Nascimento';
    if (age === 1) return '1 ano';
    return `${age} anos`;
  }

  get totalAnos(): number {
    if (!this.birthdate) return 0;
    const birthYear = new Date(this.birthdate + 'T00:00:00').getFullYear();
    return new Date().getFullYear() - birthYear;
  }

  get totalEventos(): number {
    return Object.values(this.events).reduce((acc, arr) => acc + arr.length, 0);
  }

  get anosPreenchidos(): number {
    return Object.keys(this.events).filter(ano => this.events[ano].length > 0).length;
  }

  get temDados(): boolean {
    return !!this.birthdate && this.yearRows.length > 0;
  }

  get anoAtual(): number {
    return new Date().getFullYear();
  }

  trackByYear(_: number, row: YearRow): number {
    return row.year;
  }

  trackByEvent(_: number, ev: LinhaDoTempoEvent): number {
    return ev.id;
  }

  private scheduleSave(): void {
    if (this.readOnly || !this.token) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.salvar(), 600);
  }

  salvar(): void {
    if (this.readOnly || !this.token) return;
    this.isSaving = true;
    const dados = {
      birthdate: this.birthdate || '',
      events: this.events,
      pergunta_trajetoria: this.perguntaTrajetoria || '',
      pergunta_proximos_5_anos: this.perguntaProximos5Anos || ''
    };
    this.mentoriaService.salvarLinhaDoTempo(this.token, dados).subscribe({
      next: () => {
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Erro ao salvar Linha do Tempo:', err);
        this.isSaving = false;
      }
    });
  }

  onPerguntaBlur(): void {
    this.scheduleSave();
  }

  autoGrow(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  private autoGrowAll(): void {
    const tas = document.querySelectorAll('.pergunta-group textarea') as NodeListOf<HTMLTextAreaElement>;
    tas.forEach(el => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }

  /* ===== EXPORTAÇÃO PDF ===== */

  async exportarPDF(): Promise<void> {
    if (!this.temDados) {
      this.toastr.warning('Preencha a linha do tempo antes de exportar.');
      return;
    }
    this.exportandoPDF = true;
    this.toastr.info('Gerando PDF...', '', { timeOut: 3000 });
    try {
      const container = this.criarContainerPDFVisualizacao();
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdfWidth = canvas.width * 0.264583;
      const pdfHeight = canvas.height * 0.264583;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`linha-do-tempo-${Date.now()}.pdf`);
      this.toastr.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar PDF da Linha do Tempo:', err);
      this.toastr.error('Erro ao exportar PDF.');
    } finally {
      this.exportandoPDF = false;
    }
  }

  criarContainerPDFVisualizacao(): HTMLElement {
    const c = document.createElement('div');
    c.style.cssText = 'position:absolute;left:-9999px;top:0;width:1100px;font-family:Inter,Arial,sans-serif;color:#1a202c;line-height:1.5;background:#fff;padding:48px;';

    const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtDate = (iso: string) => {
      if (!iso) return '—';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };

    // Header
    let html = `<div style="text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #022c22;">
      <h1 style="font-size:32px;font-weight:200;color:#022c22;margin:0 0 8px 0;letter-spacing:-1px;">Linha do Tempo</h1>
      <p style="font-size:15px;color:#666;margin:0;">Acontecimentos marcantes da trajetória</p>
      <div style="display:flex;justify-content:center;gap:40px;margin-top:18px;font-size:13px;color:#374151;">
        <span><strong>Data de nascimento:</strong> ${fmtDate(this.birthdate)}</span>
        <span><strong>Anos de vida:</strong> ${this.totalAnos}</span>
        <span><strong>Acontecimentos:</strong> ${this.totalEventos}</span>
      </div>
    </div>`;

    // Linha do tempo vertical (anos com eventos)
    const anosComEventos = this.yearRows.filter(r => this.getEventos(r.year).length > 0);
    if (anosComEventos.length > 0) {
      html += `<div style="position:relative;margin:0 auto 32px auto;max-width:960px;">`;
      html += `<div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:linear-gradient(180deg,#022c22 0%,#1a5f3f 100%);transform:translateX(-50%);"></div>`;
      anosComEventos.forEach((row, i) => {
        const isCurrent = row.year === this.anoAtual;
        const side = i % 2 === 0 ? 'left' : 'right';
        const cardAlign = side === 'left' ? 'margin-right:auto;text-align:right;' : 'margin-left:auto;text-align:left;';
        const connectorSide = side === 'left' ? 'right:-14px;' : 'left:-14px;';
        const dotStyle = isCurrent
          ? 'background:#022c22;box-shadow:0 0 0 6px rgba(2,44,34,0.15);'
          : 'background:#fff;';
        const eventos = this.getEventos(row.year);
        const eventosHtml = eventos.map(ev => {
          const headAlign = side === 'left' ? 'text-align:right;' : 'text-align:left;';
          return `<div style="font-size:13px;color:#022c22;line-height:1.5;padding:6px 0;border-top:1px solid rgba(0,0,0,0.06);${headAlign}">${esc(ev.text)}</div>`;
        }).join('');
        const nowTag = isCurrent
          ? '<span style="font-size:10px;color:#fff;background:#022c22;padding:2px 8px;border-radius:999px;text-transform:uppercase;font-weight:700;letter-spacing:0.04em;margin-left:8px;">Hoje</span>'
          : '';
        html += `<div style="position:relative;display:flex;align-items:center;margin-bottom:16px;min-height:50px;">
          <div style="position:absolute;left:50%;top:50%;width:14px;height:14px;border:3px solid #022c22;border-radius:50%;transform:translate(-50%,-50%);z-index:2;${dotStyle}"></div>
          <div style="position:relative;width:calc(50% - 28px);background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:10px;padding:10px 14px;${cardAlign}">
            <div style="position:absolute;top:50%;width:14px;height:1px;background:rgba(2,44,34,0.25);transform:translateY(-50%);${connectorSide}"></div>
            <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;${side === 'left' ? 'justify-content:flex-end;' : ''}">
              <span style="font-size:18px;font-weight:700;color:#022c22;font-variant-numeric:tabular-nums;">${row.year}</span>
              <span style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${esc(this.ageLabel(row.age))}</span>
              ${nowTag}
            </div>
            ${eventosHtml}
          </div>
        </div>`;
      });
      html += `</div>`;
    } else {
      html += `<div style="text-align:center;padding:28px;color:#999;font-style:italic;">Nenhum acontecimento registrado.</div>`;
    }

    // Reflexões
    if (this.perguntaTrajetoria || this.perguntaProximos5Anos) {
      html += `<div style="margin-top:32px;padding:24px;background:linear-gradient(135deg,#f8f9fa,#fff);border-left:4px solid #022c22;border-radius:12px;">
        <h3 style="font-size:13px;color:#022c22;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;margin:0 0 16px 0;">Reflexão</h3>`;
      if (this.perguntaTrajetoria) {
        html += `<div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:600;color:#022c22;margin-bottom:6px;">O que mais marcou a sua trajetória?</div>
          <div style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.5;">${esc(this.perguntaTrajetoria)}</div>
        </div>`;
      }
      if (this.perguntaProximos5Anos) {
        html += `<div>
          <div style="font-size:13px;font-weight:600;color:#022c22;margin-bottom:6px;">Como você se imagina pelos próximos 5 anos?</div>
          <div style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.5;">${esc(this.perguntaProximos5Anos)}</div>
        </div>`;
      }
      html += `</div>`;
    }

    c.innerHTML = html;
    return c;
  }

  limparTudo(): void {
    if (!confirm('Tem certeza que deseja apagar todos os acontecimentos e a data de nascimento?')) return;
    this.birthdate = '';
    this.events = {};
    this.perguntaTrajetoria = '';
    this.perguntaProximos5Anos = '';
    this.yearRows = [];
    this.selectedYear = null;
    this.scheduleSave();
  }
}
