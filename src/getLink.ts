import { LRUCache } from 'lru-cache';
import type { Word, Link, DBLinkModel } from './types';
import env from './env';
import { getAssociations } from './getAssociations';

const wordCache = new LRUCache<string, Word>({
  max: 100,
});
const linkCache = new LRUCache<string, Link>({
  max: 1000, // links are tiny, go ham.
});

const fetchWord = async (name: string): Promise<Word> => {
  const cached = wordCache.get(name);
  if (cached) return cached;

  const response = await fetch(`${env.wordsApiUrl}/words/${name}`, {
    headers: {
      [env.authHeaderName]: env.authHeaderValue,
    },
  });
  if (!response.ok) throw new Error('Word not found: ' + name);

  const word = await response.json();
  wordCache.set(name, word);
  return word;
};

export const getLink = async (
  LinkModel: DBLinkModel,
  from: string,
  to: string,
): Promise<Link> => {
  const orderedWordsKey = [from, to].sort().join('::');
  const cached = linkCache.get(orderedWordsKey);
  if (cached) return cached;

  try {
    const link = await LinkModel.get(orderedWordsKey);
    if (link) {
      linkCache.set(orderedWordsKey, link);
      return link;
    }
  } catch {
    /* fine to not find pre-created link */
  }

  const [fromWord, toWord] = await Promise.all([
    fetchWord(from),
    fetchWord(to),
  ]);

  const associationsKey = getAssociations(fromWord, toWord);
  // Link version mirrors the words dataset version. If they differ, choose the lower.
  const version = Math.min(fromWord.version ?? 1, toWord.version ?? 1);
  const newLink: Link = {
    id: orderedWordsKey,
    associationsKey,
    version,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const result = await LinkModel.create(newLink);
  linkCache.set(orderedWordsKey, result);
  return result;
};
