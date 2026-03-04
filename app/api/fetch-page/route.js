export async function POST(request) {
  const { url } = await request.json();
  console.log('[fetch-page] fetching:', url);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Brisk/1.0; +https://brisk.com)' },
      signal: AbortSignal.timeout(8000),
    });

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].trim()
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      : '';

    // Extract meta description
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract readable body text — strip scripts/styles/nav/footer elements, then tags
    const cleanedHtml = html
      .replace(/<(script|style|nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Try to extract main content area first
    const mainMatch = cleanedHtml.match(/<(main|article|\.content|#content)[^>]*>([\s\S]*?)<\/\1>/i);
    const bodySource = mainMatch ? mainMatch[0] : cleanedHtml;

    const rawText = bodySource
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Split into rough paragraphs by sentence boundaries, keep meaningful chunks
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

    // Guess subject hint
    const combined = (title + ' ' + description + ' ' + rawText.slice(0, 400)).toLowerCase();
    let subject_hint = '';
    if (/\bmath\b|algebra|geometry|calculus|equation|fraction|arithmetic|trigonometry/.test(combined)) subject_hint = 'Math';
    else if (/science|biology|chemistry|physics|lab\b|experiment|ecosystem|genetics|evolution/.test(combined)) subject_hint = 'Science';
    else if (/history|social studies|civics|geography|politics|revolution|civilization/.test(combined)) subject_hint = 'Social Studies';
    else if (/english|literature|grammar|writing|reading|poetry|novel|essay/.test(combined)) subject_hint = 'ELA';

    console.log('[fetch-page] title:', title, '| bodyText length:', bodyText.length);
    return Response.json({ title, description, preview, bodyText, subject_hint });
  } catch (err) {
    console.error('[fetch-page] error:', err.message);
    return Response.json({ title: '', description: '', preview: '', bodyText: '', subject_hint: '' });
  }
}
