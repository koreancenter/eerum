/**
 * Re-export wrapper for domain utilities redirected to centralized CardSerializer.
 */
export {
  APP_BASE_DOMAIN,
  APP_BASE_URL,
  normalizeDomain,
  getRouteSlug,
  isPublicSlugRoute,
  getCardShareUrl,
  getCardDisplayUrl,
  resolveCardFromLocation,
} from './cardSerializer';
