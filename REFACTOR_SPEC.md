# Semantic Metrics Engine Refactoring Specification

**Version:** 3.0
**Date:** 2025-11-16
**Status:** Migration Complete - All Phases Completed

---

## Implementation Status

| Phase | Description | Status | Date Completed |
|-------|-------------|--------|----------------|
| **Phase 1** | LINQ.js Integration | ✅ **COMPLETED** | 2025-11-16 |
| **Phase 2a** | Storage Layer (Unified Tables) | ✅ **COMPLETED** | 2025-11-16 |
| **Phase 2b** | Semantic Layer (Attributes & Measures) | ✅ **COMPLETED** | 2025-11-16 |
| **Phase 2c** | Metric Layer Updates | ✅ **COMPLETED** | 2025-11-16 |
| **Phase 2d** | Query Engine Refactor | ✅ **COMPLETED** | 2025-11-16 |
| **Phase 3** | Legacy API Removal | ✅ **COMPLETED** | 2025-11-16 |
| **Phase 4** | Advanced Features | ⏳ **PLANNED** | Future |
| **Phase 5** | Composable Query Engine | 📋 **PLANNED** | Future |

### Phase 1 Completion Summary

**Completed Changes:**
- ✅ Removed custom `RowSequence` class (73 lines removed)
- ✅ Added LINQ.js import: `import Enumerable from './linq.js'`
- ✅ Updated `applyContextToFact()` to return `Enumerable.IEnumerable<Row>`
- ✅ Updated `ExpressionMetric` interface signature
- ✅ Updated demo metric `pricePerUnit` to use LINQ.js
- ✅ All existing functionality preserved (backward compatible)
- ✅ Comprehensive test plan created (11 test suites, 50+ test cases)

**Files Modified:**
- `src/semanticEngine.ts` - Refactored to use LINQ.js

**Files Created:**
- `src/semanticEngine.test.js` - Automated test suite
- `TEST_PLAN.md` - Comprehensive test documentation

**Benefits Realized:**
- Access to 100+ LINQ operators (previously had 6 custom methods)
- Lazy evaluation for better performance
- Type-safe transformations
- Rich operators: joins, set operations, advanced sorting
- Battle-tested library (no custom code maintenance)

**Validation:**
- All existing queries produce identical results
- All metric types function correctly (factMeasure, expression, derived, contextTransform)
- Filter matching, dimension enrichment, and formatting unchanged
- New capabilities available (join, orderBy, distinct, selectMany, etc.)

### Phase 2 Completion Summary

**Completed Changes:**
- ✅ **Phase 2a: Storage Layer (Unified Tables)**
  - Merged `db.dimensions` and `db.facts` into unified `db.tables`
  - Created `TableDefinition` interface with schema and relationships
  - Created `TableRegistry` type
  - Updated all references to use unified table structure
  - Created demo table definitions with relationships

- ✅ **Phase 2b: Semantic Layer (Attributes & Measures)**
  - Created `AttributeDefinition` interface for slicing/grouping
  - Created `MeasureDefinition` interface for aggregations
  - Created `AttributeRegistry` and `MeasureRegistry` types
  - Implemented demo attribute registry (year, month, regionId, productId)
  - Implemented demo measure registry (salesAmount, salesQuantity, budgetAmount, etc.)
  - Added support for display name resolution in attributes

- ✅ **Phase 2c: Metric Layer Updates**
  - Added `SimpleMetric` type for wrapping measures
  - Updated `MetricDefinition` union to include SimpleMetric
  - Updated `evaluateMetric` to resolve and evaluate simple metrics
  - Added `measureRegistry` parameter to all evaluation functions
  - Created demo simple metrics (revenue, quantity, budget)
  - Maintained backward compatibility with existing metric types

- ✅ **Phase 2d: Query Engine Refactor**
  - Created new `RunQueryOptionsV2` interface using attributes instead of rows
  - Implemented `runQueryV2` function with semantic layer support
  - Automatic table determination based on attributes
  - Simplified query API (no more `factForRows` required)
  - Enhanced display name resolution via relationships
  - Maintained backward compatibility with original `runQuery` function

**Files Modified:**
- `src/semanticEngine.ts` - Implemented all Phase 2 changes

**Files Created:**
- None (all changes integrated into existing files)

**Benefits Realized:**
- **Flexibility**: Same column can be attribute, measure, or both
- **Clarity**: Clear separation between storage, semantics, and business logic
- **Simplified API**: New query API requires fewer parameters
- **MicroStrategy Alignment**: Follows industry-standard semantic layer model
- **Type Safety**: Strongly typed registries for attributes and measures
- **Clean Architecture**: Three-layer model provides clear separation of concerns

**Validation:**
- All tests validated the new three-layer architecture
- Phase 2 tests validated unified tables, semantic layer, simple metrics, and new query engine
- Comprehensive test coverage for all new functionality
- Backward compatibility maintained during Phase 2 (removed in Phase 3)

### Phase 3 Completion Summary

**Completed Changes:**
- ✅ **Legacy API Removal**
  - Removed `FactMeasureMetric` (kind: "factMeasure") - replaced with `SimpleMetric`
  - Removed `FactTableRegistry` and `FactTableDefinition` - replaced with `TableRegistry` and `MeasureRegistry`
  - Removed `DimensionConfig` - replaced with `AttributeRegistry`
  - Removed `runQueryV2` - consolidated into single `runQuery` function
  - Removed `demoFactTables` - replaced with `demoMeasures` and table definitions
  - Removed `demoDimensionConfig` - replaced with `demoAttributes`
  - Updated all demos and examples to use new API exclusively
  - Removed backward compatibility layer

**Benefits Realized:**
- **Simplified API**: Single, consistent API surface without legacy variants
- **Reduced Maintenance**: No dual API paths to maintain
- **Clearer Intent**: New API names better reflect semantic layer concepts
- **Easier Onboarding**: Developers only learn one API, not two

**Validation:**
- All tests pass with new API
- No references to legacy API remain in codebase
- Demo applications fully migrated to new API

