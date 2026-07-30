import { normalizeSmartSearchText } from './smartSearch';

interface TournamentLinkedRecord {
  tournamentId?: string;
  tournamentName?: string;
  status?: boolean;
}

interface TournamentNameRecord {
  name: string;
}

export interface TournamentSearchOption {
  key: string;
  value: string;
  label: string;
  meta: string;
}

export const buildTournamentSearchOptions = (
  records: TournamentLinkedRecord[],
  tournamentById: ReadonlyMap<string, TournamentNameRecord>,
  keyPrefix: string,
  countLabel: string,
  visibleOnly = false
): TournamentSearchOption[] => {
  const counts = new globalThis.Map<string, { name: string; count: number }>();

  records.forEach(record => {
    if (visibleOnly && record.status === false) return;

    const tournamentName = String(
      tournamentById.get(record.tournamentId || '')?.name ||
      record.tournamentName ||
      ''
    ).trim();
    if (!tournamentName) return;

    const normalizedName = normalizeSmartSearchText(tournamentName);
    const current = counts.get(normalizedName);
    counts.set(normalizedName, {
      name: tournamentName,
      count: (current?.count || 0) + 1
    });
  });

  return Array.from(counts.entries())
    .map(([normalizedName, item]) => ({
      key: `${keyPrefix}-tournament-${normalizedName}`,
      value: item.name,
      label: item.name,
      meta: `${item.count} ${countLabel}`
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
};
