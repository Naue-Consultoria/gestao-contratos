import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { ProposalService } from './proposal';
import { renderProposalPdf, ProposalPdfLogo } from './proposal-pdf.renderer';

@Injectable({ providedIn: 'root' })
export class ProposalPdfService {
  private proposalService = inject(ProposalService);

  /**
   * Gera e baixa o PDF da proposta no padrão visual dos relatórios do sistema.
   */
  async generate(proposal: any, currency: 'BRL' | 'USD' = 'BRL'): Promise<void> {
    const doc = new jsPDF();
    const logo = await this.loadLogo();
    const fileName = renderProposalPdf(doc, proposal, {
      currencyFormat: (value) => this.proposalService.formatCurrency(value || 0, currency),
      statusText: (status) => this.proposalService.getStatusText(status),
      logo,
    });
    doc.save(fileName);
  }

  private loadLogo(): Promise<ProposalPdfLogo | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = 'logoNaue.png';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx || !img.naturalWidth) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const width = 36;
          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            width,
            height: width * (img.naturalHeight / img.naturalWidth),
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
    });
  }
}
