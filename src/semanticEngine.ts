// semanticEngine.ts
// POC semantic metrics engine with factMeasure, expression, derived, contextTransform
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

/**
 * Context-transform functions (time intelligence, etc.).
 * Input: current filter context
 * Output: transformed filter context
 */
export type ContextTransformFn = (ctx: FilterContext) => FilterContext;
export type ContextTransformsRegistry = Record<string, ContextTransformFn>;

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
 */
export const demoTransforms: ContextTransformsRegistry = {
  ytd(ctx) {
    if (ctx.year == null || ctx.month == null) return ctx;
    return { ...ctx, month: { lte: Number(ctx.month) } };
  },
  lastYear(ctx) {
    if (ctx.year == null) return ctx;
    return { ...ctx, year: Number(ctx.year) - 1 };
  },
  ytdLastYear(ctx) {
    if (ctx.year == null || ctx.month == null) return ctx;
    return {
      ...ctx,
      year: Number(ctx.year) - 1,
      month: { lte: Number(ctx.month) },
    };
  },
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
}
