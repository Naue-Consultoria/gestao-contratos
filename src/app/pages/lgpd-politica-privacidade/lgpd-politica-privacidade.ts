import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-lgpd-politica-privacidade',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './lgpd-politica-privacidade.html',
  styleUrls: ['./lgpd-politica-privacidade.css']
})
export class LgpdPoliticaPrivacidadeComponent {
  versao = '1.0';
  vigenteDesde = '27/04/2026';
}
