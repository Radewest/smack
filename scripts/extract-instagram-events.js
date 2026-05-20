/**
 * extract-instagram-events.js
 *
 * Takes carousel images, sends them to Google Gemini Vision (FREE),
 * extracts structured events, and upserts into Supabase discovered_events.
 *
 * Usage (from the smack folder):
 *   node scripts/extract-instagram-events.js
 *
 * Requires:
 *   npm install @google/generative-ai @supabase/supabase-js dotenv
 *
 * Add to .env.local:
 *   GEMINI_API_KEY=AIza...
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SOURCE_ACCOUNT = '@letsgetlocalct'; // update to the actual account handle
const SOURCE_POST_ID = 'DYfE2HhjQhS';
const CITY = 'Cape Town';

// ─── Image sources ────────────────────────────────────────────────────────────
// Add your saved slide images here. No extension needed if files have none.

const IMAGE_SOURCES = [
  { type: 'file', path: './scripts/test-images/thursday.png' },
  { type: 'file', path: './scripts/test-images/friday.png' },
  { type: 'file', path: './scripts/test-images/saturday.png' },
  { type: 'file', path: './scripts/test-images/sunday.png' },
];

// ─── Extraction prompt ────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `
This image is a slide from a Cape Town events carousel post on Instagram.
Each event is listed with: Event Name, Venue, Time, and Price.

Extract every event listed and return a JSON array. Use exactly this structure:
[
  {
    "name": "event name",
    "venue": "venue name",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "price": "Free or From RXXX",
    "city": "Cape Town"
  }
]

Rules:
- The day and date are shown at the top of the slide (e.g. "thursday / 21 MAY 2026")
- Use that date for ALL events on that slide
- If price says "Free", use "Free". If it says "From RXXX", keep that exact string.
- Return ONLY a valid JSON array, no markdown fences, no explanation.
`.trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function extractEventsFromImage(model, source) {
  let imagePart;

  if (source.type === 'file') {
    const imageData = fs.readFileSync(path.resolve(__dirname, '..', source.path));
    // Detect PNG vs JPEG from magic bytes — works even with no file extension
    const isPng = imageData[0] === 0x89 && imageData[1] === 0x50;
    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    imagePart = { inlineData: { data: imageData.toString('base64'), mimeType } };
  } else if (source.type === 'url') {
    const res = await fetch(source.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = source.url.includes('.png') ? 'image/png' : 'image/jpeg';
    imagePart = { inlineData: { data: buffer.toString('base64'), mimeType } };
  }

  const result = await model.generateContent([EXTRACTION_PROMPT, imagePart]);
  const text = result.response.text().trim();
  // Strip markdown fences if Gemini adds them
  const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(clean);
}

function buildSupabaseRows(events, imageSource) {
  return events.map((event) => {
    const startsAt = event.date && event.time
      ? new Date(`${event.date}T${event.time}:00+02:00`).toISOString()
      : null;

    return {
      name: event.name,
      venue: event.venue,
      city: CITY,
      date: event.date || null,
      starts_at: startsAt,
      price: event.price || null,
      image_url: imageSource.type === 'url' ? imageSource.url : null,
      source: 'instagram',
      source_account: SOURCE_ACCOUNT,
      source_post_id: SOURCE_POST_ID,
      raw_data: event,
    };
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY in .env.local');
    console.error('   Get a free key at: https://aistudio.google.com/app/apikey');
    process.exit(1);
  }
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.error('   Supabase dashboard → Settings → API → service_role key');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let totalInserted = 0;

  for (let i = 0; i < IMAGE_SOURCES.length; i++) {
    const source = IMAGE_SOURCES[i];
    // Wait 20s between requests to stay within free tier rate limits (except first)
    if (i > 0) {
      console.log(`   ⏳ Waiting 20s before next image (free tier rate limit)...`);
      await new Promise(resolve => setTimeout(resolve, 20000));
    }
    console.log(`\n📸 Processing image ${i + 1}/${IMAGE_SOURCES.length}...`);

    try {
      const events = await extractEventsFromImage(model, source);
      console.log(`   ✅ Extracted ${events.length} events:`);
      events.forEach(e => console.log(`      - ${e.name} @ ${e.venue} | ${e.date} ${e.time} | ${e.price}`));

      const rows = buildSupabaseRows(events, source);

      const { error, data } = await supabase
        .from('discovered_events')
        .upsert(rows, {
          onConflict: 'source,source_account,name,starts_at',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        console.error(`   ❌ Supabase error:`, error.message);
      } else {
        console.log(`   💾 Upserted ${data.length} rows to Supabase`);
        totalInserted += data.length;
      }
    } catch (err) {
      console.error(`   ❌ Failed on image ${i + 1}:`, err.message);
    }
  }

  console.log(`\n🎉 Done. Total rows upserted: ${totalInserted}`);
}

main().catch(console.error);
