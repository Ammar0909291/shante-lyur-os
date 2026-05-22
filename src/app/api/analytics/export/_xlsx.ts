import * as XLSX from 'xlsx';

export function dateRu(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });
}

export function nowTimestamp(): string {
  const now = new Date();
  const datePart = dateRu(now);
  const timePart = now.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
  return `Сформировано: ${datePart} ${timePart}`;
}

export function makeSheet(
  rows: unknown[][],
  colWidths: number[],
  freezeRows = 2,
): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = colWidths.map(wch => ({ wch }));

  if (freezeRows > 0) {
    const topLeftCell = `A${freezeRows + 1}`;
    (ws['!sheetViews'] as unknown[]) = [
      {
        state: 'frozen',
        ySplit: freezeRows,
        xSplit: 0,
        topLeftCell,
        activeCell: topLeftCell,
      },
    ];
  }
  return ws;
}

export function buildXlsxResponse(wb: XLSX.WorkBook, filename: string): Response {
  // 'array' returns number[] which we wrap in Uint8Array<ArrayBuffer> — avoids
  // the Uint8Array<ArrayBufferLike> generic mismatch with BodyInit.
  const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[];
  const body = new Uint8Array(arr);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
