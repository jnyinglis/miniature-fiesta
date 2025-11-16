# Semantic Engine Test Plan
## Phase 1: LINQ.js Integration Testing

**Version:** 1.0
**Date:** 2025-11-16
**Status:** Implemented

---

## Test Coverage Overview

This document outlines the comprehensive test plan for validating the Phase 1 refactoring of the Semantic Metrics Engine, which replaces the custom `RowSequence` class with LINQ.js.

### Test Categories

1. **LINQ.js Basic Operations** - Validates core LINQ functionality
2. **Filter Matching** - Tests filter application logic
3. **Context Application** - Tests context filtering on fact tables
4. **Utility Functions** - Tests helper functions
5. **Simple Metrics** - Tests simple aggregation metrics
6. **Expression Metrics** - Tests custom expression metrics
7. **Derived Metrics** - Tests metrics that depend on other metrics
8. **Context Transform Metrics** - Tests time intelligence
9. **Query Execution** - Tests end-to-end query processing
10. **Edge Cases** - Tests error handling and boundary conditions
11. **LINQ.js Advanced Operations** - Demonstrates new capabilities

---

## Test Suite 1: LINQ.js Basic Operations

### Purpose
Validate that LINQ.js provides all functionality previously offered by RowSequence.

### Test Cases

#### 1.1: Basic Filtering with where()
**Test Data:**
```javascript
[
  { year: 2024, amount: 100 },
  { year: 2025, amount: 200 },
  { year: 2025, amount: 300 }
]
```

**Operation:**
```javascript
Enumerable.from(testData)
  .where(r => r.year === 2025)
  .toArray()
```

**Expected:** 2 rows with year === 2025

---

#### 1.2: Sum Aggregation
**Operation:**
```javascript
Enumerable.from(testData).sum(r => r.amount)
```

**Expected:** 600 (100 + 200 + 300)

---

#### 1.3: Average Aggregation
**Operation:**
```javascript
Enumerable.from(testData).average(r => r.amount)
```

**Expected:** 200 (600 / 3)

---

#### 1.4: Count Operation
**Operation:**
```javascript
Enumerable.from(testData)
  .where(r => r.year === 2025)
  .count()
```

**Expected:** 2

---

#### 1.5: GroupBy Operation
**Operation:**
```javascript
Enumerable.from(testData)
  .groupBy(r => r.year)
  .toArray()
```

**Expected:** 2 groups (2024, 2025)

---

#### 1.6: Chained Operations
**Operation:**
```javascript
Enumerable.from(testData)
  .where(r => r.amount > 100)
  .select(r => r.amount)
  .sum()
```

**Expected:** 500 (200 + 300)

---

## Test Suite 2: Filter Matching

### Purpose
Validate that `matchesFilter()` correctly handles all filter types.

### Test Cases

#### 2.1: Primitive Equality
- `matchesFilter(2025, 2025)` → `true`
- `matchesFilter(2024, 2025)` → `false`

#### 2.2: Range Filters (from/to)
- `matchesFilter(5, { from: 1, to: 10 })` → `true`
- `matchesFilter(0, { from: 1, to: 10 })` → `false`
- `matchesFilter(11, { from: 1, to: 10 })` → `false`

#### 2.3: Comparison Filters
- `matchesFilter(5, { gte: 5 })` → `true`
- `matchesFilter(4, { gte: 5 })` → `false`
- `matchesFilter(5, { lte: 5 })` → `true`
- `matchesFilter(6, { lte: 5 })` → `false`
- `matchesFilter(6, { gt: 5 })` → `true`
- `matchesFilter(5, { gt: 5 })` → `false`
- `matchesFilter(4, { lt: 5 })` → `true`
- `matchesFilter(5, { lt: 5 })` → `false`

---

## Test Suite 3: Context Application

### Purpose
Validate that `applyContextToFact()` correctly filters rows based on context and grain.

