// semanticEngine.ts
// POC semantic metrics engine with simple, expression, derived, contextTransform
//
// This version uses LINQ.js for powerful, composable query operations.
// LINQ.js provides 100+ operators for filtering, projection, aggregation, and more.

import Enumerable from './linq.js';

/**
 * Basic row type for facts/dimensions.
 */
export type Row = Record<string, any>;

/**
 * Filter context types:
 * - primitive equality (year = 2025, regionId = 'NA')
 * - range/comparison for numeric-like fields (month <= 6, etc.)
 */
export type FilterPrimitive = string | number | boolean;
export interface FilterRange {
  from?: number;
  to?: number;
  gte?: number;
  lte?: number;
  gt?: number;
  lt?: number;
}
export type FilterValue = FilterPrimitive | FilterRange;
export type FilterContext = Record<string, FilterValue>;

/* --------------------------------------------------------------------------
 * Phase 5: Filter Expression Language
 * AST-based composable filters with AND/OR/NOT logic
 * -------------------------------------------------------------------------- */

export type ScalarOp = 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'in';

/**
 * Filter expression node (leaf node in the filter tree)
 */
export interface FilterExpression {
  kind: 'expression';
  field: string;
  op: ScalarOp;
  value: any;
  value2?: any; // for 'between'
}

/**
 * Filter conjunction (AND/OR)
 */
export interface FilterConjunction {
  kind: 'and' | 'or';
  filters: Filter[];
}

/**
 * Filter negation (NOT)
 */
export interface FilterNegation {
  kind: 'not';
  filter: Filter;
}

/**
 * Filter AST type
 */
export type Filter = FilterExpression | FilterConjunction | FilterNegation;

/**
 * Filter builder API
 */
export const f = {
  eq: (field: string, value: any): FilterExpression => ({
    kind: 'expression',
    field,
    op: 'eq',
    value
  }),

  lt: (field: string, value: any): FilterExpression => ({
    kind: 'expression',
    field,
    op: 'lt',
    value
  }),

  lte: (field: string, value: any): FilterExpression => ({
    kind: 'expression',
    field,
    op: 'lte',
    value
  }),

  gt: (field: string, value: any): FilterExpression => ({
    kind: 'expression',
    field,
    op: 'gt',
    value
  }),

  gte: (field: string, value: any): FilterExpression => ({
    kind: 'expression',
    field,
    op: 'gte',
    value
  }),

  between: (field: string, from: any, to: any): FilterExpression => ({
    kind: 'expression',
    field,
    op: 'between',
    value: from,
    value2: to
  }),

  in: (field: string, values: any[]): FilterExpression => ({
    kind: 'expression',
    field,
    op: 'in',
    value: values
  }),

  and: (...filters: Filter[]): FilterConjunction => ({
    kind: 'and',
    filters
  }),

  or: (...filters: Filter[]): FilterConjunction => ({
    kind: 'or',
    filters
  }),

  not: (filter: Filter): FilterNegation => ({
    kind: 'not',
    filter
  })
};

/**
 * Compile a filter AST into a predicate function
 */
export function compileFilter(filter: Filter): (row: Row) => boolean {
  switch (filter.kind) {
    case 'expression': {
      const { field, op, value, value2 } = filter;
      return (row: Row) => {
        const fieldValue = row[field];
        switch (op) {
          case 'eq':
            return fieldValue === value;
          case 'lt':
            return fieldValue < value;
          case 'lte':
            return fieldValue <= value;
          case 'gt':
            return fieldValue > value;
          case 'gte':
            return fieldValue >= value;
          case 'between':
            return fieldValue >= value && fieldValue <= value2!;
          case 'in':
            return (value as any[]).includes(fieldValue);
          default:
            const exhaustiveCheck: never = op;
            throw new Error(`Unknown operator: ${exhaustiveCheck}`);
        }
      };
    }

    case 'and': {
      const predicates = filter.filters.map(compileFilter);
      return (row: Row) => predicates.every(p => p(row));
    }

    case 'or': {
      const predicates = filter.filters.map(compileFilter);
      return (row: Row) => predicates.some(p => p(row));
    }

    case 'not': {
      const predicate = compileFilter(filter.filter);
      return (row: Row) => !predicate(row);
    }

    default: {
      const exhaustiveCheck: never = filter;
      throw new Error(`Unknown filter kind: ${(exhaustiveCheck as any).kind}`);
    }
  }
}

/**
 * Apply filter AST to rows
 */
export function applyFilter(
  rows: Enumerable.IEnumerable<Row>,
  filter: Filter
): Enumerable.IEnumerable<Row> {
  const predicate = compileFilter(filter);
  return rows.where(predicate);
}

/**
 * Table definition: describes a table's schema and relationships.
 * Phase 2: Unified table model - no distinction between dimensions and facts.
 */
export interface TableDefinition {
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

export type TableRegistry = Record<string, TableDefinition>;

/**
 * In-memory DB: unified table storage.
 * Phase 2: All tables (formerly "dimensions" and "facts") are stored together.
 * This is a POC dataset; in a real app you'd wire your own.
 */
export interface InMemoryDb {
  tables: Record<string, Row[]>;
}


/**
 * Phase 2: Semantic Layer - Attribute Definitions
 * Attributes define how to slice and dice the data.
 */
export interface AttributeDefinition {
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

export type AttributeRegistry = Record<string, AttributeDefinition>;

/**
 * Phase 2: Semantic Layer - Measure Definitions
 * Measures define how to aggregate columns.
 */
export interface MeasureDefinition {
  name: string;              // Unique measure ID
  table: string;             // Source table
  column: string;            // Source column
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  format?: string;           // 'currency', 'integer', 'percent'
  description?: string;

