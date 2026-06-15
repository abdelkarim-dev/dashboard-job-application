// Minimal structural request/response shapes for the route layer. Express ships
// no TypeScript types here (and @types/express isn't installed), so rather than
// pull in a dependency we describe only what the handlers actually touch. The
// real Express objects flow in as `any` at the app boundary, so they satisfy
// these without friction; the value is documenting the route contract.

export interface ApiRequest {
  method: string;
  url?: string;
  originalUrl?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  set(headers: Record<string, string>): ApiResponse;
  send(body?: unknown): ApiResponse;
  json(data: unknown): ApiResponse;
  writeHead(status: number, headers?: Record<string, string>): ApiResponse;
  write(chunk: string): boolean;
  end(): void;
}

// A route handler inspects (req, method, url) and, if it owns the request,
// sends a response and returns true. Returning false (or matching a path but
// not the method) lets the router fall through to the next handler / 404 —
// exactly mirroring the original if-ladder's fallthrough semantics.
export type RouteHandler = (
  req: ApiRequest,
  res: ApiResponse,
  url: URL
) => Promise<boolean> | boolean;
