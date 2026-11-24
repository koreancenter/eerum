import { StoredCard } from "../types/card";
import { getAccountSyncIdKey, resolveAccountId } from "./accountStorage";

// 1. 현재 계정의 Sync ID 가져오기 (없으면 새로 생성; 미로그인 시 생성하지 않음)
export function getOrCreateSyncId(accountId?: string | null): string {
  const key = getAccountSyncIdKey(accountId);
  if (!key) return "";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "sync_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    localStorage.setItem(key, id);
  }
  return id;
}

// 2. 다른 기기의 Sync ID로 덮어쓰고 최신 보관함 가져오기
export async function pullWalletFromEdge(
  syncId: string,
  accountId?: string | null
): Promise<StoredCard[] | null> {
  if (!syncId) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`/api/sync?id=${encodeURIComponent(syncId)}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.cards)) {
        const key = getAccountSyncIdKey(accountId);
        if (key) {
          localStorage.setItem(key, syncId);
        }
        return data.cards;
      }
    }
  } catch {
    // Non-blocking local-first fallback
    clearTimeout(timeoutId);
  }
  return null;
}

// 3. 현재 로컬 보관함 목록을 백그라운드 동기화 (오프라인/에러/미로그인 시 조용히 스킵)
export async function pushWalletToEdge(
  cards: StoredCard[],
  accountId?: string | null
): Promise<void> {
  if (!resolveAccountId(accountId)) return;
  if (!cards || !Array.isArray(cards) || cards.length === 0) return;
  const syncId = getOrCreateSyncId(accountId);
  if (!syncId) return;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      signal: controller.signal,
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ syncId, cards }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // Local fallback without throwing
      return;
    }
  } catch {
    // Quiet fail-safe: local-first storage preserves all cards in browser localStorage
    clearTimeout(timeoutId);
  }
}

export interface PublishCardResult {
  ok: boolean;
  forbidden?: boolean;
  ownerKey?: string;
  id?: string;
  slug?: string;
  error?: string;
}

/**
 * Publishes or updates a personal public card (`isMyCard === true` with a `slug`)
 * to `/api/cards`, sending the card's secret `ownerKey` in both the `X-Owner-Key` header
 * and JSON payload for SHA-256 ownership verification.
 */
export async function publishPublicCardToEdge(
  card: StoredCard
): Promise<PublishCardResult> {
  if (!card?.isMyCard || !card.slug) {
    return { ok: false, error: 'Not a public personal card' };
  }

  const ownerKey = (card.ownerKey || card.owner_key || '').trim();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (ownerKey) {
      headers['X-Owner-Key'] = ownerKey;
    }

    const res = await fetch('/api/cards', {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        ...card,
        ownerKey: ownerKey || undefined,
        owner_key: ownerKey || undefined,
      }),
    });
    clearTimeout(timeoutId);

    const payload = await res.json().catch(() => null);
    if (res.status === 403) {
      return {
        ok: false,
        forbidden: true,
        error: payload?.error || 'Forbidden: invalid ownerKey for slug',
      };
    }

    if (!res.ok || !payload?.success) {
      return {
        ok: false,
        error: payload?.error || `HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      id: payload.id,
      slug: payload.slug,
      ownerKey: payload.ownerKey || ownerKey || undefined,
    };
  } catch {
    clearTimeout(timeoutId);
    // Quiet local-first fallback when offline
    return { ok: false, error: 'Network unavailable' };
  }
}
