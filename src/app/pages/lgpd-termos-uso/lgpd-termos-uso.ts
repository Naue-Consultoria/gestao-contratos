import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-lgpd-termos-uso',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './lgpd-termos-uso.html',
  styleUrls: ['./lgpd-termos-uso.css']
})
export class LgpdTermosUsoComponent {
  versao = '1.0';
  vigenteDesde = '27/04/2026';
}
