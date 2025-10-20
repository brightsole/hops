import { getAssociations } from './getAssociations';
import { ASSOCIATION_TYPES } from './types';
import type { Word } from './types';

const createWord = (name: string, links: Word['links']): Word => ({
  name,
  links,
  cacheExpiryDate: 0,
  updatedAt: 0,
  version: 1,
});

const createLink = (name: string, types: string[]) => ({
  name,
  associations: types.map((type) => ({ type })),
});

describe('getAssociations', () => {
  it('deduplicates duplicate associations across both sides', () => {
    const from = createWord('alpha', [
      createLink('beta', [
        'Datamuse: associated with',
        'RiTa: rhymes',
        'RiTa: rhymes',
      ]),
    ]);
    const to = createWord('beta', [
      createLink('alpha', [
        'Datamuse: associated with',
        'RiTa: rhymes',
        'RiTa: rhymes',
      ]),
    ]);

    const result = getAssociations(from, to);

    expect(result).toBe(
      `${ASSOCIATION_TYPES.associatedWith}|${ASSOCIATION_TYPES.rhymes}`,
    );
  });

  it('logs when the reciprocal link is missing types and merges the full set', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const from = createWord('alpha', [
      createLink('beta', ['Datamuse: associated with', 'RiTa: rhymes']),
    ]);
    const to = createWord('beta', [
      createLink('alpha', ['Datamuse: associated with']),
    ]);

    const result = getAssociations(from, to);

    expect(result).toBe(
      `${ASSOCIATION_TYPES.associatedWith}|${ASSOCIATION_TYPES.rhymes}`,
    );
    expect(infoSpy).toHaveBeenCalledWith('Mismatch detected: alpha <-> beta');
    infoSpy.mockRestore();
  });

  it('appends an anagram association when the words are anagrams', () => {
    const from = createWord('silent', []);
    const to = createWord('listen', []);

    const result = getAssociations(from, to);

    expect(result).toBe(ASSOCIATION_TYPES.anagram);
  });

  it('throws if neither word references the other', () => {
    const from = createWord('alpha', []);
    const to = createWord('beta', []);

    expect(() => getAssociations(from, to)).toThrow('Not linked');
  });

  it('returns both link types and the anagram marker when everything is present', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const from = createWord('team', [
      createLink('meat', ['Datamuse: associated with', 'RiTa: rhymes']),
    ]);
    const to = createWord('meat', [createLink('team', ['RiTa: rhymes'])]);

    const result = getAssociations(from, to);

    expect(result).toBe(
      `${ASSOCIATION_TYPES.associatedWith}|${ASSOCIATION_TYPES.rhymes}|${ASSOCIATION_TYPES.anagram}`,
    );
    infoSpy.mockRestore();
  });
});
