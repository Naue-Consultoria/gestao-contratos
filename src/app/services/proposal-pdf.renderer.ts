import type { jsPDF } from 'jspdf';

/**
 * Renderização do PDF da proposta comercial.
 *
 * Mantido como função pura (sem dependências do Angular) para poder ser
 * reutilizada/testada fora do contexto dos componentes.
 */

export interface ProposalPdfLogo {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ProposalPdfOptions {
  currencyFormat: (value: number) => string;
  statusText: (status: string) => string;
  logo?: ProposalPdfLogo | null;
}

type RGB = [number, number, number];

const PRIMARY: RGB = [0, 59, 43];
const TEXT: RGB = [40, 40, 40];
const BODY: RGB = [75, 75, 75];
const MUTED: RGB = [120, 120, 120];
const RULE: RGB = [210, 214, 212];
const LIGHT: RGB = [248, 249, 250];
const WHITE: RGB = [255, 255, 255];

/**
 * Remove tags HTML preservando parágrafos, títulos e listas, e normaliza
 * caracteres que a fonte padrão do jsPDF (WinAnsi) não sabe desenhar
 * (aspas tipográficas, bullets, emojis etc.).
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(h[1-6]|p|div|ul|ol|blockquote|tr)[^>]*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    // tags restantes viram espaço para não colar palavras de blocos vizinhos
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, code) => {
      const n = Number(code);
      return n >= 32 && n <= 255 ? String.fromCharCode(n) : ' ';
    });

  text = text
    // caracteres invisíveis (zero-width, BOM)
    .replace(/[​-‏﻿]/g, '')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...')
    // bullets e marcadores de check viram hífen
    .replace(/[•▪●◦✓✔✅➤▶→⇒]/g, '-')
    // demais caracteres fora do Latin-1 (emojis etc.) são descartados
    .replace(/[^\x20-\xFF\n]/g, '');

  return text
    .replace(/(^|\n)-\s+-\s+/g, '$1- ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getClientName(proposal: any): string {
  const client = proposal?.client;
  if (client) {
    if (client.type === 'PJ' && client.company) {
      return client.company.trade_name || client.company.company_name || proposal.client_name || '';
    }
    if (client.type === 'PF' && client.person) {
      return client.person.full_name || client.person.name || proposal.client_name || '';
    }
  }
  return proposal?.client_name || client?.name || '';
}

/**
 * Desenha o PDF da proposta no documento informado e retorna o nome de arquivo sugerido.
 */
export function renderProposalPdf(doc: jsPDF, proposal: any, opts: ProposalPdfOptions): string {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const bottom = pageH - 24;
  const fmt = opts.currencyFormat;
  let y = 16;

  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const newPage = () => {
    doc.addPage();
    y = 20;
  };
  const ensure = (needed: number) => {
    if (y + needed > bottom) newPage();
  };

  const sectionTitle = (title: string) => {
    ensure(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(PRIMARY);
    doc.text(title, margin, y);
    y += 2.5;
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 7.5;
  };

  /** Linhas "Rótulo: valor" em duas colunas. */
  const labelValueGrid = (pairs: [string, string][]) => {
    const rows = Math.ceil(pairs.length / 2);
    ensure(rows * 6 + 4);
    const colW = contentW / 2 - 6;
    pairs.forEach((pair, i) => {
      const colX = margin + (i % 2) * (contentW / 2 + 3);
      const rowY = y + Math.floor(i / 2) * 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(TEXT);
      const label = `${pair[0]}:`;
      doc.text(label, colX, rowY);
      const labelW = doc.getTextWidth(label) + 1.5;
      doc.setFont('helvetica', 'normal');
      setColor(BODY);
      const valueLine = (doc.splitTextToSize(pair[1], colW - labelW) as string[])[0] || '';
      doc.text(valueLine, colX + labelW, rowY);
    });
    y += rows * 6;
  };

  // ===== Cabeçalho =====
  if (opts.logo) {
    try {
      doc.addImage(opts.logo.dataUrl, 'PNG', margin, y, opts.logo.width, opts.logo.height);
    } catch {
      // segue sem logo
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(PRIMARY);
  doc.text('PROPOSTA COMERCIAL', pageW - margin, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(MUTED);
  doc.text(`Proposta Nº ${proposal.proposal_number || ''}`, pageW - margin, y + 12.5, { align: 'right' });
  doc.setFontSize(8.5);
  doc.text(`Gerada em ${new Date().toLocaleDateString('pt-BR')}`, pageW - margin, y + 17.5, { align: 'right' });

  y += 25;
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 12;

  // ===== Dados do Cliente =====
  sectionTitle('Dados do Cliente');

  const info: [string, string][] = [];
  const clientName = getClientName(proposal);
  if (clientName) info.push(['Cliente', clientName]);
  const clientEmail = proposal?.client?.company?.email || proposal?.client?.person?.email || proposal.client_email || '';
  if (clientEmail) info.push(['E-mail', clientEmail]);
  const clientPhone = proposal?.client?.company?.phone || proposal?.client?.person?.phone || proposal.client_phone || '';
  if (clientPhone) info.push(['Telefone', clientPhone]);
  if (proposal.type) info.push(['Tipo de Proposta', proposal.type]);
  if (proposal.status) info.push(['Status', opts.statusText(proposal.status)]);
  if (proposal.solicitante_name) info.push(['Solicitante', proposal.solicitante_name]);

  labelValueGrid(info);
  y += 8;

  // ===== Serviços =====
  const services: any[] = proposal.services || [];
  const showValues = proposal.usar_valor_global !== true;

  if (services.length > 0) {
    sectionTitle('Serviços Propostos');

    services.forEach((s: any, i: number) => {
      const svc = s.service || {};
      const notSelected = s.selected_by_client === false;
      const qty = s.quantity && s.quantity > 1 ? s.quantity : 0;
      const name = s.service_name || svc.name || `Serviço ${i + 1}`;
      const title = `${name}${qty ? ` (${qty} unidades)` : ''}${notSelected ? ' (Não selecionado)' : ''}`;
      const subtitle = svc.subtitle || '';
      const desc = htmlToText(s.service_description || svc.description || '');
      const duration = svc.duration_unit === 'Projeto'
        ? 'Projeto'
        : (svc.duration_amount && svc.duration_unit ? `${svc.duration_amount} ${svc.duration_unit}` : '');
      const value = s.total_value ?? s.value ?? s.unit_value ?? 0;

      const valueColW = showValues ? 38 : 0;

      // Evita começar um serviço colado no fim da página
      ensure(20);

      // Nome do serviço + valor
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      setColor(notSelected ? MUTED : PRIMARY);
      const titleLines = doc.splitTextToSize(title, contentW - valueColW) as string[];
      titleLines.forEach((line, li) => {
        ensure(6);
        doc.text(line, margin, y);
        if (li === 0) {
          if (notSelected) {
            const w = doc.getTextWidth(line);
            doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2]);
            doc.setLineWidth(0.3);
            doc.line(margin, y - 1.2, margin + w, y - 1.2);
          }
          if (showValues) {
            doc.text(fmt(value), pageW - margin, y, { align: 'right' });
          }
        }
        y += 5;
      });

      // Subtítulo
      if (subtitle) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        setColor(MUTED);
        (doc.splitTextToSize(subtitle, contentW) as string[]).forEach((line) => {
          ensure(5);
          doc.text(line, margin, y);
          y += 4.3;
        });
      }

      // Descritivo
      if (desc) {
        y += 1.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setColor(notSelected ? MUTED : BODY);
        (doc.splitTextToSize(desc, contentW) as string[]).forEach((line) => {
          ensure(5);
          doc.text(line, margin, y);
          y += 4.2;
        });
      }

      // Duração / valor unitário
      const metaParts: string[] = [];
      if (duration) metaParts.push(`Duração: ${duration}`);
      if (qty && showValues && s.unit_value) metaParts.push(`Valor unitário: ${fmt(s.unit_value)}`);
      if (metaParts.length) {
        ensure(6);
        y += 1.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        setColor(MUTED);
        doc.text(metaParts.join('     '), margin, y);
        y += 4;
      }

      // Divisor entre serviços
      if (i < services.length - 1) {
        y += 3;
        doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageW - margin, y);
        y += 7;
      }
    });

    // ===== Total =====
    const unselectedCount = services.filter((s: any) => s.selected_by_client === false).length;
    const hasPartialSelection = unselectedCount > 0 && unselectedCount < services.length;
    const grandTotal = proposal.usar_valor_global === true
      ? (proposal.valor_global ?? proposal.total_value ?? 0)
      : (proposal.total_value ?? 0);

    const totalValue = hasPartialSelection
      ? services
          .filter((s: any) => s.selected_by_client !== false)
          .reduce((sum: number, s: any) => sum + (s.total_value || 0), 0)
      : grandTotal;

    const hasVistaNote = proposal.vista_discount_percentage > 0 || proposal.vista_discount_value > 0;
    const hasPrazoNote = proposal.prazo_discount_percentage > 0 || proposal.prazo_discount_value > 0;
    const notesH = (proposal.max_installments > 1 ? 5 : 0)
      + (hasVistaNote ? 4.5 : 0)
      + (hasPrazoNote ? 4.5 : 0);
    const totalBlockH = 6 + (hasPartialSelection ? 8 : 0) + 19 + notesH;
    ensure(totalBlockH);

    y += 6;
    const totalBoxW = 95;
    const totalBoxX = pageW - margin - totalBoxW;

    if (hasPartialSelection) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(MUTED);
      const originalText = `Valor original: ${fmt(proposal.total_value || 0)}`;
      doc.text(originalText, pageW - margin, y, { align: 'right' });
      const w = doc.getTextWidth(originalText);
      doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.setLineWidth(0.4);
      doc.line(pageW - margin - w, y - 1.4, pageW - margin, y - 1.4);
      y += 8;
    }

    doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.rect(totalBoxX, y, totalBoxW, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setColor(WHITE);
    doc.text(hasPartialSelection ? 'VALOR SELECIONADO' : 'VALOR TOTAL', totalBoxX + 5, y + 8.8);
    doc.setFontSize(11);
    doc.text(fmt(totalValue), totalBoxX + totalBoxW - 5, y + 8.8, { align: 'right' });
    y += 19;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(MUTED);
    if (proposal.max_installments && proposal.max_installments > 1) {
      doc.text(
        `Em até ${proposal.max_installments}x de ${fmt(totalValue / proposal.max_installments)}`,
        pageW - margin, y, { align: 'right' }
      );
      y += 5;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    if (proposal.vista_discount_percentage > 0) {
      doc.text(`*desconto de ${proposal.vista_discount_percentage}% para pagamento à vista`, pageW - margin, y, { align: 'right' });
      y += 4.5;
    } else if (proposal.vista_discount_value > 0) {
      doc.text(`*desconto de ${fmt(proposal.vista_discount_value)} para pagamento à vista`, pageW - margin, y, { align: 'right' });
      y += 4.5;
    }
    if (proposal.prazo_discount_percentage > 0) {
      doc.text(`*desconto de ${proposal.prazo_discount_percentage}% para pagamento à prazo`, pageW - margin, y, { align: 'right' });
      y += 4.5;
    } else if (proposal.prazo_discount_value > 0) {
      doc.text(`*desconto de ${fmt(proposal.prazo_discount_value)} para pagamento à prazo`, pageW - margin, y, { align: 'right' });
      y += 4.5;
    }
    y += 8;
  }

  // ===== Condições de Pagamento =====
  if (proposal.payment_method || (proposal.installments && proposal.installments > 1) || proposal.payment_type) {
    const rows: [string, string][] = [];
    if (proposal.payment_type) rows.push(['Tipo de Pagamento', proposal.payment_type === 'vista' ? 'À Vista' : 'À Prazo']);
    if (proposal.payment_method) rows.push(['Forma de Pagamento', proposal.payment_method]);
    if (proposal.installments && proposal.installments > 1) {
      rows.push(['Número de Parcelas', `${proposal.installments}x`]);
      if (proposal.final_value) {
        rows.push(['Valor por Parcela', fmt(proposal.final_value / proposal.installments)]);
      }
    }
    if (proposal.discount_applied && proposal.discount_applied > 0) {
      rows.push(['Desconto Aplicado', fmt(proposal.discount_applied)]);
    }

    ensure(Math.ceil(rows.length / 2) * 6 + 22);
    sectionTitle('Condições de Pagamento');
    labelValueGrid(rows);
    y += 8;
  }

  // ===== Assinatura Digital =====
  if (proposal.signer_name || proposal.signer_email || proposal.signature_data) {
    ensure(40);
    sectionTitle('Assinatura Digital');

    if (proposal.signer_name || proposal.signer_email) {
      const signerRows: [string, string][] = [];
      if (proposal.signer_name) signerRows.push(['Nome', proposal.signer_name]);
      if (proposal.signer_email) signerRows.push(['E-mail', proposal.signer_email]);
      if (proposal.signer_phone) signerRows.push(['Telefone', proposal.signer_phone]);
      if (proposal.signer_document) signerRows.push(['Documento', proposal.signer_document]);

      labelValueGrid(signerRows);

      if (proposal.signer_observations) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        setColor(TEXT);
        ensure(6);
        doc.text('Observações:', margin, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        setColor(BODY);
        (doc.splitTextToSize(proposal.signer_observations, contentW) as string[]).forEach((line: string) => {
          ensure(5);
          doc.text(line, margin, y);
          y += 4.5;
        });
      }
      y += 6;
    }

    if (proposal.signature_data) {
      ensure(52);
      doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
      doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, contentW, 46, 'FD');
      try {
        const imgWidth = 70;
        const imgHeight = 35;
        doc.addImage(proposal.signature_data, 'PNG', (pageW - imgWidth) / 2, y + 5.5, imgWidth, imgHeight);
      } catch {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        setColor(PRIMARY);
        doc.text('Assinatura Digital Válida', pageW / 2, y + 25, { align: 'center' });
      }
      y += 51;
    }

    if (proposal.signed_at) {
      ensure(8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      setColor(PRIMARY);
      const signedDate = new Date(proposal.signed_at).toLocaleDateString('pt-BR');
      doc.text(`Assinado em ${signedDate}`, pageW / 2, y, { align: 'center' });
      y += 8;
    }
  }

  // ===== Rodapé em todas as páginas =====
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(MUTED);
    doc.text(`NAUE Consultoria  |  Proposta Nº ${proposal.proposal_number || ''}`, margin, pageH - 9);
    doc.text(`Página ${p} de ${pages}`, pageW - margin, pageH - 9, { align: 'right' });
  }

  return `proposta-${String(proposal.proposal_number || 'sem-numero').replace(/\s+/g, '-').toLowerCase()}.pdf`;
}
