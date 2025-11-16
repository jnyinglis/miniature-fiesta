# Semantic Metrics Engine

A modern, TypeScript-based semantic layer for defining and evaluating business metrics with composable time intelligence, multi-grain support, and declarative metric definitions.

## Overview

This project implements a **three-layer semantic model** inspired by enterprise BI platforms (MicroStrategy, LookML, MetricFlow) with a focus on:

- **Declarative metric definitions** — Define metrics once, reuse everywhere
- **Composable time intelligence** — YTD, LastYear, and custom transforms
- **Multi-grain evaluation** — Metrics can aggregate at different dimensional levels
- **Type-safe operations** — Full TypeScript support with LINQ.js query engine
- **In-memory proof-of-concept** — No database required, perfect for prototyping

## Architecture

### Three-Layer Semantic Model

```
┌─────────────────────────────────────────────────┐
│  Business Logic Layer (Metrics)                 │
│  - Simple Metrics (wrap measures)               │
│  - Fact Measures (direct aggregations)          │
│  - Expression Metrics (custom logic)            │
│  - Derived Metrics (metric compositions)        │
│  - Context Transforms (time intelligence)       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Semantic Layer (Attributes & Measures)         │
│  - Attributes (dimensions for slicing)          │
│  - Measures (aggregatable columns)              │
│  - Relationships (table joins)                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Storage Layer (Tables)                         │
│  - Unified table storage                        │
│  - Schema definitions                           │
│  - In-memory data (POC)                         │
└─────────────────────────────────────────────────┘
```

### Key Features

✅ **Five metric types** supporting all common patterns:
- `simple` — Wraps a measure from the semantic layer
- `factMeasure` — Direct aggregation on a fact column
- `expression` — Custom aggregation logic using LINQ.js
- `derived` — Computed from other metrics
- `contextTransform` — Time intelligence and filter manipulation

✅ **Metric-level grain** (like MicroStrategy level metrics):
- Each metric specifies which dimensions affect it
- Filters outside the grain are automatically ignored
- Enables metrics at different aggregation levels in the same query

✅ **Composable context transforms**:
- Reusable transformations: `ytd`, `lastYear`, `ytdLastYear`
- Apply to any metric via `contextTransform` type
- Easy to extend with custom transforms

✅ **Powered by LINQ.js**:
- 100+ operators for data manipulation
- Lazy evaluation for performance
- Type-safe transformations
- Supports complex queries: joins, grouping, set operations

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/jnyinglis/miniature-fiesta.git
cd miniature-fiesta

# Install dependencies (if using a package manager)
npm install
```

### Running the Demo

The main engine is in `src/semanticEngine.ts` and includes a runnable demo:

```bash
# Run the demo queries
node src/semanticEngine.ts
```

This will execute sample queries showing:
- Multi-dimensional slicing (Region × Product)
- Time intelligence (YTD, LastYear comparisons)
- Derived metrics (Sales vs Budget %)
- Different grain levels

### Running Tests

Comprehensive test suite with 50+ test cases:

```bash
# Run all tests
node src/semanticEngine.test.js
```

Tests cover:
- LINQ.js integration
- Filter matching and context application
- All metric types (factMeasure, expression, derived, contextTransform)
- Query execution
- Edge cases and error handling

## Usage Examples

### Defining Metrics

```typescript
import { MetricRegistry, addContextTransformMetric } from './semanticEngine.ts';

const metrics: MetricRegistry = {};

// Simple metric wrapping a measure
metrics.revenue = {
  kind: "simple",
  name: "revenue",
  measure: "salesAmount",  // References MeasureRegistry
  format: "currency"
};

// Fact measure with direct aggregation
metrics.totalSales = {
  kind: "factMeasure",
  name: "totalSales",
  factTable: "sales",
  factColumn: "amount",
  format: "currency"
  // grain defaults to fact table's grain
};

// Expression metric with custom logic
metrics.pricePerUnit = {
  kind: "expression",
  name: "pricePerUnit",
  factTable: "sales",
  format: "currency",
  expression: (rows) => {
    const amount = rows.sum(r => r.amount);
    const qty = rows.sum(r => r.quantity);
    return qty ? amount / qty : null;
  }
};

// Derived metric from other metrics
metrics.salesVsBudget = {
  kind: "derived",
  name: "salesVsBudget",
  dependencies: ["totalSales", "totalBudget"],
  format: "percent",
  evalFromDeps: ({ totalSales, totalBudget }) => {
    return totalBudget ? (totalSales / totalBudget) * 100 : null;
  }
};

// Time intelligence via context transform
addContextTransformMetric(metrics, {
  name: "salesYTD",
  baseMeasure: "totalSales",
  transform: "ytd",  // References ContextTransformsRegistry
  format: "currency"
});
```

### Querying Data

```typescript
import { runQuery, demoDb, demoFactTables, demoMetrics, demoTransforms, demoDimensionConfig, demoMeasures } from './semanticEngine.ts';

