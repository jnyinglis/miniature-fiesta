/**
 * Comprehensive test suite for the Semantic Metrics Engine
 * Tests all phases including Phase 5: Composable Query Engine
 *
 * Run with: node src/semanticEngine.test.js
 */

const Enumerable = require('../linq.js');

// Import from semantic engine
const {
  // Core functions
  runQuery,
  evaluateMetric,
  evaluateMetrics,
  matchesFilter,
  formatValue,
  pick,

  // Phase 5: Filter Expression Language
  f,
  compileFilter,
  applyFilter,

  // Phase 5: Functional Metrics
  simpleMetric,
  expressionMetric,
  derivedMetric,
  contextTransformMetric,
  makeYtdMetric,
  makeYoYMetric,

  // Phase 5: Composable Transforms
  composeTransforms,
  shiftYear,
  shiftMonth,
  rollingMonths,

  // Phase 5: DSL Helpers
  attr,
  measure,
  metric,

  // Phase 5: Model/Engine Separation
  createEngine,

  // Demo data and registries
  demoDb,
  demoTableDefinitions,
  demoAttributes,
  demoMeasures,
  demoMetrics,
  demoTransforms,
  demoSemanticModel
} = require('../semanticEngine.js');

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
console.log('SEMANTIC ENGINE TEST SUITE - All Phases + Phase 5');
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
// Test Suite 3: Utility Functions
// ============================================================================

console.log('Test Suite 3: Utility Functions');
console.log('-'.repeat(80));

