import { describe, expect, it, spyOn, afterAll, mock } from 'bun:test';
import { fetchUrlContent } from '../../services/fileService';

describe('fileService', () => {
  describe('fetchUrlContent', () => {
    let originalFetch = global.fetch;

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('should throw an error when fetch response is not ok', async () => {
      // Mock global fetch to return a non-ok response
      global.fetch = mock(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({}),
      })) as any;

      const url = 'https://example.com/invalid-url';

      // Call the function and expect it to throw an error with the specific message
      await expect(fetchUrlContent(url)).rejects.toThrow('Network response was not ok.');

      // Verify that fetch was called
      expect(global.fetch).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    });
  });
});
