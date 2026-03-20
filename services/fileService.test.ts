import { describe, it, expect, beforeAll, afterAll, mock, beforeEach } from "bun:test";
import { extractYouTubeTranscript } from "./fileService";

class MockDOMParser {
  parseFromString(xmlStr: string, type: string) {
    return {
      getElementsByTagName: (tagName: string) => {
        if (tagName === "text") {
          const regex = /<text[^>]*>(.*?)<\/text>/g;
          const nodes = [];
          let match;
          while ((match = regex.exec(xmlStr)) !== null) {
            nodes.push({ textContent: match[1] });
          }
          return nodes;
        }
        return [];
      }
    };
  }
}

describe("extractYouTubeTranscript", () => {
  let originalFetch: typeof fetch;
  let mockFetch: any;
  let originalDOMParser: any;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalDOMParser = global.DOMParser;
    global.DOMParser = MockDOMParser as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    global.DOMParser = originalDOMParser;
  });

  beforeEach(() => {
    mockFetch = mock();
    global.fetch = mockFetch;
  });

  it("should successfully extract and return Indonesian transcript (happy path)", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ contents: "<text>Halo</text><text>Dunia</text>" })
    });
    const html = `<html><body><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"http://mock-url.com/id","languageCode":"id"}]}}}</script></body></html>`;
    const result = await extractYouTubeTranscript(html);
    expect(result).toBe("Halo Dunia ");
  });

  it("should fallback to English transcript if Indonesian is not available", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ contents: "<text>Hello</text><text>World</text>" })
    });
    const html = `<html><body><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"http://mock-url.com/en","languageCode":"en"}]}}}</script></body></html>`;
    const result = await extractYouTubeTranscript(html);
    expect(result).toBe("Hello World ");
  });

  it("should fallback to first available transcript if id and en are not available", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ contents: "<text>Hola</text><text>Mundo</text>" })
    });
    const html = `<html><body><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"http://mock-url.com/es","languageCode":"es"}]}}}</script></body></html>`;
    const result = await extractYouTubeTranscript(html);
    expect(result).toBe("Hola Mundo ");
  });

  it("should decode HTML entities correctly", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ contents: "<text>&amp;</text><text>&#39;</text><text>&quot;</text>" })
    });
    const html = `<html><body><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"http://mock-url.com/id","languageCode":"id"}]}}}</script></body></html>`;
    const result = await extractYouTubeTranscript(html);
    expect(result).toBe("& ' \" ");
  });

  it("should throw an error when captionTracks regex does not match", async () => {
    const html = `<html><body>No captions here</body></html>`;
    await expect(extractYouTubeTranscript(html)).rejects.toThrow("Gagal mengambil transkrip YouTube: Tidak ada subtitle/caption yang ditemukan di video ini. Pastikan video memiliki CC/Subtitle.");
  });

  it("should throw an error when track exists but has no baseUrl", async () => {
    const html = `<html><body><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"languageCode":"id"}]}}}</script></body></html>`;
    await expect(extractYouTubeTranscript(html)).rejects.toThrow("Gagal mengambil transkrip YouTube: URL subtitle tidak ditemukan.");
  });

  it("should throw an error when parsed transcript is empty", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ contents: "<xml>no text tags</xml>" })
    });
    const html = `<html><body><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"http://mock-url.com/id","languageCode":"id"}]}}}</script></body></html>`;
    await expect(extractYouTubeTranscript(html)).rejects.toThrow("Gagal mengambil transkrip YouTube: Subtitle kosong.");
  });

  it("should throw an error when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network failed"));
    const html = `<html><body><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"http://mock-url.com/id","languageCode":"id"}]}}}</script></body></html>`;
    await expect(extractYouTubeTranscript(html)).rejects.toThrow("Gagal mengambil transkrip YouTube: Network failed");
  });
});
