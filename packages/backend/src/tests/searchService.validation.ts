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

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