### Test Data
```javascript
[
  { year: 2024, month: 1, regionId: 'NA', amount: 100 },
  { year: 2024, month: 2, regionId: 'NA', amount: 200 },
  { year: 2025, month: 1, regionId: 'NA', amount: 300 },
  { year: 2025, month: 1, regionId: 'EU', amount: 400 },
]
```

### Test Cases

#### 3.1: Filter by Single Dimension
**Context:** `{ year: 2025 }`
**Grain:** `['year', 'month', 'regionId']`
**Expected:** 2 rows

#### 3.2: Filter by Multiple Dimensions
**Context:** `{ year: 2025, regionId: 'NA' }`
**Grain:** `['year', 'month', 'regionId']`
**Expected:** 1 row (amount: 300)

#### 3.3: Ignore Filters Not in Grain
**Context:** `{ year: 2025, productId: 999 }`
**Grain:** `['year', 'month', 'regionId']`
**Expected:** 2 rows (productId filter ignored)

#### 3.4: Range Filter
**Context:** `{ month: { lte: 1 } }`
**Grain:** `['year', 'month', 'regionId']`
**Expected:** 3 rows (months <= 1)

---

## Test Suite 4: Utility Functions

### Test Cases

#### 4.1: pick() Function
**Input:** `{ a: 1, b: 2, c: 3, d: 4 }`, keys: `['a', 'c']`
**Expected:** `{ a: 1, c: 3 }`

#### 4.2: formatValue() Function
- `formatValue(1234.56, 'currency')` → `"$1234.56"`
- `formatValue(1234.56, 'integer')` → `"1234"`
- `formatValue(45.67, 'percent')` → `"45.67%"`
- `formatValue(null, 'currency')` → `null`

---

## Test Suite 5: Simple Metrics

### Purpose
Validate simple aggregation metrics using LINQ.js.

### Test Cases

#### 5.1: Simple Sum Metric
**Metric:** `totalSalesAmount`
**Context:** `{ year: 2025, month: 1 }`
**Expected:** 2100 (sum of all sales in Jan 2025)

#### 5.2: Metric with Filtered Context
**Metric:** `totalSalesAmount`
**Context:** `{ year: 2025, regionId: 'NA' }`
**Expected:** 2550 (sum of NA sales in 2025)

#### 5.3: Metric with Coarser Grain
**Metric:** `salesAmountYearRegion`
**Context:** `{ year: 2025, month: 1, productId: 1 }`
**Expected:** 3500 (ignores month and product filters due to grain)

---

## Test Suite 6: Expression Metrics

### Purpose
Validate custom expression metrics using LINQ.js.

### Test Cases

#### 6.1: Price Per Unit Calculation
**Metric:** `pricePerUnit`
**Context:** `{ year: 2025, month: 1 }`
**Calculation:** Total amount / Total quantity = 2100 / 19 ≈ 110.53
**Expected:** ~110.53

#### 6.2: Expression with Filtered Context
**Metric:** `pricePerUnit`
**Context:** `{ year: 2025, regionId: 'NA' }`
**Calculation:** 2550 / 23 ≈ 110.87
**Expected:** ~110.87

---

## Test Suite 7: Derived Metrics

### Purpose
Validate metrics that depend on other metrics.

### Test Cases

#### 7.1: Sales vs Budget Percentage
**Metric:** `salesVsBudgetPct`
**Context:** `{ year: 2025, regionId: 'NA' }`
**Calculation:** (2550 / 2200) × 100 ≈ 115.91%
**Expected:** ~115.91

#### 7.2: Null Handling (Division by Zero)
**Metric:** `salesVsBudgetPct`
**Context:** `{ year: 2099 }`
**Expected:** `null` (no data → budget = 0)

---

## Test Suite 8: Context Transform Metrics (Time Intelligence)

### Purpose
Validate time intelligence transformations.

### Test Cases

#### 8.1: Year-to-Date (YTD)
**Metric:** `salesAmountYTD`
**Context:** `{ year: 2025, month: 2 }`
**Expected:** 3500 (all sales in 2025 where month <= 2)

