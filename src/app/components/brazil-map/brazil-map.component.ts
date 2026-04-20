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

  // Ajustes manuais para siglas que ficam fora do estado por causa do formato do path
  private readonly labelOffsets: Record<string, { dx: number; dy: number }> = {
    'SP': { dx: 5, dy: 10 },
    'RJ': { dx: 8, dy: 5 },
    'ES': { dx: 5, dy: 0 },
    'SE': { dx: -5, dy: 3 },
    'AL': { dx: 5, dy: 0 },
    'DF': { dx: 0, dy: -8 },
    'RN': { dx: 0, dy: -2 },
    'PB': { dx: 0, dy: -2 },
    'AP': { dx: 5, dy: 5 },
    'PI': { dx: 3, dy: 10 },
    'SC': { dx: 8, dy: -3 },
  };

  private updateMapColors(): void {
    if (!this.svgDoc) return;

    this.estadosMap = new Set(this.estadosAtivos.map(s => s.toUpperCase()));

    const svgRoot = this.svgDoc.querySelector('svg');
    if (!svgRoot) return;

    // Remover labels anteriores
    this.svgDoc.querySelectorAll('.estado-label').forEach(el => el.remove());

    const paths = this.svgDoc.querySelectorAll('path');

    paths.forEach((path: SVGPathElement) => {
      const id = path.getAttribute('id');
      if (!id) return;

      const sigla = id.split('-')[1]?.toUpperCase();
      const isAtivo = sigla && this.estadosMap.has(sigla);

      if (isAtivo) {
        path.setAttribute('fill', '#065f46');
        path.setAttribute('stroke', '#064e3b');
        path.setAttribute('stroke-width', '1');
      } else {
        path.setAttribute('fill', '#c1c9c7');
        path.setAttribute('stroke', '#b0b8b6');
        path.setAttribute('stroke-width', '0.5');
      }
      path.style.filter = 'none';
      path.style.cursor = 'pointer';
      path.style.transition = 'all 0.3s ease';

      path.addEventListener('mouseenter', () => {
        path.style.opacity = '0.8';
      });
      path.addEventListener('mouseleave', () => {
        path.style.opacity = '1';
      });

      // Adicionar sigla no centro do estado
      if (sigla) {
        const bbox = path.getBBox();
        const offset = this.labelOffsets[sigla] || { dx: 0, dy: 0 };
        const cx = bbox.x + bbox.width / 2 + offset.dx;
        const cy = bbox.y + bbox.height / 2 + offset.dy;

        const text = this.svgDoc!.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(cx));
        text.setAttribute('y', String(cy));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'estado-label');
        text.setAttribute('fill', (isAtivo || sigla === 'DF') ? '#ffffff' : '#6b7280');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-weight', '600');
        text.setAttribute('pointer-events', 'none');
        text.textContent = sigla;
        svgRoot.appendChild(text);
      }
    });
  }
}
