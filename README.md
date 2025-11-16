# miniature-fiesta
Semantic Metrics Engine — Proof-of-Concept Design

## Interactive playground

The repo now includes a browser-deliverable playground (`/web`) that bundles the in-memory demo DB
from `src/semanticEngine.ts` into a React + Vite single-page app. The UI ships with:

- A Monaco-based metric editor where you can override or add new metric definitions. Paste a
  JSON array, click **Apply overrides**, and the definitions immediately replace the defaults that
  ship from the README examples. The editor persists to `localStorage` so you can refresh without
  losing custom metrics.
- A visual runner that wraps the existing `runQuery` helper. Pick row dimensions (respecting the
  grain of your fact table), metrics, filters, and run the query against the in-memory dataset.
- A result panel with an interactive table, a selectable bar/line chart fed by the same dataset, and
  expandable blocks that show the request payload plus the raw response rows. This makes it easy to
  reason about how metric grain, filters, and formatting behave.

### Running locally

```
npm install --prefix web
npm run dev --prefix web
```

The site lives at http://localhost:5173/shiny-octo-robot/ when served through Vite. For a production
build run `npm run build` (or `npm run build --prefix web`) and open the contents of `web/dist/`.

### Deploying to GitHub Pages

- `npm run deploy:docs` builds the SPA and copies the static assets into `docs/` for manual GitHub
  Pages hosting if desired.
- `.github/workflows/pages.yml` installs dependencies, runs lint/build tasks, and publishes the `web`
  build to the repository’s GitHub Pages environment on every push to `main`.

Overview

This document describes the design and implementation of a semantic metrics engine — a lightweight library inspired by:
	•	MicroStrategy’s semantic layer (facts, metrics, dimensionality, transformations)
	•	LookML/MetricFlow’s modern metric modeling
	•	Composable operators (YTD, LY, etc.)
	•	Power BI’s dynamic filter-context evaluation

The goal is to provide a flexible, in-memory engine that models:
	•	Reusable dimensions
	•	Configurable fact tables and fact columns
	•	Semantically defined metrics (base, derived, and expression-based)
	•	Reusable, composable time-intelligence transformations
	•	Dynamic level-aware evaluation (metric-level grain)
	•	A simple query API to return dimensioned result sets

This POC does not rely on a database; all data is stored in JSON objects and evaluated via JavaScript and the linq library.

⸻

1. Core Concepts

1.1 Attributes

Attributes represent business entities used for slicing and dicing metric values.

const attributeRegistry = {
  regionId: {
    name: 'regionId',
    table: 'sales',
    column: 'regionId',
    displayName: 'regionName',
    description: 'Region identifier'
  },
  productId: {
    name: 'productId',
    table: 'sales',
    column: 'productId',
    displayName: 'productName',
    description: 'Product identifier'
  },
};

Each attribute:
	•	Has a name and column field
	•	References a source table
	•	Can have a display name for automatic label enrichment

This enables automatic enrichment of result rows with readable labels.

⸻

1.2 Measures

Measures define how to aggregate numeric columns from tables.
Each measure defines:
	•	The source table and column
	•	The aggregation type (sum, avg, count, min, max, distinct)
	•	Display format (currency, integer, percent)

const measureRegistry = {
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
  budgetAmount: {
    name: 'budgetAmount',
    table: 'budget',
    column: 'budgetAmount',
    aggregation: 'sum',
    format: 'currency',
    description: 'Total budget amount'
  },
};

This structure provides:
	•	Reusable measure definitions
	•	Standard aggregation functions
	•	Consistent formatting across metrics

⸻

2. Metric Types

Metrics are semantic objects defined on top of measures or other metrics.

The library supports four metric types.

⸻

2.1 simple — Metric wrapping a measure

Represents a metric that uses a measure from the measure registry.

revenue: {
  kind: 'simple',
  name: 'revenue',
  measure: 'salesAmount',
  grain: ['year','month','regionId','productId'],
  format: 'currency',
  description: 'Total revenue from sales'
}

Properties:
	•	References a measure from the MeasureRegistry
	•	Can optionally specify metric-level grain (controls which filters are respected/ignored)
	•	Inherits aggregation and formatting from the measure definition