#### 8.2: Last Year (LY)
**Metric:** `salesAmountLastYear`
**Context:** `{ year: 2025, month: 1 }`
**Expected:** 1180 (sales in 2024 month 1)

#### 8.3: YTD Last Year
**Metric:** `salesAmountYTDLastYear`
**Context:** `{ year: 2025, month: 2 }`
**Expected:** 2250 (sales in 2024 where month <= 2)

#### 8.4: Budget YTD
**Metric:** `budgetYTD`
**Context:** `{ year: 2025, regionId: 'NA', month: 2 }`
**Expected:** 2200 (budget is annual, so YTD = full year)

---

## Test Suite 9: Query Execution

### Purpose
Validate end-to-end query processing with dimension enrichment and metric evaluation.

### Test Cases

#### 9.1: Single Dimension Query
**Query:**
```javascript
{
  rows: ['regionId'],
  filters: { year: 2025, month: 1 },
  metrics: ['totalSalesAmount'],
  factForRows: 'sales'
}
```
**Expected:** 2 rows (NA and EU), with `regionName` enriched

#### 9.2: Multiple Dimensions Query
**Query:**
```javascript
{
  rows: ['regionId', 'productId'],
  filters: { year: 2025, month: 1 },
  metrics: ['totalSalesAmount', 'totalSalesQuantity'],
  factForRows: 'sales'
}
```
**Expected:** 3 rows with both `regionName` and `productName`

#### 9.3: Query with Derived Metrics
**Query:**
```javascript
{
  rows: ['regionId'],
  filters: { year: 2025 },
  metrics: ['totalSalesAmount', 'totalBudget', 'salesVsBudgetPct'],
  factForRows: 'sales'
}
```
**Expected:** Includes formatted percentage values

#### 9.4: Query with Time Intelligence
**Query:**
```javascript
{
  rows: ['regionId'],
  filters: { year: 2025, month: 2 },
  metrics: ['totalSalesAmount', 'salesAmountYTD', 'salesAmountLastYear'],
  factForRows: 'sales'
}
```
**Expected:** All three metrics calculated correctly

---

## Test Suite 10: Edge Cases

### Purpose
Validate error handling and boundary conditions.

### Test Cases

#### 10.1: Empty Result Set
**Context:** `{ year: 2099 }`
**Expected:** Sum = 0, Average = null

#### 10.2: Null Values in Data
**Expected:** Null values treated as 0 in aggregations

#### 10.3: Division by Zero
**Metric:** `pricePerUnit` with no data
**Expected:** `null`

#### 10.4: Unknown Metric
**Expected:** Error thrown with message "Unknown metric"

#### 10.5: Unknown Fact Table
**Expected:** Error thrown with message "Unknown fact table"

---

## Test Suite 11: LINQ.js Advanced Operations

### Purpose
Demonstrate new capabilities enabled by LINQ.js.

### Test Cases

#### 11.1: Join Operation
**Operation:** Join sales with products
```javascript
Enumerable.from(salesData)
  .join(
    products,
    sale => sale.productId,
    product => product.productId,
    (sale, product) => ({ ...sale, productName: product.name })
  )
```
**Expected:** All sales rows with product names

#### 11.2: OrderBy and Take
**Operation:**
```javascript
Enumerable.from(salesData)
  .orderByDescending(s => s.amount)
  .take(3)
```
**Expected:** Top 3 sales by amount

#### 11.3: Distinct
**Operation:**
```javascript
Enumerable.from(salesData)
  .select(s => s.year)
  .distinct()
```
**Expected:** [2024, 2025]

#### 11.4: SelectMany (Flatten)
**Operation:** Group then flatten
**Expected:** Original row count maintained

#### 11.5: Complex Pipeline
**Operation:**
```javascript
Enumerable.from(salesData)
  .where(s => s.year === 2025)
  .groupBy(s => `${s.regionId}-${s.productId}`)
  .select(g => ({
    key: g.key(),
    totalAmount: g.sum(s => s.amount),
    totalQty: g.sum(s => s.quantity)
  }))
  .orderByDescending(r => r.totalAmount)
  .take(3)
```
**Expected:** Top 3 region-product combinations by sales

