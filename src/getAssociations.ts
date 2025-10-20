import type { Word } from './types';
import { ASSOCIATION_TYPES as A_TYPES } from './types';

const isAnagram = (str1: string, str2: string) =>
  str1.split('').sort().join('') === str2.split('').sort().join('');

const transformAssociationToType = (a: string): A_TYPES => {
  // Algorithmic
  if (a === 'Algorithmic: anagram') return A_TYPES.anagram;

  // Datamuse
  if (a === 'Datamuse: means like') return A_TYPES.meansLike;
  if (a === 'Datamuse: associated with') return A_TYPES.associatedWith;
  if (a === 'Datamuse: comprised with') return A_TYPES.comprisedWith;
  if (a === 'Datamuse: opposite of') return A_TYPES.oppositeOf;
  if (a === 'Datamuse: is a more specific term')
    return A_TYPES.isMoreSpecificTerm;
  if (a === 'Datamuse: is a more general term')
    return A_TYPES.isMoreGeneralTerm;
  if (a === 'Datamuse: popular noun pairings')
    return A_TYPES.popularNounPairings;
  if (a === 'Datamuse: popular adjective pairings')
    return A_TYPES.popularAdjectivePairings;
  if (a === 'Datamuse: a part of') return A_TYPES.aPartOf;
  if (a === 'Datamuse: commonly followed by') return A_TYPES.commonlyFollowedBy;
  if (a === 'Datamuse: commonly preceded by') return A_TYPES.commonlyPrecededBy;
  if (a === 'Datamuse: homophone of') return A_TYPES.homophoneOf;

  // RiTa
  if (a === 'RiTa: spelled like') return A_TYPES.spelledLike;
  if (a === 'RiTa: rhymes') return A_TYPES.rhymes;

  // both RiTa and Datamuse have sounds like for now
  if (a.includes('sounds')) return A_TYPES.soundsLike;

  throw new Error(`Unknown association type: ${a}`);
};

export const getAssociations = (
  from: Pick<Word, 'name' | 'links'>,
  to: Pick<Word, 'name' | 'links'>,
): string => {
  const fromLink = from.links.find((link) => link.name === to.name);
  const toLink = to.links.find((link) => link.name === from.name);
  const isAnagramPair = isAnagram(from.name, to.name);

  if (!fromLink && !toLink && !isAnagramPair) throw new Error('Not linked');

  const fromAssociations = fromLink?.associations || [];
  const toAssociations = toLink?.associations || [];

  const fromTypes = [...new Set(fromAssociations.map((assoc) => assoc.type))];
  const toTypes = [...new Set(toAssociations.map((assoc) => assoc.type))];

  if (fromTypes.length !== toTypes.length) {
    console.info(`Mismatch detected: ${from.name} <-> ${to.name}`);
  }

  const mergedTypes = [
    ...new Set([
      ...fromTypes,
      ...toTypes,
      ...(isAnagramPair ? ['Algorithmic: anagram'] : []),
    ]),
  ];

  return mergedTypes.map((type) => transformAssociationToType(type)).join('|');
};
