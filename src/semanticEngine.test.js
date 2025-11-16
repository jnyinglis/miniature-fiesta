/**
 * Comprehensive test suite for the Semantic Metrics Engine
 * Tests Phase 1: LINQ.js integration
 *
 * Run with: node src/semanticEngine.test.js
 */

const Enumerable = require('./linq.js');

// Import types and functions (simulated for JavaScript)
const {
  demoDb,
  demoFactTables,
  demoMetrics,
  demoTransforms,
  demoDimensionConfig,
  runQuery,
  evaluateMetric,
  evaluateMetrics,
  applyContextToFact,
  matchesFilter,
  formatValue,
  enrichDimensions,
  pick
} = require('./semanticEngine.ts'); // Note: This would need transpilation

// Test utilities
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passedTests++;
    console.log(`✓ Test ${testCount}: ${message}`);
  } else {
    failedTests++;
    console.error(`✗ Test ${testCount}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  assert(isEqual, message + ` (expected: ${JSON.stringify(expected)}, actual: ${JSON.stringify(actual)})`);
}

function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  assert(diff < tolerance, message + ` (expected: ${expected}, actual: ${actual}, diff: ${diff})`);
}

console.log('='.repeat(80));
console.log('SEMANTIC ENGINE TEST SUITE - Phase 1: LINQ.js Integration');
console.log('='.repeat(80));
console.log();

// ============================================================================
// Test Suite 1: LINQ.js Basic Operations
// ============================================================================

console.log('Test Suite 1: LINQ.js Basic Operations');
console.log('-'.repeat(80));

try {
  // Test 1.1: Basic filtering with where()
  const testData = [
    { year: 2024, amount: 100 },
    { year: 2025, amount: 200 },
    { year: 2025, amount: 300 }
  ];

  const filtered = Enumerable.from(testData)
    .where(r => r.year === 2025)
    .toArray();

  assertEquals(filtered.length, 2, 'LINQ where() filters correctly');
  assertEquals(filtered[0].amount, 200, 'LINQ where() preserves data');

  // Test 1.2: Sum aggregation
  const total = Enumerable.from(testData)
    .sum(r => r.amount);

  assertEquals(total, 600, 'LINQ sum() aggregates correctly');

  // Test 1.3: Average aggregation
  const avg = Enumerable.from(testData)
    .average(r => r.amount);

  assertEquals(avg, 200, 'LINQ average() calculates correctly');

  // Test 1.4: Count operation
  const count = Enumerable.from(testData)
    .where(r => r.year === 2025)
    .count();

  assertEquals(count, 2, 'LINQ count() counts correctly');

  // Test 1.5: GroupBy operation
  const groups = Enumerable.from(testData)
    .groupBy(r => r.year)
    .toArray();

  assertEquals(groups.length, 2, 'LINQ groupBy() creates correct number of groups');
  assertEquals(groups[0].key(), 2024, 'LINQ groupBy() preserves keys');

  // Test 1.6: Chained operations
  const chainedResult = Enumerable.from(testData)
    .where(r => r.amount > 100)
    .select(r => r.amount)
    .sum();

  assertEquals(chainedResult, 500, 'LINQ chains operations correctly');

  console.log('✓ All LINQ.js basic operation tests passed\n');

} catch (error) {
  console.error('✗ LINQ.js basic operations test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 2: Filter Matching
// ============================================================================

console.log('Test Suite 2: Filter Matching');
console.log('-'.repeat(80));

try {
  // Test 2.1: Primitive equality filter
  assert(matchesFilter(2025, 2025), 'matchesFilter handles exact equality');
  assert(!matchesFilter(2024, 2025), 'matchesFilter rejects inequality');

  // Test 2.2: Range filters (from/to)
  assert(matchesFilter(5, { from: 1, to: 10 }), 'matchesFilter handles from/to range (middle)');
  assert(matchesFilter(1, { from: 1, to: 10 }), 'matchesFilter handles from/to range (boundary low)');
  assert(matchesFilter(10, { from: 1, to: 10 }), 'matchesFilter handles from/to range (boundary high)');
  assert(!matchesFilter(0, { from: 1, to: 10 }), 'matchesFilter rejects value below range');
  assert(!matchesFilter(11, { from: 1, to: 10 }), 'matchesFilter rejects value above range');

  // Test 2.3: Comparison filters (gte/lte/gt/lt)
  assert(matchesFilter(5, { gte: 5 }), 'matchesFilter handles gte (equal)');
  assert(matchesFilter(6, { gte: 5 }), 'matchesFilter handles gte (greater)');
  assert(!matchesFilter(4, { gte: 5 }), 'matchesFilter rejects gte (less)');

  assert(matchesFilter(5, { lte: 5 }), 'matchesFilter handles lte (equal)');
  assert(matchesFilter(4, { lte: 5 }), 'matchesFilter handles lte (less)');
  assert(!matchesFilter(6, { lte: 5 }), 'matchesFilter rejects lte (greater)');

  assert(matchesFilter(6, { gt: 5 }), 'matchesFilter handles gt');
  assert(!matchesFilter(5, { gt: 5 }), 'matchesFilter rejects gt (equal)');

  assert(matchesFilter(4, { lt: 5 }), 'matchesFilter handles lt');
  assert(!matchesFilter(5, { lt: 5 }), 'matchesFilter rejects lt (equal)');

  console.log('✓ All filter matching tests passed\n');

} catch (error) {
  console.error('✗ Filter matching test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 3: Context Application
// ============================================================================

console.log('Test Suite 3: Context Application (applyContextToFact)');
console.log('-'.repeat(80));

try {
  const testRows = [
    { year: 2024, month: 1, regionId: 'NA', amount: 100 },
    { year: 2024, month: 2, regionId: 'NA', amount: 200 },
    { year: 2025, month: 1, regionId: 'NA', amount: 300 },
    { year: 2025, month: 1, regionId: 'EU', amount: 400 },
  ];

  // Test 3.1: Filter by single dimension
  const filtered1 = applyContextToFact(testRows, { year: 2025 }, ['year', 'month', 'regionId']);
  assertEquals(filtered1.count(), 2, 'applyContextToFact filters by year');

  // Test 3.2: Filter by multiple dimensions
  const filtered2 = applyContextToFact(testRows, { year: 2025, regionId: 'NA' }, ['year', 'month', 'regionId']);
  assertEquals(filtered2.count(), 1, 'applyContextToFact filters by multiple dimensions');
  assertEquals(filtered2.first().amount, 300, 'applyContextToFact returns correct row');

  // Test 3.3: Ignore filters not in grain
  const filtered3 = applyContextToFact(testRows, { year: 2025, productId: 999 }, ['year', 'month', 'regionId']);
  assertEquals(filtered3.count(), 2, 'applyContextToFact ignores filters not in grain');

  // Test 3.4: Range filter
  const filtered4 = applyContextToFact(testRows, { month: { lte: 1 } }, ['year', 'month', 'regionId']);
  assertEquals(filtered4.count(), 3, 'applyContextToFact handles range filters');

  console.log('✓ All context application tests passed\n');

} catch (error) {
  console.error('✗ Context application test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 4: Utility Functions
// ============================================================================

console.log('Test Suite 4: Utility Functions');
console.log('-'.repeat(80));

try {
  // Test 4.1: pick() function
  const obj = { a: 1, b: 2, c: 3, d: 4 };
  const picked = pick(obj, ['a', 'c']);
  assertEquals(picked, { a: 1, c: 3 }, 'pick() extracts specified keys');

  // Test 4.2: formatValue() function
  assertEquals(formatValue(1234.56, 'currency'), '$1234.56', 'formatValue formats currency');
  assertEquals(formatValue(1234.56, 'integer'), '1234', 'formatValue formats integer');
  assertEquals(formatValue(45.67, 'percent'), '45.67%', 'formatValue formats percent');
  assertEquals(formatValue(null, 'currency'), null, 'formatValue handles null');
  assertEquals(formatValue(undefined, 'currency'), null, 'formatValue handles undefined');

  // Test 4.3: enrichDimensions() function
  const keyObj = { regionId: 'NA', productId: 1 };
  const enriched = enrichDimensions(keyObj, demoDb, demoDimensionConfig);
  assertEquals(enriched.regionName, 'North America', 'enrichDimensions adds region name');
  assertEquals(enriched.productName, 'Widget A', 'enrichDimensions adds product name');

  console.log('✓ All utility function tests passed\n');

} catch (error) {
  console.error('✗ Utility function test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 5: Metric Evaluation - FactMeasure
// ============================================================================

console.log('Test Suite 5: Metric Evaluation - FactMeasure');
console.log('-'.repeat(80));

try {
  // Test 5.1: Simple sum metric
  const salesAmount = evaluateMetric(
    'totalSalesAmount',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, month: 1 },
    demoTransforms
  );
  assertEquals(salesAmount, 2100, 'FactMeasure sums correctly');

  // Test 5.2: Count metric (implicit)
  // Note: Would need a count-based metric in demoMetrics

  // Test 5.3: Metric with filtered context
  const filteredSales = evaluateMetric(
    'totalSalesAmount',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, regionId: 'NA' },
    demoTransforms
  );
  assertEquals(filteredSales, 2550, 'FactMeasure respects filter context');

  // Test 5.4: Metric with coarser grain
  const yearRegionSales = evaluateMetric(
    'salesAmountYearRegion',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, month: 1, productId: 1 },
    demoTransforms
  );
  // Should ignore month and productId filters due to grain
  assertEquals(yearRegionSales, 3500, 'FactMeasure respects custom grain (ignores month/product)');

  console.log('✓ All FactMeasure metric tests passed\n');

} catch (error) {
  console.error('✗ FactMeasure metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 6: Metric Evaluation - Expression
// ============================================================================

console.log('Test Suite 6: Metric Evaluation - Expression');
console.log('-'.repeat(80));

try {
  // Test 6.1: Expression metric (price per unit)
  const pricePerUnit = evaluateMetric(
    'pricePerUnit',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, month: 1 },
    demoTransforms
  );
  // Total amount: 2100, Total quantity: 19, Price per unit: 2100/19 ≈ 110.53
  assertClose(pricePerUnit, 110.53, 0.01, 'Expression metric calculates price per unit');

  // Test 6.2: Expression metric with different context
  const pricePerUnitNA = evaluateMetric(
    'pricePerUnit',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, regionId: 'NA' },
    demoTransforms
  );
  // NA 2025: (1000+600+950) / (10+5+8) = 2550 / 23 ≈ 110.87
  assertClose(pricePerUnitNA, 110.87, 0.01, 'Expression metric works with filtered context');

  console.log('✓ All Expression metric tests passed\n');

} catch (error) {
  console.error('✗ Expression metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 7: Metric Evaluation - Derived
// ============================================================================

console.log('Test Suite 7: Metric Evaluation - Derived');
console.log('-'.repeat(80));

try {
  // Test 7.1: Derived metric (Sales vs Budget %)
  const salesVsBudget = evaluateMetric(
    'salesVsBudgetPct',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, regionId: 'NA' },
    demoTransforms
  );
  // Sales: 2550, Budget: 2200, Ratio: 2550/2200 * 100 = 115.909...
  assertClose(salesVsBudget, 115.91, 0.01, 'Derived metric calculates percentage');

  // Test 7.2: Derived metric with null handling
  const salesVsBudgetNoData = evaluateMetric(
    'salesVsBudgetPct',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2099 }, // No data for this year
    demoTransforms
  );
  assertEquals(salesVsBudgetNoData, null, 'Derived metric handles division by zero');

  console.log('✓ All Derived metric tests passed\n');

} catch (error) {
  console.error('✗ Derived metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 8: Metric Evaluation - Context Transforms
// ============================================================================

console.log('Test Suite 8: Metric Evaluation - Context Transforms (Time Intelligence)');
console.log('-'.repeat(80));

try {
  // Test 8.1: YTD transform
  const salesYTD = evaluateMetric(
    'salesAmountYTD',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, month: 2 },
    demoTransforms
  );
  // YTD for month 2 includes months 1 and 2
  // 2025 months 1-2: 1000+600+500+950+450 = 3500
  assertEquals(salesYTD, 3500, 'YTD transform includes all months up to current');

  // Test 8.2: Last Year transform
  const salesLastYear = evaluateMetric(
    'salesAmountLastYear',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, month: 1 },
    demoTransforms
  );
  // 2024 month 1: 700+480 = 1180
  assertEquals(salesLastYear, 1180, 'Last Year transform shifts year back');

  // Test 8.3: YTD Last Year transform
  const salesYTDLY = evaluateMetric(
    'salesAmountYTDLastYear',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, month: 2 },
    demoTransforms
  );
  // 2024 months 1-2: 700+480+650+420 = 2250
  assertEquals(salesYTDLY, 2250, 'YTD Last Year transform combines both transforms');

  // Test 8.4: Budget YTD (annual budget, so YTD = full year)
  const budgetYTD = evaluateMetric(
    'budgetYTD',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2025, regionId: 'NA', month: 2 },
    demoTransforms
  );
  assertEquals(budgetYTD, 2200, 'Budget YTD works (budget is annual)');

  console.log('✓ All Context Transform metric tests passed\n');

} catch (error) {
  console.error('✗ Context Transform metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 9: Query Execution
// ============================================================================

console.log('Test Suite 9: Query Execution (runQuery)');
console.log('-'.repeat(80));

try {
  // Test 9.1: Query with single dimension
  const result1 = runQuery(
    demoDb,
    demoFactTables,
    demoMetrics,
    demoTransforms,
    demoDimensionConfig,
    {
      rows: ['regionId'],
      filters: { year: 2025, month: 1 },
      metrics: ['totalSalesAmount'],
      factForRows: 'sales'
    }
  );

  assertEquals(result1.length, 2, 'Query returns correct number of rows (2 regions)');
  assert(result1[0].regionName, 'Query enriches dimension labels');
  assert(result1[0].totalSalesAmount, 'Query includes metric values');

  // Test 9.2: Query with multiple dimensions
  const result2 = runQuery(
    demoDb,
    demoFactTables,
    demoMetrics,
    demoTransforms,
    demoDimensionConfig,
    {
      rows: ['regionId', 'productId'],
      filters: { year: 2025, month: 1 },
      metrics: ['totalSalesAmount', 'totalSalesQuantity'],
      factForRows: 'sales'
    }
  );

  assertEquals(result2.length, 3, 'Query with 2 dimensions returns correct row count');
  assert(result2[0].regionName && result2[0].productName, 'Query enriches multiple dimensions');

  // Test 9.3: Query with derived metrics
  const result3 = runQuery(
    demoDb,
    demoFactTables,
    demoMetrics,
    demoTransforms,
    demoDimensionConfig,
    {
      rows: ['regionId'],
      filters: { year: 2025 },
      metrics: ['totalSalesAmount', 'totalBudget', 'salesVsBudgetPct'],
      factForRows: 'sales'
    }
  );

  assert(result3[0].salesVsBudgetPct, 'Query includes derived metrics');
  assert(result3[0].salesVsBudgetPct.includes('%'), 'Query formats derived metrics');

  // Test 9.4: Query with context transform metrics
  const result4 = runQuery(
    demoDb,
    demoFactTables,
    demoMetrics,
    demoTransforms,
    demoDimensionConfig,
    {
      rows: ['regionId'],
      filters: { year: 2025, month: 2 },
      metrics: ['totalSalesAmount', 'salesAmountYTD', 'salesAmountLastYear'],
      factForRows: 'sales'
    }
  );

  assert(result4[0].salesAmountYTD, 'Query includes YTD metrics');
  assert(result4[0].salesAmountLastYear, 'Query includes Last Year metrics');

  console.log('✓ All Query execution tests passed\n');

} catch (error) {
  console.error('✗ Query execution test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 10: Edge Cases
// ============================================================================

console.log('Test Suite 10: Edge Cases');
console.log('-'.repeat(80));

try {
  // Test 10.1: Empty result set
  const emptyResult = evaluateMetric(
    'totalSalesAmount',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2099 }, // No data for this year
    demoTransforms
  );
  assertEquals(emptyResult, 0, 'Empty result set returns 0 for sum');

  // Test 10.2: Null values in data
  const testDbWithNulls = {
    ...demoDb,
    facts: {
      ...demoDb.facts,
      testFact: [
        { year: 2025, value: null },
        { year: 2025, value: 100 }
      ]
    }
  };

  // Test 10.3: Division by zero in expression metric
  const zeroDivision = evaluateMetric(
    'pricePerUnit',
    demoDb,
    demoFactTables,
    demoMetrics,
    { year: 2099 },
    demoTransforms
  );
  assertEquals(zeroDivision, null, 'Expression metric handles division by zero');

  // Test 10.4: Unknown metric
  try {
    evaluateMetric('unknownMetric', demoDb, demoFactTables, demoMetrics, {}, demoTransforms);
    assert(false, 'Unknown metric should throw error');
  } catch (error) {
    assert(error.message.includes('Unknown metric'), 'Unknown metric throws appropriate error');
  }

  // Test 10.5: Unknown fact table
  const badMetric = {
    kind: 'factMeasure',
    name: 'badMetric',
    factTable: 'nonexistent',
    factColumn: 'amount'
  };

  try {
    evaluateMetric('badMetric', demoDb, demoFactTables, { badMetric }, {}, demoTransforms);
    assert(false, 'Unknown fact table should throw error');
  } catch (error) {
    assert(error.message.includes('Unknown fact table'), 'Unknown fact table throws appropriate error');
  }

  console.log('✓ All edge case tests passed\n');

} catch (error) {
  console.error('✗ Edge case test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 11: LINQ.js Advanced Operations
// ============================================================================

console.log('Test Suite 11: LINQ.js Advanced Operations (Demonstrating New Capabilities)');
console.log('-'.repeat(80));

try {
  const salesData = demoDb.facts.sales;

  // Test 11.1: Join operation
  const joined = Enumerable.from(salesData)
    .join(
      demoDb.dimensions.products,
      sale => sale.productId,
      product => product.productId,
      (sale, product) => ({ ...sale, productName: product.name })
    )
    .toArray();

  assert(joined[0].productName, 'LINQ join() adds related data');
  assertEquals(joined.length, salesData.length, 'LINQ join() preserves row count');

  // Test 11.2: OrderBy operation
  const ordered = Enumerable.from(salesData)
    .orderByDescending(s => s.amount)
    .take(3)
    .toArray();

  assert(ordered[0].amount >= ordered[1].amount, 'LINQ orderByDescending() sorts correctly');
  assertEquals(ordered.length, 3, 'LINQ take() limits results');

  // Test 11.3: Distinct operation
  const years = Enumerable.from(salesData)
    .select(s => s.year)
    .distinct()
    .toArray();

  assertEquals(years.length, 2, 'LINQ distinct() removes duplicates');

  // Test 11.4: SelectMany (flatten)
  const grouped = Enumerable.from(salesData)
    .groupBy(s => s.regionId)
    .selectMany(g => g.toArray())
    .toArray();

  assertEquals(grouped.length, salesData.length, 'LINQ selectMany() flattens groups');

  // Test 11.5: Complex pipeline
  const topProductsByRegion = Enumerable.from(salesData)
    .where(s => s.year === 2025)
    .groupBy(s => `${s.regionId}-${s.productId}`)
    .select(g => ({
      key: g.key(),
      totalAmount: g.sum(s => s.amount),
      totalQty: g.sum(s => s.quantity)
    }))
    .orderByDescending(r => r.totalAmount)
    .take(3)
    .toArray();

  assert(topProductsByRegion.length > 0, 'LINQ complex pipeline executes successfully');
  assert(topProductsByRegion[0].totalAmount, 'LINQ complex pipeline calculates aggregates');

  console.log('✓ All LINQ.js advanced operation tests passed\n');

} catch (error) {
  console.error('✗ LINQ.js advanced operation test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Summary
// ============================================================================

console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passedTests} (${((passedTests / testCount) * 100).toFixed(1)}%)`);
console.log(`Failed: ${failedTests} (${((failedTests / testCount) * 100).toFixed(1)}%)`);
console.log('='.repeat(80));

if (failedTests === 0) {
  console.log('✓ ALL TESTS PASSED!');
  console.log('Phase 1 (LINQ.js Integration) is complete and validated.');
  process.exit(0);
} else {
  console.error('✗ SOME TESTS FAILED');
  console.error('Please review the failures above.');
  process.exit(1);
}
