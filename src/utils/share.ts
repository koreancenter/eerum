export interface ShareOrCopyOptions {
  title: string;
  text: string;
  url: string;
  onCopied?: () => void;
  onCopyError?: () => void;
}

export type ShareOrCopyOutcome = 'shared' | 'copied' | 'aborted' | 'failed';

/**
 * Shares a URL via the native Web Share API when available, gracefully ignoring
 * user cancellation (`AbortError`), and falls back to copying the URL to the clipboard.
 */
export async function shareOrCopyLink({
  title,
  text,
  url,
  onCopied,
  onCopyError,
}: ShareOrCopyOptions): Promise<ShareOrCopyOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return 'aborted';
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      onCopied?.();
      return 'copied';
    } catch {
      onCopyError?.();
      return 'failed';
    }
  }

  onCopyError?.();
  return 'failed';
}
