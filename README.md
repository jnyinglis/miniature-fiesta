# Semantic Metrics Engine

A TypeScript proof-of-concept implementation of a semantic metrics layer inspired by MicroStrategy, LookML, MetricFlow, and Power BI. This engine provides a flexible, in-memory framework for defining and evaluating business metrics with support for time intelligence, derived calculations, and semantic abstractions.

**Latest Update:** Phase 5 (Composable Query Engine) implemented - featuring query builder pattern, functional metrics, composable transforms, filter expression language, DSL helpers, and model/engine separation. [Jump to Phase 5 features →](#phase-5-composable-query-engine)

## Overview

The Semantic Metrics Engine implements a three-layer architecture that separates data storage from semantic meaning and business logic:

```
┌─────────────────────────────────────────────────────────┐
│               LAYER 3: METRICS                          │
│  Business logic, KPIs, time intelligence                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│            LAYER 2: SEMANTIC LAYER                      │
│  ┌──────────────────┐  ┌──────────────────────┐       │
│  │   Attributes     │  │     Measures          │       │
│  │  (How to slice)  │  │  (How to aggregate)   │       │
│  └──────────────────┘  └──────────────────────┘       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│              LAYER 1: STORAGE                           │
│  Pure data tables with relationships                     │
└─────────────────────────────────────────────────────────┘
```

### Key Features

- **Declarative Semantic Layer** - Attributes, measures, and metrics defined in separate registries
- **Metric-Level Dimensionality** - Control which attributes affect each metric via grain specification
- **Composable Time Intelligence** - Reusable transforms (YTD, Last Year, YTD Last Year, etc.)
- **Four Metric Types**:
  - **Simple** - Direct wrapper around a measure
  - **Expression** - Custom calculations over filtered fact rows
  - **Derived** - Arithmetic/logical operations between metrics
  - **Context Transform** - Filter context manipulation for time intelligence
- **LINQ.js Integration** - 100+ operators for powerful data transformations
- **Type-Safe** - Full TypeScript support with comprehensive type definitions

## Architecture

### Layer 1: Storage

Tables are pure data containers with no inherent semantic meaning. The same column can be used as an attribute, a measure, or both - the semantic meaning is determined by how you define it in Layer 2.

```typescript
interface InMemoryDb {
  tables: Record<string, Row[]>;
}
```

### Layer 2: Semantic Layer

**Attributes** define how to slice and dice the data:

```typescript
const attributes: AttributeRegistry = {
  regionId: {
    name: 'regionId',
    table: 'sales',
    column: 'regionId',
    displayName: 'regionName', // Auto-join to regions.name
    description: 'Region identifier'
  }
};
```

**Measures** define how to aggregate data:

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

### Layer 3: Metrics

**Metrics** add business logic on top of measures:

```typescript
const metrics: MetricRegistry = {
  // Simple metric: wraps a measure
  revenue: {
    kind: 'simple',
    name: 'revenue',
    measure: 'salesAmount'
  },

  // Derived metric: combines other metrics
  salesVsBudgetPct: {
    kind: 'derived',
    name: 'salesVsBudgetPct',
    dependencies: ['revenue', 'budget'],
    evalFromDeps: ({ revenue, budget }) =>
      budget ? (revenue / budget) * 100 : null,
    format: 'percent'
  },

  // Context transform: time intelligence
  revenueYTD: {
    kind: 'contextTransform',
    name: 'revenueYTD',
    baseMeasure: 'revenue',
    transform: 'ytd'
  }
};
```

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/miniature-fiesta.git
cd miniature-fiesta

# No dependencies needed - uses included LINQ.js
```

### Running the Demo

```bash
# Compile TypeScript to JavaScript
npx tsc src/semanticEngine.ts --outDir . --module commonjs --target ES2015 --moduleResolution node --esModuleInterop true

# Run the demo with sample data
node src/semanticEngine.js
```

The demo will output metric calculations for various attribute combinations:
- 2025-02 data by Region × Product (legacy API)
- 2025-02 data by Region only (legacy API)
- 2025-02 data for North America by Product (legacy API)
- Feb 2025 by Region using Query Builder (Phase 5 API)
- NA Sales 2025 using CTE-style composition (Phase 5 API)

### Basic Usage (Phase 5 API - Recommended)

```typescript
import { createEngine, demoDb, demoSemanticModel } from './semanticEngine';

// Create engine from semantic model
const engine = createEngine(demoDb, demoSemanticModel);

// Build and execute query
const result = engine.query()
  .where({ year: 2025, month: 2 })
  .addAttributes('regionId', 'productId')
  .addMetrics('revenue', 'budget', 'salesVsBudgetPct')
  .run();

console.table(result);
```

**Output:**
```
┌────────────┬──────────────┬──────────────┬──────────┬──────────────────┐
│ regionId   │ regionName   │ productId    │ revenue  │ salesVsBudgetPct │
├────────────┼──────────────┼──────────────┼──────────┼──────────────────┤
│ NA         │ North America│ 1            │ $950.00  │ 43.18%           │
│ EU         │ Europe       │ 2            │ $450.00  │ 28.13%           │
└────────────┴──────────────┴──────────────┴──────────┴──────────────────┘
```

### Legacy API (Still Supported)

```typescript
import { runQuery, demoDb, demoTableDefinitions, demoAttributes,
         demoMeasures, demoMetrics, demoTransforms } from './semanticEngine';

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
    metrics: ['revenue', 'budget', 'salesVsBudgetPct']
  }
);

