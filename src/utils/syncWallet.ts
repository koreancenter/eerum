import { StoredCard } from "../types/card";

const SYNC_KEY = "card_sync_id";

// 1. 현재 기기의 Sync ID 가져오기 (없으면 새로 생성)
export function getOrCreateSyncId(): string {
  let id = localStorage.getItem(SYNC_KEY);
  if (!id) {
    id = "sync_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    localStorage.setItem(SYNC_KEY, id);
  }
  return id;
}

// 2. 다른 기기의 Sync ID로 덮어쓰고 최신 보관함 가져오기
export async function pullWalletFromEdge(syncId: string): Promise<StoredCard[] | null> {
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
        localStorage.setItem(SYNC_KEY, syncId);
        return data.cards;
      }
    }
  } catch (err) {
    // Non-blocking local-first fallback
    clearTimeout(timeoutId);
  }
  return null;
}

// 3. 현재 로컬 보관함 목록을 백그라운드 동기화 (오프라인/에러 시 조용히 로컬 유지)
export async function pushWalletToEdge(cards: StoredCard[]): Promise<void> {
  if (!cards || !Array.isArray(cards) || cards.length === 0) return;
  const syncId = getOrCreateSyncId();
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
  } catch (err) {
    // Quiet fail-safe: local-first storage preserves all cards in browser localStorage
    clearTimeout(timeoutId);
  }
}
