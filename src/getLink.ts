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

  const response = await fetch(`${env.wordsApiUrl}/words/${name}`);
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
    linkCache.set(orderedWordsKey, link);
    return link;
  } catch {
    /* fine to not find pre-created link */
  }

  const [fromWord, toWord] = await Promise.all([
    fetchWord(from),
    fetchWord(to),
  ]);

  const associations = getAssociations(fromWord, toWord);
  const newLink: Link = {
    id: orderedWordsKey,
    associations,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await LinkModel.create(newLink);
  linkCache.set(orderedWordsKey, newLink);
  return newLink;
};
