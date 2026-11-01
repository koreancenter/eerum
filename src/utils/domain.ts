/**
 * Re-export wrapper for domain utilities redirected to centralized CardSerializer.
 */
export {
  APP_BASE_DOMAIN,
  APP_BASE_URL,
  normalizeDomain,
  isPlatformHost,
  parseSlugFromInput,
  getRouteSlug,
  isPublicSlugRoute,
  getCardShareUrl,
  getCardDisplayUrl,
  resolvePublicRouteCard,
  resolveCardFromLocation,
  sanitizeCardForVault,
} from './cardSerializer';