This is equivalent to MicroStrategy's simple metrics.

⸻

2.2 expression — Custom expression on raw fact rows

Used when aggregation logic cannot be expressed as a single measure aggregation.

pricePerUnit: {
  kind: 'expression',
  name: 'pricePerUnit',
  factTable: 'sales',
  grain: ['year','month','regionId','productId'],
  expression: (rows) => {
    const amount = rows.sum(r => r.amount);
    const qty    = rows.sum(r => r.quantity);
    return qty ? amount / qty : null;
  },
  format: 'currency',
  description: 'Average price per unit'
}

Examples:
	•	Ratios
	•	Conditional metrics
	•	Multi-column computations

⸻

2.3 derived — Metric composed from other metrics

Represents arithmetic/logical operations between metrics.

salesVsBudgetPct: {
  kind: 'derived',
  name: 'salesVsBudgetPct',
  dependencies: ['revenue', 'budget'],
  format: 'percent',
  description: 'Sales performance vs budget',
  evalFromDeps: ({ revenue, budget }) =>
    budget ? (revenue / budget) * 100 : null,
}

The engine computes dependencies first, then applies the operation.

Equivalent to MicroStrategy compound metrics.

⸻

2.4 contextTransform — Time-int or other context-level operators

These do not manipulate numbers; they manipulate the filter context.

salesAmountYTD: {
  kind: 'contextTransform',
  name: 'salesAmountYTD',
  baseMeasure: 'revenue',
  transform: 'ytd',
  format: 'currency',
  description: 'Year-to-date revenue'
}

This enables powerful and fully composable time intelligence.

⸻

3. Context Transforms (Time Intelligence)

A context transform takes a filter context and returns a modified context.

const contextTransforms = {
  ytd(ctx) {
    if (ctx.year == null || ctx.month == null) return ctx;
    return { ...ctx, month: { lte: ctx.month } };
  },

  lastYear(ctx) {
    if (ctx.year == null) return ctx;
    return { ...ctx, year: ctx.year - 1 };
  },

  ytdLastYear(ctx) {
    if (ctx.year == null || ctx.month == null) return ctx;
    return {
      ...ctx,
      year: ctx.year - 1,
      month: { lte: ctx.month },
    };
  },
};

These operators are reusable across all metrics.

A reusable helper registers new time-int metrics:

addContextTransformMetric(demoMetrics, {
  name: 'salesAmountYTD',
  baseMeasure: 'revenue',
  transform: 'ytd',
  description: 'YTD of total sales amount',
  format: 'currency',
});


⸻

4. Metric-Level Dimensionality (Grain)

A metric defines the set of dimensions in the context that it cares about.

grain: ['year', 'regionId']

During evaluation, filters not included in the metric grain are ignored.

Example:
	•	Metric grain = ['year','regionId']
	•	Filter context = { year:2025, regionId:'NA', productId:1 }

productId filter is ignored.

This models MicroStrategy level metrics:
	•	“At a higher level”
	•	“Ignore certain dimensions”
	•	“Force certain dimensions”

⸻

5. Filter Context Evaluation

The filter context is applied to fact rows by checking each filter only against dimensions in the metric’s grain.

applyContextToFact(rows, context, grain)

Supports:
	•	Equality ({ regionId:'NA' })
	•	Range ({ month: { from:1, to:3 } })
	•	Comparison ({ month: { lte: 6 } })

The library relies on the linq package to filter rows efficiently.

⸻

6. Metric Evaluation Engine

A DAG evaluation engine handles:
	•	Dependency resolution
	•	Context transforms
	•	Fact-measure evaluation
	•	Derived metrics
	•	Caching results per (metric, context)

Metric values are memoized using:

cacheKey = metricName + JSON.stringify(context)

This ensures efficient repeated evaluation.

⸻

7. Query API

The primary entry point for consumers is:

runQuery(
  db,                             // InMemoryDb instance
  tableRegistry,                  // TableRegistry
  attributeRegistry,              // AttributeRegistry
  measureRegistry,                // MeasureRegistry
  metricRegistry,                 // MetricRegistry
  transforms,                     // ContextTransformsRegistry
  {
    attributes: ['regionId', 'productId'],  // attribute names to group by
    filters: {...},                         // global filter context
    metrics: [...metric names],             // metrics to evaluate
  }
);

