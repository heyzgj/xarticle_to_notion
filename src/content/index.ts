import type { Message } from '../types/messages';
import { detectContent } from './detector';
import { extractArticle, extractThread } from './extractor';

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_ARTICLE') {
      handleExtract().then(sendResponse);
      return true; // async response
    }
  }
);

async function handleExtract(): Promise<Message> {
  const result = await detectContent();
  if (!result.detected) {
    return { type: 'ARTICLE_NOT_FOUND' };
  }

  const data = result.contentType === 'thread'
    ? extractThread(result.tweetCount)
    : extractArticle();

  return { type: 'ARTICLE_DATA', data };
}
