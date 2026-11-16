import { useState, useEffect, useCallback, useRef } from 'react';
import { StoredCard } from '../types/card';
import {
  loadUserCards,
  normalizeStoredCards,
  hasLocalWalletInitialized,
} from '../utils/initialCards';
import {
  resolvePublicRouteCard,
  getRouteSlug,
  isPublicSlugRoute,
  isPlatformHost,
  normalizeDomain,
} from '@/utils/cardSerializer';

export interface UsePublicCardRouteOptions {
  hasLocalCards: boolean;
  isPinConfigured: boolean;
  showToast: (msg: string) => void;
  onResolveOwnedMyCard: (ownedCardId?: string) => void;
  onApplySyncedCards: (normalizedCards: StoredCard[]) => void;
  onResetFlip: () => void;
}

export function usePublicCardRoute({
  hasLocalCards,
  isPinConfigured,
  showToast,
  onResolveOwnedMyCard,
  onApplySyncedCards,
  onResetFlip,
}: UsePublicCardRouteOptions) {
  // External Public Shared Landing State (strictly isolated from internal studio & vault views)
  const [publicCard, setPublicCard] = useState<StoredCard | null>(null);
  const [isPublicExternalView, setIsPublicExternalView] = useState<boolean>(false);

  const callbacksRef = useRef({
    showToast,
    onResolveOwnedMyCard,
    onApplySyncedCards,
    onResetFlip,
  });

  useEffect(() => {
    callbacksRef.current = {
      showToast,
      onResolveOwnedMyCard,
      onApplySyncedCards,
      onResetFlip,
    };
  }, [showToast, onResolveOwnedMyCard, onApplySyncedCards, onResetFlip]);

  const cleanPublicUrlToRoot = useCallback(() => {
    if (typeof window !== 'undefined' && isPublicSlugRoute()) {
      window.history.replaceState({}, document.title, '/');
    }
    setPublicCard(null);
    setIsPublicExternalView(false);
  }, []);

  // 1. URL Sync Detection & Initialization (Cross-device anonymous wallet)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const syncId = searchParams.get('sync');
    if (syncId) {
      import('../utils/syncWallet').then(({ pullWalletFromEdge }) =>
        pullWalletFromEdge(syncId).then((remoteCards) => {
          if (remoteCards && Array.isArray(remoteCards) && remoteCards.length > 0) {
            const normalized = normalizeStoredCards(remoteCards);
            setPublicCard(null);
            setIsPublicExternalView(false);
            callbacksRef.current.onApplySyncedCards(normalized);
            callbacksRef.current.showToast('기기 보관함이 성공적으로 동기화되었습니다.');
          }
          const url = new URL(window.location.href);
          url.searchParams.delete('sync');
          window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
        })
      );
    }
  }, []);

  // 2. Public URL Route Evaluation (Runs ONLY on initial load & browser Back/Forward, NEVER on cards state mutations)
  const evaluatePublicRoute = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      if (!isPublicSlugRoute()) {
        setPublicCard(null);
        setIsPublicExternalView(false);
        return;
      }

      const localMyCards = loadUserCards().filter((c) => c.isMyCard);
      const localOwnedMatch = resolvePublicRouteCard(localMyCards, []);
      if (localOwnedMatch) {
        setPublicCard(null);
        setIsPublicExternalView(false);
        callbacksRef.current.onResolveOwnedMyCard(localOwnedMatch.id);
        return;
      }

      const slug = getRouteSlug();
      const hostname = window.location.hostname.toLowerCase();
      const customDomainParam = !isPlatformHost(hostname) ? normalizeDomain(hostname) : null;

      const endpoint = customDomainParam
        ? `/api/resolve?domain=${encodeURIComponent(customDomainParam)}`
        : slug
          ? `/api/cards?slug=${encodeURIComponent(slug)}`
          : null;

      import('../constants/sampleCards').then(({ INITIAL_CARDS }) => {
        const sampleFallback = resolvePublicRouteCard([], INITIAL_CARDS);

        if (!endpoint) {
          if (sampleFallback) {
            setPublicCard(sampleFallback);
            setIsPublicExternalView(true);
            callbacksRef.current.onResetFlip();
          }
          return;
        }

        fetch(endpoint)
          .then((res) => (res.ok ? res.json() : null))
          .then((payload) => {
            const remoteCard: StoredCard | null = payload?.card || sampleFallback || null;
            if (!remoteCard) return;

            const currentMyCards = loadUserCards().filter((c) => c.isMyCard);
            const isOwnedByLocalUser = currentMyCards.some(
              (c) =>
                c.id === remoteCard.id ||
                (Boolean(remoteCard.owner_key) && c.owner_key === remoteCard.owner_key)
            );

            if (isOwnedByLocalUser) {
              const owned =
                currentMyCards.find(
                  (c) =>
                    c.id === remoteCard.id ||
                    (Boolean(remoteCard.owner_key) && c.owner_key === remoteCard.owner_key)
                ) || currentMyCards[0];
              setPublicCard(null);
              setIsPublicExternalView(false);
              callbacksRef.current.onResolveOwnedMyCard(owned?.id);
            } else {
              setPublicCard(remoteCard);
              setIsPublicExternalView(true);
              callbacksRef.current.onResetFlip();
            }
          })
          .catch(() => {
            if (sampleFallback) {
              setPublicCard(sampleFallback);
              setIsPublicExternalView(true);
              callbacksRef.current.onResetFlip();
            }
          });
      });
    } catch (e) {
      console.error('URL routing error', e);
    }
  }, []);

  useEffect(() => {
    evaluatePublicRoute();
    window.addEventListener('popstate', evaluatePublicRoute);
    return () => window.removeEventListener('popstate', evaluatePublicRoute);
  }, [evaluatePublicRoute]);

  // Strict visitor classification:
  // True ONLY when an unauthenticated external visitor (no local wallet/cards/PIN) visits a public shared link (/card/:slug)
  const hasLocalUserSession =
    hasLocalCards || isPinConfigured || hasLocalWalletInitialized();
  const isUnauthenticatedExternalVisitor =
    isPublicExternalView && Boolean(publicCard) && !hasLocalUserSession;

  return {
    publicCard,
    isPublicExternalView,
    isUnauthenticatedExternalVisitor,
    cleanPublicUrlToRoot,
  };
}
