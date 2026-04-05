import type { Message } from '../types/messages';
import { detectArticle } from './detector';
import { extractArticle } from './extractor';

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_ARTICLE') {
      handleExtract().then(sendResponse);
      return true; // async response
    }
  }
);

async function handleExtract(): Promise<Message> {
  const isArticle = await detectArticle();
  if (!isArticle) {
    return { type: 'ARTICLE_NOT_FOUND' };
  }
  const data = extractArticle();
  return { type: 'ARTICLE_DATA', data };
}