  // Optional: Custom aggregation logic
  expression?: (rows: Enumerable.IEnumerable<Row>) => number | null;
}

export type MeasureRegistry = Record<string, MeasureDefinition>;

/**
 * Metric definitions
 */

// Common base for all metric definitions
interface MetricBase {
  /** Unique ID / registry key (not required on type, but used by registry) */
  name: string;
  /** Human description */
  description?: string;
  /** Suggested format (currency, integer, percent, etc.) */
  format?: string;
}

/**
 * Phase 2: Simple metric - wraps a measure from the measure registry.
 */
export interface SimpleMetric extends MetricBase {
  kind: "simple";
  measure: string;           // Reference to MeasureRegistry
  grain?: string[];          // Optional: restrict to specific attributes
}

/**
 * Metric evaluated with a custom expression over the filtered fact rows.
 */
export interface ExpressionMetric extends MetricBase {
  kind: "expression";
  factTable: string;
  /**
   * Metric grain; controls which filters are respected/ignored.
   * If omitted, defaults to the fact table's grain.
   */
  grain?: string[];
  /**
   * Custom aggregator: receives a LINQ.js enumerable over filtered fact rows.
   * Returns a numeric value or null.
   */
  expression: (rows: Enumerable.IEnumerable<Row>, db: InMemoryDb, context: FilterContext) => number | null;
}

/**
 * Metric that depends on other metrics.
 * The engine evaluates its dependencies first.
 */
export interface DerivedMetric extends MetricBase {
  kind: "derived";
  dependencies: string[]; // metric IDs
  evalFromDeps: (
    depValues: Record<string, number | null>,
    db: InMemoryDb,
    context: FilterContext
  ) => number | null;
}

/**
 * Metric that wraps another metric and applies a context transform
 * (e.g., YTD, LastYear, YTDLastYear).
 */
export interface ContextTransformMetric extends MetricBase {
  kind: "contextTransform";
  baseMeasure: string;   // metric ID
  transform: string;     // key into ContextTransformsRegistry
}

/**
 * Union of all metric definitions.
 */
export type MetricDefinition =
  | SimpleMetric
  | ExpressionMetric
  | DerivedMetric
  | ContextTransformMetric;

/**
 * Metric registry: id -> metric definition.
 */
export type MetricRegistry = Record<string, MetricDefinition>;

/* --------------------------------------------------------------------------
 * Phase 5: New Functional Metric System
 * Unified metric interface using function composition
 * -------------------------------------------------------------------------- */

/**
 * Phase 5: Metric context passed to metric evaluation functions
 */
export interface MetricContext {
  filter: FilterContext;
  grain: string[];
  db: InMemoryDb;
  measureRegistry: MeasureRegistry;
  metricRegistry: MetricDefRegistry;
}

/**
 * Phase 5: Metric evaluation function signature
 */
export type MetricEval = (ctx: MetricContext) => number | null;

/**
 * Phase 5: New unified metric definition
 * All metrics are now just functions with metadata
 */
export interface MetricDef {
  name: string;
  eval: MetricEval;
  deps?: string[];
  description?: string;
  format?: string;
}

/**
 * Phase 5: New metric registry type (functional)
 */
export type MetricDefRegistry = Record<string, MetricDef>;

/**
 * Context-transform functions (time intelligence, etc.).
 * Input: current filter context
 * Output: transformed filter context
 */
export type ContextTransformFn = (ctx: FilterContext) => FilterContext;
export type ContextTransformsRegistry = Record<string, ContextTransformFn>;

/**
 * Phase 5: Compose multiple transforms into a single transform
 * Transforms are applied left to right (first transform runs first)
 */
export const composeTransforms = (
  ...transforms: ContextTransformFn[]
): ContextTransformFn => {
  return (ctx: FilterContext) => {
    return transforms.reduce((acc, t) => t(acc), ctx);
  };
};

/**
 * Phase 5: Parameterized transform builders
 */

// Shift year by a given offset
export const shiftYear = (offset: number): ContextTransformFn =>
  (ctx: FilterContext) => {
    if (ctx.year == null) return ctx;
    return { ...ctx, year: Number(ctx.year) + offset };
  };

// Shift month by a given offset
export const shiftMonth = (offset: number): ContextTransformFn =>
  (ctx: FilterContext) => {
    if (ctx.month == null) return ctx;
    return { ...ctx, month: Number(ctx.month) + offset };
  };

// Rolling window of N months
export const rollingMonths = (count: number): ContextTransformFn =>
  (ctx: FilterContext) => {
    if (ctx.month == null) return ctx;
    const currentMonth = Number(ctx.month);
    return {
      ...ctx,
      month: { gte: currentMonth - count + 1, lte: currentMonth }
    };
  };

/* --------------------------------------------------------------------------
 * Phase 5: Metric Constructor Functions
 * Factory functions for creating functional metrics
 * -------------------------------------------------------------------------- */

/**
 * Phase 5: Helper to evaluate a measure in a given context
 */
export function evaluateMeasure(
  measureName: string,
  ctx: MetricContext
): number | null {
  const measureDef = ctx.measureRegistry[measureName];
  if (!measureDef) {
    throw new Error(`Unknown measure: ${measureName}`);
  }

  const rows = ctx.db.tables[measureDef.table];
  if (!rows) {
    throw new Error(`Missing rows for table: ${measureDef.table}`);
  }

  const filteredRows = applyContextToFact(rows, ctx.filter, ctx.grain);

  if (measureDef.expression) {
    return measureDef.expression(filteredRows);
  }

  const col = measureDef.column;
  switch (measureDef.aggregation) {
    case "sum":
      return filteredRows.sum((r: Row) => Number(r[col] ?? 0));
    case "avg":
      return filteredRows.average((r: Row) => Number(r[col] ?? 0));
    case "count":
      return filteredRows.count();
    case "min":
      return filteredRows.min((r: Row) => Number(r[col] ?? 0));
    case "max":
      return filteredRows.max((r: Row) => Number(r[col] ?? 0));
    case "distinct":
      return filteredRows.distinct((r: Row) => r[col]).count();
    default:
      throw new Error(`Unsupported aggregation: ${measureDef.aggregation}`);
  }
}

/**
 * Phase 5: Helper to evaluate metric dependencies
 */
export function evaluateDependencies(
  deps: string[],
  ctx: MetricContext
): Record<string, number | null> {
  const depValues: Record<string, number | null> = {};
  for (const dep of deps) {
    const depMetric = ctx.metricRegistry[dep];
    if (!depMetric) {
      throw new Error(`Unknown dependency metric: ${dep}`);
    }
    depValues[dep] = depMetric.eval(ctx);
  }
  return depValues;
}

/**
 * Phase 5: Simple metric constructor
 * Wraps a measure from the measure registry
 */
export function simpleMetric(opts: {
  name: string;
  measure: string;
  grain?: string[];
  description?: string;
  format?: string;
}): MetricDef {
  return {
    name: opts.name,
    description: opts.description ?? `Simple metric wrapping ${opts.measure}`,
    format: opts.format,
    eval: (ctx: MetricContext) => {
      const grain = opts.grain ?? ctx.grain;
      return evaluateMeasure(
        opts.measure,
        { ...ctx, grain }
      );
    }
  };
}

/**
 * Phase 5: Expression metric constructor
 * Evaluates a custom expression over filtered rows
 */
export function expressionMetric(opts: {
  name: string;
  table: string;
  grain?: string[];
  expression: (rows: Enumerable.IEnumerable<Row>, ctx: MetricContext) => number | null;
  description?: string;
  format?: string;
}): MetricDef {
  return {
    name: opts.name,
    description: opts.description,
    format: opts.format,
    eval: (ctx: MetricContext) => {
      const rows = ctx.db.tables[opts.table];
      if (!rows) {
        throw new Error(`Missing rows for table: ${opts.table}`);
      }

      const grain = opts.grain ?? Object.keys(rows[0] || {});
      const filteredRows = applyContextToFact(rows, ctx.filter, grain);
      return opts.expression(filteredRows, ctx);
    }
  };
}

/**
 * Phase 5: Derived metric constructor
 * Combines values from other metrics
 */
export function derivedMetric(opts: {
  name: string;
  deps: string[];
  combine: (values: Record<string, number | null>) => number | null;
  description?: string;
  format?: string;
}): MetricDef {
  return {
    name: opts.name,
    deps: opts.deps,
    description: opts.description,
    format: opts.format,
    eval: (ctx: MetricContext) => {
      const depValues = evaluateDependencies(opts.deps, ctx);
      return opts.combine(depValues);
    }
  };
}

/**
 * Phase 5: Context transform metric constructor
 * Applies a transform to the context before evaluating a base metric
 */
export function contextTransformMetric(opts: {
  name: string;
  baseMetric: string;
  transform: ContextTransformFn;
  description?: string;
  format?: string;
}): MetricDef {
  return {
    name: opts.name,
    deps: [opts.baseMetric],
    description: opts.description,
    format: opts.format,
    eval: (ctx: MetricContext) => {
      const baseMetric = ctx.metricRegistry[opts.baseMetric];
      if (!baseMetric) {
        throw new Error(`Unknown base metric: ${opts.baseMetric}`);
      }

      const transformedContext: MetricContext = {
        ...ctx,
        filter: opts.transform(ctx.filter)
      };

      return baseMetric.eval(transformedContext);
    }
  };
}

/* --------------------------------------------------------------------------
 * Phase 5: Higher-Order Metric Builders
 * -------------------------------------------------------------------------- */

/**
 * Generate YTD metric for any base metric
 */
export function makeYtdMetric(
  baseName: string,
  ytdTransform: ContextTransformFn
): MetricDef {
  return contextTransformMetric({
    name: `${baseName}YTD`,
    baseMetric: baseName,
    transform: ytdTransform,
    description: `Year-to-date ${baseName}`
  });
}

/**
 * Generate YoY (Year-over-Year) metric
 */
export function makeYoYMetric(baseName: string): MetricDef {
  return derivedMetric({
    name: `${baseName}YoY`,
    deps: [baseName, `${baseName}LastYear`],
    combine: (values) => {
      const current = values[baseName];
      const prior = values[`${baseName}LastYear`];
      if (prior == null || prior === 0) return null;
      if (current == null) return null;
      return ((current - prior) / prior) * 100;
    },
    description: `Year-over-year change for ${baseName}`,
    format: 'percent'
  });
}

/* --------------------------------------------------------------------------
 * Phase 5: DSL Helpers for Definitions
 * Builder helpers to reduce boilerplate
 * -------------------------------------------------------------------------- */

/**
 * Attribute builder helpers
 */
export const attr = {
  /**
   * Create a simple ID attribute
   */
  id: (opts: {
    name: string;
    table: string;
    column?: string;
    description?: string;
    displayName?: string;
  }): AttributeDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    description: opts.description,
    displayName: opts.displayName,
  }),