// Query: 2025 February sales by Region and Product
const results = runQuery(
  demoDb,
  demoFactTables,
  demoMetrics,
  demoTransforms,
  demoDimensionConfig,
  {
    rows: ["regionId", "productId"],  // Dimensions for slicing
    filters: { year: 2025, month: 2 },  // Global filters
    metrics: ["totalSales", "salesYTD", "salesVsBudget"],  // Metrics to evaluate
    factForRows: "sales"  // Fact table to determine row combinations
  },
  demoMeasures
);

console.table(results);
// Output:
// ┌─────────┬──────────────┬───────────┬──────────────┬─────────────┬──────────────┬─────────────────┐
// │ (index) │ regionId     │ regionName│ productId    │ productName │ totalSales   │ salesYTD        │
// ├─────────┼──────────────┼───────────┼──────────────┼─────────────┼──────────────┼─────────────────┤
// │    0    │ 'NA'         │ 'North...'│      1       │ 'Widget A'  │ '$950.00'    │ '$1,950.00'     │
// │    1    │ 'EU'         │ 'Europe'  │      2       │ 'Widget B'  │ '$450.00'    │ '$450.00'       │
// └─────────┴──────────────┴───────────┴──────────────┴─────────────┴──────────────┴─────────────────┘
```

### Using the New Semantic Layer API (Phase 2)

```typescript
import { runQueryV2, demoDb, demoTableDefinitions, demoAttributes, demoMeasures, demoMetrics, demoTransforms } from './semanticEngine.ts';

// Simpler API using attributes from the semantic layer
const results = runQueryV2(
  demoDb,
  demoTableDefinitions,
  demoAttributes,
  demoMeasures,
  demoMetrics,
  demoTransforms,
  {
    attributes: ['regionId', 'productId'],  // Semantic attributes
    filters: { year: 2025, month: 2 },
    metrics: ['revenue', 'quantity', 'budget']  // Simple metrics
  }
);

console.table(results);
```

## Project Structure

```
miniature-fiesta/
├── src/
│   ├── semanticEngine.ts       # Main engine implementation
│   ├── semanticEngine.test.js  # Comprehensive test suite
│   ├── linq.js                 # LINQ.js library (query engine)
│   ├── linq.d.ts               # TypeScript definitions for LINQ.js
│   └── operators.md            # LINQ.js operator reference
├── REFACTOR_SPEC.md            # Refactoring history and architecture
├── TEST_PLAN.md                # Detailed test documentation
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## Refactoring History

This codebase has undergone two major refactoring phases:

### ✅ Phase 1: LINQ.js Integration (Completed 2025-11-16)

**Goal:** Replace custom `RowSequence` class with industry-standard LINQ.js library

**Changes:**
- Removed 73 lines of custom query code
- Integrated LINQ.js (100+ operators)
- Updated all metric evaluation to use LINQ.js enumerables
- Added comprehensive test suite (50+ test cases)

**Benefits:**
- Access to powerful query operators (joins, set operations, advanced sorting)
- Lazy evaluation for better performance
- Battle-tested library (no custom maintenance burden)
- Type-safe transformations

### ✅ Phase 2: Three-Layer Semantic Model (Completed 2025-11-16)

**Goal:** Implement enterprise-grade semantic layer architecture

**Changes:**

**2a. Storage Layer (Unified Tables)**
- Merged separate dimension/fact storage into unified `db.tables`
- Added table schema definitions with relationships
- Created `TableRegistry` for metadata

**2b. Semantic Layer (Attributes & Measures)**
- Created `AttributeDefinition` for dimensional slicing
- Created `MeasureDefinition` for aggregatable columns
- Added display name resolution via relationships
- Implemented demo registries for attributes and measures

**2c. Metric Layer Updates**
- Added `SimpleMetric` type for wrapping measures
- Updated evaluation engine to support measure registry
- Created demo simple metrics (revenue, quantity, budget)
- Maintained backward compatibility with existing metric types

**2d. Query Engine Refactor**
- Implemented `runQueryV2` with simplified API
- Automatic table determination based on attributes
- No more `factForRows` parameter required
- Enhanced relationship traversal for display names

**Benefits:**
- **Flexibility**: Same column can be attribute, measure, or both
- **Clarity**: Clear separation of concerns (storage → semantics → business logic)
- **Simplified API**: Fewer parameters, more intuitive
- **Industry Alignment**: Follows MicroStrategy/LookML patterns
- **Backward Compatibility**: Original API still works

## Core Concepts

### 1. Tables (Storage Layer)

