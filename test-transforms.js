// Simple test script for data-driven transforms
// Run with: node test-transforms.js

const {
  demoDb,
  demoTransforms,
  demoMeasures,
  demoMetrics,
  evaluateMetric,
  buildTransformHelpers
} = require('./dist/semanticEngine.js');

console.log('\n=== Testing Data-Driven Context Transforms ===\n');

// Test 1: Basic transform helpers
console.log('Test 1: Transform helpers can access data');
const helpers = buildTransformHelpers(demoDb);
const mappingRows = helpers.rows('calendarMapping').toArray();
console.log('Calendar mapping rows:', mappingRows.length);
console.log('Sample mapping:', mappingRows[0]);

// Test 2: Apply mapped period transform
console.log('\nTest 2: Mapped period transform');
const testContext = { year: 2025, month: 2, regionId: 'NA' };
const transformedContext = demoTransforms.mappedPeriod(testContext, helpers);
console.log('Original context:', testContext);
console.log('Transformed context:', transformedContext);
console.log('Expected: year=2024, month=12');

// Test 3: Evaluate metric with mapped period
console.log('\nTest 3: Evaluate salesAmountMappedPeriod metric');
const cache = new Map();
try {
  const result = evaluateMetric(
    'salesAmountMappedPeriod',
    demoDb,
    demoMetrics,
    { year: 2025, month: 2, regionId: 'NA' },
    demoTransforms,
    cache,
    demoMeasures
  );
  console.log('Sales for 2025-02 mapped period (should be 2024-12):', result);

  // Compare with direct query
  const direct = evaluateMetric(
    'revenue',
    demoDb,
    demoMetrics,
    { year: 2024, month: 12, regionId: 'NA' },
    demoTransforms,
    cache,
    demoMeasures
  );
  console.log('Direct sales for 2024-12:', direct);
  console.log('Match:', result === direct ? 'YES ✓' : 'NO ✗');
} catch (error) {
  console.error('Error evaluating metric:', error.message);
}

// Test 4: YTD transform still works
console.log('\nTest 4: YTD transform (existing functionality)');
try {
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
} catch (error) {
  console.error('Error evaluating YTD metric:', error.message);
}

console.log('\n=== Tests Complete ===\n');