console.table(result);
```

## Core Concepts

### Filter Context

Filter context determines which data is included in calculations:

```typescript
filters: {
  year: 2025,                    // Equality
  month: { lte: 6 },             // Comparison
  amount: { from: 100, to: 500 } // Range
}
```

### Metric Grain

Grain controls which dimensions a metric respects:

```typescript
{
  kind: 'simple',
  name: 'regionalBudget',
  measure: 'budgetAmount',
  grain: ['year', 'regionId']  // Ignores month and product filters
}
```

### Time Intelligence

Context transforms modify the filter context for time-based calculations:

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

## Examples

### Example 1: Simple Metric

```typescript
demoMetrics.revenue = {
  kind: "simple",
  name: "revenue",
  description: "Total revenue from sales",
  measure: "salesAmount",
  format: "currency"
};
```

### Example 2: Expression Metric

```typescript
demoMetrics.pricePerUnit = {
  kind: "expression",
  name: "pricePerUnit",
  factTable: "sales",
  format: "currency",
  expression: (rows) => {
    const amount = rows.sum(r => Number(r.amount ?? 0));
    const qty = rows.sum(r => Number(r.quantity ?? 0));
    return qty ? amount / qty : null;
  }
};
```

### Example 3: Advanced LINQ Composition

```typescript
demoMetrics.top3ProductsRevenue = {
  kind: 'expression',
  name: 'top3ProductsRevenue',
  factTable: 'sales',
  expression: (filteredRows) => {
    // Get top 3 products by revenue
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
};
```

## Testing

The project includes a comprehensive test suite covering all metric types, filter operations, and LINQ.js integration:

```bash
node src/semanticEngine.test.js
```

See [TEST_PLAN.md](TEST_PLAN.md) for detailed test documentation.

## Project Structure

```
miniature-fiesta/
├── src/
│   ├── semanticEngine.ts       # Core engine implementation
│   ├── semanticEngine.test.js  # Test suite
│   ├── operators.md            # LINQ.js operator documentation
│   ├── linq.js                 # LINQ.js library
│   └── linq.d.ts               # LINQ.js type definitions
├── README.md                   # This file
├── REFACTOR_SPEC.md           # Detailed refactoring documentation
├── TEST_PLAN.md               # Test plan and coverage
└── .gitignore
```

## Documentation

- **[REFACTOR_SPEC.md](REFACTOR_SPEC.md)** - Complete architectural documentation including:
  - Three-layer model design
  - LINQ.js integration details
  - Migration history
  - Design decisions and tradeoffs

- **[TEST_PLAN.md](TEST_PLAN.md)** - Comprehensive test coverage including:
  - Test categories and scenarios
  - LINQ.js operation tests
  - Metric evaluation tests
  - Edge case handling

## Design Principles

### 1. Separation of Concerns

Storage, semantics, and business logic are cleanly separated into three distinct layers, each with a single responsibility.

### 2. Column Flexibility

A table column has no inherent semantic meaning. The same column can be:
- An **attribute** for slicing/grouping (e.g., `quantityBand` from `quantity`)
- A **measure** for aggregation (e.g., `totalQuantity`, `avgQuantity` from `quantity`)
- Both simultaneously in different contexts

### 3. Composability

LINQ.js enables declarative, type-safe query composition with 100+ operators including:
- **Filtering**: `where`, `distinct`, `except`, `intersect`
- **Projection**: `select`, `selectMany`, `zip`
- **Aggregation**: `sum`, `average`, `count`, `min`, `max`
- **Joining**: `join`, `leftJoin`, `groupJoin`
- **Ordering**: `orderBy`, `orderByDescending`, `thenBy`
- **Grouping**: `groupBy`, `partitionBy`

### 4. MicroStrategy Alignment

The architecture closely mirrors MicroStrategy's semantic layer:
- Attributes define dimensional slicing
- Measures define aggregations
- Metrics add business logic
- Level (grain) metrics control dimensionality

## Future Enhancements

The current implementation provides a solid foundation for additional features:

### Implemented in Phase 5 ✅

- ✅ **Query Builder Pattern** - Fluent, composable query API
- ✅ **Functional Metrics** - First-class function composition for metrics
- ✅ **Composable Transforms** - Stackable time intelligence transforms
- ✅ **Filter Expression Language** - AST-based filters with AND/OR/NOT logic
- ✅ **DSL Helpers** - Builders that reduce boilerplate
- ✅ **Model/Engine Separation** - Clean separation between model and runtime

### Implemented in Earlier Phases ✅

- ✅ **LINQ.js Integration** (Phase 1) - 100+ composable query operators
- ✅ **Three-Layer Architecture** (Phase 2) - Storage, Semantic, Metrics layers
- ✅ **Unified Table Model** (Phase 2) - Single model for all tables
- ✅ **Semantic Layer** (Phase 2) - Attributes and measures
- ✅ **Metric Types** (Phase 2) - Simple, Expression, Derived, Context Transform

### Potential Future Features

- **Advanced Derived Attributes** - More sophisticated attribute calculations
- **Smart Auto-Join Resolution** - Automatic determination of optimal join paths
- **Cross-Table Metrics** - Metrics spanning multiple fact tables with automatic joins
- **Query Plan Visualization** - Debug and optimize query execution paths
- **Hierarchies** - Built-in support for Year → Quarter → Month → Day, Region → Country → City
- **Calculation Templates** - Reusable patterns (percent of total, moving average, rank, window functions)
- **SQL Pushdown** - Compile semantic queries to SQL or DuckDB for larger datasets
- **Caching Strategies** - More sophisticated caching and materialization
- **Incremental Computation** - Update metrics based on data changes
- **Time Series Analysis** - Built-in support for forecasting and trend analysis

See [PHASE_5.md](PHASE_5.md) for the full Phase 5 specification and [REFACTOR_SPEC.md](REFACTOR_SPEC.md) for historical context.

## Technical Details

### Requirements

- TypeScript 4.0+
- Node.js 14+
- No external runtime dependencies (LINQ.js is included)

### Performance

- **Lazy Evaluation** - LINQ.js uses lazy evaluation for optimal performance
- **Metric Caching** - Metric values are memoized per (metric, context) combination
- **In-Memory Processing** - Suitable for POCs and embedded scenarios

### Limitations

This is a proof-of-concept implementation with some intentional limitations:

- In-memory data only (no database connectivity)
- Simplified join resolution (uses first attribute's table)
- Basic display name resolution (assumes naming conventions)
- No query optimization or index usage

## Contributing

This is a proof-of-concept project demonstrating semantic layer architecture. Contributions, issues, and feature requests are welcome!

## License

MIT

## Acknowledgments

Inspired by:
- **MicroStrategy** - Semantic layer and metric engine architecture
- **LookML/MetricFlow** - Modern metric modeling approaches
- **Power BI** - Dynamic filter-context evaluation
- **LINQ.js** - Powerful functional query composition

---

**Status**: Phase 5 Composable Query Engine implemented ✅
- Phase 1: LINQ.js Integration ✅
- Phase 2: Three-Layer Architecture ✅
- Phase 3: Legacy API Removal ✅
- **Phase 5: Composable Query Engine** ✅

## Phase 5: Composable Query Engine

Phase 5 introduces major architectural improvements focused on composability and functional programming patterns. All features from the Phase 5 specification have been successfully implemented.

### 1. Query Builder Pattern (Implemented)

Build queries incrementally with a fluent API that supports reusable base queries and CTE-style composition:

```typescript
import { createEngine, demoDb, demoSemanticModel } from './semanticEngine';

// Create engine from semantic model
const engine = createEngine(demoDb, demoSemanticModel);

// Build reusable base queries
const base2025 = engine.query().where({ year: 2025 });

// Extend and compose - each method returns a new QueryBuilder
const feb2025ByRegion = base2025
  .where({ month: 2 })
  .addAttributes('regionId')
  .addMetrics('revenue', 'budget', 'salesVsBudgetPct')
  .run();

// CTE-style composition - reuse base queries
const naSales = base2025.where({ regionId: 'NA' });
const euSales = base2025.where({ regionId: 'EU' });

const naResult = naSales
  .addAttributes('productId')
  .addMetrics('revenue')
  .run();
```

**Key Benefits:**
- Immutable builder pattern - base queries remain unchanged
- Reusable query fragments (DRY principle)
- Incremental query construction
- Type-safe with full TypeScript support

### 2. Functional Metric System (Implemented)

All metric types are now unified behind a single functional interface, replacing the previous tagged union approach:

```typescript
import { simpleMetric, derivedMetric, expressionMetric,
         contextTransformMetric } from './semanticEngine';

// Simple metric - wraps a measure
const revenue = simpleMetric({
  name: 'revenue',
  measure: 'salesAmount',
  format: 'currency'
});

// Expression metric - custom aggregation logic
const pricePerUnit = expressionMetric({
  name: 'pricePerUnit',
  table: 'sales',
  format: 'currency',
  expression: (rows, ctx) => {
    const amount = rows.sum(r => Number(r.amount ?? 0));
    const qty = rows.sum(r => Number(r.quantity ?? 0));
    return qty ? amount / qty : null;
  }
});

// Derived metric - combines other metrics
const salesVsBudgetPct = derivedMetric({
  name: 'salesVsBudgetPct',
  deps: ['revenue', 'budget'],
  combine: ({ revenue, budget }) =>
    budget ? (revenue! / budget) * 100 : null,
  format: 'percent'
});

// Context transform metric - applies time intelligence
const revenueYTD = contextTransformMetric({
  name: 'revenueYTD',
  baseMetric: 'revenue',
  transform: ytdTransform
});
```

**Higher-Order Metric Builders:**

```typescript
import { makeYtdMetric, makeYoYMetric } from './semanticEngine';

// Generate YTD metric for any base metric
const revenueYTD = makeYtdMetric('revenue', ytdTransform);

// Generate Year-over-Year comparison
const revenueYoY = makeYoYMetric('revenue');
```

**Benefits:**
- Single evaluation path (no switch statements)
- First-class functions enable composition
- Easy to add new metric patterns
- Supports dependency injection

### 3. Composable Context Transforms (Implemented)

Time intelligence transforms are now stackable and composable:

```typescript
import { composeTransforms, shiftYear, shiftMonth,
         rollingMonths } from './semanticEngine';

// Base transforms
const ytd: ContextTransformFn = (ctx) => {
  if (ctx.year == null || ctx.month == null) return ctx;
  return { ...ctx, month: { lte: Number(ctx.month) } };
};

const lastYear: ContextTransformFn = (ctx) => {
  if (ctx.year == null) return ctx;
  return { ...ctx, year: Number(ctx.year) - 1 };
};

// Compose transforms (applied left to right)
const ytdLastYear = composeTransforms(ytd, lastYear);
const priorMonthLastYear = composeTransforms(priorMonth, lastYear);

// Parameterized transform builders
const rolling3Months = rollingMonths(3);
const rolling6Months = rollingMonths(6);

// Use in transform registry
const transforms = {
  ytd,
  lastYear,
  ytdLastYear,  // Composed transform
  rolling3Months,
  rolling6Months
};
```

**Benefits:**
- DRY: No duplicate logic for combined transforms
- Stackable like LINQ operators
- Parameterized transform families
- Pure functions (easy to test)

### 4. Filter Expression Language (Implemented)

Build complex filters with an AST supporting AND/OR/NOT logic and operator composition:

```typescript
import { f, compileFilter, applyFilter } from './semanticEngine';

// Simple equality and comparisons
const yearFilter = f.eq('year', 2025);
const monthFilter = f.lte('month', 6);
const rangeFilter = f.between('amount', 100, 1000);

// Combine with AND
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

const naFilter = f.and(baseFilter, f.eq('regionId', 'NA'));
const euFilter = f.and(baseFilter, f.eq('regionId', 'EU'));

// Compile to predicate function
const predicate = compileFilter(validSales);
const filteredRows = rows.filter(predicate);

// Or use with LINQ.js
const filteredEnumerable = applyFilter(Enumerable.from(rows), validSales);
```

**Supported Operators:**
- `eq`, `lt`, `lte`, `gt`, `gte` - Comparisons
- `between` - Range queries
- `in` - List membership
- `and`, `or` - Boolean logic
- `not` - Negation

**Benefits:**
- Expressiveness: Full boolean logic
- Composability: Merge and extend filters
- Reusability: Define base filters once
- Type-safe AST structure

### 5. DSL Helpers for Definitions (Implemented)

Builder helpers that reduce boilerplate and provide smart defaults:

```typescript
import { attr, measure, metric } from './semanticEngine';

// Attribute builders
const attributes = {
  // Simple ID attribute (column defaults to name)
  regionId: attr.id({
    name: 'regionId',
    table: 'sales',
    displayName: 'regionName'
  }),

  // Derived attribute with custom expression
  quantityBand: attr.derived({
    name: 'quantityBand',
    table: 'sales',
    column: 'quantity',
    expression: (row) => {
      const q = row.quantity;
      if (q <= 5) return 'Small';
      if (q <= 10) return 'Medium';
      return 'Large';
    }
  }),

  // Formatted attribute
  monthName: attr.formatted({
    name: 'monthName',
    table: 'sales',
    column: 'month',
    format: (m) => ['Jan', 'Feb', 'Mar'][m - 1]
  })
};

// Measure builders with smart defaults
const measures = {
  salesAmount: measure.sum({
    name: 'salesAmount',
    table: 'sales',
    column: 'amount',  // Optional: defaults to name
    format: 'currency'
  }),

  avgOrderSize: measure.avg({
    name: 'avgOrderSize',
    table: 'sales',
    column: 'amount',
    format: 'currency'
  }),

  orderCount: measure.count({
    name: 'orderCount',
    table: 'sales'
  })
};

// Metric builders (combines all metric constructors)
const metrics = {
  revenue: metric.simple({
    name: 'revenue',
    measure: 'salesAmount'
  }),

  revenueYTD: metric.ytd('revenue', ytdTransform),
  revenueYoY: metric.yoy('revenue'),

  salesVsBudgetPct: metric.derived({
    name: 'salesVsBudgetPct',
    deps: ['revenue', 'budget'],
    combine: ({ revenue, budget }) =>
      budget ? (revenue! / budget) * 100 : null
  })
};
```

**Benefits:**
- Less boilerplate (30%+ reduction)
- Smart defaults (column = name)
- Reusable patterns
- IDE autocomplete support

### 6. Model/Engine Separation (Implemented)

Clean separation between semantic model definition and query engine runtime:

```typescript
import { createEngine, SemanticModel } from './semanticEngine';

// Define semantic model once (bundles all registries)
const salesModel: SemanticModel = {
  tables: demoTableDefinitions,
  attributes: demoAttributes,
  measures: demoMeasures,
  metrics: demoMetrics,
  transforms: demoTransforms
};

// Create engine from model and data
const engine = createEngine(demoDb, salesModel);

// Use engine for queries
const result = engine.query()
  .where({ year: 2025 })
  .addAttributes('regionId')
  .addMetrics('revenue')
  .run();

// Introspect the model
const revenueMetric = engine.getMetric('revenue');
const allMetrics = engine.listMetrics();
const salesMeasure = engine.getMeasure('salesAmount');

// Extend model for specific use cases
const extendedEngine = engine.extend({
  metrics: {
    customMetric: simpleMetric({ name: 'custom', measure: 'salesAmount' })
  }
});

// Multiple models over same database
const salesEngine = createEngine(db, salesModel);
const hrEngine = createEngine(db, hrModel);
```

**Engine Interface:**
```typescript
interface Engine {
  query(): QueryBuilder;
  getMetric(name: string): MetricDefinition | undefined;
  listMetrics(): MetricDefinition[];
  getMeasure(name: string): MeasureDefinition | undefined;
  getAttribute(name: string): AttributeDefinition | undefined;
  extend(partial: Partial<SemanticModel>): Engine;
}
```

**Benefits:**
- Dependency injection pattern
- Multiple models over same data
- Easy testing with mock models
- Clean extension points

### Backward Compatibility

The legacy `runQuery()` function is still available for backward compatibility:

```typescript
// Old API (still works)
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
    metrics: ['revenue', 'budget']
  }
);

// New API (recommended)
const engine = createEngine(demoDb, demoSemanticModel);
const result = engine.query()
  .where({ year: 2025, month: 2 })
  .addAttributes('regionId', 'productId')
  .addMetrics('revenue', 'budget')
  .run();
```

### Phase 5 Summary

**All Implemented Features:**
- ✅ Query Builder Pattern (5a)
- ✅ Functional Metric System (5b)
- ✅ Composable Context Transforms (5c)
- ✅ Filter Expression Language (5d)
- ✅ Model/Engine Separation (5e)
- ✅ DSL Helpers for Definitions (5f)

For complete Phase 5 specification and design rationale, see [PHASE_5.md](PHASE_5.md).

For historical context and detailed migration information, see [REFACTOR_SPEC.md](REFACTOR_SPEC.md).
