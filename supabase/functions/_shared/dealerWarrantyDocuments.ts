// Current customer-safe Panda Protect documents used by dealer purchase emails.
// Both PDFs are attached to the email and linked in its visible document section.
export const PANDA_WARRANTY_DOCUMENTS = [
  {
    label: 'Platinum Warranty Plan',
    filename: 'Panda-Protect-Platinum-Warranty-Plan-v11.pdf',
    url: 'https://pandaprotect.co.uk/__l5e/assets-v1/f6744457-1a17-43e2-80c7-ce6d01db9ab7/panda-protect-platinum-warranty-plan-v11.pdf',
  },
  {
    label: 'Terms & Conditions',
    filename: 'Panda-Protect-Terms-and-Conditions-v11.pdf',
    url: 'https://pandaprotect.co.uk/__l5e/assets-v1/24efc3a6-0d27-4acf-86e5-a01057517241/panda-protect-terms-and-conditions-v11.pdf',
  },
] as const;

export interface PandaWarrantyAttachment {
  filename: string;
  content: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function fetchAttachments(fetcher: typeof fetch): Promise<PandaWarrantyAttachment[]> {
  return await Promise.all(PANDA_WARRANTY_DOCUMENTS.map(async document => {
    const response = await fetcher(document.url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${document.label} could not be loaded (${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const header = String.fromCharCode(...bytes.subarray(0, 4));
    if (header !== '%PDF') throw new Error(`${document.label} did not return a valid PDF.`);
    return { filename: document.filename, content: bytesToBase64(bytes) };
  }));
}

let cachedAttachments: Promise<PandaWarrantyAttachment[]> | null = null;

/** Load both PDFs together; a missing document fails the send rather than silently omitting it. */
export function loadPandaWarrantyAttachments(fetcher?: typeof fetch): Promise<PandaWarrantyAttachment[]> {
  if (fetcher) return fetchAttachments(fetcher);
  if (!cachedAttachments) {
    cachedAttachments = fetchAttachments(fetch).catch(error => {
      cachedAttachments = null;
      throw error;
    });
  }
  return cachedAttachments;
}

export function pandaWarrantyDocumentsHtml(): string {
  const links = PANDA_WARRANTY_DOCUMENTS.map(document => `
    <a href="${document.url}" style="display:block;background:#ffffff;border:1px solid #fed7aa;border-radius:8px;padding:11px 12px;margin-top:8px;color:#1f2a44;text-decoration:none;font-size:14px;font-weight:600">
      <span style="display:inline-block;background:#fff0e5;color:#c2410c;border-radius:4px;padding:3px 6px;margin-right:8px;font-size:11px;font-weight:700">PDF</span>
      ${document.label}
    </a>`).join('');
  return `
    <div style="background:#fffaf5;border:1px solid #ffedd5;border-radius:10px;padding:16px;margin-top:22px">
      <p style="font-size:15px;font-weight:700;color:#1f2a44;margin:0 0 5px">Your warranty documents</p>
      <p style="font-size:13px;line-height:1.5;color:#666;margin:0 0 8px">Both PDF documents are attached to this email. Please keep them with your vehicle records. You can also open them using the links below.</p>
      ${links}
    </div>`;
}
