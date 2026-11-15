// Email-safe "copy one line / copy all" credentials block.
// Email apps strip scripts, so real copy buttons are impossible; instead each
// value sits in its own tap-to-select box (user-select:all) and a final box
// holds every line together so it can be copied in one go.
const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export interface CredentialLine { label: string; value: string }

const box = "font-family:'Courier New',monospace;font-size:16px;color:#1e3a5f;background:#ffffff;border:1px dashed #94a3b8;border-radius:6px;padding:10px 12px;-webkit-user-select:all;user-select:all;word-break:break-all;";

export function credentialsBlockHtml(lines: CredentialLine[]): string {
  const clean = lines.filter((l) => l.value);
  const rows = clean.map((l) => `
    <div style="margin:0 0 12px;">
      <div style="font-size:13px;font-weight:bold;color:#334155;margin:0 0 4px;">${esc(l.label)} <span style="font-weight:normal;color:#64748b;">— tap to select, then copy</span></div>
      <div style="${box}">${esc(l.value)}</div>
    </div>`).join("");
  const all = clean.map((l) => `${esc(l.label)}: ${esc(l.value)}`).join("<br/>");
  return `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;">
    ${rows}
    <div style="margin:4px 0 0;">
      <div style="font-size:13px;font-weight:bold;color:#334155;margin:0 0 4px;">Copy all <span style="font-weight:normal;color:#64748b;">— tap to select every line</span></div>
      <div style="${box}font-size:14px;">${all}</div>
    </div>
  </div>`;
}
