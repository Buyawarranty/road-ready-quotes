import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { displayWarrantyPlanName } from './warrantyPlanDisplay';
import { getDealerPaymentState } from './dealerPaymentStatus';
import { pandaLogoUrl } from './pandaLogo';

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
  payment_due_date?: string | null;
  payment_collected_at?: string | null;
  stripe_session_id?: string | null;
  warranty_start_date?: string | null;
  policy_end_date?: string | null;
  signup_date?: string | null;
  warranty_number?: string | null;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const ref = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();
const money = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ORANGE: [number, number, number] = [255, 122, 0];
const DARK: [number, number, number] = [17, 24, 39];
const NAVY: [number, number, number] = [15, 38, 71];
const SLATE: [number, number, number] = [91, 104, 121];
const LINE: [number, number, number] = [222, 227, 233];
const GREEN: [number, number, number] = [23, 126, 83];
const RED: [number, number, number] = [185, 54, 54];

export interface DealerInvoiceView {
  statusLabel: 'PAID IN FULL' | 'PAYMENT PENDING' | 'PAYMENT OVERDUE' | 'AWAITING PAYMENT';
  statusTitle: string;
  statusMessage: string;
  paymentMethod: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  invoiceDate: string;
  dueDate: string;
  paidDate: string | null;
  isPaid: boolean;
  isOverdue: boolean;
}

export function getDealerInvoiceView(row: DealerPdfRow, now: Date = new Date()): DealerInvoiceView {
  const payment = getDealerPaymentState(row, now);
  const isPaid = payment.key === 'paid';
  const total = Number(row.final_amount || 0);
  const sessionId = String(row.stripe_session_id || '').trim();
  const paymentStatus = String(row.payment_status || '').toLowerCase();
  const isCreditInvoice = ['invoice_pending', 'overdue'].includes(paymentStatus) || sessionId.startsWith('invoice:');
  const dueDate = row.payment_due_date || payment.dueDate?.toISOString() || null;
  const recordedDueDate = dueDate ? new Date(dueDate) : null;
  const isOverdue = payment.key === 'overdue'
    || (!isPaid && paymentStatus === 'invoice_pending' && !!recordedDueDate && recordedDueDate < now);

  return {
    statusLabel: isPaid ? 'PAID IN FULL' : isOverdue ? 'PAYMENT OVERDUE' : payment.key === 'due' ? 'PAYMENT PENDING' : 'AWAITING PAYMENT',
    statusTitle: isPaid ? 'Paid in full' : isOverdue ? 'Invoice payment overdue' : payment.key === 'due' ? 'Invoice payment pending' : 'Awaiting payment',
    statusMessage: isPaid
      ? 'Payment has been received and reconciled. No further payment is due.'
      : isOverdue
        ? 'This invoice is past its due date. Please arrange payment as soon as possible.'
        : payment.key === 'due'
          ? 'Please pay this invoice by the due date through the Dealer Portal Payments tab.'
          : 'Complete payment through the Dealer Portal to finalise this invoice.',
    paymentMethod: isPaid
      ? sessionId && !sessionId.startsWith('invoice:') ? 'Card payment via Stripe' : isCreditInvoice ? 'Dealer account invoice' : 'Payment confirmed'
      : isCreditInvoice ? '30-day dealer invoice' : 'Online card payment',
    total,
    amountPaid: isPaid ? total : 0,
    balanceDue: isPaid ? 0 : total,
    invoiceDate: fmt(row.signup_date || now.toISOString()),
    dueDate: dueDate ? fmt(dueDate) : '—',
    paidDate: row.payment_collected_at ? fmt(row.payment_collected_at) : null,
    isPaid,
    isOverdue,
  };
}

let logoDataPromise: Promise<string | null> | null = null;

function loadLogoDataUrl(): Promise<string | null> {
  if (logoDataPromise) return logoDataPromise;
  logoDataPromise = new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = pandaLogoUrl;
  });
  return logoDataPromise;
}

function statusColours(view: DealerInvoiceView): { text: [number, number, number]; background: [number, number, number] } {
  if (view.isPaid) return { text: GREEN, background: [232, 247, 239] };
  if (view.isOverdue) return { text: RED, background: [253, 237, 237] };
  return { text: [174, 94, 0], background: [255, 245, 229] };
}

