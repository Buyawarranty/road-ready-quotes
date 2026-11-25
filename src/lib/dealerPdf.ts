import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { displayWarrantyPlanName } from './warrantyPlanDisplay';
import { getDealerPaymentState } from './dealerPaymentStatus';
import { pandaLogoUrl } from './pandaLogo';
import { isFreeDealerWarranty } from './dealerSales';

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
  phone?: string | null;
  address_line?: string | null;
  address_town?: string | null;
  vehicle_year?: string | number | null;
  mileage?: string | number | null;
  claim_limit?: number | null;
  voluntary_excess?: number | null;
  labour_rate?: number | null;
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
  statusLabel: 'NO PAYMENT DUE' | 'PAID IN FULL' | 'PAYMENT PENDING' | 'PAYMENT OVERDUE' | 'AWAITING PAYMENT';
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
  isFree: boolean;
  isOverdue: boolean;
}

export function getDealerInvoiceView(row: DealerPdfRow, now: Date = new Date()): DealerInvoiceView {
  const payment = getDealerPaymentState(row, now);
  const isPaid = payment.key === 'paid';
  const isFree = isFreeDealerWarranty(row);
  const total = Number(row.final_amount || 0);
  const sessionId = String(row.stripe_session_id || '').trim();
  const paymentStatus = String(row.payment_status || '').toLowerCase();
  const isCreditInvoice = ['invoice_pending', 'overdue'].includes(paymentStatus) || sessionId.startsWith('invoice:');
  const dueDate = row.payment_due_date || payment.dueDate?.toISOString() || null;
  const recordedDueDate = dueDate ? new Date(dueDate) : null;
  const isOverdue = payment.key === 'overdue'
    || (!isPaid && paymentStatus === 'invoice_pending' && !!recordedDueDate && recordedDueDate < now);

  return {
    statusLabel: isFree ? 'NO PAYMENT DUE' : isPaid ? 'PAID IN FULL' : isOverdue ? 'PAYMENT OVERDUE' : payment.key === 'due' ? 'PAYMENT PENDING' : 'AWAITING PAYMENT',
    statusTitle: isFree ? 'Free warranty issued' : isPaid ? 'Paid in full' : isOverdue ? 'Invoice payment overdue' : payment.key === 'due' ? 'Invoice payment pending' : 'Awaiting payment',
    statusMessage: isFree ? 'Warranty issued at no charge. No payment is due.' : isPaid
      ? 'Payment has been received and reconciled. No further payment is due.'
      : isOverdue
        ? 'This invoice is past its due date. Please arrange payment as soon as possible.'
        : payment.key === 'due'
          ? 'Please pay this invoice by the due date through the Dealer Portal Invoicing section.'
          : 'Complete payment through the Dealer Portal to finalise this invoice.',
    paymentMethod: isFree ? 'Free warranty — no payment' : isPaid
      ? sessionId && !sessionId.startsWith('invoice:') ? 'Card payment via Stripe' : isCreditInvoice ? 'Dealer account invoice' : 'Payment confirmed'
      : isCreditInvoice ? '30-day dealer invoice' : 'Online card payment',
    total,
    amountPaid: isPaid ? total : 0,
    balanceDue: isPaid ? 0 : total,
    invoiceDate: fmt(row.signup_date || now.toISOString()),
    dueDate: !isFree && dueDate ? fmt(dueDate) : '—',
    paidDate: !isFree && row.payment_collected_at ? fmt(row.payment_collected_at) : null,
    isPaid,
    isFree,
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

const LIGHT: [number, number, number] = [255, 246, 236];
const SOFT: [number, number, number] = [247, 249, 251];

export interface InvoiceBillTo {
  name?: string | null;
  addressLines?: (string | null | undefined)[];
  email?: string | null;
  phone?: string | null;
}

/** Shared Panda Protect invoice header: logo + address on the left, INVOICE with number/date boxes on the right. */
export function drawInvoiceHeader(doc: jsPDF, invoiceNumber: string, invoiceDate: string, logoDataUrl?: string | null) {
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, 210, 4, 'F');
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 16, 12, 46, 22.3, undefined, 'FAST');
  } else {
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
    doc.text('panda', 16, 23); doc.setTextColor(...ORANGE); doc.text('protect', 16, 31);
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...SLATE);
  doc.text('Warranty House, 62 Berkhamsted Ave', 16, 41);
  doc.text('Wembley, HA9 6DT, England', 16, 46);
  doc.setTextColor(...NAVY);
  doc.text('support@pandaprotect.co.uk', 16, 51);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...NAVY);
  doc.text('INVOICE', 194, 22, { align: 'right' });
  const box = (label: string, value: string, x: number) => {
    doc.setFillColor(...NAVY); doc.rect(x, 29, 39, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text(label, x + 19.5, 33.8, { align: 'center' });
    doc.setFillColor(...SOFT); doc.rect(x, 36, 39, 9, 'F');
    doc.setTextColor(...DARK); doc.setFontSize(8.5);
    doc.text(value, x + 19.5, 41.8, { align: 'center', maxWidth: 37 });
  };
  box('INVOICE #', invoiceNumber, 116);
  box('DATE', invoiceDate, 155);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.4); doc.line(16, 58, 194, 58);
}