  /**
   * Create a derived attribute with custom expression
   */
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

  /**
   * Create a formatted attribute
   */
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

/**
 * Measure builder helpers
 */
export const measure = {
  /**
   * Create a sum measure
   */
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

  /**
   * Create an average measure
   */
  avg: (opts: {
    name: string;
    table: string;
    column?: string;
    format?: string;
    description?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    aggregation: 'avg',
    format: opts.format,
    description: opts.description,
  }),

  /**
   * Create a count measure
   */
  count: (opts: {
    name: string;
    table: string;
    description?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: 'id',
    aggregation: 'count',
    format: 'integer',
    description: opts.description,
  }),

  /**
   * Create a min measure
   */
  min: (opts: {
    name: string;
    table: string;
    column?: string;
    format?: string;
    description?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    aggregation: 'min',
    format: opts.format,
    description: opts.description,
  }),

  /**
   * Create a max measure
   */
  max: (opts: {
    name: string;
    table: string;
    column?: string;
    format?: string;
    description?: string;
  }): MeasureDefinition => ({
    name: opts.name,
    table: opts.table,
    column: opts.column ?? opts.name,
    aggregation: 'max',
    format: opts.format,
    description: opts.description,
  }),
};

/**
 * Metric builder helpers namespace
 * Combines Phase 5 metric constructors with higher-order builders
 */
export const metric = {
  simple: simpleMetric,
  derived: derivedMetric,
  expression: expressionMetric,
  transform: contextTransformMetric,
  ytd: makeYtdMetric,
  yoy: makeYoYMetric,
};

/**
 * Phase 5: Semantic Model - bundles all registries together
 */
export interface SemanticModel {
  tables: TableRegistry;
  attributes: AttributeRegistry;
  measures: MeasureRegistry;
  metrics: MetricRegistry;
  transforms: ContextTransformsRegistry;
}

/**
 * Phase 5: Query Builder interface (forward declaration)
 */
export interface QueryBuilder {
  addAttributes(...attrs: string[]): QueryBuilder;
  addMetrics(...metrics: string[]): QueryBuilder;
  where(partial: FilterContext): QueryBuilder;
  build(): QuerySpec;
  run(): Row[];
}

/**
 * Phase 5: Query specification
 */
export interface QuerySpec {
  attributes: string[];
  metrics: string[];
  filters?: FilterContext;
}

/**
 * Phase 5: Engine interface - provides query capabilities over a semantic model
 */
export interface Engine {
  query(): QueryBuilder;
  getMetric(name: string): MetricDefinition | undefined;
  listMetrics(): MetricDefinition[];
  getMeasure(name: string): MeasureDefinition | undefined;
  getAttribute(name: string): AttributeDefinition | undefined;
  extend(partial: Partial<SemanticModel>): Engine;
}

/**
 * Formatting helper: interpret a numeric value using metric format.
 */
export function formatValue(value: number | null | undefined, format?: string): string | null {
  if (value == null || Number.isNaN(value)) return null;
  const n = Number(value);
  switch (format) {
    case "currency":
      return `$${n.toFixed(2)}`;
    case "integer":
      return n.toFixed(0);
    case "percent":
      return `${n.toFixed(2)}%`;
    default:
      return String(n);
  }
}

/**
 * Helpers for filter application to fact rows.
 */

// Match a value to a filter (primitive or range/comparison)
export function matchesFilter(value: any, filter: FilterValue): boolean {
  if (
    filter != null &&
    typeof filter === "object" &&
    !Array.isArray(filter)
  ) {
    const f = filter as FilterRange;

    if ("from" in f || "to" in f) {
      if (f.from != null && value < f.from) return false;
      if (f.to != null && value > f.to) return false;
      return true;
    }

    if (f.gte != null && value < f.gte) return false;
    if (f.lte != null && value > f.lte) return false;
    if (f.gt != null && value <= f.gt) return false;
    if (f.lt != null && value >= f.lt) return false;
    return true;
  }

  // Primitive equality
  return value === filter;
}

/**
 * Apply a filter context to a fact table,
 * respecting only the dimensions in `grain`.
 */
export function applyContextToFact(
  rows: Row[],
  context: FilterContext,
  grain: string[]
): Enumerable.IEnumerable<Row> {
  let query = Enumerable.from(rows);

  Object.entries(context || {}).forEach(([key, filter]) => {
    if (filter === undefined || filter === null) return;
    if (!grain.includes(key)) return; // ignore filters this metric doesn't care about

    query = query.where((r: Row) => matchesFilter(r[key], filter));
  });

  return query;
}

/**
 * Pick a subset of keys from an object.
 */
export function pick(obj: Row, keys: string[]): Row {
  const out: Row = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}


/**
 * Metric evaluation engine
 */

function cacheKey(metricName: string, context: FilterContext): string {
  return `${metricName}::${JSON.stringify(context || {})}`;
}

/**
 * Evaluate a single metric with context and cache.
 */
export function evaluateMetric(
  metricName: string,
  db: InMemoryDb,
  metricRegistry: MetricRegistry,
  context: FilterContext,
  transforms: ContextTransformsRegistry,
  cache: Map<string, number | null> = new Map(),
  measureRegistry?: MeasureRegistry
): number | null {
  const key = cacheKey(metricName, context);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const def = metricRegistry[metricName];
  if (!def) {
    throw new Error(`Unknown metric: ${metricName}`);
  }

  let value: number | null;

  if (def.kind === "simple") {
    // Phase 2: Simple metric - resolve from measure registry
    if (!measureRegistry) {
      throw new Error(`MeasureRegistry required for simple metrics`);
    }

    const measureDef = measureRegistry[def.measure];
    if (!measureDef) {
      throw new Error(`Unknown measure: ${def.measure}`);
    }

    const rows = db.tables[measureDef.table];
    if (!rows) throw new Error(`Missing rows for table: ${measureDef.table}`);

    // Use metric grain if specified, otherwise use all table columns as grain
    const grain = def.grain ?? Object.keys(rows[0] || {});
    const filteredRows = applyContextToFact(rows, context, grain);

    // Apply aggregation based on measure definition
    if (measureDef.expression) {
      value = measureDef.expression(filteredRows);
    } else {
      const col = measureDef.column;
      switch (measureDef.aggregation) {
        case "sum":
          value = filteredRows.sum((r: Row) => Number(r[col] ?? 0));
          break;
        case "avg":
          value = filteredRows.average((r: Row) => Number(r[col] ?? 0));
          break;
        case "count":
          value = filteredRows.count();
          break;
        case "min":
          value = filteredRows.min((r: Row) => Number(r[col] ?? 0));
          break;
        case "max":
          value = filteredRows.max((r: Row) => Number(r[col] ?? 0));
          break;
        case "distinct":
          value = filteredRows.distinct((r: Row) => r[col]).count();
          break;
        default:
          throw new Error(`Unsupported aggregation: ${measureDef.aggregation}`);
      }
    }

  } else if (def.kind === "expression") {
    const rows = db.tables[def.factTable];
    if (!rows) throw new Error(`Missing rows for fact table: ${def.factTable}`);

    // Use metric grain if specified, otherwise use all table columns as grain
    const grain = def.grain ?? Object.keys(rows[0] || {});
    const q = applyContextToFact(rows, context, grain);
    value = def.expression(q, db, context);

  } else if (def.kind === "derived") {
    const depValues: Record<string, number | null> = {};
    for (const dep of def.dependencies) {
      depValues[dep] = evaluateMetric(
        dep,
        db,
        metricRegistry,
        context,
        transforms,
        cache,
        measureRegistry
      );
    }
    value = def.evalFromDeps(depValues, db, context);

  } else if (def.kind === "contextTransform") {
    const transformFn = transforms[def.transform];
    if (!transformFn) {
      throw new Error(`Unknown context transform: ${def.transform}`);
    }
    const transformedContext = transformFn(context || {});
    value = evaluateMetric(
      def.baseMeasure,
      db,
      metricRegistry,
      transformedContext,
      transforms,
      cache,
      measureRegistry
    );
  } else {
    const exhaustiveCheck: never = def;
    throw new Error(`Unknown metric kind: ${(exhaustiveCheck as any).kind}`);
  }

  cache.set(key, value);
  return value;
}

/**
 * Evaluate multiple metrics together, sharing a cache.
 */
export function evaluateMetrics(
  metricNames: string[],
  db: InMemoryDb,
  metricRegistry: MetricRegistry,
  context: FilterContext,
  transforms: ContextTransformsRegistry,
  measureRegistry?: MeasureRegistry
): Record<string, number | null> {
  const cache = new Map<string, number | null>();
  const results: Record<string, number | null> = {};
  for (const m of metricNames) {
    results[m] = evaluateMetric(
      m,
      db,
      metricRegistry,
      context,
      transforms,
      cache,
      measureRegistry
    );
  }
  return results;
}

/**
 * Query options using attributes from the semantic layer.
 */
export interface RunQueryOptions {
  attributes: string[];   // Attribute names (can come from any table)
  filters?: FilterContext;
  metrics: string[];      // Metric IDs
}

/**
 * Enhanced query engine using the semantic layer.
 * Uses attributes and measures instead of direct table references.
 */
export function runQuery(
  db: InMemoryDb,
  tableRegistry: TableRegistry,
  attributeRegistry: AttributeRegistry,
  measureRegistry: MeasureRegistry,
  metricRegistry: MetricRegistry,
  transforms: ContextTransformsRegistry,
  options: RunQueryOptions
): Row[] {
  const { attributes: attrNames, filters = {}, metrics } = options;

  // Determine the primary table based on attributes
  // For now, use the first attribute's table as the primary table
  // In a full implementation, this would use a more sophisticated algorithm
  if (attrNames.length === 0) {
    throw new Error('At least one attribute is required');
  }

  const primaryAttr = attributeRegistry[attrNames[0]];
  if (!primaryAttr) {
    throw new Error(`Unknown attribute: ${attrNames[0]}`);
  }

  const primaryTable = primaryAttr.table;
  const tableRows = db.tables[primaryTable];
  if (!tableRows) {
    throw new Error(`Missing rows for table: ${primaryTable}`);
  }

  // Apply filters to get distinct attribute combinations
  const tableGrain = Object.keys(tableRows[0] || {});
  const filtered = applyContextToFact(tableRows, filters, tableGrain);

  // Extract attribute columns from the primary table
  const attrColumns: string[] = [];
  const attrDefs: Record<string, AttributeDefinition> = {};

  for (const attrName of attrNames) {
    const attrDef = attributeRegistry[attrName];
    if (!attrDef) {
      throw new Error(`Unknown attribute: ${attrName}`);
    }
    attrDefs[attrName] = attrDef;
    attrColumns.push(attrDef.column);
  }

  // Group by attribute combinations
  const groups = filtered
    .groupBy(
      (r: Row) => JSON.stringify(pick(r, attrColumns)),
      (r: Row) => r
    )
    .toArray();

  const cache = new Map<string, number | null>();
  const result: Row[] = [];

  for (const g of groups) {
    const keyObj: Row = JSON.parse(g.key());

    // Build the row context from filters and attribute values
    const rowContext: FilterContext = {
      ...filters,
      ...keyObj,
    };

    // Build the output row with attribute values
    const outputRow: Row = {};

    // Add attribute values (with transformations if specified)
    for (const attrName of attrNames) {
      const attrDef = attrDefs[attrName];
      const rawValue = keyObj[attrDef.column];

      if (attrDef.expression) {
        // Use expression if defined
        outputRow[attrName] = attrDef.expression({ [attrDef.column]: rawValue });
      } else if (attrDef.format) {
        // Apply format if defined
        outputRow[attrName] = attrDef.format(rawValue);
      } else {
        // Use raw value
        outputRow[attrName] = rawValue;
      }

      // Add display name if specified (simplified - would need proper join in production)
      if (attrDef.displayName) {
        // For now, we'll use the existing dimension enrichment logic
        // In a full implementation, this would traverse relationships
        const relatedTableName = attrDef.displayName.replace(/Name$/, 's');
        const relatedTable = db.tables[relatedTableName];

        if (relatedTable) {
          const relatedKey = attrDef.column;
          const match = relatedTable.find((r: Row) => r[relatedKey] === rawValue);
          if (match && match.name) {
            outputRow[attrDef.displayName] = match.name;
          }
        }
      }
    }

    // Evaluate metrics
    const metricValues: Row = {};
    for (const m of metrics) {
      const numericValue = evaluateMetric(
        m,
        db,
        metricRegistry,
        rowContext,
        transforms,
        cache,
        measureRegistry
      );
      const def = metricRegistry[m];
      metricValues[m] = formatValue(numericValue, def.format);
    }

    result.push({
      ...outputRow,
      ...metricValues,
    });
  }

  return result;
}

/* --------------------------------------------------------------------------
 * Phase 5: Query Builder and Engine Implementation
 * -------------------------------------------------------------------------- */

/**
 * QueryBuilder implementation with immutable builder pattern
 */
class QueryBuilderImpl implements QueryBuilder {
  private spec: QuerySpec;

