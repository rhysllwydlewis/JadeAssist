import { searchService, SearchResult } from '../services/searchService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

async function main(): Promise<void> {
  section('Search result prompt formatting');

  const results: SearchResult[] = [
    {
      id: 'supplier-1',
      type: 'supplier',
      title: 'Perfect Shots Photography',
      description: 'Professional event photography',
      location: 'Birmingham',
      category: 'photographer',
      rating: 4.9,
      source: 'local-db',
    },
    {
      id: 'website-guides',
      type: 'website',
      title: 'EventFlow Guides',
      description: 'Planning guides and checklists',
      url: '/guides',
      source: 'website-index',
    },
  ];

  const formatted = searchService.formatForPrompt(results);

  assert(formatted.includes('Perfect Shots Photography'), 'includes supplier title');
  assert(formatted.includes('Birmingham'), 'includes supplier location');
  assert(formatted.includes('photographer'), 'includes supplier category');
  assert(formatted.includes('EventFlow Guides'), 'includes website result');
  assert(formatted.includes('/guides'), 'includes website URL');

  section('Empty search result formatting');

  assert(
    searchService.formatForPrompt([]) === 'No matching EventFlow results were found.',
    'returns clear empty-result message'
  );

  section('UK-wide online fallback');

  const cardiffVenues = await searchService.search({
    query: 'find me a venue in Cardiff',
    limit: 6,
  });

  assert(cardiffVenues.length >= 3, 'returns multiple Cardiff venue discovery links');
  assert(
    cardiffVenues.some(
      (item) => item.source === 'online-search' && item.url?.includes('google.com')
    ),
    'includes online search links when EventFlow inventory is thin'
  );
  assert(
    cardiffVenues.every((item) => item.category === 'venue'),
    'venue search returns venue-category recommendations'
  );

  const northWalesVenues = await searchService.search({
    query: 'find me a venue in North Wales',
    limit: 6,
  });

  assert(
    northWalesVenues.some((item) => item.location === 'North Wales'),
    'detects North Wales before generic Wales'
  );

  const boltonFlorists = await searchService.search({
    query: 'find me a florist in Bolton',
    limit: 6,
  });

  assert(
    boltonFlorists.some((item) => item.category === 'florist' && item.location === 'Bolton'),
    'maps florist requests to Bolton online discovery links'
  );

  const plymouthMusicians = await searchService.search({
    query: 'find me a musician in Plymouth',
    limit: 6,
  });

  assert(
    plymouthMusicians.some(
      (item) => item.category === 'entertainment' && item.location === 'Plymouth'
    ),
    'maps musician requests to entertainment discovery links in Plymouth'
  );

  const cardiffHotels = await searchService.search({
    query: 'find me a hotel near Cardiff',
    limit: 6,
  });

  assert(
    cardiffHotels.some((item) => item.category === 'accommodation'),
    'maps hotel requests to accommodation recommendations'
  );

  console.log(`\n──────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`──────────────────────────────────\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Search service validation failed:', error);
  process.exit(1);
});