Steps performed internally:
	1.	Filter the primary table using global context.
	2.	Determine distinct combinations of requested attributes.
	3.	For each combination:
	•	Merge into a row-specific filter context
	•	Evaluate all metrics
	•	Enrich attributes with display names
	•	Format results
	4.	Return an array of row objects.

Example Output

[
  {
    regionId: 'NA',
    regionName: 'North America',
    productId: 1,
    productName: 'Widget A',
    revenue: '$950.00',
    salesAmountYTD: '$1,950.00',
    budget: '$2,200.00',
    salesVsBudgetPct: '43.18%',
    ...
  },
  ...
]


⸻

8. Key Architectural Strengths

✔ Declarative semantic layer

Attributes, measures, and metrics are all explicitly modeled in separate registries.

✔ Metric-level dimensionality (grain)

Each metric can optionally specify which attributes affect it.

✔ Composable time intelligence

Transforms like YTD/LY are reusable across all metrics.

✔ Derived and expression metrics

Support for MSTR-style metric compositions.

✔ Clean separation
	•	Table definitions
	•	Attribute definitions
	•	Measure definitions
	•	Metric logic
	•	Transform logic
	•	Query logic

✔ Works entirely in-memory

Perfect for POCs or small embedded semantic engines.

⸻

9. Possible Extensions

This foundation enables:

A. Hierarchies
	•	Year → Quarter → Month → Day
	•	Region → Country → City

B. Column Axis (Pivot Grids)

Return results in MicroStrategy-style grid format:
	•	Rows × Columns × Metrics

C. Calculation Templates

Reusable metric types:
	•	Percent of total
	•	Moving average (7-day, 30-day)
	•	Rank (dense, ordinal)
	•	Running totals

D. Multiple Fact Table Joining

Fact stitching / conformed dimensions.

E. SQL Pushdown / Remote Execution

Compile semantic queries into SQL or DuckDB.

F. API Exposure

REST, GraphQL, or WASM-based metric service.

⸻

10. Summary

This POC implements a flexible and modern semantic layer architecture:
	•	Stronger than Tableau’s calc-field model
	•	More composable than Power BI DAX without calc groups
	•	Much closer to MicroStrategy’s metric engine
	•	Inspired by modern tools like LookML, dbt Metrics, MetricFlow

It offers:
	•	Reusable metric definitions
	•	Composable time intelligence
	•	Fact-grain and metric-grain control
	•	In-memory filter-context evaluation
	•	A simple but powerful query API

This design is intentionally modular and extensible, forming the basis of a future semantic metrics platform.


2. Documentation-style examples

You can reuse these in a README or doc site.

2.1 Defining a simple metric

demoMetrics.revenue = {
  kind: "simple",
  name: "revenue",
  description: "Total revenue from sales",
  measure: "salesAmount",
  format: "currency",
};

2.2 Defining an expression metric

demoMetrics.pricePerUnit = {
  kind: "expression",
  name: "pricePerUnit",
  description: "Sales amount / quantity over the current context.",
  factTable: "sales",
  format: "currency",
  expression: (rows) => {
    const amount = rows.sum((r) => Number(r.amount ?? 0));
    const qty = rows.sum((r) => Number(r.quantity ?? 0));
    return qty ? amount / qty : null;
  },
};

2.3 Defining a derived metric

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

2.4 Defining a context-transform time-int metric

addContextTransformMetric(demoMetrics, {
  name: "salesAmountYTD",
  baseMeasure: "revenue",
  transform: "ytd",
  description: "YTD of total sales amount.",
  format: "currency",
});

ytd is defined in demoTransforms and can be reused for any metric.

2.5 Running a query

const rows = runQuery(
  demoDb,
  demoTableDefinitions,
  demoAttributes,
  demoMeasures,
  demoMetrics,
  demoTransforms,
  {
    attributes: ["regionId", "productId"],
    filters: { year: 2025, month: 2 },
    metrics: ["revenue", "salesAmountYTD", "budget"],
  }
);

console.table(rows);



