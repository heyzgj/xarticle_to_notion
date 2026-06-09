import type { Message } from '../types/messages';
import type { SiteProfile } from '../pipeline/types';
import { createPipeline } from '../pipeline/pipeline';

/**
 * Per-platform content-script bootstrap. Each platform's `index.ts` calls this
 * with its profile (and optional async readiness check). Centralizes the
 * chrome.runtime listener pattern so adding a platform is one entry + manifest
 * declaration, not boilerplate.
 */
export function registerPipeline(
  profiles: SiteProfile[],
  readyCheck?: () => Promise<void>,
): void {
  const pipeline = createPipeline(profiles);

  chrome.runtime.onMessage.addListener(
    (message: Message, _sender, sendResponse) => {
      if (message.type !== 'EXTRACT_ARTICLE') return;
      void (async () => {
        try {
          if (readyCheck) await readyCheck();
          const data = await pipeline.run(document, window.location.href);
          sendResponse(
            data
              ? { type: 'ARTICLE_DATA', data }
              : { type: 'ARTICLE_NOT_FOUND' },
          );
        } catch (err) {
          // Profiles must never hang the popup; surface as a not-found and log.
          console.error('[pipeline] extract failed', err);
          sendResponse({ type: 'ARTICLE_NOT_FOUND' });
        }
      })();
      return true; // async response
    },
  );
}
