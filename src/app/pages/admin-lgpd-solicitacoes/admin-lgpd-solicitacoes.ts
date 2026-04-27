import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

interface LgpdSolicitacao {
  id: string;
  protocolo: string;
  titular_nome: string;
  titular_email: string;
  titular_documento: string | null;
  tipo_solicitacao: string;
  mensagem: string;
  status: string;
  prazo_resposta: string;
  respondida_em: string | null;
  resposta: string | null;
  respondida_por: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-admin-lgpd-solicitacoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-lgpd-solicitacoes.html',
  styleUrls: ['./admin-lgpd-solicitacoes.css']
})
export class AdminLgpdSolicitacoesComponent implements OnInit {
  solicitacoes = signal<LgpdSolicitacao[]>([]);
  loading = signal(false);
  filtroStatus = signal<string>('');
  filtroTipo = signal<string>('');

  selecionada = signal<LgpdSolicitacao | null>(null);
  resposta = '';
  novoStatus = 'concluida';
  enviandoResposta = signal(false);

  tiposLabels: Record<string, string> = {
    acesso: 'Acesso aos dados',
    correcao: 'Correção',
    eliminacao: 'Eliminação',
    anonimizacao: 'Anonimização',
    portabilidade: 'Portabilidade',
    revogacao_consentimento: 'Revogação de consentimento',
    informacao_compartilhamento: 'Info compartilhamento',
    outro: 'Outro'
  };

  statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    em_analise: 'Em análise',
    aguardando_titular: 'Aguardando titular',
    concluida: 'Concluída',
    recusada: 'Recusada'
  };

  filtradas = computed(() => {
    let arr = this.solicitacoes();
    const s = this.filtroStatus();
    const t = this.filtroTipo();
    if (s) arr = arr.filter(x => x.status === s);
    if (t) arr = arr.filter(x => x.tipo_solicitacao === t);
    return arr;
  });

  resumo = computed(() => {
    const arr = this.solicitacoes();
    const hoje = new Date().toISOString().split('T')[0];
    return {
      total: arr.length,
      pendentes: arr.filter(x => x.status === 'pendente' || x.status === 'em_analise').length,
      atrasadas: arr.filter(x =>
        (x.status === 'pendente' || x.status === 'em_analise') &&
        x.prazo_resposta < hoje
      ).length,
      concluidas: arr.filter(x => x.status === 'concluida').length
    };
  });

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.http.get<{ success: boolean; data: LgpdSolicitacao[] }>(`${environment.apiUrl}/lgpd/solicitacoes`)
      .subscribe({
        next: (res) => {
          this.solicitacoes.set(res.data || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.toastr.error('Erro ao carregar solicitações');
          this.loading.set(false);
        }
      });
  }

  abrirDetalhe(s: LgpdSolicitacao): void {
    this.selecionada.set(s);
    this.resposta = s.resposta || '';
    this.novoStatus = s.status === 'pendente' ? 'concluida' : s.status;
  }

  fechar(): void {
    this.selecionada.set(null);
    this.resposta = '';
  }

  marcarEmAnalise(): void {
    const s = this.selecionada();
    if (!s) return;
    this.http.put(`${environment.apiUrl}/lgpd/solicitacoes/${s.id}/status`, { status: 'em_analise' })
      .subscribe({
        next: () => {
          this.toastr.success('Marcada como em análise');
          this.carregar();
          this.fechar();
        },
        error: () => this.toastr.error('Erro ao atualizar status')
      });
  }

  responder(): void {
    const s = this.selecionada();
    if (!s) return;
    if (this.resposta.trim().length < 5) {
      this.toastr.warning('Escreva uma resposta de pelo menos 5 caracteres');
      return;
    }
    this.enviandoResposta.set(true);
    this.http.post(`${environment.apiUrl}/lgpd/solicitacoes/${s.id}/responder`, {
      resposta: this.resposta,
      status: this.novoStatus
    }).subscribe({
      next: () => {
        this.toastr.success('Resposta registrada');
        this.enviandoResposta.set(false);
        this.carregar();
        this.fechar();
      },
      error: () => {
        this.enviandoResposta.set(false);
        this.toastr.error('Erro ao registrar resposta');
      }
    });
  }

  prazoAtrasado(s: LgpdSolicitacao): boolean {
    if (s.status === 'concluida' || s.status === 'recusada') return false;
    return s.prazo_resposta < new Date().toISOString().split('T')[0];
  }

  diasRestantes(prazo: string): number {
    const d = new Date(prazo);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  }

  formatarData(iso: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('pt-BR');
  }
}