**Migration Complete:**
- All phases of the semantic layer refactoring are now complete
- The engine fully implements the three-layer architecture (Storage, Semantic, Metrics)
- All functionality previously available in the legacy API is available in the new API

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Previous Architecture (Legacy)](#previous-architecture-legacy)
3. [Problems & Limitations (Resolved)](#problems--limitations-resolved)
4. [Current Architecture](#current-architecture)
5. [LINQ.js Integration](#linqjs-integration)
6. [Three-Layer Model](#three-layer-model)
7. [Current API](#current-api)
8. [Migration Guide (Historical)](#migration-guide-historical)
9. [Implementation Phases](#implementation-phases)
10. [Examples](#examples)
11. [Benefits & Tradeoffs](#benefits--tradeoffs)

---

## Executive Summary

This document describes the completed major refactoring of the semantic metrics engine that:

1. **Replaced the custom `RowSequence` class with LINQ.js** for richer composition and declarative query building
2. **Unified dimensions and facts into a single "tables" concept** aligned with MicroStrategy's semantic layer model
3. **Introduced a 3-layer architecture** that separates storage, semantics, and business logic
4. **Removed all legacy API components** to provide a single, clean, consistent API

### Key Design Principle

**A table column has no inherent semantic meaning.** The same column can be used as:
- An **attribute** (for slicing/grouping)
- A **measure** (for aggregation)
- Both simultaneously in different contexts

This is determined by **attribute and measure definitions**, not by the table schema itself.

### Migration Status

**✅ COMPLETE** - All phases of the refactoring are complete. The legacy API has been fully removed and all functionality has been migrated to the new three-layer architecture.

---

## Previous Architecture (Legacy)

> **Note:** This section describes the legacy architecture that has been replaced. It is retained for historical reference and to understand the migration context.

### Database Structure (Legacy)

```typescript
interface InMemoryDb {
  dimensions: Record<string, Row[]>;  // Lookup tables: products, regions
  facts: Record<string, Row[]>;       // Transaction tables: sales, budget
}
```

### Fact Table Metadata (Legacy - REMOVED)

```typescript
interface FactTableDefinition {
  grain: string[];  // Native dimensions
  measures: Record<string, FactMeasureDefinition>;  // Aggregatable columns
}

interface FactMeasureDefinition {
  column: string;
  defaultAgg: 'sum' | 'avg' | 'count';
  format?: string;
}
```

### Dimension Configuration (Legacy - REMOVED)

```typescript
interface DimensionConfigEntry {
  table: string;      // Lookup table name
  key: string;        // Foreign key in facts
  labelProp: string;  // Display column
  labelAlias: string; // Output field name
}
```

### Metric Types (Legacy)

1. **factMeasure** (REMOVED): Simple aggregation of a fact column - replaced by `SimpleMetric`
2. **expression**: Custom expression over filtered fact rows - RETAINED
3. **derived**: Arithmetic on other metrics - RETAINED
4. **contextTransform**: Filter context manipulation (YTD, LY, etc.) - RETAINED

### Query Execution (Legacy - REMOVED)

```typescript
runQuery(
  db: InMemoryDb,
  factTables: FactTableRegistry,
  metricRegistry: MetricRegistry,
  transforms: ContextTransformsRegistry,
  dimensionConfig: DimensionConfig,
  options: {
    rows: string[];         // Dimension keys
    filters?: FilterContext;
    metrics: string[];
    factForRows: string;    // Which fact table to use
  }
)
```

### Custom RowSequence Class (Legacy - REMOVED)

A minimal LINQ-like wrapper that was replaced by LINQ.js:
- `where(predicate)`
- `sum(selector)`
- `average(selector)`
- `count()`
- `groupBy(keySelector, valueSelector)`
- `toArray()`

---

## Problems & Limitations (Resolved)

> **Note:** This section describes the problems with the legacy architecture that motivated the refactoring. All of these issues have been resolved in the current three-layer architecture.

### 1. Artificial Dimension/Fact Separation ✅ RESOLVED

**Problem (Legacy):** The storage model enforced a distinction that didn't exist semantically.

**Example:**
- A `budget` table is stored in `db.facts`
- But budget is often used for comparison (like a dimension)
- A product hierarchy table might contain aggregatable metrics

**Impact (Legacy):** Rigid data modeling; didn't match real-world use cases.

**Resolution:** Unified table model (`db.tables`) treats all tables equally. Semantic meaning is defined through `AttributeRegistry` and `MeasureRegistry`, not storage structure.

---

### 2. Limited Composition with RowSequence ✅ RESOLVED

**Problem (Legacy):** Custom implementation lacked:
- Rich operators (joins, unions, set operations)
- Lazy evaluation optimization
- Type-safe chaining
- 100+ battle-tested LINQ operators

**Example:**
```typescript
// Legacy: Manual implementation
expression: (q: RowSequence) => {
  const amount = q.sum(r => r.amount);
  const qty = q.sum(r => r.quantity);
  return qty ? amount / qty : null;
}

// Couldn't do: joins, complex aggregations, window functions, etc.
```

**Impact (Legacy):** Limited expressiveness; reinventing the wheel.

**Resolution:** Replaced with LINQ.js providing 100+ operators, lazy evaluation, type-safe chaining, and rich composition capabilities.

---

### 3. Semantic Information Scattered ✅ RESOLVED

**Problem (Legacy):** Metadata was fragmented across multiple structures:
- Table schemas in `db` structure
- Grain in `FactTableDefinition`
- Measure definitions in `FactTableDefinition.measures`
- Display labels in `DimensionConfig`
- Aggregation logic in metric definitions

**Impact (Legacy):** Hard to understand what was available; duplication; no single source of truth.

**Resolution:** Three-layer architecture with clear separation:
- **Layer 1 (Storage):** `TableRegistry` defines schemas and relationships
- **Layer 2 (Semantic):** `AttributeRegistry` and `MeasureRegistry` define meaning
- **Layer 3 (Metrics):** `MetricRegistry` defines business logic

---

### 4. No Multi-Interpretation of Columns ✅ RESOLVED

**Problem (Legacy):** A column could only be either:
- A dimension key (in `grain`)
- A fact measure (in `measures`)

**Example:**
- `quantity` couldn't be both:
  - An attribute for bucketing (Small/Medium/Large orders)
  - A measure for summing/averaging

**Impact (Legacy):** Couldn't model real-world scenarios where columns have multiple roles.

**Resolution:** Columns have no inherent semantic meaning in storage layer. Same column can be defined as:
- Multiple attributes (e.g., `quantity` as raw value, `quantityBand` as bucketed)
- Multiple measures (e.g., `totalQuantity` as sum, `avgQuantity` as average)
- Both simultaneously

---

### 5. Hard-Coded Fact Table Selection ✅ RESOLVED

**Problem (Legacy):** Query had to specify `factForRows` explicitly.

**Example:**
```typescript
{
  rows: ['regionId', 'productId'],
  metrics: ['totalSales', 'totalBudget'],
  factForRows: 'sales'  // ← But budget came from different table!
}
```

**Impact (Legacy):** Couldn't naturally query metrics from different fact tables; no automatic join resolution.

**Resolution:** `factForRows` parameter removed. Engine automatically determines which tables to query based on the attributes and measures referenced. Supports querying metrics from multiple tables in a single query.

---

## Current Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 3: METRICS                          │
│  Business logic: derived metrics, time intelligence, KPIs   │
│  References: Measures, Attributes (by name)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              LAYER 2: SEMANTIC LAYER                         │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  Attribute Registry     │  │  Measure Registry       │  │
│  │  (How to slice)         │  │  (How to aggregate)     │  │
│  │  - year, month          │  │  - salesAmount (SUM)    │  │
│  │  - regionId → name      │  │  - quantity (SUM)       │  │
│  │  - quantityBand         │  │  - quantity (AVG)       │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              LAYER 1: STORAGE                                │
│  Pure data storage - no semantic meaning                     │
│  Tables: { sales: [...], products: [...], budget: [...] }   │
│  Relationships: sales.regionId → regions.regionId           │
└─────────────────────────────────────────────────────────────┘
```

---

## LINQ.js Integration

### Replacement Strategy

**Remove:** Custom `RowSequence` class (lines 10-71 in semanticEngine.ts)

**Add:** Import from linq.js
```typescript
import Enumerable from './linq.js';
```

### Core Changes

#### 1. Update `applyContextToFact`

**Before:**
```typescript
function applyContextToFact(
  rows: Row[],
  context: FilterContext,
  grain: string[]
): RowSequence {
  let q = RowSequence.from(rows);
  Object.entries(context || {}).forEach(([key, filter]) => {
    if (filter === undefined || filter === null) return;
    if (!grain.includes(key)) return;
    q = q.where((r: Row) => matchesFilter(r[key], filter));
  });
  return q;
}
```

**After:**
```typescript
function applyContextToFact(
  rows: Row[],
  context: FilterContext,
  grain: string[]
): Enumerable.IEnumerable<Row> {
  let query = Enumerable.from(rows);

  Object.entries(context || {}).forEach(([key, filter]) => {
    if (filter === undefined || filter === null) return;
    if (!grain.includes(key)) return;
    query = query.where((r: Row) => matchesFilter(r[key], filter));
  });

  return query;
}
```

#### 2. Update Metric Expression Signatures

**Before:**
```typescript
interface ExpressionMetric {
  expression: (q: RowSequence, db: InMemoryDb, context: FilterContext) => number | null;
}
```

**After:**
```typescript
interface ExpressionMetric {
  expression: (
    rows: Enumerable.IEnumerable<Row>,
    db: InMemoryDb,
    context: FilterContext
  ) => number | null;
}
```

#### 3. Update Metric Evaluation

**Before:**
```typescript
const q = applyContextToFact(rows, context, grain);
value = q.sum((r: Row) => Number(r[col] ?? 0));
```

**After:**
```typescript
const filteredRows = applyContextToFact(rows, context, grain);
value = filteredRows.sum((r: Row) => Number(r[col] ?? 0));
```

#### 4. Update runQuery Grouping

**Before:**
```typescript
const groups = filtered
  .groupBy(
    (r: Row) => JSON.stringify(pick(r, rowDims)),
    (r: Row) => r
  )
  .toArray();
```

**After:**
```typescript
const groups = filtered
  .groupBy(
    (r: Row) => JSON.stringify(pick(r, rowDims)),
    (r: Row) => r
  )
  .toArray();
// Same API! LINQ.js groupBy is compatible
```

### Benefits of LINQ.js

#### 1. **Rich Operator Library**

```typescript
// Example: Sales by product category with ranking
Enumerable.from(db.tables.sales)
  .where(s => s.year === 2025)
  .join(
    db.tables.products,
    sale => sale.productId,
    product => product.productId,
    (sale, product) => ({ ...sale, category: product.category })
  )
  .groupBy(r => r.category)
  .select(g => ({
    category: g.key(),
    total: g.sum(r => r.amount)
  }))
  .orderByDescending(r => r.total)
  .select((r, index) => ({ ...r, rank: index + 1 }))
  .toArray();
```

#### 2. **Lazy Evaluation**

```typescript
// Build a pipeline - nothing executes yet
const pipeline = Enumerable.from(sales)
  .where(s => s.amount > 1000)
  .select(s => ({ ...s, tax: s.amount * 0.1 }))
  .orderBy(s => s.date);

// Execute when needed
const top10 = pipeline.take(10).toArray();
const total = pipeline.sum(s => s.amount);
```

#### 3. **Composable Filters**

```typescript
// Reusable query fragments
const inRegion = (region: string) =>
  (seq: Enumerable.IEnumerable<Row>) =>
    seq.where(r => r.regionId === region);

const inYear = (year: number) =>
  (seq: Enumerable.IEnumerable<Row>) =>
    seq.where(r => r.year === year);

// Compose them
const naSales2025 = inYear(2025)(inRegion('NA')(Enumerable.from(sales)));
```

#### 4. **Type-Safe Transformations**

```typescript
Enumerable.from(sales)          // IEnumerable<Sale>
  .where(s => s.amount > 100)   // IEnumerable<Sale>
  .select(s => s.productId)     // IEnumerable<number>
  .distinct()                   // IEnumerable<number>
  .count();                     // number
```

### Available Operators

**Filtering:** `where`, `distinct`, `except`, `intersect`, `union`, `ofType`

**Projection:** `select`, `selectMany`, `zip`, `flatten`, `pairwise`, `scan`

**Aggregation:** `sum`, `average`, `count`, `min`, `max`, `aggregate`, `minBy`, `maxBy`

**Joining:** `join`, `leftJoin`, `groupJoin`

**Grouping:** `groupBy`, `partitionBy`, `buffer`

**Ordering:** `orderBy`, `orderByDescending`, `thenBy`, `reverse`, `shuffle`

**Partitioning:** `skip`, `take`, `skipWhile`, `takeWhile`, `takeFromLast`

**Set Operations:** `contains`, `sequenceEqual`, `defaultIfEmpty`

**Conversion:** `toArray`, `toLookup`, `toDictionary`, `toObject`, `toJoinedString`

**Utilities:** `forEach`, `doAction`, `force`, `memoize`, `share`

---

## Three-Layer Model

### Layer 1: Storage Layer

Tables are pure data containers with no semantic meaning.

```typescript
interface TableDefinition {
  name: string;

  columns: Record<string, {
    dataType: 'string' | 'number' | 'date' | 'boolean';
  }>;

  primaryKey?: string[];

  relationships?: Array<{
    to: string;          // Target table name
    from: string[];      // Foreign key column(s) in this table
    toColumns: string[]; // Primary key column(s) in target table
    type: '1:1' | '1:M' | 'M:M';
  }>;
}

type TableRegistry = Record<string, TableDefinition>;

interface InMemoryDb {
  tables: Record<string, Row[]>;
}
```

**Example:**
```typescript
const tableDefinitions: TableRegistry = {
  sales: {
    name: 'sales',
    columns: {
      year: { dataType: 'number' },
      month: { dataType: 'number' },
      regionId: { dataType: 'string' },
      productId: { dataType: 'number' },
      amount: { dataType: 'number' },
      quantity: { dataType: 'number' }
    },
    relationships: [
      {
        to: 'regions',
        from: ['regionId'],
        toColumns: ['regionId'],
        type: '1:M'
      },
      {
        to: 'products',
        from: ['productId'],
        toColumns: ['productId'],
        type: '1:M'
      }
    ]
  }
};
```

---

### Layer 2: Semantic Layer

Attributes and measures give meaning to table columns.

#### Attribute Definitions

Attributes define **how to slice and dice** the data.

```typescript
interface AttributeDefinition {
  name: string;              // Unique attribute ID
  table: string;             // Source table
  column: string;            // Source column
  description?: string;

  // Optional: Display name from related table
  displayName?: string;      // e.g., "regionName" for regionId

  // Optional: Transform the value
  format?: (value: any) => string;

  // Optional: Derived attribute (calculated)
  expression?: (row: Row) => any;
}

type AttributeRegistry = Record<string, AttributeDefinition>;
```

**Examples:**

```typescript
const attributes: AttributeRegistry = {
  // Simple attribute
  year: {
    name: 'year',
    table: 'sales',
    column: 'year'
  },

  // Attribute with display name (requires join)
  regionId: {
    name: 'regionId',
    table: 'sales',
    column: 'regionId',
    displayName: 'regionName'  // Join to regions.name
  },

  // Derived attribute: bucket quantity
  quantityBand: {
    name: 'quantityBand',
    table: 'sales',
    column: 'quantity',
    expression: (row) => {
      const q = row.quantity;
      if (q <= 5) return 'Small';
      if (q <= 10) return 'Medium';
      return 'Large';
    }
  },

  // Formatted attribute
  monthName: {
    name: 'monthName',
    table: 'sales',
    column: 'month',
    format: (month) => {
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return names[month - 1];
    }
  }
};
```

#### Measure Definitions

Measures define **how to aggregate** columns.

```typescript
interface MeasureDefinition {
  name: string;              // Unique measure ID
  table: string;             // Source table
  column: string;            // Source column
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  format?: string;           // 'currency', 'integer', 'percent'
  description?: string;

  // Optional: Custom aggregation logic
  expression?: (rows: Enumerable.IEnumerable<Row>) => number | null;
}

type MeasureRegistry = Record<string, MeasureDefinition>;
```

**Examples:**

```typescript
const measures: MeasureRegistry = {
  // Same column, different aggregations
  salesAmount: {
    name: 'salesAmount',
    table: 'sales',
    column: 'amount',
    aggregation: 'sum',
    format: 'currency'
  },

  avgOrderSize: {
    name: 'avgOrderSize',
    table: 'sales',
    column: 'amount',
    aggregation: 'avg',
    format: 'currency'
  },

  // Quantity as sum
  totalQuantity: {
    name: 'totalQuantity',
    table: 'sales',
    column: 'quantity',
    aggregation: 'sum',
    format: 'integer'
  },

  // Quantity as average
  avgQuantity: {
    name: 'avgQuantity',
    table: 'sales',
    column: 'quantity',
    aggregation: 'avg',
    format: 'integer'
  },

  // Order count
  orderCount: {
    name: 'orderCount',
    table: 'sales',
    column: 'quantity',  // Any column works for count
    aggregation: 'count',
    format: 'integer'
  },

  // Custom expression
  distinctProducts: {
    name: 'distinctProducts',
    table: 'sales',
    column: 'productId',
    aggregation: 'distinct',
    format: 'integer',
    expression: (rows) => rows.distinct(r => r.productId).count()
  }
};
```

**Key Insight:** The `quantity` column is used in:
- An **attribute** (`quantityBand`) for grouping
- Multiple **measures** (`totalQuantity`, `avgQuantity`, `orderCount`)

The column itself has no inherent role!

---

### Layer 3: Metrics Layer

Metrics add business logic on top of measures.

```typescript
// Simple metric: wraps a measure
interface SimpleMetric {
  kind: 'simple';
  name: string;
  measure: string;           // Reference to MeasureRegistry
  grain?: string[];          // Optional: restrict to specific attributes
  description?: string;
  format?: string;           // Override measure format
}

// Derived metric: combines multiple metrics
interface DerivedMetric {
  kind: 'derived';
  name: string;
  dependencies: string[];    // Metric names
  evalFromDeps: (
    deps: Record<string, number | null>,
    db: InMemoryDb,
    context: FilterContext
  ) => number | null;
  format?: string;
  description?: string;
}

// Context transform: time intelligence
interface ContextTransformMetric {
  kind: 'contextTransform';
  name: string;
  baseMeasure: string;       // Metric name
  transform: string;         // Transform key (ytd, ly, etc.)
  description?: string;
  format?: string;
}

// Expression metric: custom logic over raw rows
interface ExpressionMetric {
  kind: 'expression';
  name: string;
  table: string;
  grain?: string[];
  expression: (
    rows: Enumerable.IEnumerable<Row>,
    db: InMemoryDb,
    context: FilterContext
  ) => number | null;
  format?: string;
  description?: string;
}

type MetricDefinition =
  | SimpleMetric
  | DerivedMetric
  | ContextTransformMetric
  | ExpressionMetric;

type MetricRegistry = Record<string, MetricDefinition>;
```

**Examples:**

```typescript
const metrics: MetricRegistry = {
  // Simple: just expose a measure
  revenue: {
    kind: 'simple',
    name: 'revenue',
    measure: 'salesAmount'
  },

  // Simple with grain restriction
  regionalBudget: {
    kind: 'simple',
    name: 'regionalBudget',
    measure: 'budgetAmount',
    grain: ['year', 'regionId']  // Ignore month, product filters
  },

  // Derived: price per unit
  pricePerUnit: {
    kind: 'derived',
    name: 'pricePerUnit',
    dependencies: ['salesAmount', 'totalQuantity'],
    evalFromDeps: (deps) =>
      deps.totalQuantity ? deps.salesAmount / deps.totalQuantity : null,
    format: 'currency'
  },

  // Context transform: YTD revenue
  revenueYTD: {
    kind: 'contextTransform',
    name: 'revenueYTD',
    baseMeasure: 'revenue',
    transform: 'ytd'
  },

  // Expression: complex calculation
  weightedAvgPrice: {
    kind: 'expression',
    name: 'weightedAvgPrice',
    table: 'sales',
    expression: (rows) => {
      const items = rows.toArray();
      if (items.length === 0) return null;

      const totalValue = items.reduce((sum, r) => sum + r.amount, 0);
      const totalQty = items.reduce((sum, r) => sum + r.quantity, 0);

      return totalQty ? totalValue / totalQty : null;
    },
    format: 'currency'
  }
};
```

---

## Current API

The refactoring is complete and the engine now uses a single, consistent API.

### Query Function Signature

```typescript
runQuery(
  db: InMemoryDb,                    // { tables: {...} }
  tableRegistry: TableRegistry,      // Table schemas + relationships
  attributeRegistry: AttributeRegistry,
  measureRegistry: MeasureRegistry,
  metricRegistry: MetricRegistry,
  transforms: ContextTransformsRegistry,
  options: {
    attributes: string[];            // Attribute names (can come from any table)
    filters?: FilterContext;
    metrics: string[];
  }
): Row[]
```

### Key Features

1. **No `factForRows` parameter** - Engine automatically determines which tables to query based on attributes/metrics
2. **`attributes` instead of `rows`** - Clearer semantic meaning
3. **Unified table registry** - Single source of truth for schemas
4. **Separate attribute/measure registries** - Explicit semantic layer
5. **LINQ.js integration** - Rich composition with 100+ operators

### Example Usage

```typescript
const result = runQuery(
  demoDb,
  demoTableDefinitions,
  demoAttributes,
  demoMeasures,
  demoMetrics,
  demoTransforms,
  {
    attributes: ['regionId', 'productId'],
    filters: { year: 2025, month: 2 },
    metrics: ['revenue', 'quantity', 'budget']
    // No factForRows needed - engine figures it out!
  }
);
```

---

## Migration Guide (Historical)

> **Note:** This migration has been completed. This section is retained for historical reference and to document the migration process that was performed.

### Step 1: Migrate Database Structure ✅ COMPLETED

**Before:**
```typescript
const demoDb: InMemoryDb = {
  dimensions: {
    products: [
      { productId: 1, name: "Widget A" },
      { productId: 2, name: "Widget B" }
    ],
    regions: [
      { regionId: "NA", name: "North America" },
      { regionId: "EU", name: "Europe" }
    ]
  },
  facts: {
    sales: [
      { year: 2025, month: 1, regionId: "NA", productId: 1, quantity: 10, amount: 1000 }
    ],
    budget: [
      { year: 2025, regionId: "NA", budgetAmount: 2200 }
    ]
  }
};
```

**After:**
```typescript
const demoDb: InMemoryDb = {
  tables: {
    products: [
      { productId: 1, name: "Widget A" },
      { productId: 2, name: "Widget B" }
    ],
    regions: [
      { regionId: "NA", name: "North America" },
      { regionId: "EU", name: "Europe" }
    ],
    sales: [
      { year: 2025, month: 1, regionId: "NA", productId: 1, quantity: 10, amount: 1000 }
    ],
    budget: [
      { year: 2025, regionId: "NA", budgetAmount: 2200 }
    ]
  }
};
```

### Step 2: Create Table Definitions ✅ COMPLETED

Extracted from `FactTableRegistry` and inferred from data:

```typescript
const tableDefinitions: TableRegistry = {
  products: {
    name: 'products',
    columns: {
      productId: { dataType: 'number' },
      name: { dataType: 'string' }
    },
    primaryKey: ['productId']
  },

  regions: {
    name: 'regions',
    columns: {
      regionId: { dataType: 'string' },
      name: { dataType: 'string' }
    },
    primaryKey: ['regionId']
  },

  sales: {
    name: 'sales',
    columns: {
      year: { dataType: 'number' },
      month: { dataType: 'number' },
      regionId: { dataType: 'string' },
      productId: { dataType: 'number' },
      amount: { dataType: 'number' },
      quantity: { dataType: 'number' }
    },
    relationships: [
      { to: 'regions', from: ['regionId'], toColumns: ['regionId'], type: '1:M' },
      { to: 'products', from: ['productId'], toColumns: ['productId'], type: '1:M' }
    ]
  },

  budget: {
    name: 'budget',
    columns: {
      year: { dataType: 'number' },
      regionId: { dataType: 'string' },
      budgetAmount: { dataType: 'number' }
    },
    relationships: [
      { to: 'regions', from: ['regionId'], toColumns: ['regionId'], type: '1:M' }
    ]
  }
};
```

### Step 3: Extract Attributes ✅ COMPLETED

Extracted from `DimensionConfig` and fact table grains:

```typescript
const attributes: AttributeRegistry = {
  year: {
    name: 'year',
    table: 'sales',
    column: 'year'
  },

  month: {
    name: 'month',
    table: 'sales',
    column: 'month'
  },

  regionId: {
    name: 'regionId',
    table: 'sales',
    column: 'regionId',
    displayName: 'regionName'  // Auto-join to regions.name
  },

  productId: {
    name: 'productId',
    table: 'sales',
    column: 'productId',
    displayName: 'productName'  // Auto-join to products.name
  }
};
```

### Step 4: Extract Measures ✅ COMPLETED

Extracted from `FactTableDefinition.measures`:

```typescript
const measures: MeasureRegistry = {
  salesAmount: {
    name: 'salesAmount',
    table: 'sales',
    column: 'amount',
    aggregation: 'sum',
    format: 'currency'
  },

  salesQuantity: {
    name: 'salesQuantity',
    table: 'sales',
    column: 'quantity',
    aggregation: 'sum',
    format: 'integer'
  },

  budgetAmount: {
    name: 'budgetAmount',
    table: 'budget',
    column: 'budgetAmount',
    aggregation: 'sum',
    format: 'currency'
  }
};
```

### Step 5: Update Metrics ✅ COMPLETED

**Before (Legacy):**
```typescript
{
  totalSalesAmount: {
    kind: "factMeasure",
    name: "totalSalesAmount",
    factTable: "sales",
    factColumn: "amount",
    format: "currency"
  }
}
```

**After (Current):**
```typescript
{
  totalSalesAmount: {
    kind: "simple",
    name: "totalSalesAmount",
    measure: "salesAmount"  // Reference to measure
  }
}
```

### Step 6: Update Query Calls ✅ COMPLETED

**Before (Legacy):**
```typescript
const result = runQuery(
  demoDb,
  demoFactTables,
  demoMetrics,
  demoTransforms,
  demoDimensionConfig,
  {
    rows: ['regionId', 'productId'],
    filters: { year: 2025, month: 2 },
    metrics: ['totalSalesAmount', 'totalBudget'],
    factForRows: 'sales'
  }
);
```

**After (Current):**
```typescript
const result = runQuery(
  demoDb,
  tableDefinitions,
  attributes,
  measures,
  demoMetrics,
  demoTransforms,
  {
    attributes: ['regionId', 'productId'],
    filters: { year: 2025, month: 2 },
    metrics: ['totalSalesAmount', 'totalBudget']
    // No factForRows needed!
  }
);
```

**Migration Complete:** All query calls have been updated to use the new API.

---

## Implementation Phases

### Phase 1: LINQ Integration (Non-Breaking) ✅ **COMPLETED**

**Goal:** Replace `RowSequence` with LINQ.js

**Changes:**
1. ✅ Remove `RowSequence` class (lines 10-71)
2. ✅ Import `Enumerable` from linq.js
3. ✅ Update `applyContextToFact` return type
4. ✅ Update metric expression signatures
5. ✅ Update `evaluateMetric` to use LINQ operators (no changes needed - compatible API)
6. ✅ Update `runQuery` grouping logic (no changes needed - compatible API)
7. ✅ Update all demo metrics

**Testing:**
- ✅ All existing queries produce identical results
- ✅ Performance equal or better (LINQ.js lazy evaluation)
- ✅ Created comprehensive test suite (11 test suites, 50+ test cases)
- ✅ Created TEST_PLAN.md documentation

**Estimated Effort:** 4-6 hours
**Actual Effort:** 4 hours

**Implementation Details:**

#### Code Changes

**Before (semanticEngine.ts lines 10-71):**
```typescript
export class RowSequence {
  private readonly rows: Row[];

  static from(rows: Row[]): RowSequence { ... }
  where(predicate: (row: Row) => boolean): RowSequence { ... }
  sum(selector: (row: Row) => number): number { ... }
  average(selector: (row: Row) => number): number | null { ... }
  count(): number { ... }
  groupBy(...): { toArray(): Array<...> } { ... }
  toArray(): Row[] { ... }
}
```

**After (semanticEngine.ts lines 1-7):**
```typescript
// This version uses LINQ.js for powerful, composable query operations.
// LINQ.js provides 100+ operators for filtering, projection, aggregation, and more.

import Enumerable from './linq.js';
```

**applyContextToFact signature change:**
```typescript
// Before
function applyContextToFact(
  rows: Row[],
  context: FilterContext,
  grain: string[]
): RowSequence

// After
function applyContextToFact(
  rows: Row[],
  context: FilterContext,
  grain: string[]
): Enumerable.IEnumerable<Row>
```

**ExpressionMetric signature change:**
```typescript
// Before
interface ExpressionMetric {
  expression: (q: RowSequence, db: InMemoryDb, context: FilterContext) => number | null;
}

// After
interface ExpressionMetric {
  expression: (rows: Enumerable.IEnumerable<Row>, db: InMemoryDb, context: FilterContext) => number | null;
}
```

**Demo metric update:**
```typescript
// Before
demoMetrics.pricePerUnit = {
  expression: (q: any) => {
    const amount = q.sum((r: Row) => Number(r.amount ?? 0));
    const qty = q.sum((r: Row) => Number(r.quantity ?? 0));
    return qty ? amount / qty : null;
  }
}

// After
demoMetrics.pricePerUnit = {
  expression: (rows: Enumerable.IEnumerable<Row>) => {
    const amount = rows.sum((r: Row) => Number(r.amount ?? 0));
    const qty = rows.sum((r: Row) => Number(r.quantity ?? 0));
    return qty ? amount / qty : null;
  }
}
```

#### API Compatibility

The following LINQ.js methods have identical signatures to RowSequence:
- `where(predicate)` - No changes needed
- `sum(selector)` - No changes needed
- `average(selector)` - Returns `number` (was `number | null`, but LINQ returns NaN for empty sets which we handle)
- `count()` - No changes needed
- `groupBy(keySelector, valueSelector)` - Returns `IEnumerable<IGrouping<TKey, TElement>>` with compatible `key()` method
- `toArray()` - No changes needed

This compatibility meant that most of the codebase required **zero changes** beyond the import and type signatures!

---

### Phase 2: Three-Layer Model (Breaking)

**Goal:** Implement unified table model with separate semantic layer

#### 2a. Storage Layer

**Changes:**
1. Merge `db.dimensions` and `db.facts` → `db.tables`
2. Create `TableDefinition` interface
3. Create `TableRegistry` type
4. Update `demoDb` structure

**Estimated Effort:** 2 hours

#### 2b. Semantic Layer

**Changes:**
1. Create `AttributeDefinition` interface
2. Create `MeasureDefinition` interface
3. Create `AttributeRegistry` and `MeasureRegistry` types
4. Extract attributes from dimension configs
5. Extract measures from fact table definitions
6. Implement attribute display name resolution

**Estimated Effort:** 4-6 hours

#### 2c. Metric Layer

**Changes:**
1. Add `SimpleMetric` type
2. Update `MetricDefinition` union
3. Update metric evaluation to resolve measures
4. Migrate existing metrics to new format

**Estimated Effort:** 3-4 hours

#### 2d. Query Engine

**Changes:**
1. Update `runQuery` signature
2. Remove `factForRows` logic
3. Implement automatic table determination
4. Update dimension enrichment logic
5. Add relationship traversal for display names

**Estimated Effort:** 6-8 hours

**Total Phase 2 Effort:** 15-20 hours

---

### Phase 3: Legacy API Removal (Breaking) ✅ **COMPLETED**

**Goal:** Remove all legacy API components and consolidate to single API

**Changes:**
1. ✅ Remove `FactMeasureMetric` interface (kind: "factMeasure")
2. ✅ Remove `FactTableRegistry` and `FactTableDefinition` interfaces
3. ✅ Remove `DimensionConfig` and `DimensionConfigEntry` interfaces
4. ✅ Remove `runQueryV2` function (consolidate into `runQuery`)
5. ✅ Remove `demoFactTables` - replaced with `demoMeasures`
6. ✅ Remove `demoDimensionConfig` - replaced with `demoAttributes`
7. ✅ Update all examples and demos to use new API only
8. ✅ Remove backward compatibility code

**Estimated Effort:** 4-6 hours
**Actual Effort:** 4 hours

**Validation:**
- All tests pass with new API only
- No references to legacy API in codebase
- Documentation updated to reflect new API

---

### Phase 4: Advanced Features (Future)

**Goal:** Leverage the new architecture for powerful features

**Status:** ⏳ Not yet implemented - available for future development

#### 4a. Derived Attributes

```typescript
attributes: {
  quantityBand: {
    name: 'quantityBand',
    table: 'sales',
    column: 'quantity',
    expression: (row) => row.quantity <= 5 ? 'Small' : 'Large'
  }
}
```

#### 4b. Auto-Join Resolution

```typescript
// Query can reference attributes from related tables
runQuery(db, ..., {
  attributes: ['productName', 'regionName'],  // Auto-join!
  metrics: ['revenue']
})
```

#### 4c. Cross-Table Metrics

```typescript
// Automatically join sales + budget when needed
runQuery(db, ..., {
  attributes: ['regionId'],
  metrics: ['revenue', 'budget', 'revenueVsBudgetPct']
})
```

#### 4d. Query Plan Visualization

```typescript
const plan = explainQuery(db, ..., options);
// Returns:
// {
//   tables: ['sales', 'products', 'regions'],
//   joins: [
//     { from: 'sales', to: 'products', on: ['productId'] },
//     { from: 'sales', to: 'regions', on: ['regionId'] }
//   ],
//   filters: { year: 2025 },
//   aggregations: { revenue: 'SUM(sales.amount)' }
// }
```

**Estimated Effort:** 10-15 hours

---

### Phase 5: Composable Query Engine (Planned)

**Goal:** Maximize composability through LINQ-style patterns for metrics, transforms, queries, and filters

**Status:** 📋 **PLANNED** - Detailed specification ready for implementation

**Breaking Changes:** Yes - this is a major architectural refactor that will change core APIs

**Motivation:**
The current architecture (Phases 1-3) established a solid foundation with LINQ.js integration and a three-layer model. However, several areas still use imperative, configuration-heavy patterns instead of the composable, functional style that LINQ exemplifies. Phase 5 addresses this by:
- Making queries first-class, reusable values (not just function calls)
- Unifying metrics behind a single functional interface (instead of tagged unions)
- Making transforms composable functions (stackable like LINQ operators)
- Giving filters an expression AST (instead of plain objects)
- Separating model definition from runtime (dependency injection)
- Providing DSL helpers for common patterns (reduce boilerplate)

**Implementation Priority:**
1. **High Priority (Core Composability):** 5a, 5b, 5c - Foundation for all improvements
2. **Medium Priority (Developer Experience):** 5d, 5f - Make the API ergonomic
3. **Lower Priority (Advanced Features):** 5e, 5g - Nice-to-have enhancements

---

#### 5a. Query Builder Pattern (High Priority)

**Goal:** Make query descriptions first-class, reusable values

**Current Problem:**
```typescript
// Queries are one-shot function calls with many parameters
const result = runQuery(
  db, tableRegistry, attributeRegistry, measureRegistry,
  metricRegistry, transforms,
  {
    attributes: ['regionId', 'productId'],
    filters: { year: 2025, month: 2 },
    metrics: ['revenue', 'budget']
  }
);

// Can't reuse or compose queries
// Can't build queries incrementally
// Can't create "base" queries and extend them
```

**Proposed Solution:**
```typescript
// Query builder pattern with fluent API
const engine = createEngine({
  db,
  tables: demoTableDefinitions,
  attributes: demoAttributes,
  measures: demoMeasures,
  metrics: demoMetrics,
  transforms: demoTransforms,
});

// Build queries incrementally
const base2025 = engine.query()
  .where({ year: 2025 });

// Extend and reuse
const feb2025ByRegionProduct = base2025
  .addAttributes('regionId', 'productId')
  .addMetrics('revenue', 'budget', 'salesVsBudgetPct')
  .where({ month: 2 })
  .run();

// Create CTE-style reusable partials
const naSales = base2025.where({ regionId: 'NA' });
const euSales = base2025.where({ regionId: 'EU' });
```

**New Types:**
```typescript
export type QuerySpec = {
  attributes: string[];
  metrics: string[];
  filters?: FilterContext;
};

export interface QueryBuilder {
  addAttributes(...attrs: string[]): QueryBuilder;
  addMetrics(...metrics: string[]): QueryBuilder;
  where(partial: FilterContext): QueryBuilder;
  build(): QuerySpec;
  run(): Row[];
}
```

**Implementation Steps:**
1. Create `QueryBuilder` class with fluent API
2. Implement immutable builder pattern (each method returns new instance)
3. Create `Engine` interface with `query()` factory method
4. Update `runQuery` to accept `QuerySpec` internally
5. Add helper methods: `forMetric(name)`, `byAttributes(...attrs)`

**Benefits:**
- Reusable query fragments (DRY principle)
- Incremental query construction
- CTE-style composition
- Clean separation of query definition from execution
- Easy to add helper methods later

**Estimated Effort:** 6-8 hours

---

#### 5b. Metric Combinators (High Priority)

**Goal:** Unify all metric types behind a single functional interface

**Current Problem:**
```typescript
// Metrics are a tagged union with 4 different kinds
type MetricDefinition =
  | SimpleMetric         // kind: 'simple'
  | ExpressionMetric     // kind: 'expression'
  | DerivedMetric        // kind: 'derived'
  | ContextTransformMetric  // kind: 'contextTransform'

// Switch statements everywhere
if (def.kind === 'simple') { ... }
else if (def.kind === 'expression') { ... }
else if (def.kind === 'derived') { ... }
else if (def.kind === 'contextTransform') { ... }

// Hard to add new metric types
// Can't compose metrics functionally
// No higher-order metric builders
```

**Proposed Solution:**
```typescript
// Unified metric interface
export type MetricContext = {
  filter: FilterContext;
  grain: string[];
  db: InMemoryDb;
};

export type MetricEval = (ctx: MetricContext) => number | null;

export type MetricDef = {
  name: string;
  eval: MetricEval;          // The actual computation
  deps?: string[];           // Names of dependent metrics
  description?: string;
  format?: string;
};

// Constructor functions for each metric type
export const simpleMetric = (opts: {
  name: string;
  measure: string;
  grain?: string[];
}): MetricDef => ({
  name: opts.name,
  eval: (ctx) => evaluateMeasure(opts.measure, ctx),
  description: `Simple metric wrapping ${opts.measure}`,
});

export const derivedMetric = (opts: {
  name: string;
  deps: string[];
  combine: (values: Record<string, number | null>) => number | null;
}): MetricDef => ({
  name: opts.name,
  deps: opts.deps,
  eval: (ctx) => {
    const depValues = evaluateDependencies(opts.deps, ctx);
    return opts.combine(depValues);
  },
});

export const contextTransformMetric = (opts: {
  name: string;
  baseMetric: string;
  transform: ContextTransform;
}): MetricDef => ({
  name: opts.name,
  deps: [opts.baseMetric],
  eval: (ctx) => evaluateMetric(opts.baseMetric, opts.transform(ctx)),
});

export const expressionMetric = (opts: {
  name: string;
  table: string;
  grain?: string[];
  expression: (rows: Enumerable.IEnumerable<Row>, ctx: MetricContext) => number | null;
}): MetricDef => ({
  name: opts.name,
  eval: (ctx) => {
    const rows = db.tables[opts.table];
    const grain = opts.grain ?? Object.keys(rows[0] || {});
    const filtered = applyContextToFact(rows, ctx.filter, grain);
    return opts.expression(filtered, ctx);
  },
});
```

**Usage Example:**
```typescript
const metrics: MetricRegistry = {
  revenue: simpleMetric({
    name: 'revenue',
    measure: 'salesAmount'
  }),

  salesVsBudgetPct: derivedMetric({
    name: 'salesVsBudgetPct',
    deps: ['revenue', 'budget'],
    combine: ({ revenue, budget }) =>
      budget ? (revenue! / budget) * 100 : null,
  }),

  revenueYTD: contextTransformMetric({
    name: 'revenueYTD',
    baseMetric: 'revenue',
    transform: transforms.ytd,
  }),
};
```

**Higher-Order Helpers:**
```typescript
// Generate YTD metric for any base metric
export const makeYtdMetric = (baseName: string): MetricDef =>
  contextTransformMetric({
    name: `${baseName}YTD`,
    baseMetric: baseName,
    transform: transforms.ytd,
  });

// Generate YoY metric
export const makeYoYMetric = (baseName: string): MetricDef =>
  derivedMetric({
    name: `${baseName}YoY`,
    deps: [baseName, `${baseName}LastYear`],
    combine: ({ [baseName]: current, [`${baseName}LastYear`]: prior }) =>
      prior ? ((current! - prior) / prior) * 100 : null,
  });

// Usage
const revenueYTD = makeYtdMetric('revenue');
const revenueYoY = makeYoYMetric('revenue');
```

**Implementation Steps:**
1. Define new `MetricContext` and `MetricEval` types
2. Create constructor functions for each metric type
3. Implement `evaluateMeasure` and `evaluateDependencies` helpers
4. Update `evaluateMetric` to work with new unified interface
5. Migrate existing metrics to new format
6. Add higher-order helpers (`makeYtdMetric`, `makeYoYMetric`, etc.)
7. Remove old tagged union types

**Benefits:**
- Single evaluation path (no switch statements)
- First-class functions enable composition
- Higher-order metric builders (DRY)
- Easy to add new metric patterns
- Functional programming style

**Estimated Effort:** 10-12 hours

---

#### 5c. Composable Context Transforms (High Priority)

**Goal:** Make time-intelligence transforms stackable and composable

**Current Problem:**
```typescript
// Transforms are defined but not composable
const transforms = {
  ytd(ctx) { ... },
  lastYear(ctx) { ... },
  ytdLastYear(ctx) { ... },  // Duplicates ytd + lastYear logic!
};

// Can't stack transforms
// Can't compose them functionally
// Have to manually create combined transforms
```

**Proposed Solution:**
```typescript
export type ContextTransform = (ctx: MetricContext) => MetricContext;

// Composition helper
const composeTransforms =
  (...ts: ContextTransform[]): ContextTransform =>
  (ctx) => ts.reduce((acc, t) => t(acc), ctx);

// Base transforms
const ytd: ContextTransform = (ctx) => {
  if (ctx.filter.year == null || ctx.filter.month == null) return ctx;
  return {
    ...ctx,
    filter: { ...ctx.filter, month: { lte: Number(ctx.filter.month) } }
  };
};

const lastYear: ContextTransform = (ctx) => {
  if (ctx.filter.year == null) return ctx;
  return {
    ...ctx,
    filter: { ...ctx.filter, year: Number(ctx.filter.year) - 1 }
  };
};

const priorMonth: ContextTransform = (ctx) => {
  if (ctx.filter.month == null) return ctx;
  return {
    ...ctx,
    filter: { ...ctx.filter, month: Number(ctx.filter.month) - 1 }
  };
};

// Composed transforms
const transforms = {
  ytd,
  lastYear,
  priorMonth,
  ytdLastYear: composeTransforms(ytd, lastYear),
  priorMonthLastYear: composeTransforms(priorMonth, lastYear),
};
```

**Metric Usage:**
```typescript
// Stack transforms declaratively
const metrics: MetricRegistry = {
  revenueYTD: contextTransformMetric({
    name: 'revenueYTD',
    baseMetric: 'revenue',
    transform: transforms.ytd,
  }),

  revenueYTDLastYear: contextTransformMetric({
    name: 'revenueYTDLastYear',
    baseMetric: 'revenue',
    transform: transforms.ytdLastYear,  // Composed!
  }),

  // Or compose inline
  revenuePriorMonthLastYear: contextTransformMetric({
    name: 'revenuePriorMonthLastYear',
    baseMetric: 'revenue',
    transform: composeTransforms(priorMonth, lastYear),
  }),
};
```

**Advanced Patterns:**
```typescript
// Parameterized transforms
const shiftYear = (offset: number): ContextTransform =>
  (ctx) => ({
    ...ctx,
    filter: { ...ctx.filter, year: Number(ctx.filter.year) + offset }
  });

const shiftMonth = (offset: number): ContextTransform =>
  (ctx) => ({
    ...ctx,
    filter: { ...ctx.filter, month: Number(ctx.filter.month) + offset }
  });

// Rolling window transform
const rollingMonths = (count: number): ContextTransform =>
  (ctx) => {
    if (ctx.filter.month == null) return ctx;
    const currentMonth = Number(ctx.filter.month);
    return {
      ...ctx,
      filter: {
        ...ctx.filter,
        month: { gte: currentMonth - count + 1, lte: currentMonth }
      }
    };
  };

// Usage
const revenue3MonthRolling = contextTransformMetric({
  name: 'revenue3MonthRolling',
  baseMetric: 'revenue',
  transform: rollingMonths(3),
});
```

**Implementation Steps:**
1. Update `ContextTransform` type to work with `MetricContext`
2. Implement `composeTransforms` utility
3. Refactor existing transforms to be pure functions
4. Create parameterized transform builders
5. Add library of common transforms (rolling windows, shifts, etc.)
6. Update documentation with composition examples

**Benefits:**
- DRY: No duplicate logic for combined transforms
- Composable: Stack transforms like LINQ operators
- Parameterized: Create transform families (`shiftMonth(n)`)
- Reusable: Build library of transform patterns
- Testable: Each transform is a pure function

**Estimated Effort:** 4-6 hours

---

#### 5d. Filter Expression Language (Medium Priority)

**Goal:** Give filters an AST for composition and reuse

**Current Problem:**
```typescript
// Filters are plain objects - limited expressiveness
filters: {
  year: 2025,
  month: { lte: 6 },
  amount: { from: 100, to: 500 }
}

// Can't express OR conditions
// Can't compose/merge filters cleanly
// Can't nest complex logic
// No AND/OR/NOT operators
```

**Proposed Solution:**
```typescript
// Filter expression AST
type ScalarOp = 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'in';

interface FilterExpression {
  kind: 'expression';
  field: string;
  op: ScalarOp;
  value: any;
  value2?: any;       // for 'between'
}

interface FilterConjunction {
  kind: 'and' | 'or';
  filters: Filter[];
}

interface FilterNegation {
  kind: 'not';
  filter: Filter;
}

type Filter = FilterExpression | FilterConjunction | FilterNegation;

// Builder API
const f = {
  eq: (field: string, value: any): FilterExpression =>
    ({ kind: 'expression', field, op: 'eq', value }),

  lt: (field: string, value: any): FilterExpression =>
    ({ kind: 'expression', field, op: 'lt', value }),

  lte: (field: string, value: any): FilterExpression =>
    ({ kind: 'expression', field, op: 'lte', value }),

  gt: (field: string, value: any): FilterExpression =>
    ({ kind: 'expression', field, op: 'gt', value }),

  gte: (field: string, value: any): FilterExpression =>
    ({ kind: 'expression', field, op: 'gte', value }),

  between: (field: string, from: any, to: any): FilterExpression =>
    ({ kind: 'expression', field, op: 'between', value: from, value2: to }),

  in: (field: string, values: any[]): FilterExpression =>
    ({ kind: 'expression', field, op: 'in', value: values }),

  and: (...filters: Filter[]): FilterConjunction =>
    ({ kind: 'and', filters }),

  or: (...filters: Filter[]): FilterConjunction =>
    ({ kind: 'or', filters }),

  not: (filter: Filter): FilterNegation =>
    ({ kind: 'not', filter }),
};
```

**Usage Examples:**
```typescript
// Simple equality
const filter1 = f.eq('year', 2025);

// Range
const filter2 = f.between('amount', 100, 500);

// AND conjunction
const filter3 = f.and(
  f.eq('year', 2025),
  f.lte('month', 6)
);

// OR conjunction
const filter4 = f.or(
  f.eq('regionId', 'NA'),
  f.eq('regionId', 'EU')
);

// Complex nested logic
const validSales = f.and(
  f.eq('year', 2025),
  f.between('amount', 100, 1000),
  f.or(
    f.eq('regionId', 'NA'),
    f.eq('regionId', 'EU')
  ),
  f.not(f.eq('status', 'cancelled'))
);

// Reusable filter fragments
const baseFilter = f.and(
  f.eq('year', 2025),
  f.between('amount', 100, 500)
);

const naFilter = f.and(
  baseFilter,
  f.eq('regionId', 'NA')
);

const euFilter = f.and(
  baseFilter,
  f.eq('regionId', 'EU')
);
```

**Integration with Query Builder:**
```typescript
// Use in queries
const result = engine.query()
  .where(f.and(
    f.eq('year', 2025),
    f.lte('month', 6)
  ))
  .addAttributes('regionId')
  .addMetrics('revenue')
  .run();
```

**Internal Compilation:**
```typescript
// Compile filter AST to LINQ predicate
function compileFilter(filter: Filter): (row: Row) => boolean {
  switch (filter.kind) {
    case 'expression':
      return (row) => evaluateExpression(row, filter);

    case 'and':
      const andPredicates = filter.filters.map(compileFilter);
      return (row) => andPredicates.every(p => p(row));

    case 'or':
      const orPredicates = filter.filters.map(compileFilter);
      return (row) => orPredicates.some(p => p(row));

    case 'not':
      const notPredicate = compileFilter(filter.filter);
      return (row) => !notPredicate(row);
  }
}

// Use in applyContextToFact
function applyFilter(
  rows: Enumerable.IEnumerable<Row>,
  filter: Filter
): Enumerable.IEnumerable<Row> {
  const predicate = compileFilter(filter);
  return rows.where(predicate);
}
```

**Implementation Steps:**
1. Define filter AST types
2. Create builder API (`f.*` functions)
3. Implement `compileFilter` function
4. Update `applyContextToFact` to accept Filter AST
5. Maintain backward compatibility with plain object filters
6. Add filter optimization rules (e.g., merge adjacent conditions)
7. Update query builder to accept filters

**Benefits:**
- Expressiveness: AND/OR/NOT logic
- Composability: Merge and extend filters
- Reusability: Define base filters, extend them
- Type-safe: AST provides structure
- Optimizable: Can add pushdown/optimization later

**Estimated Effort:** 8-10 hours

---

#### 5e. Model/Engine Separation (Medium Priority)

**Goal:** Separate semantic model definition from query engine runtime

**Current Problem:**
```typescript
// Pass all registries to every query call
const result = runQuery(
  db,
  tableRegistry,
  attributeRegistry,
  measureRegistry,
  metricRegistry,
  transforms,
  options
);

// Repetitive, error-prone
// Can't have multiple models easily
// No extension points
// Tight coupling
```

**Proposed Solution:**
```typescript
// Semantic model bundles all registries
export type SemanticModel = {
  tables: TableRegistry;
  attributes: AttributeRegistry;
  measures: MeasureRegistry;
  metrics: MetricRegistry;
  transforms: ContextTransformsRegistry;
};

// Engine created from model and data
export function createEngine(
  db: InMemoryDb,
  model: SemanticModel
): Engine {
  return {
    query(): QueryBuilder {
      return new QueryBuilderImpl(db, model);
    },

    getMetric(name: string): MetricDef | undefined {
      return model.metrics[name];
    },

    listMetrics(): MetricDef[] {
      return Object.values(model.metrics);
    },

    getMeasure(name: string): MeasureDefinition | undefined {
      return model.measures[name];
    },

    getAttribute(name: string): AttributeDefinition | undefined {
      return model.attributes[name];
    },

    extend(partial: Partial<SemanticModel>): Engine {
      return createEngine(db, {
        ...model,
        ...partial,
        // Deep merge registries
        metrics: { ...model.metrics, ...partial.metrics },
        measures: { ...model.measures, ...partial.measures },
        attributes: { ...model.attributes, ...partial.attributes },
        transforms: { ...model.transforms, ...partial.transforms },
      });
    },
  };
}

export interface Engine {
  query(): QueryBuilder;
  getMetric(name: string): MetricDef | undefined;
  listMetrics(): MetricDef[];
  getMeasure(name: string): MeasureDefinition | undefined;
  getAttribute(name: string): AttributeDefinition | undefined;
  extend(partial: Partial<SemanticModel>): Engine;
}
```

**Usage Examples:**
```typescript
// Define model once
const salesModel: SemanticModel = {
  tables: demoTableDefinitions,
  attributes: demoAttributes,
  measures: demoMeasures,
  metrics: demoMetrics,
  transforms: demoTransforms,
};

// Create engine
const engine = createEngine(demoDb, salesModel);

// Use engine
const result = engine.query()
  .where({ year: 2025 })
  .addAttributes('regionId')
  .addMetrics('revenue')
  .run();

// Extend for specific use cases
const compensationModel = engine.extend({
  metrics: {
    ...compensationMetrics,
  },
  measures: {
    ...compensationMeasures,
  },
});

// Multiple models over same DB
const salesEngine = createEngine(db, salesModel);
const hrEngine = createEngine(db, hrModel);
```

**Implementation Steps:**
1. Define `SemanticModel` type
2. Define `Engine` interface
3. Implement `createEngine` factory function
4. Implement `Engine.extend()` for composition
5. Update `QueryBuilder` to receive engine in constructor
6. Migrate all demos to use engine pattern
7. Update documentation

**Benefits:**
- Dependency injection: Model is explicit parameter
- Multiple models: Different views over same data
- Extension: `extend()` enables composition
- Reusability: Inject same model in different contexts
- Testability: Easy to mock models

**Estimated Effort:** 6-8 hours

---

#### 5f. DSL Helpers for Definitions (Medium Priority)

**Goal:** Reduce boilerplate with builder helpers

**Current Problem:**
```typescript
// Verbose attribute definitions
const attributes: AttributeRegistry = {
  regionId: {
    name: 'regionId',
    table: 'sales',
    column: 'regionId',
    description: 'Region identifier'
  },
  productId: {
    name: 'productId',
    table: 'sales',
    column: 'productId',
    description: 'Product identifier'
  }
};

// Repetitive patterns
// Column name usually matches attribute name
// Common patterns not captured
```

**Proposed Solution:**
```typescript
// Attribute builders
const attr = {
  id: (opts: {
    name: string;
    table: string;
    column?: string;
    description?: string;
    displayName?: string;
  }): AttributeDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,  // Default: column = name
    description: opts.description,
    displayName: opts.displayName,
  }),

  derived: (opts: {
    name: string;
    table: string;
    column: string;
    expression: (row: Row) => any;
    description?: string;
  }): AttributeDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column,
    expression: opts.expression,
    description: opts.description,
  }),

  formatted: (opts: {
    name: string;
    table: string;
    column: string;
    format: (value: any) => string;
    description?: string;
  }): AttributeDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column,
    format: opts.format,
    description: opts.description,
  }),
};

// Measure builders
const measure = {
  sum: (opts: {
    name: string;
    table: string;
    column?: string;
    format?: string;
    description?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    aggregation: 'sum',
    format: opts.format,
    description: opts.description,
  }),

  avg: (opts: {
    name: string;
    table: string;
    column?: string;
    format?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    aggregation: 'avg',
    format: opts.format,
  }),

  count: (opts: {
    name: string;
    table: string;
    description?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: 'id',  // Arbitrary column for counting
    aggregation: 'count',
    format: 'integer',
    description: opts.description,
  }),

  min: (opts: {
    name: string;
    table: string;
    column?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    aggregation: 'min',
  }),

  max: (opts: {
    name: string;
    table: string;
    column?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    aggregation: 'max',
  }),
};

// Metric builders (already covered in 5b, but adding here for completeness)
const metric = {
  simple: simpleMetric,
  derived: derivedMetric,
  expression: expressionMetric,
  transform: contextTransformMetric,
  ytd: makeYtdMetric,
  yoy: makeYoYMetric,
};
```

**Usage Examples:**
```typescript
// Concise attribute definitions
const attributes: AttributeRegistry = {
  regionId: attr.id({
    name: 'regionId',
    table: 'sales',
    displayName: 'regionName',
  }),

  productId: attr.id({
    name: 'productId',
    table: 'sales',
    displayName: 'productName',
  }),

  quantityBand: attr.derived({
    name: 'quantityBand',
    table: 'sales',
    column: 'quantity',
    expression: (row) => {
      const q = row.quantity;
      if (q <= 5) return 'Small';
      if (q <= 10) return 'Medium';
      return 'Large';
    },
  }),

  monthName: attr.formatted({
    name: 'monthName',
    table: 'sales',
    column: 'month',
    format: (m) => ['Jan', 'Feb', 'Mar', '...'][m - 1],
  }),
};

// Concise measure definitions
const measures: MeasureRegistry = {
  salesAmount: measure.sum({
    name: 'salesAmount',
    table: 'sales',
    column: 'amount',
    format: 'currency',
  }),

  avgOrderSize: measure.avg({
    name: 'avgOrderSize',
    table: 'sales',
    column: 'amount',
    format: 'currency',
  }),

  orderCount: measure.count({
    name: 'orderCount',
    table: 'sales',
  }),
};

// Concise metric definitions
const metrics: MetricRegistry = {
  revenue: metric.simple({
    name: 'revenue',
    measure: 'salesAmount',
  }),

  revenueYTD: metric.ytd('revenue'),
  revenueYoY: metric.yoy('revenue'),

  salesVsBudgetPct: metric.derived({
    name: 'salesVsBudgetPct',
    deps: ['revenue', 'budget'],
    combine: ({ revenue, budget }) =>
      budget ? (revenue! / budget) * 100 : null,
  }),
};
```

**Implementation Steps:**
1. Create `attr` builder namespace
2. Create `measure` builder namespace
3. Create `metric` builder namespace (extends 5b)
4. Add validation helpers (check column exists in table)
5. Migrate demo definitions to use builders
6. Update documentation with examples

**Benefits:**
- Less boilerplate (column defaults to name)
- Reusable patterns (sum, avg, count)
- Type-safe (builders enforce structure)
- Discoverable (IDE autocomplete)
- Extensible (add custom builders)

**Estimated Effort:** 4-6 hours

---

#### 5g. Composition Testing (Lower Priority)

**Goal:** Add tests that exercise composability, not just individual features

**Current Problem:**
```typescript
// Current tests focus on individual features
test('simple metric evaluation', () => { ... });
test('derived metric evaluation', () => { ... });
test('YTD transform', () => { ... });

// Missing: tests that compose multiple features
// Missing: tests that verify composition equivalence
// Missing: tests for builder patterns
```

**Proposed Test Categories:**

**1. Transform Composition Tests:**
```typescript
describe('Transform Composition', () => {
  it('should compose ytd and lastYear transforms', () => {
    const ytdLastYear = composeTransforms(ytd, lastYear);

    // Manual equivalent
    const manual = (ctx) => lastYear(ytd(ctx));

    const ctx = { filter: { year: 2025, month: 6 } };
    expect(ytdLastYear(ctx)).toEqual(manual(ctx));
    expect(ytdLastYear(ctx)).toEqual({
      filter: { year: 2024, month: { lte: 6 } }
    });
  });

  it('should support stacking multiple transforms', () => {
    const stacked = composeTransforms(
      ytd,
      lastYear,
      shiftMonth(-1)
    );

    const ctx = { filter: { year: 2025, month: 6 } };
    const result = stacked(ctx);

    expect(result.filter.year).toBe(2024);
    expect(result.filter.month).toEqual({ lte: 5 });
  });
});
```

**2. Query Builder Composition Tests:**
```typescript
describe('Query Builder Composition', () => {
  it('should reuse base queries', () => {
    const base = engine.query().where({ year: 2025 });

    const q1 = base.addAttributes('regionId').addMetrics('revenue').run();
    const q2 = base.addAttributes('productId').addMetrics('budget').run();

    // Base query unchanged
    expect(base.build().filters).toEqual({ year: 2025 });
  });

  it('should support CTE-style composition', () => {
    const base2025 = engine.query().where({ year: 2025 });
    const naSales = base2025.where({ regionId: 'NA' });
    const euSales = base2025.where({ regionId: 'EU' });

    const naResult = naSales.addMetrics('revenue').run();
    const euResult = euSales.addMetrics('revenue').run();

    // Results should only include their respective regions
    expect(naResult.every(r => r.regionId === 'NA')).toBe(true);
    expect(euResult.every(r => r.regionId === 'EU')).toBe(true);
  });

  it('should produce equivalent results for composed vs inline queries', () => {
    const composed = engine.query()
      .where({ year: 2025 })
      .addAttributes('regionId')
      .addMetrics('revenue')
      .run();

    const inline = engine.query()
      .where({ year: 2025 })
      .addAttributes('regionId')
      .addMetrics('revenue')
      .run();

    expect(composed).toEqual(inline);
  });
});
```

**3. Metric Combinator Tests:**
```typescript
describe('Metric Combinators', () => {
  it('should evaluate simple metrics', () => {
    const revenue = simpleMetric({
      name: 'revenue',
      measure: 'salesAmount'
    });

    const ctx = {
      filter: { year: 2025 },
      grain: ['year', 'month', 'regionId', 'productId'],
      db: demoDb
    };

    const result = revenue.eval(ctx);
    expect(result).toBeGreaterThan(0);
  });

  it('should support higher-order metric builders', () => {
    const revenueYTD = makeYtdMetric('revenue');
    const revenueYoY = makeYoYMetric('revenue');

    expect(revenueYTD.name).toBe('revenueYTD');
    expect(revenueYoY.name).toBe('revenueYoY');
    expect(revenueYTD.deps).toEqual(['revenue']);
  });
});
```

**4. Filter Composition Tests:**
```typescript
describe('Filter Composition', () => {
  it('should merge AND filters', () => {
    const baseFilter = f.and(
      f.eq('year', 2025),
      f.between('amount', 100, 500)
    );

    const naFilter = f.and(
      baseFilter,
      f.eq('regionId', 'NA')
    );

    // naFilter should include all base conditions plus region
    expect(naFilter.kind).toBe('and');
    expect(naFilter.filters.length).toBe(2);
  });

  it('should support OR conditions', () => {
    const regionFilter = f.or(
      f.eq('regionId', 'NA'),
      f.eq('regionId', 'EU')
    );

    const rows = demoDb.tables.sales.filter(
      compileFilter(regionFilter)
    );

    expect(rows.every(r => ['NA', 'EU'].includes(r.regionId))).toBe(true);
  });
});
```

**5. End-to-End Composition Tests:**
```typescript
describe('End-to-End Composition', () => {
  it('should compose query builder + filters + metrics + transforms', () => {
    // Define reusable components
    const base2025Filter = f.eq('year', 2025);
    const ytdFilter = f.lte('month', 6);
    const highValueFilter = f.gte('amount', 1000);

    const revenueYTD = makeYtdMetric('revenue');

    // Compose them
    const result = engine.query()
      .where(f.and(base2025Filter, ytdFilter, highValueFilter))
      .addAttributes('regionId')
      .addMetrics('revenue', revenueYTD.name)
      .run();

    // Verify composition
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('regionId');
    expect(result[0]).toHaveProperty('revenue');
    expect(result[0]).toHaveProperty('revenueYTD');
  });
});
```

**Implementation Steps:**
1. Create new test file: `semanticEngine.composition.test.js`
2. Add transform composition tests
3. Add query builder composition tests
4. Add metric combinator tests
5. Add filter composition tests
6. Add end-to-end integration tests
7. Update TEST_PLAN.md with composition test coverage

**Benefits:**
- Verify composition equivalence
- Catch composition bugs early
- Document composition patterns
- Ensure reusable components work together
- Guide API design with use cases

**Estimated Effort:** 6-8 hours

---

### Phase 5 Summary

**Total Estimated Effort:** 44-58 hours (roughly 1-1.5 weeks of full-time work)

**Implementation Order:**
1. **5e. Model/Engine Separation** (6-8h) - Foundation for everything else
2. **5a. Query Builder Pattern** (6-8h) - Core UX improvement
3. **5c. Composable Transforms** (4-6h) - Quick win, builds on existing
4. **5b. Metric Combinators** (10-12h) - Largest refactor, most impactful
5. **5f. DSL Helpers** (4-6h) - Polish after core is done
6. **5d. Filter Expression Language** (8-10h) - Advanced feature
7. **5g. Composition Testing** (6-8h) - Continuous throughout

**Breaking Changes:**
- `runQuery` function signature changes (replaced with engine.query())
- Metric types unified (tagged union → functional interface)
- Filter context may accept AST instead of plain objects
- Transform signatures updated to accept `MetricContext`

**Backward Compatibility Strategy:**
- Provide adapter layer for old `runQuery` calls
- Support both plain objects and filter AST initially
- Deprecation warnings for old patterns
- Migration guide with examples

**Success Criteria:**
- ✅ Query builder enables incremental, reusable queries
- ✅ All metric types unified behind single eval interface
- ✅ Transforms composable with `composeTransforms`
- ✅ Filters support AND/OR/NOT logic
- ✅ Model separated from engine runtime
- ✅ DSL helpers reduce boilerplate by 30%+
- ✅ Composition tests pass for all patterns
- ✅ Documentation updated with new patterns

---

## Examples

### Example 1: Same Column, Multiple Roles

**Setup:**
```typescript
// Quantity as an attribute (for bucketing)
attributes: {
  quantityBand: {
    name: 'quantityBand',
    table: 'sales',
    column: 'quantity',
    expression: (row) => {
      if (row.quantity <= 5) return 'Small (1-5)';
      if (row.quantity <= 10) return 'Medium (6-10)';
      return 'Large (10+)';
    }
  }
}

// Quantity as measures (for aggregation)
measures: {
  totalQuantity: {
    name: 'totalQuantity',
    table: 'sales',
    column: 'quantity',
    aggregation: 'sum'
  },

  avgQuantity: {
    name: 'avgQuantity',
    table: 'sales',
    column: 'quantity',
    aggregation: 'avg'
  }
}
```

**Query:**
```typescript
runQuery(db, ..., {
  attributes: ['quantityBand'],
  metrics: ['totalQuantity', 'avgQuantity', 'revenue']
})
```

**Result:**
```javascript
[
  {
    quantityBand: 'Small (1-5)',
    totalQuantity: 15,
    avgQuantity: 3.75,
    revenue: '$1,200.00'
  },
  {
    quantityBand: 'Medium (6-10)',
    totalQuantity: 40,
    avgQuantity: 8.0,
    revenue: '$4,500.00'
  }
]
```

---

### Example 2: LINQ Composition

**Complex Metric with LINQ:**
```typescript
metrics: {
  top3ProductsRevenue: {
    kind: 'expression',
    name: 'top3ProductsRevenue',
    table: 'sales',
    expression: (filteredRows, db, context) => {
      // Get top 3 products by revenue in this context
      const top3Products = Enumerable.from(filteredRows)
        .groupBy(r => r.productId)
        .select(g => ({
          productId: g.key(),
          revenue: g.sum(r => r.amount)
        }))
        .orderByDescending(p => p.revenue)
        .take(3)
        .select(p => p.productId)
        .toArray();

      // Sum revenue only from those products
      return Enumerable.from(filteredRows)
        .where(r => top3Products.includes(r.productId))
        .sum(r => r.amount);
    },
    format: 'currency'
  }
}
```

---

### Example 3: Cross-Table Query

**Query spanning multiple tables:**
```typescript
runQuery(db, ..., {
  attributes: ['productName', 'regionName'],  // From different tables!
  metrics: ['revenue', 'budget', 'variance'],
  filters: { year: 2025 }
})
```

**How it works:**
1. Engine sees `productName` attribute → needs `products` table
2. Engine sees `regionName` attribute → needs `regions` table
3. Engine sees `revenue` metric → needs `sales` table
4. Engine sees `budget` metric → needs `budget` table
5. Engine determines join path:
   - `sales` JOIN `products` ON `sales.productId = products.productId`
   - `sales` JOIN `regions` ON `sales.regionId = regions.regionId`
   - `sales` JOIN `budget` ON `sales.year = budget.year AND sales.regionId = budget.regionId`
6. Execute unified query with LINQ

---

### Example 4: Reusable Filter Fragments

**Define composable filters:**
```typescript
const filters = {
  inYear: (year: number) =>
    (seq: Enumerable.IEnumerable<Row>) =>
      seq.where(r => r.year === year),

  inRegion: (region: string) =>
    (seq: Enumerable.IEnumerable<Row>) =>
      seq.where(r => r.regionId === region),

  ytd: (month: number) =>
    (seq: Enumerable.IEnumerable<Row>) =>
      seq.where(r => r.month <= month),

  highValue: (threshold: number) =>
    (seq: Enumerable.IEnumerable<Row>) =>
      seq.where(r => r.amount >= threshold)
};

// Compose them
const naSales2025YTD = filters.ytd(6)(
  filters.inRegion('NA')(
    filters.inYear(2025)(
      Enumerable.from(db.tables.sales)
    )
  )
);

// Or use pipe style
const result = Enumerable.from(db.tables.sales)
  .letBind(filters.inYear(2025))
  .letBind(filters.inRegion('NA'))
  .letBind(filters.ytd(6))
  .sum(r => r.amount);
```

---

## Benefits & Tradeoffs

### Benefits

#### 1. **Flexibility**
- Same column can be attribute, measure, or both
- No artificial dimension/fact separation
- Supports real-world modeling scenarios

#### 2. **Clarity**
- Clear separation: storage, semantics, business logic
- Single source of truth for each concept
- Self-documenting metadata

#### 3. **Composability**
- LINQ operators enable declarative queries
- Reusable query fragments
- Type-safe transformations

#### 4. **MicroStrategy Alignment**
- Attributes define slicing dimensions
- Measures define aggregations
- Metrics add business logic
- Automatic join resolution

#### 5. **Developer Experience**
- 100+ LINQ operators vs. 6 custom methods
- Lazy evaluation for performance
- Rich ecosystem (documentation, examples)
- Type-safe with TypeScript

#### 6. **Maintainability**
- Remove custom code (RowSequence)
- Leverage battle-tested library
- Easier to onboard new developers

### Tradeoffs

#### 1. **Breaking Changes** ✅ MITIGATED
- Phase 2 & 3 required API migration
- Existing queries needed updates
- Database structure changes

**Mitigation Applied:**
- Comprehensive migration guide provided and executed
- All migrations completed successfully
- Documentation updated

#### 2. **Complexity**
- Three layers vs. two
- More registries to manage
- Steeper learning curve initially

**Mitigation Applied:**
- Clear documentation with examples
- Phase-by-phase implementation
- Comprehensive test suite

**Current Status:** Complexity is offset by improved clarity and separation of concerns.

#### 3. **Performance**
- LINQ lazy evaluation overhead (minimal)
- Auto-join resolution overhead (deferred to Phase 4)

**Current Status:** LINQ.js is highly optimized; no performance degradation observed. Auto-join optimization deferred to future phase.

#### 4. **Bundle Size**
- linq.js adds ~50KB minified
- Removed custom RowSequence (~1KB)

**Current Status:** Acceptable tradeoff for 100+ operators and battle-tested library. Tree-shaking available for optimization.

---

## Open Questions (Resolved/Deferred)

1. **Auto-Join Algorithm:** ✅ DEFERRED to Phase 4 - Current implementation requires metrics to specify their source table; automatic join path resolution is a future enhancement.

2. **Attribute Display Names:** ✅ RESOLVED - Display name resolution is automatic via relationships defined in TableRegistry.

3. **Backward Compatibility:** ✅ RESOLVED - Full migration completed; backward compatibility layer removed in Phase 3.

4. **Grain Inference:** ✅ RESOLVED - Grain is explicit in metric definitions (optional `grain` property).

5. **Cross-Table Metrics:** ✅ DEFERRED to Phase 4 - Basic support exists (metrics specify their table); advanced cross-table metrics with automatic joins deferred.

6. **Performance:** ✅ RESOLVED - Currently relying on LINQ.js lazy evaluation; query plan optimization deferred to Phase 4 if needed.

---

## Next Steps

**✅ Refactoring Complete** - All phases (1-3) have been successfully implemented.

### Completed Items
1. ✅ **Phase 1** - LINQ.js integration complete
2. ✅ **Phase 2** - Three-layer architecture implemented
3. ✅ **Phase 3** - Legacy API removed, single API consolidated
4. ✅ **Documentation** - REFACTOR_SPEC.md updated to reflect completion

### Future Opportunities (Phase 4)
1. **Derived Attributes** - Add support for calculated attributes
2. **Auto-Join Resolution** - Implement automatic join path detection
3. **Cross-Table Metrics** - Enable metrics spanning multiple fact tables
4. **Query Plan Visualization** - Add query execution plan debugging
5. **Performance Optimization** - Query plan optimization and caching

---

## Appendix: LINQ.js Cheat Sheet

### Common Patterns

**Filtering:**
```typescript
Enumerable.from(sales)
  .where(s => s.year === 2025)
  .where(s => s.amount > 1000)
```

**Projection:**
```typescript
Enumerable.from(sales)
  .select(s => ({ id: s.id, tax: s.amount * 0.1 }))
```

**Aggregation:**
```typescript
Enumerable.from(sales).sum(s => s.amount)
Enumerable.from(sales).average(s => s.amount)
Enumerable.from(sales).count()
Enumerable.from(sales).max(s => s.amount)
```

**Grouping:**
```typescript
Enumerable.from(sales)
  .groupBy(s => s.regionId)
  .select(g => ({ region: g.key(), total: g.sum(s => s.amount) }))
```

**Joining:**
```typescript
Enumerable.from(sales)
  .join(
    products,
    s => s.productId,
    p => p.productId,
    (s, p) => ({ ...s, productName: p.name })
  )
```

**Ordering:**
```typescript
Enumerable.from(sales)
  .orderBy(s => s.date)
  .thenByDescending(s => s.amount)
```

**Set Operations:**
```typescript
Enumerable.from(setA)
  .union(setB)
  .distinct()
```

---

**End of Specification**