  constructor(
    private db: InMemoryDb,
    private model: SemanticModel,
    spec?: QuerySpec
  ) {
    this.spec = spec || {
      attributes: [],
      metrics: [],
      filters: {}
    };
  }

  addAttributes(...attrs: string[]): QueryBuilder {
    return new QueryBuilderImpl(this.db, this.model, {
      ...this.spec,
      attributes: [...this.spec.attributes, ...attrs]
    });
  }

  addMetrics(...metrics: string[]): QueryBuilder {
    return new QueryBuilderImpl(this.db, this.model, {
      ...this.spec,
      metrics: [...this.spec.metrics, ...metrics]
    });
  }

  where(partial: FilterContext): QueryBuilder {
    return new QueryBuilderImpl(this.db, this.model, {
      ...this.spec,
      filters: { ...this.spec.filters, ...partial }
    });
  }

  build(): QuerySpec {
    return { ...this.spec };
  }

  run(): Row[] {
    return runQuery(
      this.db,
      this.model.tables,
      this.model.attributes,
      this.model.measures,
      this.model.metrics,
      this.model.transforms,
      {
        attributes: this.spec.attributes,
        filters: this.spec.filters,
        metrics: this.spec.metrics
      }
    );
  }
}

/**
 * Phase 5: Create an Engine instance from a database and semantic model
 */
export function createEngine(
  db: InMemoryDb,
  model: SemanticModel
): Engine {
  return {
    query(): QueryBuilder {
      return new QueryBuilderImpl(db, model);
    },

    getMetric(name: string): MetricDefinition | undefined {
      return model.metrics[name];
    },

    listMetrics(): MetricDefinition[] {
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
        tables: partial.tables ?? model.tables,
        attributes: { ...model.attributes, ...(partial.attributes || {}) },
        measures: { ...model.measures, ...(partial.measures || {}) },
        metrics: { ...model.metrics, ...(partial.metrics || {}) },
        transforms: { ...model.transforms, ...(partial.transforms || {}) }
      });
    }
  };
}

