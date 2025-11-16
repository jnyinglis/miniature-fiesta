# Phase 5: Composable Query Engine

**Status:** 📋 **PLANNED** - Detailed specification ready for implementation

**Breaking Changes:** Yes - this is a major architectural refactor that will change core APIs

---

## Overview

**Goal:** Maximize composability through LINQ-style patterns for metrics, transforms, queries, and filters

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
2. **Medium Priority (Developer Experience):** 5d, 5e, 5f - Make the API ergonomic
3. **Lower Priority (Advanced Features):** 5g - Nice-to-have enhancements

**Total Estimated Effort:** 44-58 hours (roughly 1-1.5 weeks of full-time work)

---

## Table of Contents

1. [5a. Query Builder Pattern](#5a-query-builder-pattern-high-priority) (High Priority) - 6-8h
2. [5b. Metric Combinators](#5b-metric-combinators-high-priority) (High Priority) - 10-12h
3. [5c. Composable Context Transforms](#5c-composable-context-transforms-high-priority) (High Priority) - 4-6h
4. [5d. Filter Expression Language](#5d-filter-expression-language-medium-priority) (Medium Priority) - 8-10h
5. [5e. Model/Engine Separation](#5e-modelengine-separation-medium-priority) (Medium Priority) - 6-8h
6. [5f. DSL Helpers for Definitions](#5f-dsl-helpers-for-definitions-medium-priority) (Medium Priority) - 4-6h
7. [5g. Composition Testing](#5g-composition-testing-lower-priority) (Lower Priority) - 6-8h

---

## 5a. Query Builder Pattern (High Priority)

**Goal:** Make query descriptions first-class, reusable values

**Estimated Effort:** 6-8 hours

### Current Problem

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

### Proposed Solution

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

### New Types

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

### Implementation Steps

1. Create `QueryBuilder` class with fluent API
2. Implement immutable builder pattern (each method returns new instance)
3. Create `Engine` interface with `query()` factory method
4. Update `runQuery` to accept `QuerySpec` internally
5. Add helper methods: `forMetric(name)`, `byAttributes(...attrs)`

### Benefits

- Reusable query fragments (DRY principle)
- Incremental query construction
- CTE-style composition
- Clean separation of query definition from execution
- Easy to add helper methods later

---

## 5b. Metric Combinators (High Priority)

**Goal:** Unify all metric types behind a single functional interface

**Estimated Effort:** 10-12 hours

### Current Problem

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

### Proposed Solution

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

### Usage Example

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

### Higher-Order Helpers

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

### Implementation Steps

1. Define new `MetricContext` and `MetricEval` types
2. Create constructor functions for each metric type
3. Implement `evaluateMeasure` and `evaluateDependencies` helpers
4. Update `evaluateMetric` to work with new unified interface
5. Migrate existing metrics to new format
6. Add higher-order helpers (`makeYtdMetric`, `makeYoYMetric`, etc.)
7. Remove old tagged union types

### Benefits

- Single evaluation path (no switch statements)
- First-class functions enable composition
- Higher-order metric builders (DRY)
- Easy to add new metric patterns
- Functional programming style

---

## 5c. Composable Context Transforms (High Priority)

**Goal:** Make time-intelligence transforms stackable and composable

**Estimated Effort:** 4-6 hours

### Current Problem

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

### Proposed Solution

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

### Metric Usage

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

### Advanced Patterns

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

### Implementation Steps

1. Update `ContextTransform` type to work with `MetricContext`
2. Implement `composeTransforms` utility
3. Refactor existing transforms to be pure functions
4. Create parameterized transform builders
5. Add library of common transforms (rolling windows, shifts, etc.)
6. Update documentation with composition examples

### Benefits

- DRY: No duplicate logic for combined transforms
- Composable: Stack transforms like LINQ operators
- Parameterized: Create transform families (`shiftMonth(n)`)
- Reusable: Build library of transform patterns
- Testable: Each transform is a pure function

---

## 5d. Filter Expression Language (Medium Priority)

**Goal:** Give filters an AST for composition and reuse

**Estimated Effort:** 8-10 hours

### Current Problem

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

### Proposed Solution

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

### Usage Examples

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

### Integration with Query Builder

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

### Internal Compilation

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

### Implementation Steps

1. Define filter AST types
2. Create builder API (`f.*` functions)
3. Implement `compileFilter` function
4. Update `applyContextToFact` to accept Filter AST
5. Maintain backward compatibility with plain object filters
6. Add filter optimization rules (e.g., merge adjacent conditions)
7. Update query builder to accept filters

### Benefits

- Expressiveness: AND/OR/NOT logic
- Composability: Merge and extend filters
- Reusability: Define base filters, extend them
- Type-safe: AST provides structure
- Optimizable: Can add pushdown/optimization later

---

## 5e. Model/Engine Separation (Medium Priority)

**Goal:** Separate semantic model definition from query engine runtime

**Estimated Effort:** 6-8 hours

### Current Problem

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

### Proposed Solution

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

### Usage Examples

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

### Implementation Steps

1. Define `SemanticModel` type
2. Define `Engine` interface
3. Implement `createEngine` factory function
4. Implement `Engine.extend()` for composition
5. Update `QueryBuilder` to receive engine in constructor
6. Migrate all demos to use engine pattern
7. Update documentation

### Benefits

- Dependency injection: Model is explicit parameter
- Multiple models: Different views over same data
- Extension: `extend()` enables composition
- Reusability: Inject same model in different contexts
- Testability: Easy to mock models

---

## 5f. DSL Helpers for Definitions (Medium Priority)

**Goal:** Reduce boilerplate with builder helpers

**Estimated Effort:** 4-6 hours

### Current Problem

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

### Proposed Solution

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

### Usage Examples

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

### Implementation Steps

1. Create `attr` builder namespace
2. Create `measure` builder namespace
3. Create `metric` builder namespace (extends 5b)
4. Add validation helpers (check column exists in table)
5. Migrate demo definitions to use builders
6. Update documentation with examples

### Benefits

- Less boilerplate (column defaults to name)
- Reusable patterns (sum, avg, count)
- Type-safe (builders enforce structure)
- Discoverable (IDE autocomplete)
- Extensible (add custom builders)

---

## 5g. Composition Testing (Lower Priority)

**Goal:** Add tests that exercise composability, not just individual features

**Estimated Effort:** 6-8 hours

### Current Problem

```typescript
// Current tests focus on individual features
test('simple metric evaluation', () => { ... });
test('derived metric evaluation', () => { ... });
test('YTD transform', () => { ... });

// Missing: tests that compose multiple features
// Missing: tests that verify composition equivalence
// Missing: tests for builder patterns
```

### Proposed Test Categories

#### 1. Transform Composition Tests

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

#### 2. Query Builder Composition Tests

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

#### 3. Metric Combinator Tests

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

#### 4. Filter Composition Tests

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

#### 5. End-to-End Composition Tests

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

### Implementation Steps

1. Create new test file: `semanticEngine.composition.test.js`
2. Add transform composition tests
3. Add query builder composition tests
4. Add metric combinator tests
5. Add filter composition tests
6. Add end-to-end integration tests
7. Update TEST_PLAN.md with composition test coverage

### Benefits

- Verify composition equivalence
- Catch composition bugs early
- Document composition patterns
- Ensure reusable components work together
- Guide API design with use cases

---

## Phase 5 Summary

### Implementation Order

1. **5e. Model/Engine Separation** (6-8h) - Foundation for everything else
2. **5a. Query Builder Pattern** (6-8h) - Core UX improvement
3. **5c. Composable Transforms** (4-6h) - Quick win, builds on existing
4. **5b. Metric Combinators** (10-12h) - Largest refactor, most impactful
5. **5f. DSL Helpers** (4-6h) - Polish after core is done
6. **5d. Filter Expression Language** (8-10h) - Advanced feature
7. **5g. Composition Testing** (6-8h) - Continuous throughout

### Breaking Changes

- `runQuery` function signature changes (replaced with engine.query())
- Metric types unified (tagged union → functional interface)
- Filter context may accept AST instead of plain objects
- Transform signatures updated to accept `MetricContext`

### Backward Compatibility Strategy

- Provide adapter layer for old `runQuery` calls
- Support both plain objects and filter AST initially
- Deprecation warnings for old patterns
- Migration guide with examples

### Success Criteria

- ✅ Query builder enables incremental, reusable queries
- ✅ All metric types unified behind single eval interface
- ✅ Transforms composable with `composeTransforms`
- ✅ Filters support AND/OR/NOT logic
- ✅ Model separated from engine runtime
- ✅ DSL helpers reduce boilerplate by 30%+
- ✅ Composition tests pass for all patterns
- ✅ Documentation updated with new patterns

---

**End of Phase 5 Specification**
