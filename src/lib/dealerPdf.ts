import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DealerPdfRow {
  id: string;
  name?: string | null;
  email?: string | null;
  registration_plate?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  plan_type?: string | null;
  payment_type?: string | null;
  final_amount?: number | null;
  payment_status?: string | null;
  warranty_start_date?: string | null;
  policy_end_date?: string | null;
  signup_date?: string | null;
  warranty_number?: string | null;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const ref = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

const ORANGE: [number, number, number] = [255, 122, 0];
const DARK: [number, number, number] = [17, 24, 39];

export function downloadInvoicePdf(row: DealerPdfRow, dealerName?: string) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('en-GB');

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(...ORANGE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('INVOICE', 14, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Buy A Warranty Limited', 196, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('support@buyawarranty.co.uk', 196, 20, { align: 'right' });

  // Meta
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #${ref(row.id)}`, 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${today}`, 14, 49);

  if (dealerName) {
    doc.text(`Billed to: ${dealerName}`, 196, 42, { align: 'right' });
  }

  // Line items
  autoTable(doc, {
    startY: 60,
    head: [['Ref', 'Vehicle', 'Customer', 'Plan', 'Amount']],
    body: [[
      ref(row.id),
      `${row.registration_plate || '—'}\n${[row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ')}`,
      row.name || '—',
      `${(row.plan_type || '').toUpperCase()} · ${row.payment_type || ''}mo`,
      `£${Number(row.final_amount || 0).toFixed(2)}`,
    ]],
    theme: 'grid',
    headStyles: { fillColor: ORANGE, textColor: DARK, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    columnStyles: { 4: { halign: 'right' } },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 90;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', 150, finalY + 14);
  doc.text(`£${Number(row.final_amount || 0).toFixed(2)}`, 196, finalY + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    row.payment_status === 'paid'
      ? 'Status: PAID'
      : 'Status: Outstanding — pay via the Dealer Portal Payments tab.',
    14,
    finalY + 26,
  );

  doc.save(`invoice-${ref(row.id)}.pdf`);
}

export function downloadWarrantyPdf(row: DealerPdfRow, dealerName?: string) {
  const doc = new jsPDF();

  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(...ORANGE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('WARRANTY SCHEDULE', 14, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Buy A Warranty Limited', 196, 14, { align: 'right' });

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Warranty #${row.warranty_number || ref(row.id)}`, 14, 42);
  doc.setFont('helvetica', 'normal');
  if (dealerName) doc.text(`Issued by: ${dealerName}`, 14, 49);

  autoTable(doc, {
    startY: 60,
    theme: 'grid',
    headStyles: { fillColor: ORANGE, textColor: DARK, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    head: [['Field', 'Detail']],
    body: [
      ['Customer', row.name || '—'],
      ['Email', row.email || '—'],
      ['Vehicle', `${row.registration_plate || '—'} ${[row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ')}`],
      ['Plan', `${(row.plan_type || '').toUpperCase()} · ${row.payment_type || ''} months`],
      ['Activation date', fmt(row.warranty_start_date || row.signup_date)],
      ['Expiry date', fmt(row.policy_end_date)],
      ['Premium', `£${Number(row.final_amount || 0).toFixed(2)}`],
      ['Payment status', (row.payment_status || 'pending').replace('_', ' ').toUpperCase()],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'This document confirms cover under the plan above. Full Terms & Conditions available at buyawarranty.co.uk/warranty-plan',
    14,
    finalY + 14,
    { maxWidth: 182 },
  );

  doc.save(`warranty-${row.warranty_number || ref(row.id)}.pdf`);
}
