// Enhanced test script with additional data
// Run with: node test-transforms-enhanced.js

const {
  demoDb,
  demoTransforms,
  demoMeasures,
  demoMetrics,
  evaluateMetric,
  buildTransformHelpers
} = require('./dist/semanticEngine.js');

console.log('\n=== Enhanced Testing of Data-Driven Context Transforms ===\n');

// Add sales data for Dec 2024 so the mapping has data to find
demoDb.tables.sales.push(
  { year: 2024, month: 12, regionId: "NA", productId: 1, quantity: 15, amount: 1500 },
  { year: 2024, month: 12, regionId: "EU", productId: 2, quantity: 8, amount: 960 }
);

console.log('Added sales data for 2024-12');
console.log('2024-12 data:', demoDb.tables.sales.filter(s => s.year === 2024 && s.month === 12));

// Test 1: Transform mapping
console.log('\n=== Test 1: Transform Mapping ===');
const helpers = buildTransformHelpers(demoDb);
const testContext = { year: 2025, month: 2, regionId: 'NA' };
const transformedContext = demoTransforms.mappedPeriod(testContext, helpers);
console.log('Original:    year=2025, month=2');
console.log('Transformed: year=' + transformedContext.year + ', month=' + transformedContext.month);
console.log('Status:', transformedContext.year === 2024 && transformedContext.month === 12 ? '✓ PASS' : '✗ FAIL');

// Test 2: No mapping case
console.log('\n=== Test 2: No Mapping Found ===');
const noMapContext = { year: 2023, month: 6, regionId: 'NA' };
const noMapResult = demoTransforms.mappedPeriod(noMapContext, helpers);
console.log('Original:    year=2023, month=6');
console.log('Transformed: year=' + noMapResult.year + ', month=' + noMapResult.month);
console.log('Status:', noMapResult.year === 2023 && noMapResult.month === 6 ? '✓ PASS (unchanged)' : '✗ FAIL');

// Test 3: Evaluate metric with mapped period
console.log('\n=== Test 3: Metric Evaluation ===');
const cache = new Map();

// Query for 2025-02 with mappedPeriod transform (should return 2024-12 data)
const mappedResult = evaluateMetric(
  'salesAmountMappedPeriod',
  demoDb,
  demoMetrics,
  { year: 2025, month: 2, regionId: 'NA' },
  demoTransforms,
  cache,
  demoMeasures
);
console.log('salesAmountMappedPeriod for 2025-02, NA:', mappedResult);

// Direct query for 2024-12 to verify
const directResult = evaluateMetric(
  'revenue',
  demoDb,
  demoMetrics,
  { year: 2024, month: 12, regionId: 'NA' },
  demoTransforms,
  cache,
  demoMeasures
);
console.log('Direct revenue for 2024-12, NA:', directResult);
console.log('Match:', mappedResult === directResult ? '✓ PASS' : '✗ FAIL');

// Test 4: Existing transforms still work
console.log('\n=== Test 4: Existing Transforms (YTD, LastYear) ===');
const ytdResult = evaluateMetric(
  'salesAmountYTD',
  demoDb,
  demoMetrics,
  { year: 2025, month: 2 },
  demoTransforms,
  new Map(),
  demoMeasures
);
console.log('YTD sales for 2025-02:', ytdResult);
console.log('Status:', ytdResult > 0 ? '✓ PASS' : '✗ FAIL');

const lastYearResult = evaluateMetric(
  'salesAmountLastYear',
  demoDb,
  demoMetrics,
  { year: 2025, month: 2 },
  demoTransforms,
  new Map(),
  demoMeasures
);
console.log('Last year sales for 2025-02 (shows 2024-02):', lastYearResult);
console.log('Status:', lastYearResult > 0 ? '✓ PASS' : '✗ FAIL');

// Test 5: Composed transforms still work
console.log('\n=== Test 5: Composed Transforms ===');
const ytdLastYearResult = evaluateMetric(
  'salesAmountYTDLastYear',
  demoDb,
  demoMetrics,
  { year: 2025, month: 2 },
  demoTransforms,
  new Map(),
  demoMeasures
);
console.log('YTD Last Year for 2025-02 (shows 2024 Jan-Feb):', ytdLastYearResult);
console.log('Status:', ytdLastYearResult > 0 ? '✓ PASS' : '✗ FAIL');

// Test 6: Transform helpers API
console.log('\n=== Test 6: Transform Helpers API ===');
console.log('helpers.rows() works:', helpers.rows('sales').count() > 0 ? '✓ PASS' : '✗ FAIL');
console.log('helpers.first() works:', helpers.first('calendarMapping', r => r.fromYear === 2025) ? '✓ PASS' : '✗ FAIL');
console.log('helpers.filterRows() works:', helpers.filterRows('sales', r => r.year === 2025).count() > 0 ? '✓ PASS' : '✗ FAIL');
console.log('helpers.getFilterValue() works:', helpers.getFilterValue('year', { year: 2025 }) === 2025 ? '✓ PASS' : '✗ FAIL');
console.log('helpers.asNumber() works:', helpers.asNumber(2025) === 2025 ? '✓ PASS' : '✗ FAIL');
console.log('helpers.omitFilterFields() works:', Object.keys(helpers.omitFilterFields({ year: 2025, month: 2 }, 'year')).length === 1 ? '✓ PASS' : '✗ FAIL');

console.log('\n=== All Tests Complete ===\n');
