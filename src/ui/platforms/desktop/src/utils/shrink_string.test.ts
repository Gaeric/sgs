/** @jest-environment node */
import { compress, decompress } from 'core/shares/libs/utils/shrink_string';
import { gunzipSync, gzipSync } from 'zlib';

describe('replay compression', () => {
  test.each(['', 'hello', '三国杀 🃏', 'game state'.repeat(10000)])('round-trips sample %#', async text => {
    const compressed = await compress(text);

    expect(gunzipSync(Buffer.from(compressed, 'base64')).toString()).toBe(text);
    expect(await decompress(compressed)).toBe(text);
  });

  test('reads existing gzip/base64 data', async () => {
    const text = JSON.stringify({ players: ['Alice', '曹操'], events: [] });
    const existing = gzipSync(text).toString('base64');

    expect(await decompress(existing)).toBe(text);
  });

  test('rejects corrupt replay data', async () => {
    await expect(decompress(Buffer.from('not a gzip stream').toString('base64'))).rejects.toThrow();
  });
});
