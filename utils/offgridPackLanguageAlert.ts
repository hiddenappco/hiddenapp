/** Tracks when app language changed while offline packs may be stale (pre-_en or pre-rebuild). */

const LANG_ALERT_KEY = 'offgrid_pack_language_alert';
const PACKS_KEY = 'offgrid_downloaded_packs';

export interface PackLanguageAlertState {
  language: 'es' | 'en';
  changedAt: number;
}

export function getDownloadedPackIds(): string[] {
  try {
    const raw = localStorage.getItem(PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.keys(parsed);
  } catch {
    return [];
  }
}

export function hasDownloadedPacks(): boolean {
  return getDownloadedPackIds().length > 0;
}

export function markPackLanguageRefreshNeeded(language: 'es' | 'en'): void {
  if (!hasDownloadedPacks()) return;
  const state: PackLanguageAlertState = { language, changedAt: Date.now() };
  localStorage.setItem(LANG_ALERT_KEY, JSON.stringify(state));
}

export function getPackLanguageAlert(): PackLanguageAlertState | null {
  try {
    const raw = localStorage.getItem(LANG_ALERT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PackLanguageAlertState;
  } catch {
    return null;
  }
}

export function dismissPackLanguageAlert(): void {
  localStorage.removeItem(LANG_ALERT_KEY);
}

export function shouldShowPackLanguageAlert(
  downloadedPacks: Record<string, { downloadedAt: string }>
): PackLanguageAlertState | null {
  const alert = getPackLanguageAlert();
  if (!alert) return null;

  const packIds = Object.keys(downloadedPacks);
  if (packIds.length === 0) return null;

  const hasStalePack = packIds.some((id) => {
    const downloadedMs = new Date(downloadedPacks[id].downloadedAt).getTime();
    return !Number.isFinite(downloadedMs) || downloadedMs < alert.changedAt;
  });

  return hasStalePack ? alert : null;
}

export function syncPackLanguageAlertAfterDownload(
  downloadedPacks: Record<string, { downloadedAt: string }>
): void {
  const alert = getPackLanguageAlert();
  if (!alert) return;

  const packIds = Object.keys(downloadedPacks);
  if (packIds.length === 0) {
    dismissPackLanguageAlert();
    return;
  }

  const allFresh = packIds.every((id) => {
    const downloadedMs = new Date(downloadedPacks[id].downloadedAt).getTime();
    return Number.isFinite(downloadedMs) && downloadedMs >= alert.changedAt;
  });

  if (allFresh) dismissPackLanguageAlert();
}
