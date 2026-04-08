import { NextResponse } from 'next/server';
import { pipeline, cos_sim } from '@huggingface/transformers';
import { MY_LIBRARY, DISTRICT_LIBRARY, MY_LIB_CS, DIST_LIB_CS } from '../../../lib/library-items.js';

// Module-level cache — persists across requests in the same Node process
let embedder = null;
let cachedVectors = null; // { id -> Float32Array }

const ALL_ITEMS = [...MY_LIBRARY, ...DISTRICT_LIBRARY, ...MY_LIB_CS, ...DIST_LIB_CS];

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'fp32',
    });
  }
  return embedder;
}

async function embedText(text, pipe) {
  const out = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

async function getItemVectors(pipe) {
  if (!cachedVectors) {
    const entries = await Promise.all(
      ALL_ITEMS.map(async item => [item.id, await embedText(item.text, pipe)])
    );
    cachedVectors = Object.fromEntries(entries);
  }
  return cachedVectors;
}

export async function POST(request) {
  try {
    const { query, panel } = await request.json();
    // panel: 'main' (home search) or 'create' (create-search panel)

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ my: [], district: [] });
    }

    const pipe = await getEmbedder();
    const [queryVec, itemVecs] = await Promise.all([
      embedText(query.trim(), pipe),
      getItemVectors(pipe),
    ]);

    const myPool   = panel === 'create' ? MY_LIB_CS   : MY_LIBRARY;
    const distPool = panel === 'create' ? DIST_LIB_CS : DISTRICT_LIBRARY;
    const THRESHOLD = 0.25;

    const rank = (pool) =>
      pool
        .map(item => ({ item, score: cos_sim(queryVec, itemVecs[item.id]) }))
        .filter(x => x.score >= THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.item);

    return NextResponse.json({ my: rank(myPool), district: rank(distPool) });
  } catch (err) {
    console.error('[library-search]', err);
    return NextResponse.json({ my: [], district: [] }, { status: 500 });
  }
}
