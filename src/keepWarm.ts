export const handler = async () => {
  const url = process.env.PING_URL;
  if (!url) throw new Error('no url set for keep alive function');
  return fetch(url, { method: 'HEAD', cache: 'no-store' });
};
