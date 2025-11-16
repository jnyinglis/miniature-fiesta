# Semantic Metrics Engine

A TypeScript proof-of-concept implementation of a semantic metrics layer inspired by MicroStrategy, LookML, MetricFlow, and Power BI. This engine provides a flexible, in-memory framework for defining and evaluating business metrics with support for time intelligence, derived calculations, and semantic abstractions.

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
# Run the demo with sample data
node src/semanticEngine.ts
```

The demo will output metric calculations for various attribute combinations:
- 2025-02 data by Region × Product
- 2025-02 data by Region only
- 2025-02 data for North America by Product

### Basic Usage

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

**Output:**
```
┌────────────┬──────────────┬──────────────┬──────────┬──────────────────┐
│ regionId   │ regionName   │ productId    │ revenue  │ salesVsBudgetPct │
├────────────┼──────────────┼──────────────┼──────────┼──────────────────┤
│ NA         │ North America│ 1            │ $950.00  │ 43.18%           │
│ EU         │ Europe       │ 2            │ $450.00  │ 28.13%           │
└────────────┴──────────────┴──────────────┴──────────┴──────────────────┘
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

### Planned Features

- **Derived Attributes** - Calculated attributes based on expressions
- **Auto-Join Resolution** - Automatic determination of join paths across tables
- **Cross-Table Metrics** - Metrics spanning multiple fact tables with automatic joins
- **Query Plan Visualization** - Debug and optimize query execution
- **Hierarchies** - Year → Quarter → Month → Day, Region → Country → City
- **Calculation Templates** - Reusable patterns (percent of total, moving average, rank)
- **SQL Pushdown** - Compile semantic queries to SQL or DuckDB

See [REFACTOR_SPEC.md](REFACTOR_SPEC.md) Phase 4 for detailed enhancement plans.

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
- Phase 1: LINQ.js Integration
- Phase 2: Three-Layer Architecture
- Phase 3: Legacy API Removal
- **Phase 5: Composable Query Engine** ⭐

## Phase 5: Composable Query Engine

Phase 5 introduces major architectural improvements focused on composability and functional programming patterns:

### Query Builder Pattern

Build queries incrementally with a fluent API:

```typescript
import { createEngine, demoDb, demoSemanticModel } from './semanticEngine';

// Create engine from semantic model
const engine = createEngine(demoDb, demoSemanticModel);

// Build reusable base queries
const base2025 = engine.query().where({ year: 2025 });

// Extend and compose
const feb2025ByRegion = base2025
  .where({ month: 2 })
  .addAttributes('regionId')
  .addMetrics('revenue', 'budget', 'salesVsBudgetPct')
  .run();

// CTE-style composition
const naSales = base2025.where({ regionId: 'NA' });
const euSales = base2025.where({ regionId: 'EU' });
```

### Functional Metrics

Metrics are now first-class functions for better composition:

```typescript
import { simpleMetric, derivedMetric, contextTransformMetric } from './semanticEngine';

// Simple metric
const revenue = simpleMetric({
  name: 'revenue',
  measure: 'salesAmount',
  format: 'currency'
});

// Derived metric
const salesVsBudgetPct = derivedMetric({
  name: 'salesVsBudgetPct',
  deps: ['revenue', 'budget'],
  combine: ({ revenue, budget }) =>
    budget ? (revenue! / budget) * 100 : null
});

// Higher-order metrics
const revenueYTD = makeYtdMetric('revenue', ytdTransform);
const revenueYoY = makeYoYMetric('revenue');
```

### Composable Transforms

Time intelligence transforms are now stackable:

```typescript
import { composeTransforms, shiftYear, shiftMonth, rollingMonths } from './semanticEngine';

// Compose transforms
const ytdLastYear = composeTransforms(ytd, lastYear);
const priorMonthLastYear = composeTransforms(priorMonth, lastYear);

// Parameterized transforms
const rolling3Months = rollingMonths(3);
const rolling6Months = rollingMonths(6);
```

### Filter Expression Language

Build complex filters with AND/OR/NOT logic:

```typescript
import { f } from './semanticEngine';

// Complex nested filters
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
```

### DSL Helpers

Reduce boilerplate with builder helpers:

```typescript
import { attr, measure, metric } from './semanticEngine';

// Concise attribute definitions
const attributes = {
  regionId: attr.id({
    name: 'regionId',
    table: 'sales',
    displayName: 'regionName'
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
    }
  })
};

// Concise measure definitions
const measures = {
  salesAmount: measure.sum({
    name: 'salesAmount',
    table: 'sales',
    column: 'amount',
    format: 'currency'
  }),

  orderCount: measure.count({
    name: 'orderCount',
    table: 'sales'
  })
};
```

### Model/Engine Separation

Clean separation between model definition and runtime:

```typescript
import { createEngine, SemanticModel } from './semanticEngine';

// Define model once
const salesModel: SemanticModel = {
  tables: demoTableDefinitions,
  attributes: demoAttributes,
  measures: demoMeasures,
  metrics: demoMetrics,
  transforms: demoTransforms
};

// Create engine
const engine = createEngine(demoDb, salesModel);

// Extend for specific use cases
const extendedEngine = engine.extend({
  metrics: {
    ...additionalMetrics
  }
});
```

For complete Phase 5 specification, see [PHASE_5.md](PHASE_5.md).

For historical context and detailed migration information, see [REFACTOR_SPEC.md](REFACTOR_SPEC.md).