/* --------------------------------------------------------------------------
 * BELOW: POC DATA + METRIC REGISTRY + DEMO USAGE
 * You can move this into a separate file in a real project.
 * -------------------------------------------------------------------------- */

/**
 * Example in-memory DB for the POC.
 * Phase 2: All tables unified under 'tables' property.
 */
export const demoDb: InMemoryDb = {
  tables: {
    products: [
      { productId: 1, name: "Widget A" },
      { productId: 2, name: "Widget B" },
    ],
    regions: [
      { regionId: "NA", name: "North America" },
      { regionId: "EU", name: "Europe" },
    ],
    sales: [
      // 2024
      { year: 2024, month: 1, regionId: "NA", productId: 1, quantity: 7, amount: 700 },
      { year: 2024, month: 1, regionId: "NA", productId: 2, quantity: 4, amount: 480 },
      { year: 2024, month: 2, regionId: "NA", productId: 1, quantity: 5, amount: 650 },
      { year: 2024, month: 2, regionId: "EU", productId: 1, quantity: 3, amount: 420 },

      // 2025
      { year: 2025, month: 1, regionId: "NA", productId: 1, quantity: 10, amount: 1000 },
      { year: 2025, month: 1, regionId: "NA", productId: 2, quantity: 5, amount: 600 },
      { year: 2025, month: 1, regionId: "EU", productId: 1, quantity: 4, amount: 500 },
      { year: 2025, month: 2, regionId: "NA", productId: 1, quantity: 8, amount: 950 },
      { year: 2025, month: 2, regionId: "EU", productId: 2, quantity: 3, amount: 450 },
    ],
    budget: [
      { year: 2024, regionId: "NA", budgetAmount: 1500 },
      { year: 2024, regionId: "EU", budgetAmount: 1000 },
      { year: 2025, regionId: "NA", budgetAmount: 2200 },
      { year: 2025, regionId: "EU", budgetAmount: 1600 },
    ],
  },
};

