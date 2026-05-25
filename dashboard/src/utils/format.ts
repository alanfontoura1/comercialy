export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = raw.replace(/\D/g, '');
  // Brazilian mobile with country code: +55 (XX) XXXXX-XXXX — 13 digits
  if (d.length === 13 && d.startsWith('55')) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  // Brazilian landline with country code: +55 (XX) XXXX-XXXX — 12 digits
  if (d.length === 12 && d.startsWith('55')) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  // Brazilian mobile without country code: (XX) 9XXXX-XXXX — 11 digits
  if (d.length === 11 && /^[1-9][1-9]9/.test(d)) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  // Brazilian landline without country code: (XX) XXXX-XXXX — 10 digits
  if (d.length === 10 && /^[1-9][1-9]/.test(d)) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  // Generic international
  if (d.length >= 10) {
    const cc  = d.slice(0, 2);
    const ddd = d.slice(2, 4);
    const mid = d.slice(4, d.length - 4);
    const end = d.slice(-4);
    return `+${cc} (${ddd}) ${mid}-${end}`;
  }
  return raw;
}

/** Display name or formatted phone — never shows raw JID */
export function displayName(nome: string | null | undefined, telefone: string | null | undefined): string {
  if (nome?.trim()) return nome.trim();
  return formatPhone(telefone) || telefone || '—';
}
