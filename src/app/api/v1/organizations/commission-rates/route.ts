export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const DEFAULT_RATES = {
  STANDARD_SALE:    { label: 'Стандартная комиссия', defaultRate: 3 },
  NEW_CLIENT:       { label: 'Новый клиент',          defaultRate: 5 },
  RETURNING_CLIENT: { label: 'Возврат клиента',       defaultRate: 3 },
  UPSELL:           { label: 'Допродажа',             defaultRate: 4 },
  REFERRAL:         { label: 'Реферал',               defaultRate: 5 },
  TARGET_BONUS:     { label: 'Бонус за план',         defaultRate: 0 },
  QUALITY_BONUS:    { label: 'Бонус за качество',     defaultRate: 0 },
  CUSTOM:           { label: 'Особый бонус',          defaultRate: 0 },
};

export async function GET() {
  return NextResponse.json({ success: true, data: DEFAULT_RATES });
}