---

## Validation Checklist

### LINQ.js Integration
- [x] RowSequence class removed
- [x] Enumerable imported from linq.js
- [x] applyContextToFact returns IEnumerable<Row>
- [x] Expression metric signature updated
- [x] All metric evaluations use LINQ.js operators
- [x] Demo metrics updated (pricePerUnit)

### Backward Compatibility
- [x] All existing queries produce identical results
- [x] All metric types still supported (simple, expression, derived, contextTransform)
- [x] Filter matching unchanged
- [x] Attribute display name resolution working
- [x] Formatting unchanged

### New Capabilities
- [x] Join operations available
- [x] Advanced sorting (orderBy, thenBy)
- [x] Set operations (distinct, union, intersect, except)
- [x] Projection (select, selectMany)
- [x] Partitioning (take, skip, takeWhile, skipWhile)
- [x] 100+ LINQ operators accessible

---

## Performance Considerations

### Expected Performance
- **LINQ.js lazy evaluation:** Only processes data when terminal operation (toArray, sum, etc.) is called
- **Memory usage:** Similar or better than RowSequence due to lazy evaluation
- **Execution time:** Should be equal or faster due to LINQ.js optimizations

### Benchmarks to Consider
1. Large dataset filtering (10,000+ rows)
2. Complex aggregations with multiple groupBy operations
3. Deeply nested derived metrics
4. Queries with many context transforms

---

## Test Execution

### Manual Testing
1. Review code changes in `semanticEngine.ts`
2. Verify LINQ.js import statement
3. Check type signatures updated
4. Run demo queries (if TypeScript compiler available)

### Automated Testing
Run the test suite:
```bash
node src/semanticEngine.test.js
```

**Note:** The test file assumes TypeScript transpilation. If running directly:
1. Install TypeScript: `npm install -g typescript`
2. Compile: `tsc src/semanticEngine.ts`
3. Run tests against compiled JavaScript

---

## Success Criteria

Phase 1 is considered complete when:

- [x] All RowSequence references removed
- [x] LINQ.js successfully integrated
- [x] All existing functionality preserved
- [x] All test cases pass
- [x] Code review approved
- [x] Documentation updated

---

## Next Steps

After Phase 1 validation:

1. **Phase 2a:** Implement unified table model (merge dimensions and facts)
2. **Phase 2b:** Create attribute and measure registries
3. **Phase 2c:** Update metric layer to reference measures
4. **Phase 2d:** Update query engine for automatic table determination

---

## Appendix: LINQ.js Operator Reference

### Commonly Used Operators

**Filtering:**
- `where()` - Filter elements
- `distinct()` - Remove duplicates
- `except()` - Set difference
- `intersect()` - Set intersection
- `union()` - Set union

**Projection:**
- `select()` - Transform elements
- `selectMany()` - Flatten nested structures

**Aggregation:**
- `sum()` - Sum values
- `average()` - Calculate average
- `count()` - Count elements
- `min()` / `max()` - Find extremes
- `aggregate()` - Custom aggregation

**Joining:**
- `join()` - Inner join
- `leftJoin()` - Left outer join
- `groupJoin()` - Group join

**Grouping:**
- `groupBy()` - Group by key
- `partitionBy()` - Partition by key

**Ordering:**
- `orderBy()` / `orderByDescending()` - Sort
- `thenBy()` / `thenByDescending()` - Secondary sort
- `reverse()` - Reverse order

**Partitioning:**
- `take()` / `skip()` - Take/skip n elements
- `takeWhile()` / `skipWhile()` - Conditional take/skip

**Conversion:**
- `toArray()` - Convert to array
- `toLookup()` - Convert to lookup
- `toDictionary()` - Convert to dictionary

---

**End of Test Plan**
