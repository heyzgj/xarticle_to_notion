import type { Message } from '../../../types/messages';
import { detectContent } from './detector';
import { extractArticle, extractThread, extractTweet, extractQuoteTweet } from './extractor';

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
  if (!result.detected) return { type: 'ARTICLE_NOT_FOUND' };

  switch (result.contentType) {
    case 'thread':      return { type: 'ARTICLE_DATA', data: extractThread(result.tweetCount) };
    case 'tweet':       return { type: 'ARTICLE_DATA', data: extractTweet() };
    case 'quote_tweet': return { type: 'ARTICLE_DATA', data: extractQuoteTweet() };
    default:            return { type: 'ARTICLE_DATA', data: extractArticle() };
  }
}
