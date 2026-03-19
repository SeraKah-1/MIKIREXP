
/**
 * ==========================================
 * UNIVERSAL FILE SERVICE
 * Handles extraction of text from various file formats
 * ==========================================
 */

export const extractYouTubeTranscript = async (html: string): Promise<string> => {
  try {
    const captionsRegex = /"captionTracks":(\[.*?\])/;
    const match = html.match(captionsRegex);
    if (!match) {
      throw new Error("Tidak ada subtitle/caption yang ditemukan di video ini. Pastikan video memiliki CC/Subtitle.");
    }
    
    const captionTracks = JSON.parse(match[1]);
    let track = captionTracks.find((t: any) => t.languageCode === 'id') || 
                captionTracks.find((t: any) => t.languageCode === 'en') || 
                captionTracks[0];
                
    if (!track || !track.baseUrl) throw new Error("URL subtitle tidak ditemukan.");
    
    const transcriptUrl = track.baseUrl;
    const transcriptResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(transcriptUrl)}`);
    const transcriptData = await transcriptResponse.json();
    const transcriptXml = transcriptData.contents;
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("text");
    
    let transcript = "";
    for (let i = 0; i < textNodes.length; i++) {
      const text = textNodes[i].textContent || "";
      const decodedText = text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      transcript += decodedText + " ";
    }
    
    if (!transcript || !transcript.trim()) throw new Error("Subtitle kosong.");
    return transcript;
  } catch (error: any) {
    console.error("YouTube Transcript Error:", error);
    throw new Error("Gagal mengambil transkrip YouTube: " + error.message);
  }
};

export const fetchUrlContent = async (url: string): Promise<string> => {
  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Network response was not ok.');
    const data = await response.json();
    const html = data.contents;
    
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      return await extractYouTubeTranscript(html);
    }
    
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script, style, nav, footer, header, aside');
    scripts.forEach(s => s.remove());
    
    return doc.body.textContent || "";
  } catch (error: any) {
    console.error("Error fetching URL:", error);
    throw new Error(error.message || "Gagal mengambil konten dari URL.");
  }
};