/** Shared footer: thank-you line, contact and legal line. */
export function drawInvoiceFooter(doc: jsPDF) {
  doc.setFillColor(...LIGHT); doc.roundedRect(16, 252, 178, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...NAVY);
  doc.text('Thank you for your business!', 21, 259.6);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...ORANGE);
  doc.text('support@pandaprotect.co.uk', 189, 259.6, { align: 'right' });
  doc.setDrawColor(...LINE); doc.line(16, 270, 194, 270);
  doc.setFontSize(7.5); doc.setTextColor(...SLATE);
  doc.text('Panda Protect  •  Trusted Auto Warranties', 105, 276, { align: 'center' });
  doc.text('Pandaprotect.co.uk is a trading name of Buy A Warranty Limited. Company No: 10314863. VAT No: 519 1099 85.', 105, 281, { align: 'center', maxWidth: 178 });
}

function drawBillTo(doc: jsPDF, billTo: InvoiceBillTo, refs: [string, string][], y = 66) {
  const head = (t: string, x: number, w: number) => {
    doc.setFillColor(...ORANGE); doc.rect(x, y, w, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text(t, x + 4, y + 4.8);
  };
  head('BILL TO', 16, 104); head('POLICY REFERENCE', 124, 70);
  doc.setFillColor(...SOFT); doc.rect(16, y + 7, 104, 34, 'F'); doc.rect(124, y + 7, 70, 34, 'F');
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(billTo.name || 'Customer', 20, y + 14, { maxWidth: 96 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...SLATE);
  let ly = y + 20;
  const lines = [...(billTo.addressLines || []).filter(Boolean) as string[], [billTo.email, billTo.phone].filter(Boolean).join('  |  ')].filter(Boolean);
  for (const l of lines.slice(0, 4)) { doc.text(l, 20, ly, { maxWidth: 96 }); ly += 5; }
  let ry = y + 13;
  for (const [label, value] of refs) {
    doc.setFontSize(7); doc.setTextColor(...SLATE); doc.setFont('helvetica', 'normal'); doc.text(label.toUpperCase(), 128, ry);
    doc.setFontSize(9); doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.text(value, 128, ry + 4.5, { maxWidth: 62 });
    ry += 10;
  }
  return y + 41;
}

export function createInvoicePdf(row: DealerPdfRow, dealerName?: string, logoDataUrl?: string | null, now: Date = new Date()) {
  const doc = new jsPDF();
  const view = getDealerInvoiceView(row, now);
  const colours = statusColours(view);
  const vehicle = [row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ') || '—';
  const duration = Number(row.payment_type || 0) ? `${Number(row.payment_type)} months` : '—';
  const invoiceNumber = row.warranty_number || `PP-${ref(row.id)}`;

  drawInvoiceHeader(doc, invoiceNumber, view.invoiceDate, logoDataUrl);

  // Status pill under header
  doc.setFillColor(...colours.background); doc.roundedRect(144, 47.5, 50, 7, 2, 2, 'F');
  doc.setTextColor(...colours.text); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text(view.statusLabel, 169, 52.2, { align: 'center' });

  const afterBill = drawBillTo(doc, {
    name: dealerName ? `${dealerName}` : row.name,
    addressLines: [row.address_line, row.address_town].concat(dealerName && row.name ? [`Customer: ${row.name}`] : []),
    email: row.email, phone: row.phone,
  }, [
    ['Policy / certificate number', invoiceNumber],
    ['Vehicle registration', (row.registration_plate || '—').toUpperCase()],
    ['Reference', ref(row.id)],
  ]);

  const L = (t: string) => ({ content: t, styles: { textColor: SLATE, fontSize: 7, fontStyle: 'bold' as const, cellPadding: { top: 2.6, bottom: 0.3, left: 4, right: 4 } } });
  const V = (t: string) => ({ content: t, styles: { textColor: NAVY, fontSize: 9.5, fontStyle: 'bold' as const, cellPadding: { top: 0.3, bottom: 2.4, left: 4, right: 4 } } });
  const section = (t: string) => [{ content: t, colSpan: 3, styles: { fillColor: LIGHT, textColor: ORANGE, fontSize: 7.5, fontStyle: 'bold' as const, cellPadding: 3 } }];
  const pair = (a: string, b: string, av: string, bv: string) => [[L(a), L(b), ''], [V(av), V(bv), '']];
  const money2 = (n?: number | null) => (n == null || Number.isNaN(Number(n)) ? '—' : money(Number(n)));

  const body: any[] = [
    section('COVER'),
    ...pair('PLAN TYPE', 'DURATION', `${displayWarrantyPlanName(row.plan_type)} warranty`, duration),
    ...pair('VEHICLE', 'MILEAGE', vehicle, row.mileage ? `${Number(row.mileage).toLocaleString('en-GB')} miles` : '—'),
    ...pair('POLICY START DATE', 'POLICY END DATE', fmt(row.warranty_start_date), fmt(row.policy_end_date)),
    ...pair('AMOUNT PAID', 'PAYMENT METHOD', money(view.amountPaid), view.paymentMethod),
    section('POLICY DETAILS'),
    ...pair('CLAIM LIMIT', 'VOLUNTARY EXCESS', row.claim_limit ? `${money2(row.claim_limit)} per claim` : '—', money2(row.voluntary_excess)),
    ...pair('LABOUR RATE', 'PAYMENT STATUS', row.labour_rate ? `${money2(row.labour_rate)} / hour` : '—', view.isFree ? 'Free — no payment due' : view.isPaid ? 'Paid' : 'Outstanding'),
  ];
  body[1][2] = { content: money(view.total), rowSpan: 2, styles: { halign: 'right', valign: 'middle', fontStyle: 'bold', fontSize: 12, textColor: NAVY } };

  autoTable(doc, {
    startY: afterBill + 6,
    head: [[{ content: 'DESCRIPTION', colSpan: 2 }, { content: 'AMOUNT', styles: { halign: 'right' } }]],
    body,
    theme: 'plain',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 3.5 },
    columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 72 }, 2: { cellWidth: 34 } },
    margin: { left: 16, right: 16 },
  });

  const y = ((doc as any).lastAutoTable.finalY || 200) + 2;
  doc.setFillColor(...NAVY); doc.rect(16, y, 178, 11, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('TOTAL', 20, y + 7.3);
  doc.text(money(view.total), 190, y + 7.3, { align: 'right' });
  if (!view.isPaid) {
    doc.setTextColor(...colours.text); doc.setFontSize(8.5);
    doc.text(`Balance due ${money(view.balanceDue)}  •  Due ${view.dueDate}`, 190, y + 17, { align: 'right' });
  } else if (view.paidDate) {
    doc.setTextColor(...GREEN); doc.setFontSize(8.5);
    doc.text(`Paid in full on ${view.paidDate}`, 190, y + 17, { align: 'right' });
  }

  drawInvoiceFooter(doc);
  return doc;
}

export { loadLogoDataUrl as loadInvoiceLogo };

export async function downloadInvoicePdf(row: DealerPdfRow, dealerName?: string) {
  const logoDataUrl = await loadLogoDataUrl();
  createInvoicePdf(row, dealerName, logoDataUrl).save(`invoice-${row.warranty_number || ref(row.id)}.pdf`);
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