export function createInvoicePdf(row: DealerPdfRow, dealerName?: string, logoDataUrl?: string | null, now: Date = new Date()) {
  const doc = new jsPDF();
  const view = getDealerInvoiceView(row, now);
  const colours = statusColours(view);
  const vehicle = [row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ');
  const duration = Number(row.payment_type || 0) ? `${Number(row.payment_type)} months` : 'Duration not supplied';

  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, 210, 3, 'F');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 16, 12, 48, 23.28, undefined, 'FAST');
  } else {
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('panda', 16, 23);
    doc.setTextColor(...ORANGE);
    doc.text('protect', 16, 31);
  }

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INVOICE', 194, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(`#${ref(row.id)}`, 194, 26, { align: 'right' });

  doc.setFillColor(...colours.background);
  doc.roundedRect(137, 30, 57, 9, 2, 2, 'F');
  doc.setTextColor(...colours.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(view.statusLabel, 165.5, 36, { align: 'center' });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(16, 44, 194, 44);

  const heading = (text: string, x: number) => {
    doc.setTextColor(...ORANGE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(text, x, 53);
  };
  heading('FROM', 16);
  heading('BILLED TO', 82);
  heading('INVOICE DETAILS', 145);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Panda Protect', 16, 61);
  doc.text(dealerName || 'Dealer account', 82, 61, { maxWidth: 56 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text('support@pandaprotect.co.uk', 16, 67);
  doc.text('0330 229 6547', 16, 72);
  doc.text('pandaprotect.co.uk', 16, 77);
  doc.text('Trade warranty purchase', 82, 67, { maxWidth: 56 });

  const detail = (label: string, value: string, y: number) => {
    doc.setTextColor(...SLATE);
    doc.setFontSize(7.5);
    doc.text(label, 145, y);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(value, 194, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  };
  detail('Invoice date', view.invoiceDate, 60);
  detail(view.isPaid ? 'Payment received' : 'Payment due', view.isPaid ? view.paidDate || 'Confirmed' : view.dueDate, 67);
  detail('Currency', 'GBP', 74);

  doc.setDrawColor(...LINE);
  doc.line(16, 84, 194, 84);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Warranty purchase', 16, 94);

  autoTable(doc, {
    startY: 100,
    head: [['VEHICLE & CUSTOMER', 'COVER', 'AMOUNT']],
    body: [[
      `${row.registration_plate || 'Registration not supplied'}${vehicle ? `\n${vehicle}` : ''}\nCustomer: ${row.name || 'Not supplied'}`,
      `${displayWarrantyPlanName(row.plan_type)} warranty\n${duration}\nRef: ${ref(row.id)}`,
      money(view.total),
    ]],
    theme: 'plain',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 4, right: 4 } },
    bodyStyles: { textColor: DARK, fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }, lineColor: LINE, lineWidth: { bottom: 0.3 } },
    columnStyles: {
      0: { cellWidth: 77 },
      1: { cellWidth: 68 },
      2: { cellWidth: 33, halign: 'right', fontStyle: 'bold', fontSize: 11, valign: 'top' },
    },
    margin: { left: 16, right: 16 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 135;
  const totalsY = finalY + 8;
  doc.setFillColor(247, 249, 251);
  doc.roundedRect(108, totalsY, 86, 37, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.text('Invoice total', 114, totalsY + 9);
  doc.text(view.isPaid ? 'Amount paid' : 'Amount paid to date', 114, totalsY + 18);
  doc.setTextColor(...NAVY);
  doc.text(money(view.total), 188, totalsY + 9, { align: 'right' });
  doc.text(money(view.amountPaid), 188, totalsY + 18, { align: 'right' });
  doc.setDrawColor(...LINE);
  doc.line(114, totalsY + 23, 188, totalsY + 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colours.text);
  doc.text(view.isPaid ? 'Balance due' : 'Balance due', 114, totalsY + 31);
  doc.text(money(view.balanceDue), 188, totalsY + 31, { align: 'right' });

  const statusY = totalsY + 47;
  doc.setFillColor(...colours.background);
  doc.roundedRect(16, statusY, 178, 34, 2, 2, 'F');
  doc.setFillColor(...colours.text);
  doc.circle(25, statusY + 10, 3, 'F');
  if (view.isPaid) {
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.7);
    doc.line(23.3, statusY + 10, 24.5, statusY + 11.2);
    doc.line(24.5, statusY + 11.2, 26.9, statusY + 8.6);
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('!', 25, statusY + 11, { align: 'center' });
  }
  doc.setTextColor(...colours.text);
  doc.setFontSize(11);
  doc.text(view.statusTitle, 33, statusY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(view.statusMessage, 33, statusY + 18, { maxWidth: 153 });
  doc.setTextColor(...SLATE);
  doc.setFontSize(8);
  const paymentMeta = view.isPaid
    ? `${view.paymentMethod}${view.paidDate ? `  |  Paid ${view.paidDate}` : ''}`
    : `${view.paymentMethod}  |  Due ${view.dueDate}`;
  doc.text(paymentMeta, 33, statusY + 27, { maxWidth: 153 });

  const helpY = Math.max(statusY + 46, 231);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Questions about this invoice?', 16, helpY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text('Email support@pandaprotect.co.uk or call 0330 229 6547 and quote the invoice number.', 16, helpY + 6, { maxWidth: 178 });

  doc.setDrawColor(...LINE);
  doc.line(16, 264, 194, 264);
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text('Panda Protect is a trading name of Buy A Warranty Limited. Company No: 10314863.', 16, 271, { maxWidth: 178 });
  doc.text('Registered office: Warranty House, 62 Berkhamsted Ave, Wembley, HA9 6DT.', 16, 276, { maxWidth: 178 });
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('pandaprotect.co.uk  |  support@pandaprotect.co.uk', 16, 284);

  return doc;
}

export async function downloadInvoicePdf(row: DealerPdfRow, dealerName?: string) {
  const logoDataUrl = await loadLogoDataUrl();
  createInvoicePdf(row, dealerName, logoDataUrl).save(`invoice-${ref(row.id)}.pdf`);
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
  doc.text('Panda Protect', 196, 14, { align: 'right' });

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Warranty #${row.warranty_number || ref(row.id)}`, 14, 42);
  doc.setFont('helvetica', 'normal');
  if (dealerName) doc.text(`Issued by: ${dealerName}`, 14, 49);

  autoTable(doc, {
    startY: 60,
    theme: 'grid',
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    head: [['Field', 'Detail']],
    body: [
      ['Customer', row.name || '—'],
      ['Email', row.email || '—'],
      ['Vehicle', `${row.registration_plate || '—'} ${[row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ')}`],
      ['Plan', `${displayWarrantyPlanName(row.plan_type).toUpperCase()} · ${row.payment_type || ''} months`],
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
    'This document confirms cover under the plan above. Full Terms & Conditions available at pandaprotect.co.uk/warranty-plan',
    14,
    finalY + 14,
    { maxWidth: 182 },
  );

  doc.save(`warranty-${row.warranty_number || ref(row.id)}.pdf`);
}
