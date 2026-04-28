import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-lgpd-termos-uso-publico',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './lgpd-termos-uso-publico.html',
  styleUrls: ['./lgpd-termos-uso-publico.css']
})
export class LgpdTermosUsoPublicoComponent {
  versao = '1.0';
  vigenteDesde = '27/04/2026';

  voltar(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }
}
