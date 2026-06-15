// Express ships no TypeScript types and @types/express isn't a dependency, so we
// intentionally treat it as untyped here rather than pull one in. The route
// layer is typed via RouteHandler (server/types.ts); the thin app wiring in
// app.ts is the only place that touches Express directly.
declare module "express";
