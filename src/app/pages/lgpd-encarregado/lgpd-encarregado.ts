import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-lgpd-encarregado',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './lgpd-encarregado.html',
  styleUrls: ['./lgpd-encarregado.css']
})
export class LgpdEncarregadoComponent {
  // TROCAR: definir nome e e-mail reais do Encarregado
  dpoNome = 'Time GIO — Inovações e Tecnologia';
  dpoCargo = 'Encarregado de Proteção de Dados (Art. 41, LGPD)';
  dpoEmail = 'consultorianaue@gmail.com';
  dpoTelefone = '';

  form: FormGroup;
  enviando = signal(false);
  enviado = signal(false);
  erro = signal<string | null>(null);

  tiposSolicitacao = [
    { value: 'acesso', label: 'Acesso aos meus dados' },
    { value: 'correcao', label: 'Correção de dados' },
    { value: 'eliminacao', label: 'Eliminação de dados' },
    { value: 'anonimizacao', label: 'Anonimização de dados' },
    { value: 'portabilidade', label: 'Portabilidade dos dados' },
    { value: 'revogacao_consentimento', label: 'Revogação de consentimento' },
    { value: 'informacao_compartilhamento', label: 'Informação sobre compartilhamento' },
    { value: 'outro', label: 'Outra solicitação' }
  ];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      tipo_solicitacao: ['acesso', Validators.required],
      mensagem: ['', [Validators.required, Validators.minLength(10)]],
      aceite: [false, Validators.requiredTrue]
    });
  }

  enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);

    const payload = {
      nome: this.form.value.nome,
      email: this.form.value.email,
      tipo_solicitacao: this.form.value.tipo_solicitacao,
      mensagem: this.form.value.mensagem
    };

    this.http.post(`${environment.apiUrl}/lgpd/solicitacao`, payload).subscribe({
      next: () => {
        this.enviado.set(true);
        this.enviando.set(false);
        this.form.reset({ tipo_solicitacao: 'acesso', aceite: false });
      },
      error: (err) => {
        this.enviando.set(false);
        this.erro.set(err?.error?.message || 'Erro ao enviar solicitação. Tente novamente ou envie diretamente por e-mail.');
      }
    });
  }
}
