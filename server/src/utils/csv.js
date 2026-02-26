export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const text = String(v ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return '"' + text.replaceAll('"', '""') + '"';
    }
    return text;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}