Tables store raw data with defined schemas and relationships:

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
      }
    ]
  }
};
```

### 2. Attributes & Measures (Semantic Layer)

**Attributes** define how to slice and group data:

```typescript
const attributes: AttributeRegistry = {
  regionId: {
    name: 'regionId',
    table: 'sales',
    column: 'regionId',
    displayName: 'regionName',  // Auto-joins to regions.name
    description: 'Region identifier'
  }
};
```

**Measures** define aggregatable columns:

```typescript
const measures: MeasureRegistry = {
  salesAmount: {
    name: 'salesAmount',
    table: 'sales',
    column: 'amount',
    aggregation: 'sum',
    format: 'currency',
    description: 'Total sales amount'
  }
};
```

### 3. Metrics (Business Logic Layer)

Metrics define business calculations that can reference attributes, measures, and other metrics. See "Defining Metrics" above for examples.

### 4. Context Transforms (Time Intelligence)

Transforms manipulate the filter context before evaluation:

```typescript
const transforms: ContextTransformsRegistry = {
  ytd(ctx) {
    if (ctx.year == null || ctx.month == null) return ctx;
    return { ...ctx, month: { lte: ctx.month } };
  },

  lastYear(ctx) {
    if (ctx.year == null) return ctx;
    return { ...ctx, year: ctx.year - 1 };
  }
};
```

Apply to any metric:

```typescript
addContextTransformMetric(metrics, {
  name: "salesYTD",
  baseMeasure: "totalSales",
  transform: "ytd"
});
```

### 5. Metric-Level Grain

Each metric can specify its dimensional grain, controlling which filters affect it:

```typescript
metrics.salesByRegion = {
  kind: "factMeasure",
  factTable: "sales",
  factColumn: "amount",
  grain: ["year", "regionId"],  // Ignores month and productId filters
  format: "currency"
};
```

**Example:**
- Query filters: `{ year: 2025, month: 2, regionId: 'NA', productId: 1 }`
- Metric grain: `['year', 'regionId']`
- **Result:** Month and productId filters are ignored for this metric

This enables "level metrics" (MicroStrategy) or "dimension pinning" patterns.

## Filter Context

The engine supports flexible filter expressions:

```typescript
// Exact match
{ year: 2025, regionId: 'NA' }

// Range filter
{ month: { from: 1, to: 3 } }

// Comparison filters
{ month: { lte: 6 } }           // month <= 6
{ amount: { gte: 100, lt: 1000 } }  // 100 <= amount < 1000
```

Filters are automatically applied based on each metric's grain.

## Future Enhancements (Phase 3)

Potential extensions to consider:

### A. Hierarchies
- Year → Quarter → Month → Day
- Region → Country → State → City
- Automatic drill-down/roll-up

### B. Pivot Grids
- MicroStrategy-style grid format
- Rows × Columns × Metrics
- Subtotals and grand totals

### C. Calculation Templates
- Percent of total
- Moving averages (7-day, 30-day)
- Rank (dense, ordinal, percentile)
- Running totals

### D. Multi-Fact Queries
- Fact stitching via conformed dimensions
- Automatic join path detection
- Cross-fact derived metrics

### E. SQL Pushdown
- Compile semantic queries to SQL
- DuckDB integration for larger datasets
- Query optimization and caching

### F. API Exposure
- REST API for metric evaluation
- GraphQL schema generation
- WASM-based embedding

## Design Philosophy

This engine demonstrates several key architectural principles:

1. **Declarative over Imperative** — Metrics are data structures, not functions
2. **Composability** — Small, reusable pieces (transforms, measures, metrics)
3. **Separation of Concerns** — Storage ≠ Semantics ≠ Business Logic
4. **Type Safety** — Leverage TypeScript for correctness
5. **Lazy Evaluation** — LINQ.js enumerables don't execute until needed
6. **Testability** — Pure functions, no side effects, comprehensive tests

## Comparison to Other Tools

| Feature | This Engine | Tableau | Power BI | MicroStrategy | LookML |
|---------|-------------|---------|----------|---------------|--------|
| Metric-level grain | ✅ | ❌ | ⚠️ (Calc Groups) | ✅ | ✅ |
| Composable time-int | ✅ | ⚠️ (Table calcs) | ⚠️ (DAX patterns) | ✅ | ✅ |
| Derived metrics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Expression metrics | ✅ | ✅ | ✅ | ✅ | ⚠️ (Limited) |
| Type-safe definitions | ✅ | ❌ | ❌ | ❌ | ⚠️ (YAML) |
| In-memory POC | ✅ | ❌ | ❌ | ❌ | ❌ |

## Contributing

This is a proof-of-concept project demonstrating semantic layer architecture. Contributions welcome!

## License

MIT

## References

- [LINQ.js Documentation](https://github.com/mihaifm/linq)
- [MicroStrategy Metrics](https://www2.microstrategy.com/producthelp/Current/MSTRWeb/WebHelp/Lang_1033/Content/metrics.htm)
- [LookML Reference](https://cloud.google.com/looker/docs/what-is-lookml)
- [MetricFlow](https://docs.getdbt.com/docs/build/about-metricflow)
- [Power BI DAX](https://learn.microsoft.com/en-us/dax/)

---

**Built with ❤️ as a demonstration of modern semantic layer architecture**
