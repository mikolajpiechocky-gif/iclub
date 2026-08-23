// Reguły domenowe: typy zarobku pracownika za zlecenie (§10).
// iClub domyślnie: 1 realizacja = 8 godzin (do wyliczeń godzinowych/statystyk).
// Jedynym źródłem reguł rozliczenia/premii jest settlementForRealization (lib/domain/iclub-settlement.ts).

export const ICLUB_HOURS = 8;

export interface EarningsBreakdown {
  base: number;
  baseLabel: string;
  ownerBonus: number;
  total: number;
  possibleBonuses: { label: string; amount: number }[];
}