/**
 * Example table definitions for the POC.
 * Phase 2: Defines schema and relationships for all tables.
 */
export const demoTableDefinitions: TableRegistry = {
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
  },

  budget: {
    name: 'budget',
    columns: {
      year: { dataType: 'number' },
      regionId: { dataType: 'string' },
      budgetAmount: { dataType: 'number' }
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

/**
 * Example attribute registry for the POC.
 * Phase 2: Attributes define how to slice/group the data.
 */
export const demoAttributes: AttributeRegistry = {
  year: {
    name: 'year',
    table: 'sales',
    column: 'year',
    description: 'Year dimension'
  },

  month: {
    name: 'month',
    table: 'sales',
    column: 'month',
    description: 'Month dimension'
  },

  regionId: {
    name: 'regionId',
    table: 'sales',
    column: 'regionId',
    displayName: 'regionName',  // Auto-join to regions.name
    description: 'Region identifier'
  },

  productId: {
    name: 'productId',
    table: 'sales',
    column: 'productId',
    displayName: 'productName',  // Auto-join to products.name
    description: 'Product identifier'
  }
};

/**
 * Example measure registry for the POC.
 * Phase 2: Measures define how to aggregate data.
 */
export const demoMeasures: MeasureRegistry = {
  salesAmount: {
    name: 'salesAmount',
    table: 'sales',
    column: 'amount',
    aggregation: 'sum',
    format: 'currency',
    description: 'Total sales amount'
  },

  salesQuantity: {
    name: 'salesQuantity',
    table: 'sales',
    column: 'quantity',
    aggregation: 'sum',
    format: 'integer',
    description: 'Total sales quantity'
  },

  avgOrderSize: {
    name: 'avgOrderSize',
    table: 'sales',
    column: 'amount',
    aggregation: 'avg',
    format: 'currency',
    description: 'Average order size'
  },

  orderCount: {
    name: 'orderCount',
    table: 'sales',
    column: 'quantity',
    aggregation: 'count',
    format: 'integer',
    description: 'Number of orders'
  },

  budgetAmount: {
    name: 'budgetAmount',
    table: 'budget',
    column: 'budgetAmount',
    aggregation: 'sum',
    format: 'currency',
    description: 'Total budget amount'
  }
};


/**
 * Example context transforms (time intelligence).
 * Phase 5: Refactored to use composable transforms
 */

// Base transforms
const ytd: ContextTransformFn = (ctx) => {
  if (ctx.year == null || ctx.month == null) return ctx;
  return { ...ctx, month: { lte: Number(ctx.month) } };
};

const lastYear: ContextTransformFn = (ctx) => {
  if (ctx.year == null) return ctx;
  return { ...ctx, year: Number(ctx.year) - 1 };
};

const priorMonth: ContextTransformFn = (ctx) => {
  if (ctx.month == null) return ctx;
  return { ...ctx, month: Number(ctx.month) - 1 };
};

// Phase 5: Composed transforms using composeTransforms helper
export const demoTransforms: ContextTransformsRegistry = {
  ytd,
  lastYear,
  priorMonth,
  ytdLastYear: composeTransforms(ytd, lastYear),
  priorMonthLastYear: composeTransforms(priorMonth, lastYear),

  // Parameterized transforms
  rolling3Months: rollingMonths(3),
  rolling6Months: rollingMonths(6),
};

/**
 * Example metric registry implementing simple, expression, derived, and contextTransform metrics.
 */
export const demoMetrics: MetricRegistry = {};

/**
 * Helper to register a context-transform metric into a registry.
 */
export function addContextTransformMetric(
  registry: MetricRegistry,
  def: Omit<ContextTransformMetric, "kind">
): void {
  registry[def.name] = {
    kind: "contextTransform",
    ...def,
  };
}

/**
 * Build demo metrics (you can mirror this pattern in your own project).
 */
function buildDemoMetrics() {
  // Phase 2: Simple metrics (using measure registry)
  demoMetrics.revenue = {
    kind: "simple",
    name: "revenue",
    description: "Total revenue from sales",
    measure: "salesAmount",
    format: "currency"
  };

  demoMetrics.quantity = {
    kind: "simple",
    name: "quantity",
    description: "Total quantity sold",
    measure: "salesQuantity",
    format: "integer"
  };

  demoMetrics.budget = {
    kind: "simple",
    name: "budget",
    description: "Total budget amount",
    measure: "budgetAmount",
    format: "currency"
  };

  // Expression metric: price per unit
  demoMetrics.pricePerUnit = {
    kind: "expression",
    name: "pricePerUnit",
    description: "Sales amount / quantity over the current context.",
    factTable: "sales",
    format: "currency",
    expression: (rows: Enumerable.IEnumerable<Row>) => {
      const amount = rows.sum((r: Row) => Number(r.amount ?? 0));
      const qty = rows.sum((r: Row) => Number(r.quantity ?? 0));
      return qty ? amount / qty : null;
    },
  };

  // Derived metric: Sales vs Budget %
  demoMetrics.salesVsBudgetPct = {
    kind: "derived",
    name: "salesVsBudgetPct",
    description: "Total sales / total budget.",
    dependencies: ["revenue", "budget"],
    format: "percent",
    evalFromDeps: ({ revenue, budget }) => {
      const s = revenue ?? 0;
      const b = budget ?? 0;
      if (!b) return null;
      return (s / b) * 100;
    },
  };

  // Time-int metrics (context-transform)
  addContextTransformMetric(demoMetrics, {
    name: "salesAmountYTD",
    baseMeasure: "revenue",
    transform: "ytd",
    description: "YTD of total sales amount.",
    format: "currency",
  });

  addContextTransformMetric(demoMetrics, {
    name: "salesAmountLastYear",
    baseMeasure: "revenue",
    transform: "lastYear",
    description: "Total sales amount for previous year.",
    format: "currency",
  });

  addContextTransformMetric(demoMetrics, {
    name: "salesAmountYTDLastYear",
    baseMeasure: "revenue",
    transform: "ytdLastYear",
    description: "YTD of total sales amount in previous year.",
    format: "currency",
  });

  addContextTransformMetric(demoMetrics, {
    name: "budgetYTD",
    baseMeasure: "budget",
    transform: "ytd",
    description: "YTD of total budget (may match full year if budget is annual).",
    format: "currency",
  });

  addContextTransformMetric(demoMetrics, {
    name: "budgetLastYear",
    baseMeasure: "budget",
    transform: "lastYear",
    description: "Total budget in previous year.",
    format: "currency",
  });

  // Derived YTD comparison metric
  demoMetrics.salesVsBudgetPctYTD = {
    kind: "derived",
    name: "salesVsBudgetPctYTD",
    description: "YTD sales / YTD budget.",
    dependencies: ["salesAmountYTD", "budgetYTD"],
    format: "percent",
    evalFromDeps: ({ salesAmountYTD, budgetYTD }) => {
      const s = salesAmountYTD ?? 0;
      const b = budgetYTD ?? 0;
      if (!b) return null;
      return (s / b) * 100;
    },
  };
}

// Build demo metrics immediately
buildDemoMetrics();

/**
 * Phase 5: Demo semantic model bundling all registries
 */
export const demoSemanticModel: SemanticModel = {
  tables: demoTableDefinitions,
  attributes: demoAttributes,
  measures: demoMeasures,
  metrics: demoMetrics,
  transforms: demoTransforms
};

/**
 * Phase 5: Demo engine instance
 */
export const demoEngine = createEngine(demoDb, demoSemanticModel);

/**
 * DEMO USAGE
 *
 * This is just to illustrate. In a real application you'd likely:
 * - import the library parts
 * - define your own db, attributes, measures, metrics
 * - call runQuery() from your UI / API layer
 */

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const metricBundle = [
    "revenue",
    "quantity",
    "budget",
    "pricePerUnit",
    "salesVsBudgetPct",
    "salesAmountYTD",
    "salesAmountLastYear",
    "salesAmountYTDLastYear",
    "budgetYTD",
    "budgetLastYear",
    "salesVsBudgetPctYTD",
  ];

  console.log("\n=== Demo: 2025-02, Region x Product ===");
  const result1 = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['regionId', 'productId'],
      filters: { year: 2025, month: 2 },
      metrics: metricBundle
    }
  );
  // eslint-disable-next-line no-console
  console.table(result1);

  console.log("\n=== Demo: 2025-02, Region only ===");
  const result2 = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['regionId'],
      filters: { year: 2025, month: 2 },
      metrics: metricBundle
    }
  );
  // eslint-disable-next-line no-console
  console.table(result2);

  console.log("\n=== Demo: 2025-02, Region=NA, by Product ===");
  const result3 = runQuery(
    demoDb,
    demoTableDefinitions,
    demoAttributes,
    demoMeasures,
    demoMetrics,
    demoTransforms,
    {
      attributes: ['productId'],
      filters: { year: 2025, month: 2, regionId: "NA" },
      metrics: metricBundle
    }
  );
  // eslint-disable-next-line no-console
  console.table(result3);

  // Phase 5: Demo new Query Builder pattern
  console.log("\n=== Phase 5 Demo: Query Builder Pattern ===");

  // Reusable base query
  const base2025 = demoEngine.query().where({ year: 2025 });

  // Extend and reuse
  const feb2025ByRegion = base2025
    .where({ month: 2 })
    .addAttributes('regionId')
    .addMetrics('revenue', 'budget', 'salesVsBudgetPct')
    .run();

  console.log("\n=== Phase 5: Feb 2025 by Region (using Query Builder) ===");
  console.table(feb2025ByRegion);

  // CTE-style reusable partials
  const naSales = base2025.where({ regionId: 'NA' });
  const euSales = base2025.where({ regionId: 'EU' });

  const naResult = naSales
    .addAttributes('regionId', 'productId')
    .addMetrics('revenue', 'quantity')
    .run();

  console.log("\n=== Phase 5: NA Sales 2025 (CTE-style) ===");
  console.table(naResult);
}
