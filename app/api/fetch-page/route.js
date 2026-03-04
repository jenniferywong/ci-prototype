import FirecrawlApp from '@mendable/firecrawl-js';

function subjectHint(combined) {
  if (/\bmath\b|algebra|geometry|calculus|equation|fraction|arithmetic|trigonometry/.test(combined)) return 'Math';
  if (/science|biology|chemistry|physics|lab\b|experiment|ecosystem|genetics|evolution/.test(combined)) return 'Science';
  if (/history|social studies|civics|geography|politics|revolution|civilization/.test(combined)) return 'Social Studies';
  if (/english|literature|grammar|writing|reading|poetry|novel|essay/.test(combined)) return 'ELA';
  return '';
}

export async function POST(request) {
  const { url } = await request.json();
  console.log('[fetch-page] fetching:', url);

  // ── Firecrawl (primary) ──────────────────────────────────────
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const result = await app.scrapeUrl(url, { formats: ['markdown'] });
      if (result.success && (result.markdown || result.content)) {
        const bodyText = result.markdown || result.content || '';
        const meta = result.metadata || {};
        const title = meta.title || meta.ogTitle || '';
        const description = meta.description || meta.ogDescription || '';
        const combined = (title + ' ' + description + ' ' + bodyText.slice(0, 400)).toLowerCase();
        console.log('[fetch-page] Firecrawl ok — title:', title, '| length:', bodyText.length);
        return Response.json({
          title, description,
          preview: bodyText.slice(0, 350),
          bodyText,
          subject_hint: subjectHint(combined),
        });
      }
    } catch (err) {
      console.warn('[fetch-page] Firecrawl failed, falling back:', err.message);
    }
  }

  // ── Basic fetch fallback ─────────────────────────────────────
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Brisk/1.0; +https://brisk.com)' },
      signal: AbortSignal.timeout(8000),
    });

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].trim()
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      : '';

    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const cleanedHtml = html
      .replace(/<(script|style|nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const mainMatch = cleanedHtml.match(/<(main|article)[^>]*>([\s\S]*?)<\/\1>/i);
    const bodySource = mainMatch ? mainMatch[0] : cleanedHtml;

    const rawText = bodySource
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ').trim();

    const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [];
    const paragraphs = [];
    let current = '';
    for (const s of sentences) {
      current += s.trim() + ' ';
      if (current.length > 200) {
        if (current.trim().length > 40) paragraphs.push(current.trim());
        current = '';
      }
    }
    if (current.trim().length > 40) paragraphs.push(current.trim());

    const bodyText = paragraphs.slice(0, 25).join('\n');
    const preview = bodyText.slice(0, 350);
    const combined = (title + ' ' + description + ' ' + rawText.slice(0, 400)).toLowerCase();

    console.log('[fetch-page] fallback — title:', title, '| bodyText length:', bodyText.length);
    return Response.json({ title, description, preview, bodyText, subject_hint: subjectHint(combined) });
  } catch (err) {
    console.error('[fetch-page] error:', err.message);
    return Response.json({ title: '', description: '', preview: '', bodyText: '', subject_hint: '' });
  }
}
