import { Component, Input, OnChanges, AfterViewInit, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-brazil-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brazil-map.component.html',
  styleUrls: ['./brazil-map.component.css']
})
export class BrazilMapComponent implements AfterViewInit, OnChanges {
  @Input() estadosAtivos: string[] = [];
  @ViewChild('svgObject') svgObject!: ElementRef;

  private estadosMap = new Set<string>();
  private svgDoc: Document | null = null;

  ngAfterViewInit(): void {
    // Aguardar o SVG carregar
    this.svgObject.nativeElement.addEventListener('load', () => {
      this.svgDoc = this.svgObject.nativeElement.contentDocument;
      console.log('SVG carregado!');
      this.updateMapColors();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estadosAtivos'] && this.svgDoc) {
      this.updateMapColors();
    }
  }

  private updateMapColors(): void {
    if (!this.svgDoc) return;

    this.estadosMap = new Set(this.estadosAtivos.map(s => s.toUpperCase()));
    console.log('Atualizando cores. Estados ativos:', Array.from(this.estadosMap));

    // Pegar todos os paths do SVG
    const paths = this.svgDoc.querySelectorAll('path');
    console.log(`Encontrados ${paths.length} estados no SVG`);

    paths.forEach((path: SVGPathElement) => {
      const id = path.getAttribute('id'); // Ex: "BR-AC", "BR-SP"
      if (!id) return;

      // Extrair sigla (últimos 2 caracteres depois do hífen)
      const sigla = id.split('-')[1]?.toUpperCase();

      if (sigla && this.estadosMap.has(sigla)) {
        // Estado ativo
        path.setAttribute('fill', '#065f46');
        path.setAttribute('stroke', '#064e3b');
        path.setAttribute('stroke-width', '1');
        path.style.filter = 'none';
      } else {
        // Estado inativo
        path.setAttribute('fill', '#c1c9c7');
        path.setAttribute('stroke', '#b0b8b6');
        path.setAttribute('stroke-width', '0.5');
        path.style.filter = 'none';
      }

      // Adicionar hover e transição
      path.style.cursor = 'pointer';
      path.style.transition = 'all 0.3s ease';

      // Event listener para hover
      path.addEventListener('mouseenter', () => {
        path.style.opacity = '0.8';
      });

      path.addEventListener('mouseleave', () => {
        path.style.opacity = '1';
      });
    });
  }
}