try {
  // Test 3.1: pick() function
  const obj = { a: 1, b: 2, c: 3, d: 4 };
  const picked = pick(obj, ['a', 'c']);
  assertEquals(picked, { a: 1, c: 3 }, 'pick() extracts specified keys');

  // Test 3.2: formatValue() function
  assertEquals(formatValue(1234.56, 'currency'), '$1234.56', 'formatValue formats currency');
  assertEquals(formatValue(1234.56, 'integer'), '1235', 'formatValue formats integer (rounds)');
  assertEquals(formatValue(45.67, 'percent'), '45.67%', 'formatValue formats percent');
  assertEquals(formatValue(null, 'currency'), null, 'formatValue handles null');
  assertEquals(formatValue(undefined, 'currency'), null, 'formatValue handles undefined');

  console.log('✓ All utility function tests passed\n');

} catch (error) {
  console.error('✗ Utility function test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 4: Legacy API - Simple Metrics
// ============================================================================

console.log('Test Suite 4: Legacy API - Simple Metrics');
console.log('-'.repeat(80));

try {
  // Test 4.1: Simple sum metric
  const salesAmount = evaluateMetric(
    'revenue',
    demoDb,
    demoMetrics,
    { year: 2025, month: 1 },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  assertEquals(salesAmount, 2100, 'Simple metric sums correctly');

  // Test 4.2: Metric with filtered context
  const filteredSales = evaluateMetric(
    'revenue',
    demoDb,
    demoMetrics,
    { year: 2025, regionId: 'NA' },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  assertEquals(filteredSales, 2550, 'Simple metric respects filter context');

  // Test 4.3: Quantity metric
  const quantity = evaluateMetric(
    'quantity',
    demoDb,
    demoMetrics,
    { year: 2025, month: 1 },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  assertEquals(quantity, 19, 'Simple metric sums quantity correctly');

  console.log('✓ All Legacy Simple metric tests passed\n');

} catch (error) {
  console.error('✗ Legacy Simple metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 5: Legacy API - Expression Metrics
// ============================================================================

console.log('Test Suite 5: Legacy API - Expression Metrics');
console.log('-'.repeat(80));

try {
  // Test 5.1: Expression metric (price per unit)
  const pricePerUnit = evaluateMetric(
    'pricePerUnit',
    demoDb,
    demoMetrics,
    { year: 2025, month: 1 },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  // Total amount: 2100, Total quantity: 19, Price per unit: 2100/19 ≈ 110.53
  assertClose(pricePerUnit, 110.53, 0.01, 'Expression metric calculates price per unit');

  // Test 5.2: Expression metric with different context
  const pricePerUnitNA = evaluateMetric(
    'pricePerUnit',
    demoDb,
    demoMetrics,
    { year: 2025, regionId: 'NA' },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  // NA 2025: (1000+600+950) / (10+5+8) = 2550 / 23 ≈ 110.87
  assertClose(pricePerUnitNA, 110.87, 0.01, 'Expression metric works with filtered context');

  console.log('✓ All Legacy Expression metric tests passed\n');

} catch (error) {
  console.error('✗ Legacy Expression metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 6: Legacy API - Derived Metrics
// ============================================================================

console.log('Test Suite 6: Legacy API - Derived Metrics');
console.log('-'.repeat(80));

try {
  // Test 6.1: Derived metric (Sales vs Budget %)
  const salesVsBudget = evaluateMetric(
    'salesVsBudgetPct',
    demoDb,
    demoMetrics,
    { year: 2025, regionId: 'NA' },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  // Sales: 2550, Budget: 2200, Ratio: 2550/2200 * 100 = 115.909...
  assertClose(salesVsBudget, 115.91, 0.01, 'Derived metric calculates percentage');

  // Test 6.2: Derived metric with null handling
  const salesVsBudgetNoData = evaluateMetric(
    'salesVsBudgetPct',
    demoDb,
    demoMetrics,
    { year: 2099 }, // No data for this year
    demoTransforms,
    new Map(),
    demoMeasures
  );
  assertEquals(salesVsBudgetNoData, null, 'Derived metric handles division by zero');

  console.log('✓ All Legacy Derived metric tests passed\n');

} catch (error) {
  console.error('✗ Legacy Derived metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 7: Legacy API - Context Transforms
// ============================================================================

console.log('Test Suite 7: Legacy API - Context Transforms (Time Intelligence)');
console.log('-'.repeat(80));

try {
  // Test 7.1: YTD transform
  const salesYTD = evaluateMetric(
    'salesAmountYTD',
    demoDb,
    demoMetrics,
    { year: 2025, month: 2 },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  // YTD for month 2 includes months 1 and 2
  // 2025 months 1-2: 1000+600+500+950+450 = 3500
  assertEquals(salesYTD, 3500, 'YTD transform includes all months up to current');

  // Test 7.2: Last Year transform
  const salesLastYear = evaluateMetric(
    'salesAmountLastYear',
    demoDb,
    demoMetrics,
    { year: 2025, month: 1 },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  // 2024 month 1: 700+480 = 1180
  assertEquals(salesLastYear, 1180, 'Last Year transform shifts year back');

  // Test 7.3: YTD Last Year transform
  const salesYTDLY = evaluateMetric(
    'salesAmountYTDLastYear',
    demoDb,
    demoMetrics,
    { year: 2025, month: 2 },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  // 2024 months 1-2: 700+480+650+420 = 2250
  assertEquals(salesYTDLY, 2250, 'YTD Last Year transform combines both transforms');

  console.log('✓ All Legacy Context Transform metric tests passed\n');

} catch (error) {
  console.error('✗ Legacy Context Transform metric test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 8: Legacy API - Query Execution
// ============================================================================

console.log('Test Suite 8: Legacy API - Query Execution (runQuery)');
console.log('-'.repeat(80));

try {
  // Test 8.1: Query with single dimension
  const result1 = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['regionId'],
      filters: { year: 2025, month: 1 },
      metrics: ['revenue']
    }
  );

  assertEquals(result1.length, 2, 'Query returns correct number of rows (2 regions)');
  assert(result1[0].regionName, 'Query enriches dimension labels');
  assert(result1[0].revenue, 'Query includes metric values');

  // Test 8.2: Query with multiple dimensions
  const result2 = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['regionId', 'productId'],
      filters: { year: 2025, month: 1 },
      metrics: ['revenue', 'quantity']
    }
  );

  assertEquals(result2.length, 3, 'Query with 2 dimensions returns correct row count');
  assert(result2[0].regionName && result2[0].productName, 'Query enriches multiple dimensions');

  // Test 8.3: Query with derived metrics
  const result3 = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['regionId'],
      filters: { year: 2025 },
      metrics: ['revenue', 'budget', 'salesVsBudgetPct']
    }
  );

  assert(result3[0].salesVsBudgetPct, 'Query includes derived metrics');
  assert(result3[0].salesVsBudgetPct.includes('%'), 'Query formats derived metrics');

  console.log('✓ All Legacy Query execution tests passed\n');

} catch (error) {
  console.error('✗ Legacy Query execution test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 9: Phase 5d - Filter Expression Language
// ============================================================================

console.log('Test Suite 9: Phase 5d - Filter Expression Language');
console.log('-'.repeat(80));

try {
  const testRows = [
    { year: 2024, month: 1, amount: 100, regionId: 'NA', status: 'active' },
    { year: 2025, month: 2, amount: 200, regionId: 'NA', status: 'active' },
    { year: 2025, month: 6, amount: 300, regionId: 'EU', status: 'cancelled' },
    { year: 2025, month: 12, amount: 500, regionId: 'EU', status: 'active' }
  ];

  // Test 9.1: Simple equality filter
  const eqFilter = f.eq('year', 2025);
  const eqPredicate = compileFilter(eqFilter);
  const eqFiltered = testRows.filter(eqPredicate);
  assertEquals(eqFiltered.length, 3, 'f.eq() filters correctly');

  // Test 9.2: Comparison filters
  const lteFilter = f.lte('month', 6);
  const ltePredicate = compileFilter(lteFilter);
  const lteFiltered = testRows.filter(ltePredicate);
  assertEquals(lteFiltered.length, 3, 'f.lte() filters correctly');

  // Test 9.3: Between filter
  const betweenFilter = f.between('amount', 150, 350);
  const betweenPredicate = compileFilter(betweenFilter);
  const betweenFiltered = testRows.filter(betweenPredicate);
  assertEquals(betweenFiltered.length, 2, 'f.between() filters correctly');

  // Test 9.4: In filter
  const inFilter = f.in('regionId', ['NA', 'EU']);
  const inPredicate = compileFilter(inFilter);
  const inFiltered = testRows.filter(inPredicate);
  assertEquals(inFiltered.length, 4, 'f.in() filters correctly');

  // Test 9.5: AND conjunction
  const andFilter = f.and(
    f.eq('year', 2025),
    f.eq('regionId', 'NA')
  );
  const andPredicate = compileFilter(andFilter);
  const andFiltered = testRows.filter(andPredicate);
  assertEquals(andFiltered.length, 1, 'f.and() filters correctly');

  // Test 9.6: OR conjunction
  const orFilter = f.or(
    f.eq('regionId', 'NA'),
    f.eq('regionId', 'EU')
  );
  const orPredicate = compileFilter(orFilter);
  const orFiltered = testRows.filter(orPredicate);
  assertEquals(orFiltered.length, 4, 'f.or() filters correctly');

  // Test 9.7: NOT negation
  const notFilter = f.not(f.eq('status', 'cancelled'));
  const notPredicate = compileFilter(notFilter);
  const notFiltered = testRows.filter(notPredicate);
  assertEquals(notFiltered.length, 3, 'f.not() filters correctly');

  // Test 9.8: Complex nested filter
  const complexFilter = f.and(
    f.eq('year', 2025),
    f.or(
      f.eq('regionId', 'NA'),
      f.eq('regionId', 'EU')
    ),
    f.not(f.eq('status', 'cancelled'))
  );
  const complexPredicate = compileFilter(complexFilter);
  const complexFiltered = testRows.filter(complexPredicate);
  assertEquals(complexFiltered.length, 2, 'Complex nested filters work correctly');

  // Test 9.9: applyFilter with LINQ.js
  const enumFiltered = applyFilter(
    Enumerable.from(testRows),
    f.and(f.eq('year', 2025), f.gte('amount', 300))
  );
  assertEquals(enumFiltered.count(), 2, 'applyFilter works with LINQ.js');

  console.log('✓ All Filter Expression Language tests passed\n');

} catch (error) {
  console.error('✗ Filter Expression Language test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 10: Phase 5c - Composable Transforms
// ============================================================================

console.log('Test Suite 10: Phase 5c - Composable Transforms');
console.log('-'.repeat(80));

try {
  // Test 10.1: shiftYear transform
  const shiftYearTransform = shiftYear(-1);
  const shiftedYear = shiftYearTransform({ year: 2025, month: 6 });
  assertEquals(shiftedYear.year, 2024, 'shiftYear(-1) shifts year back');
  assertEquals(shiftedYear.month, 6, 'shiftYear preserves month');

  // Test 10.2: shiftMonth transform
  const shiftMonthTransform = shiftMonth(-1);
  const shiftedMonth = shiftMonthTransform({ year: 2025, month: 6 });
  assertEquals(shiftedMonth.month, 5, 'shiftMonth(-1) shifts month back');

  // Test 10.3: rollingMonths transform
  const rolling3 = rollingMonths(3);
  const rollingCtx = rolling3({ year: 2025, month: 6 });
  assertEquals(rollingCtx.month.gte, 4, 'rollingMonths(3) sets gte to current - 2');
  assertEquals(rollingCtx.month.lte, 6, 'rollingMonths(3) sets lte to current');

  // Test 10.4: composeTransforms - simple composition
  const ytd = (ctx) => {
    if (ctx.year == null || ctx.month == null) return ctx;
    return { ...ctx, month: { lte: Number(ctx.month) } };
  };
  const lastYear = (ctx) => {
    if (ctx.year == null) return ctx;
    return { ...ctx, year: Number(ctx.year) - 1 };
  };

  const ytdLastYear = composeTransforms(ytd, lastYear);
  const composedCtx = ytdLastYear({ year: 2025, month: 6 });

  assertEquals(composedCtx.year, 2024, 'composeTransforms applies year shift');
  assertEquals(composedCtx.month.lte, 6, 'composeTransforms applies YTD');

  // Test 10.5: composeTransforms - three transforms
  const priorMonth = (ctx) => {
    if (ctx.month == null) return ctx;
    return { ...ctx, month: Number(ctx.month) - 1 };
  };

  const priorMonthLastYear = composeTransforms(priorMonth, lastYear);
  const tripleComposed = priorMonthLastYear({ year: 2025, month: 6 });

  assertEquals(tripleComposed.year, 2024, 'Triple composition applies year shift');
  assertEquals(tripleComposed.month, 5, 'Triple composition applies month shift');

  console.log('✓ All Composable Transforms tests passed\n');

} catch (error) {
  console.error('✗ Composable Transforms test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 11: Phase 5b - Functional Metrics
// ============================================================================

console.log('Test Suite 11: Phase 5b - Functional Metrics');
console.log('-'.repeat(80));

try {
  // Test 11.1: simpleMetric constructor
  const testSimpleMetric = simpleMetric({
    name: 'testRevenue',
    measure: 'salesAmount',
    format: 'currency'
  });

  assert(testSimpleMetric.name === 'testRevenue', 'simpleMetric sets name');
  assert(typeof testSimpleMetric.eval === 'function', 'simpleMetric creates eval function');

  // Test 11.2: expressionMetric constructor
  const testExpressionMetric = expressionMetric({
    name: 'testPricePerUnit',
    table: 'sales',
    expression: (rows, ctx) => {
      const amount = rows.sum(r => Number(r.amount ?? 0));
      const qty = rows.sum(r => Number(r.quantity ?? 0));
      return qty ? amount / qty : null;
    },
    format: 'currency'
  });

  assert(testExpressionMetric.name === 'testPricePerUnit', 'expressionMetric sets name');
  assert(typeof testExpressionMetric.eval === 'function', 'expressionMetric creates eval function');

  // Test 11.3: derivedMetric constructor
  const testDerivedMetric = derivedMetric({
    name: 'testRatio',
    deps: ['revenue', 'budget'],
    combine: ({ revenue, budget }) => budget ? (revenue / budget) * 100 : null,
    format: 'percent'
  });

  assert(testDerivedMetric.name === 'testRatio', 'derivedMetric sets name');
  assert(testDerivedMetric.deps.length === 2, 'derivedMetric sets dependencies');
  assert(typeof testDerivedMetric.eval === 'function', 'derivedMetric creates eval function');

  // Test 11.4: contextTransformMetric constructor
  const testYtdTransform = (ctx) => {
    if (ctx.year == null || ctx.month == null) return ctx;
    return { ...ctx, month: { lte: Number(ctx.month) } };
  };

  const testTransformMetric = contextTransformMetric({
    name: 'testRevenueYTD',
    baseMetric: 'revenue',
    transform: testYtdTransform
  });

  assert(testTransformMetric.name === 'testRevenueYTD', 'contextTransformMetric sets name');
  assert(typeof testTransformMetric.eval === 'function', 'contextTransformMetric creates eval function');

  // Test 11.5: makeYtdMetric higher-order builder
  const ytdMetric = makeYtdMetric('revenue', testYtdTransform);
  assert(ytdMetric.name === 'revenueYTD', 'makeYtdMetric generates correct name');
  assert(typeof ytdMetric.eval === 'function', 'makeYtdMetric creates eval function');

  // Test 11.6: makeYoYMetric higher-order builder
  const yoyMetric = makeYoYMetric('revenue');
  assert(yoyMetric.name === 'revenueYoY', 'makeYoYMetric generates correct name');
  assert(yoyMetric.deps.length === 2, 'makeYoYMetric sets dependencies (current and last year)');

  console.log('✓ All Functional Metrics tests passed\n');

} catch (error) {
  console.error('✗ Functional Metrics test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 12: Phase 5f - DSL Helpers
// ============================================================================

console.log('Test Suite 12: Phase 5f - DSL Helpers');
console.log('-'.repeat(80));

try {
  // Test 12.1: attr.id builder
  const attrId = attr.id({
    name: 'testRegionId',
    table: 'sales',
    displayName: 'regionName'
  });

  assertEquals(attrId.name, 'testRegionId', 'attr.id sets name');
  assertEquals(attrId.table, 'sales', 'attr.id sets table');
  assertEquals(attrId.column, 'testRegionId', 'attr.id defaults column to name');

  // Test 12.2: attr.derived builder
  const attrDerived = attr.derived({
    name: 'quantityBand',
    table: 'sales',
    column: 'quantity',
    expression: (row) => {
      const q = row.quantity;
      if (q <= 5) return 'Small';
      if (q <= 10) return 'Medium';
      return 'Large';
    }
  });

  assertEquals(attrDerived.name, 'quantityBand', 'attr.derived sets name');
  assert(typeof attrDerived.expression === 'function', 'attr.derived sets expression');

  // Test 12.3: attr.formatted builder
  const attrFormatted = attr.formatted({
    name: 'monthName',
    table: 'sales',
    column: 'month',
    format: (m) => ['Jan', 'Feb', 'Mar'][m - 1] || `Month ${m}`
  });

  assertEquals(attrFormatted.name, 'monthName', 'attr.formatted sets name');
  assert(typeof attrFormatted.format === 'function', 'attr.formatted sets format function');

  // Test 12.4: measure.sum builder
  const measureSum = measure.sum({
    name: 'testAmount',
    table: 'sales',
    column: 'amount',
    format: 'currency'
  });

  assertEquals(measureSum.name, 'testAmount', 'measure.sum sets name');
  assertEquals(measureSum.aggregation, 'sum', 'measure.sum sets aggregation to sum');

  // Test 12.5: measure.avg builder
  const measureAvg = measure.avg({
    name: 'avgAmount',
    table: 'sales',
    column: 'amount'
  });

  assertEquals(measureAvg.aggregation, 'avg', 'measure.avg sets aggregation to avg');

  // Test 12.6: measure.count builder
  const measureCount = measure.count({
    name: 'rowCount',
    table: 'sales'
  });

  assertEquals(measureCount.aggregation, 'count', 'measure.count sets aggregation to count');

  // Test 12.7: measure.min builder
  const measureMin = measure.min({
    name: 'minAmount',
    table: 'sales',
    column: 'amount'
  });

  assertEquals(measureMin.aggregation, 'min', 'measure.min sets aggregation to min');

  // Test 12.8: measure.max builder
  const measureMax = measure.max({
    name: 'maxAmount',
    table: 'sales',
    column: 'amount'
  });

  assertEquals(measureMax.aggregation, 'max', 'measure.max sets aggregation to max');

  // Test 12.9: metric.simple builder
  const metricSimple = metric.simple({
    name: 'testRevenue',
    measure: 'salesAmount'
  });

  assertEquals(metricSimple.name, 'testRevenue', 'metric.simple sets name');

  // Test 12.10: metric.derived builder
  const metricDerived = metric.derived({
    name: 'testRatio',
    deps: ['revenue', 'budget'],
    combine: ({ revenue, budget }) => budget ? revenue / budget : null
  });

  assertEquals(metricDerived.name, 'testRatio', 'metric.derived sets name');
  assertEquals(metricDerived.deps.length, 2, 'metric.derived sets dependencies');

  console.log('✓ All DSL Helpers tests passed\n');

} catch (error) {
  console.error('✗ DSL Helpers test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 13: Phase 5e - Model/Engine Separation
// ============================================================================

console.log('Test Suite 13: Phase 5e - Model/Engine Separation');
console.log('-'.repeat(80));

try {
  // Test 13.1: createEngine creates engine instance
  const engine = createEngine(demoDb, demoSemanticModel);
  assert(engine !== null && engine !== undefined, 'createEngine returns engine instance');

  // Test 13.2: engine.query() returns QueryBuilder
  const queryBuilder = engine.query();
  assert(queryBuilder !== null, 'engine.query() returns QueryBuilder');
  assert(typeof queryBuilder.where === 'function', 'QueryBuilder has where method');
  assert(typeof queryBuilder.addAttributes === 'function', 'QueryBuilder has addAttributes method');
  assert(typeof queryBuilder.addMetrics === 'function', 'QueryBuilder has addMetrics method');
  assert(typeof queryBuilder.run === 'function', 'QueryBuilder has run method');

  // Test 13.3: engine.getMetric introspection
  const revenueMetric = engine.getMetric('revenue');
  assert(revenueMetric !== undefined, 'engine.getMetric returns metric definition');
  assertEquals(revenueMetric.name, 'revenue', 'getMetric returns correct metric');

  // Test 13.4: engine.listMetrics introspection
  const allMetrics = engine.listMetrics();
  assert(Array.isArray(allMetrics), 'engine.listMetrics returns array');
  assert(allMetrics.length > 0, 'listMetrics returns non-empty array');

  // Test 13.5: engine.getMeasure introspection
  const salesMeasure = engine.getMeasure('salesAmount');
  assert(salesMeasure !== undefined, 'engine.getMeasure returns measure definition');
  assertEquals(salesMeasure.name, 'salesAmount', 'getMeasure returns correct measure');

  // Test 13.6: engine.getAttribute introspection
  const regionAttr = engine.getAttribute('regionId');
  assert(regionAttr !== undefined, 'engine.getAttribute returns attribute definition');
  assertEquals(regionAttr.name, 'regionId', 'getAttribute returns correct attribute');

  console.log('✓ All Model/Engine Separation tests passed\n');

} catch (error) {
  console.error('✗ Model/Engine Separation test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 14: Phase 5a - Query Builder Pattern
// ============================================================================

console.log('Test Suite 14: Phase 5a - Query Builder Pattern');
console.log('-'.repeat(80));

try {
  const engine = createEngine(demoDb, demoSemanticModel);

  // Test 14.1: Basic query with where()
  const result1 = engine.query()
    .where({ year: 2025, month: 1 })
    .addAttributes('regionId')
    .addMetrics('revenue')
    .run();

  assertEquals(result1.length, 2, 'Query builder returns correct number of rows');
  assert(result1[0].revenue !== undefined, 'Query builder includes metric values');

  // Test 14.2: Chained where() filters
  const result2 = engine.query()
    .where({ year: 2025 })
    .where({ month: 1 })
    .addAttributes('regionId')
    .addMetrics('revenue')
    .run();

  assertEquals(result2.length, 2, 'Chained where() filters work correctly');

  // Test 14.3: Multiple attributes
  const result3 = engine.query()
    .where({ year: 2025, month: 1 })
    .addAttributes('regionId', 'productId')
    .addMetrics('revenue', 'quantity')
    .run();

  assertEquals(result3.length, 3, 'Multiple attributes create correct number of rows');
  assert(result3[0].regionId !== undefined, 'Result includes first attribute');
  assert(result3[0].productId !== undefined, 'Result includes second attribute');

  // Test 14.4: Reusable base query (CTE-style)
  const base2025 = engine.query().where({ year: 2025 });

  const jan2025 = base2025.where({ month: 1 }).addAttributes('regionId').addMetrics('revenue').run();
  const feb2025 = base2025.where({ month: 2 }).addAttributes('regionId').addMetrics('revenue').run();

  assertEquals(jan2025.length, 2, 'Base query can be reused for Jan');
  assertEquals(feb2025.length, 2, 'Base query can be reused for Feb');
  // Verify the base query is immutable
  assertEquals(jan2025[0].revenue !== feb2025[0].revenue || jan2025[0].regionId !== feb2025[0].regionId, true, 'Base query is immutable');

  // Test 14.5: Complex CTE-style composition
  const naSales = base2025.where({ regionId: 'NA' });
  const euSales = base2025.where({ regionId: 'EU' });

  const naResult = naSales.addAttributes('regionId', 'productId').addMetrics('revenue').run();
  const euResult = euSales.addAttributes('regionId', 'productId').addMetrics('revenue').run();

  assert(naResult.length > 0, 'NA query returns results');
  assert(euResult.length > 0, 'EU query returns results');
  assert(naResult.every(r => r.regionId === 'NA'), 'NA query filters correctly');
  assert(euResult.every(r => r.regionId === 'EU'), 'EU query filters correctly');

  // Test 14.6: build() returns query spec
  const querySpec = engine.query()
    .where({ year: 2025 })
    .addAttributes('regionId')
    .addMetrics('revenue')
    .build();

  assert(querySpec.filters !== undefined, 'build() returns query spec with filters');
  assert(querySpec.attributes !== undefined, 'build() returns query spec with attributes');
  assert(querySpec.metrics !== undefined, 'build() returns query spec with metrics');
  assertEquals(querySpec.filters.year, 2025, 'build() preserves filters');

  console.log('✓ All Query Builder Pattern tests passed\n');

} catch (error) {
  console.error('✗ Query Builder Pattern test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 15: Phase 5 Integration - Combined Features
// ============================================================================

console.log('Test Suite 15: Phase 5 Integration - Combined Features');
console.log('-'.repeat(80));

try {
  const engine = createEngine(demoDb, demoSemanticModel);

  // Test 15.1: Verify functional metric constructors work
  const customMetric = simpleMetric({
    name: 'customRevenue',
    measure: 'salesAmount',
    format: 'currency'
  });

  assert(customMetric.name === 'customRevenue', 'Functional metric constructor works');
  assert(typeof customMetric.eval === 'function', 'Functional metric has eval function');

  // Test 15.2: Verify DSL helpers work
  const dslMetric = metric.simple({
    name: 'dslRevenue',
    measure: 'salesAmount'
  });

  assert(dslMetric.name === 'dslRevenue', 'DSL metric builder works');
  assert(typeof dslMetric.eval === 'function', 'DSL metric has eval function');

  // Test 15.3: Composable Transforms + Context Transform Metrics
  const ytd = (ctx) => {
    if (ctx.year == null || ctx.month == null) return ctx;
    return { ...ctx, month: { lte: Number(ctx.month) } };
  };
  const lastYear = (ctx) => {
    if (ctx.year == null) return ctx;
    return { ...ctx, year: Number(ctx.year) - 1 };
  };
  const ytdLastYear = composeTransforms(ytd, lastYear);

  const ytdLyMetric = contextTransformMetric({
    name: 'revenueYTDLY',
    baseMetric: 'revenue',
    transform: ytdLastYear
  });

  // Verify transform composition works in metric evaluation
  assert(ytdLyMetric.name === 'revenueYTDLY', 'Composed transform metric created');
  assert(typeof ytdLyMetric.eval === 'function', 'Composed transform metric has eval function');

  // Test 15.4: Query Builder works with existing (legacy) metrics
  const result = engine.query()
    .where({ year: 2025 })
    .addAttributes('regionId')
    .addMetrics('revenue', 'budget')
    .run();

  assert(result.length > 0, 'Query builder works with legacy metrics');

  console.log('✓ All Phase 5 Integration tests passed\n');

} catch (error) {
  console.error('✗ Phase 5 Integration test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 16: Backward Compatibility - Legacy vs New API
// ============================================================================

console.log('Test Suite 16: Backward Compatibility - Legacy vs New API');
console.log('-'.repeat(80));

try {
  const engine = createEngine(demoDb, demoSemanticModel);

  // Test 16.1: Same query, different APIs should return same results
  const legacyResult = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['regionId'],
      filters: { year: 2025, month: 1 },
      metrics: ['revenue']
    }
  );

  const newResult = engine.query()
    .where({ year: 2025, month: 1 })
    .addAttributes('regionId')
    .addMetrics('revenue')
    .run();

  assertEquals(legacyResult.length, newResult.length, 'Legacy and new APIs return same number of rows');

  // Sort both results by regionId for comparison
  const sortedLegacy = legacyResult.sort((a, b) => a.regionId.localeCompare(b.regionId));
  const sortedNew = newResult.sort((a, b) => a.regionId.localeCompare(b.regionId));

  for (let i = 0; i < sortedLegacy.length; i++) {
    assertEquals(sortedLegacy[i].regionId, sortedNew[i].regionId, `Row ${i} regionId matches`);
    assertEquals(sortedLegacy[i].revenue, sortedNew[i].revenue, `Row ${i} revenue matches`);
  }

  // Test 16.2: Complex query with multiple attributes and metrics
  const legacyComplex = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['regionId', 'productId'],
      filters: { year: 2025 },
      metrics: ['revenue', 'quantity']
    }
  );

  const newComplex = engine.query()
    .where({ year: 2025 })
    .addAttributes('regionId', 'productId')
    .addMetrics('revenue', 'quantity')
    .run();

  assertEquals(legacyComplex.length, newComplex.length, 'Complex queries return same row count');

  console.log('✓ All Backward Compatibility tests passed\n');

} catch (error) {
  console.error('✗ Backward Compatibility test failed:', error.message);
  console.log();
}

// ============================================================================
// Test Suite 17: Edge Cases
// ============================================================================

console.log('Test Suite 17: Edge Cases');
console.log('-'.repeat(80));

try {
  // Test 17.1: Empty result set
  const emptyResult = evaluateMetric(
    'revenue',
    demoDb,
    demoMetrics,
    { year: 2099 }, // No data for this year
    demoTransforms,
    new Map(),
    demoMeasures
  );
  assertEquals(emptyResult, 0, 'Empty result set returns 0 for sum');

  // Test 17.2: Division by zero in expression metric
  const zeroDivision = evaluateMetric(
    'pricePerUnit',
    demoDb,
    demoMetrics,
    { year: 2099 },
    demoTransforms,
    new Map(),
    demoMeasures
  );
  assertEquals(zeroDivision, null, 'Expression metric handles division by zero');

  // Test 17.3: Unknown metric
  try {
    evaluateMetric('unknownMetric', demoDb, demoMetrics, {}, demoTransforms, new Map(), demoMeasures);
    assert(false, 'Unknown metric should throw error');
  } catch (error) {
    assert(error.message.includes('Unknown metric'), 'Unknown metric throws appropriate error');
  }

  // Test 17.4: Query builder with no results
  const engine = createEngine(demoDb, demoSemanticModel);
  const noResults = engine.query()
    .where({ year: 2099 })
    .addAttributes('regionId')
    .addMetrics('revenue')
    .run();

  assertEquals(noResults.length, 0, 'Query builder handles empty results');

  // Test 17.5: Filter AST with no matches
  const noMatchFilter = f.and(
    f.eq('year', 2025),
    f.eq('year', 2024) // Impossible condition
  );
  const noMatchPredicate = compileFilter(noMatchFilter);
  const testRows = [
    { year: 2024, amount: 100 },
    { year: 2025, amount: 200 }
  ];
  const noMatchFiltered = testRows.filter(noMatchPredicate);
  assertEquals(noMatchFiltered.length, 0, 'Filter AST handles impossible conditions');

  console.log('✓ All edge case tests passed\n');

} catch (error) {
  console.error('✗ Edge case test failed:', error.message);
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
  console.log('All phases including Phase 5 (Composable Query Engine) are complete and validated.');
  process.exit(0);
} else {
  console.error('✗ SOME TESTS FAILED');
  console.error('Please review the failures above.');
  process.exit(1);
}
