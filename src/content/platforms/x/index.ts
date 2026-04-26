import type { Message } from '../../../types/messages';
import { createPipeline } from '../../../pipeline/pipeline';
import { x, waitForXContent } from '../../../pipeline/profiles/x';

const pipeline = createPipeline([x]);

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_ARTICLE') {
      handleExtract().then(sendResponse);
      return true; // async response
    }
  },
);

async function handleExtract(): Promise<Message> {
  await waitForXContent();
  const data = pipeline.run(document, window.location.href);
  if (!data) return { type: 'ARTICLE_NOT_FOUND' };
  return { type: 'ARTICLE_DATA', data };
}
