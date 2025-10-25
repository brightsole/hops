import type { Word, DBLink, DBLinkModel } from './types';
import { getLink } from './getLink';
import { getAssociations } from './getAssociations';

jest.mock('./getAssociations', () => ({
  getAssociations: jest.fn(),
}));

// Ensure getLink constructs absolute URLs independent of real env
jest.mock('./env', () => ({
  __esModule: true,
  default: {
    wordsApiUrl: 'http://words.example.test',
  },
}));

describe('getLink', () => {
  const NOW = new Date('2024-01-02T03:04:05.000Z');
  type MockResponse<T> = { ok: boolean; json: () => Promise<T> };
  type TestFetch = jest.Mock<
    Promise<MockResponse<Word>>,
    [string, RequestInit?]
  >;
  let mockFetch: TestFetch;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(NOW);
    jest.clearAllMocks();
    // fresh fetch mock per test
    mockFetch = jest.fn<Promise<MockResponse<Word>>, [string, RequestInit?]>();
    Object.defineProperty(global, 'fetch', {
      value: mockFetch,
      writable: true,
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const createLinkModelDouble = (
    overrides: {
      get?: jest.Mock<Promise<DBLink>, [string]>;
      create?: jest.Mock<Promise<DBLink>, [Partial<DBLink>]>;
    } = {},
  ) => {
    const getMock =
      overrides.get ??
      jest
        .fn<Promise<DBLink>, [string]>()
        .mockRejectedValue(new Error('not found'));
    const createMock =
      overrides.create ?? jest.fn<Promise<DBLink>, [Partial<DBLink>]>();
    const modelUnknown: unknown = {
      get: getMock,
      create: createMock,
    };
    const model = modelUnknown as DBLinkModel; // single cast for controller mock
    return { model, getMock, createMock };
  };

  const word = (name: string, links: Word['links'] = []): Word => ({
    name,
    links,
    cacheExpiryDate: 0,
    updatedAt: 0,
    version: 1,
  });

  const mockFetchWordJson = (w: Word): MockResponse<Word> => ({
    ok: true,
    json: async () => w,
  });

  const mockFetchWordError = (): MockResponse<Word> => ({
    ok: false,
    // json will not be called when ok is false, but keep shape consistent

    json: async () =>
      ({
        // this is never used
      }) as unknown as Word,
  });

  it('returns immediately from in-memory cache without DB or network', async () => {
    const { model: LinkModel, createMock, getMock } = createLinkModelDouble();

    // initial create path to seed cache
    const alpha = word('alpha1');
    const beta = word('beta1');
    mockFetch
      .mockResolvedValueOnce(mockFetchWordJson(alpha))
      .mockResolvedValueOnce(mockFetchWordJson(beta));
    jest.mocked(getAssociations).mockReturnValue('cached-assoc');

    const first = await getLink(LinkModel, 'alpha1', 'beta1');

    // now ensure the second call hits the in-memory cache
    mockFetch.mockClear();
    createMock.mockClear();
    getMock.mockClear();
    jest.mocked(getAssociations).mockClear();

    const second = await getLink(LinkModel, 'beta1', 'alpha1');

    expect(second).toBe(first); // exact same object reference from cache
    expect(getMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(getAssociations).not.toHaveBeenCalled();
  });

  it('returns a preexisting link from the DB and caches it (order-insensitive key)', async () => {
    const existing = {
      id: 'alpha2::beta2',
      associations: 'associated|rhyme',
      createdAt: 1,
      updatedAt: 2,
    } as DBLink;

    const { model: LinkModel, getMock } = createLinkModelDouble({
      get: jest.fn<Promise<DBLink>, [string]>().mockResolvedValue(existing),
    });

    const first = await getLink(LinkModel, 'alpha2', 'beta2');
    expect(first).toEqual(existing);
    expect(getMock).toHaveBeenCalledWith('alpha2::beta2');
    expect(global.fetch).not.toHaveBeenCalled();
    // association calculation not needed when DB hit

    // Change DB behavior to ensure cache is used
    getMock.mockRejectedValueOnce(new Error('should not be called'));

    const second = await getLink(LinkModel, 'beta2', 'alpha2');
    expect(second).toEqual(existing);
    // get called only once total; second call should hit link cache
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
    // association calculation not needed when cache hit
  });

  it('creates a new link when DB miss: fetches words, computes associations, persists, and caches', async () => {
    const { model: LinkModel, createMock, getMock } = createLinkModelDouble();

    // mock fetch for both words
    const alpha = word('alpha3');
    const beta = word('beta3');

    mockFetch
      // fetch called with ('beta','alpha') in that order
      .mockResolvedValueOnce(mockFetchWordJson(beta))
      .mockResolvedValueOnce(mockFetchWordJson(alpha));

    const mockedGetAssociations = jest.mocked(getAssociations);
    mockedGetAssociations.mockReturnValue('means|rhyme');

    const result = await getLink(LinkModel, 'beta3', 'alpha3'); // reverse order to test key sorting

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'http://words.example.test/words/beta3',
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'http://words.example.test/words/alpha3',
    );

    // Called with input order (fromWord=beta, toWord=alpha)
    expect(mockedGetAssociations).toHaveBeenCalledWith(beta, alpha);

    expect(createMock).toHaveBeenCalledTimes(1);
    const created = createMock.mock.calls[0][0];
    expect(created).toEqual({
      id: 'alpha3::beta3',
      associations: 'means|rhyme',
      createdAt: NOW.getTime(),
      updatedAt: NOW.getTime(),
    });

    expect(result).toEqual(created);

    // subsequent call should be a cache hit: no DB get/create or fetch
    getMock.mockClear();
    createMock.mockClear();
    mockFetch.mockClear();

    const again = await getLink(LinkModel, 'alpha3', 'beta3');
    expect(again).toEqual(created);
    expect(getMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('propagates association calculation errors (no link between words)', async () => {
    const { model: LinkModel, createMock } = createLinkModelDouble();

    mockFetch
      .mockResolvedValueOnce(mockFetchWordJson(word('alpha4')))
      .mockResolvedValueOnce(mockFetchWordJson(word('beta4')));

    const mockedGetAssociations = jest.mocked(getAssociations);
    mockedGetAssociations.mockImplementation(() => {
      throw new Error('Not linked');
    });

    await expect(getLink(LinkModel, 'alpha4', 'beta4')).rejects.toThrow(
      'Not linked',
    );

    expect(createMock).not.toHaveBeenCalled();
  });

  it('reuses cached words across calls to minimize fetches', async () => {
    const { model: LinkModel } = createLinkModelDouble();

    const alpha = word('alpha5');
    const beta = word('beta5');
    const gamma = word('gamma5');

    // First call alpha/beta -> 2 fetches
    mockFetch
      .mockResolvedValueOnce(mockFetchWordJson(alpha))
      .mockResolvedValueOnce(mockFetchWordJson(beta))
      // Second call alpha/gamma -> only gamma should be fetched
      .mockResolvedValueOnce(mockFetchWordJson(gamma));

    jest.mocked(getAssociations).mockReturnValue('associated');

    const link1 = await getLink(LinkModel, 'alpha5', 'beta5');
    expect(link1).toEqual({
      id: 'alpha5::beta5',
      associations: 'associated',
      createdAt: NOW.getTime(),
      updatedAt: NOW.getTime(),
    });

    const link2 = await getLink(LinkModel, 'gamma5', 'alpha5');
    expect(link2).toEqual({
      id: 'alpha5::gamma5',
      associations: 'associated',
      createdAt: NOW.getTime(),
      updatedAt: NOW.getTime(),
    });

    // Only 3 fetches total across two calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      'http://words.example.test/words/gamma5',
    );
  });

  it('propagates words service errors (non-OK response)', async () => {
    const { model: LinkModel, createMock } = createLinkModelDouble();

    // from succeeds, to fails
    mockFetch
      .mockResolvedValueOnce(mockFetchWordJson(word('alpha6')))
      .mockResolvedValueOnce(mockFetchWordError());

    await expect(getLink(LinkModel, 'alpha6', 'beta6')).rejects.toThrow(
      'Word not found: beta6',
    );

    expect(createMock).not.toHaveBeenCalled();
  });
});
