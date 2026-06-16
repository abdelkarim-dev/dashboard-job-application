// Plain-language glossary for the Learn hub.
//
// The Knowledge pages (especially System Design Core) are written at
// senior/staff density and throw around jargon — p99, QPS, ACID, LSM-tree,
// PACELC — as if the reader already knows it. This module defines those terms
// in one sentence each so they can be surfaced inline (a dotted-underline term
// you hover/tap reveals its meaning) and as a per-page "Jargon decoder" list.
//
// It is pure (no React / DOM), so front/test/glossary.test.mjs can unit-test the
// matcher directly. Definitions are intentionally short and concrete — enough to
// unblock a reader, not a textbook. Add terms here, not in the generated content.

// Each entry: { term (canonical display), aliases? (other spellings that map to
// it), short (one-sentence definition) }. Keep definitions plain — assume the
// reader is smart but new to the vocabulary.
export const GLOSSARY_ENTRIES = [
  // ── Latency, load & targets ─────────────────────────────────────────────
  {
    term: "p99",
    aliases: ["p999", "p95", "p90", "p50"],
    short:
      "A latency percentile: p99 is the response time that 99% of requests beat — i.e. how slow the worst 1% are. Targets use p99 (not the average) because that slow tail is what users actually notice.",
  },
  {
    term: "tail latency",
    aliases: ["percentile latency"],
    short:
      "The slow end of the latency distribution (p95/p99) — the unlucky requests. A fast average can still hide a painful tail, which is why it's measured separately.",
  },
  {
    term: "latency",
    short: "How long a single request takes end to end, usually in milliseconds. Lower is better.",
  },
  {
    term: "throughput",
    short:
      "How much work a system finishes per unit time (e.g. requests/second). Different from latency — a system can push high throughput while each request is still slow.",
  },
  {
    term: "QPS",
    aliases: ["queries per second", "RPS", "requests per second"],
    short: "Queries (requests) per second — the rate of traffic hitting the system. The basic unit of 'how big is this?'.",
  },
  {
    term: "DAU",
    aliases: ["daily active users"],
    short: "Daily Active Users — distinct people using the product per day. Capacity math usually starts from this number.",
  },
  {
    term: "capacity estimation",
    aliases: ["back-of-the-envelope"],
    short:
      "Rough math (QPS, storage, bandwidth from user counts) to size a system and justify the architecture — meant to be order-of-magnitude right, not exact.",
  },

  // ── Reliability targets ─────────────────────────────────────────────────
  {
    term: "availability",
    aliases: ["nines", "three nines", "four nines", "five nines", "99.9%", "99.99%", "99.999%"],
    short:
      "Uptime, measured in 'nines'. 99.9% ('three nines') ≈ 43 min of downtime per month; 99.99% ('four nines') ≈ 4.3 min. Each extra nine is roughly 10× harder.",
  },
  {
    term: "durability",
    short: "The guarantee that once data is acknowledged as saved, it won't be lost — even if machines crash.",
  },
  { term: "SLA", short: "Service Level Agreement — a promise to customers (often contractual) about uptime/latency, with penalties if you miss it." },
  { term: "SLO", short: "Service Level Objective — the internal target you hold yourself to (e.g. 'p99 < 200 ms'), usually stricter than the SLA." },
  { term: "SLI", short: "Service Level Indicator — the actual measured number (e.g. the real p99) you compare against the SLO." },
  {
    term: "NFR",
    aliases: ["non-functional requirements", "non-functional requirement"],
    short:
      "Non-Functional Requirements — the qualities a system must hit (latency, availability, consistency, scale) rather than the features it offers.",
  },
  { term: "blast radius", short: "How much breaks when one thing fails — the scope of impact of an incident. Designs try to keep it small." },

  // ── Consistency & the theorems ──────────────────────────────────────────
  {
    term: "consistency",
    short:
      "Whether everyone reading the data sees the same, latest value. 'Strong' = always; 'eventual' = copies catch up after a short delay.",
  },
  { term: "strong consistency", short: "Every read returns the most recent write — no stale data, at the cost of more coordination and latency." },
  {
    term: "eventual consistency",
    short: "Reads may briefly return stale data, but all copies converge to the same value soon after a write. Trades freshness for availability and speed.",
  },
  {
    term: "ACID",
    short:
      "The transaction guarantees of classic SQL databases: Atomic (all-or-nothing), Consistent, Isolated (concurrent transactions don't corrupt each other), Durable (survives crashes).",
  },
  {
    term: "BASE",
    caseSensitive: true, // don't light up the common word "base"
    short:
      "The looser alternative to ACID common in NoSQL: Basically Available, Soft state, Eventually consistent — favors uptime and scale over instant consistency.",
  },
  {
    term: "CAP theorem",
    aliases: ["CAP"],
    caseSensitive: true, // match the acronym, not the word "cap"
    short:
      "When the network splits (a 'partition'), a distributed store can keep either Consistency or Availability, not both. The core distributed-systems trade-off.",
  },
  {
    term: "PACELC",
    short:
      "An extension of CAP: if there's a Partition, trade Availability vs Consistency; Else (normal operation) trade Latency vs Consistency. Names the cost you pay on every request, not just during failures.",
  },
  { term: "network partition", short: "When parts of a distributed system temporarily can't reach each other over the network. Rare, but you must plan for it." },
  { term: "quorum", short: "Requiring a majority of replicas to agree on a read or write so you don't see stale data — a tunable consistency knob." },

  // ── Storage engines & databases ─────────────────────────────────────────
  {
    term: "B-tree",
    short:
      "The classic database index/storage structure (Postgres, MySQL). Fast, predictable reads; it updates rows in place, so writes cost random disk I/O.",
  },
  {
    term: "LSM-tree",
    aliases: ["LSM"],
    short:
      "Log-Structured Merge tree (Cassandra, RocksDB, DynamoDB). Buffers writes in memory and flushes them sequentially, making writes very fast; a read may have to check several files.",
  },
  { term: "SSTable", aliases: ["SSTables"], short: "Sorted String Table — the immutable on-disk file an LSM-tree flushes its in-memory writes into." },
  { term: "memtable", short: "The in-memory buffer an LSM-tree collects writes in before flushing them to disk as an SSTable." },
  { term: "compaction", short: "Background work in an LSM-tree that merges many small on-disk files into fewer larger ones to keep reads fast." },
  {
    term: "bloom filter",
    short:
      "A tiny probabilistic index that answers 'definitely not here' or 'maybe here' — letting a database skip files it knows don't hold a key.",
  },
  {
    term: "write amplification",
    short: "When one logical write triggers several physical writes to disk — the hidden cost of some storage engines.",
  },
  { term: "read amplification", short: "When one logical read has to touch several files/structures on disk — the read-side cost of write-optimized engines." },
  { term: "write-ahead log", aliases: ["WAL"], short: "A database writes each change to an append-only log first, so it can recover cleanly after a crash." },
  {
    term: "NoSQL",
    short:
      "Non-relational databases that trade SQL's joins and rich transactions for horizontal scale or flexible schemas — key-value, document, wide-column, and graph stores.",
  },
  { term: "wide-column", aliases: ["wide-column store"], short: "A NoSQL store (Cassandra, DynamoDB) keyed by a partition key, built for massive write throughput." },
  { term: "key-value store", short: "The simplest NoSQL store: get/set a value by its key. Ideal for caches and session data." },
  { term: "document store", short: "A NoSQL store holding JSON-like documents — good for nested data that's read together (e.g. MongoDB)." },
  { term: "graph database", short: "A store optimized for relationships and traversals — friends-of-friends, recommendations, fraud rings." },

  // ── Scaling, sharding & replication ─────────────────────────────────────
  { term: "horizontal scaling", aliases: ["scale out", "scaling out"], short: "Adding more machines that work together. Scales far, but needs sharding and coordination." },
  { term: "vertical scaling", aliases: ["scale up", "scaling up"], short: "Moving to a bigger machine (more CPU/RAM). Simple, but there's a ceiling." },
  {
    term: "sharding",
    aliases: ["shard", "shards"],
    short: "Splitting one big dataset across many machines so no single box has to store or serve it all. Each slice is a 'shard'.",
  },
  { term: "partitioning", short: "Dividing data into pieces (partitions) that can live on different machines — the mechanism behind sharding." },
  {
    term: "hot partition",
    aliases: ["hot key", "hotspot"],
    short: "A single shard or key that soaks up a disproportionate share of traffic and becomes a bottleneck while the others sit idle.",
  },
  {
    term: "consistent hashing",
    short:
      "A way to map keys to servers so that adding or removing one server moves only ~1/N of the keys, instead of reshuffling almost everything.",
  },
  { term: "virtual nodes", aliases: ["vnodes"], short: "Giving each real server many positions on the consistent-hashing ring so load stays even." },
  {
    term: "replication",
    aliases: ["replica", "replicas"],
    short: "Keeping copies of the data on multiple machines — for durability and to serve more reads.",
  },
  { term: "read replica", short: "A copy of the database that serves read traffic, taking load off the primary that handles writes." },

  // ── Caching ─────────────────────────────────────────────────────────────
  { term: "cache", short: "A fast in-memory copy of frequently-read data (often Redis/Memcached) that saves hitting the slower database." },
  {
    term: "cache-aside",
    aliases: ["lazy loading"],
    short: "Caching pattern: the app checks the cache, and on a miss reads the DB and fills the cache. Simple and resilient; the first read after a write can be stale.",
  },
  { term: "read-through", short: "Caching pattern where the cache itself loads from the DB on a miss, sitting directly in the read path." },
  { term: "write-through", short: "Caching pattern that writes to the cache and the DB together, keeping them consistent at the cost of slower writes." },
  {
    term: "write-back",
    aliases: ["write-behind"],
    short: "Caching pattern that acknowledges a write to the cache immediately and saves to the DB later — fast, but risks data loss if the cache dies first.",
  },
  { term: "cache invalidation", short: "Deciding when cached data is stale and must be refreshed or dropped — famously one of the hard problems in computing." },
  { term: "CDN", short: "Content Delivery Network — servers spread worldwide that cache static content close to users to cut latency." },

  // ── Networking & the edge ───────────────────────────────────────────────
  {
    term: "load balancer",
    aliases: ["load balancing"],
    short: "Spreads incoming requests across many servers so no one server is overwhelmed.",
  },
  { term: "L4", aliases: ["layer 4"], short: "A load balancer that routes by IP and port without reading the request — fast and protocol-agnostic, but 'dumb'." },
  { term: "L7", aliases: ["layer 7"], short: "A load balancer that reads the HTTP request, so it can route by URL/header, retry, and do TLS — smarter, at higher CPU cost." },
  { term: "round-robin", short: "Load-balancing algorithm that hands each new request to the next server in turn." },
  { term: "least-connections", short: "Load-balancing algorithm that sends the next request to the server with the fewest open connections." },
  { term: "back-pressure", short: "Letting an overloaded component signal 'slow down' upstream (e.g. via a queue) instead of falling over." },
  { term: "API gateway", short: "A single entry point in front of many services that handles auth, rate limiting, routing, and TLS." },
  { term: "sidecar", short: "A helper process deployed next to each service instance to handle cross-cutting concerns like networking or rate limiting." },
  { term: "TLS termination", short: "Decrypting incoming HTTPS at the edge (load balancer/gateway) so internal services can speak plain HTTP." },
  { term: "WAF", short: "Web Application Firewall — filters and blocks malicious HTTP traffic (injection, bad bots) before it reaches your app." },

  // ── Queues, messaging & delivery ────────────────────────────────────────
  { term: "message queue", aliases: ["queue"], short: "A buffer between producers and consumers so work runs asynchronously and survives traffic spikes." },
  { term: "Kafka", short: "A durable, partitioned log for high-throughput event streaming — messages are retained so you can replay them. The default for event pipelines." },
  { term: "SQS", short: "Amazon Simple Queue Service — a fully managed queue for decoupling services (Standard = high throughput; FIFO = strictly ordered)." },
  { term: "RabbitMQ", short: "A traditional message broker with rich routing rules — good for task queues and complex per-message routing." },
  { term: "dead-letter queue", aliases: ["DLQ"], short: "A side queue where messages that keep failing are parked for inspection, so they don't block the main queue." },
  { term: "poison message", short: "A message that always fails processing and would loop forever if not moved aside to a dead-letter queue." },
  {
    term: "at-least-once",
    short: "A delivery guarantee that never drops a message but may deliver it more than once — so consumers must be idempotent to handle duplicates.",
  },
  { term: "at-most-once", short: "A delivery guarantee that never duplicates a message but may silently drop one. Fine only when losing a message is acceptable." },
  {
    term: "exactly-once",
    short: "The ideal of processing each message once and only once. True over a network is impossible; in practice it means at-least-once delivery + idempotent consumers.",
  },
  {
    term: "idempotent",
    aliases: ["idempotency", "idempotency key"],
    short: "An operation safe to run more than once with the same effect (e.g. 'set status = paid', not 'add $10'). The standard fix for retries and duplicate messages.",
  },

  // ── Architecture patterns ───────────────────────────────────────────────
  { term: "event-driven", short: "An architecture where components react to events (messages) instead of calling each other directly — loose coupling." },
  { term: "event sourcing", short: "Storing the full history of changes as an append-only log of events, and rebuilding current state by replaying them." },
  {
    term: "CQRS",
    short: "Command Query Responsibility Segregation — separate the write path (commands) from the read path (queries) so each can be optimized on its own.",
  },
  {
    term: "saga",
    aliases: ["sagas"],
    short: "A multi-step transaction across services done without a global lock: each step has a compensating 'undo' if a later step fails.",
  },
  {
    term: "outbox",
    aliases: ["outbox pattern", "transactional outbox"],
    short: "Write each event into the same DB transaction as the data change (an 'outbox' table), then publish it separately — so events are never lost or double-sent.",
  },
  { term: "two-phase commit", aliases: ["2PC"], short: "A protocol to commit one transaction across multiple databases atomically — correct but slow and fragile, so distributed systems often prefer sagas." },

  // ── Resilience patterns ─────────────────────────────────────────────────
  {
    term: "circuit breaker",
    short: "A wrapper that stops calling a failing dependency after too many errors, failing fast for a while so the system can recover instead of piling on.",
  },
  { term: "rate limiting", aliases: ["rate limiter"], short: "Capping how many requests a client can make in a time window, to protect a service from overload or abuse." },
  {
    term: "token bucket",
    short: "Rate-limiting algorithm: tokens refill at a steady rate and each request spends one — allows short bursts while capping the average rate.",
  },
  { term: "leaky bucket", short: "Rate-limiting algorithm that drains queued requests at a fixed steady rate, smoothing bursts into a constant stream." },
  { term: "sliding window", short: "A rate-limiting approach that counts requests over a moving time window for smoother, more accurate limits than fixed windows." },
  { term: "HTTP 429", aliases: ["429"], short: "The HTTP status 'Too Many Requests' — what a rate limiter returns, usually with a Retry-After header saying when to try again." },
  { term: "Retry-After", short: "An HTTP response header telling the client how long to wait before retrying after a 429 or 503." },
  { term: "ETL", short: "Extract, Transform, Load — the batch pipeline that pulls data from sources, reshapes it, and loads it into a warehouse." },

  // ── RAG, embeddings & Bedrock ───────────────────────────────────────────
  {
    term: "RAG",
    aliases: ["retrieval-augmented generation"],
    short:
      "Retrieval-Augmented Generation — fetch the documents relevant to a question and put them in the prompt, so the model answers from your data instead of its memory. Grounds answers and lets them cite sources.",
  },
  {
    term: "embedding",
    aliases: ["embeddings", "embed"],
    short:
      "A vector (list of numbers) that captures the meaning of a piece of text, so similar meanings sit close together. The same model must embed both your documents and the query.",
  },
  {
    term: "vector database",
    aliases: ["vector store", "vector DB"],
    short:
      "A store that holds embeddings (plus the original text + metadata) and does fast nearest-neighbour search to find the chunks closest in meaning to a query.",
  },
  {
    term: "chunking",
    aliases: ["chunk"],
    short:
      "Splitting documents into passages before embedding them — you can't usefully embed a 50-page PDF as one unit. Chunking strategy is the single biggest lever on RAG quality.",
  },
  {
    term: "reranking",
    aliases: ["reranker", "re-rank", "rerank"],
    short:
      "A second pass after the initial retrieval: a cross-encoder re-scores the candidate chunks and keeps only the most relevant before they reach the model. High ROI on answer quality.",
  },
  {
    term: "hybrid search",
    short:
      "Combining semantic (vector) search with keyword (BM25) search — vectors catch meaning, keywords catch exact terms, product codes, and acronyms. Improves recall.",
  },
  {
    term: "fine-tuning",
    aliases: ["fine-tune"],
    short:
      "Continuing to train a model on your data so the new knowledge/behaviour is baked into its weights. Changes style/behaviour; RAG instead supplies knowledge at query time without retraining.",
  },
  {
    term: "hallucination",
    aliases: ["hallucinate"],
    short:
      "When a language model confidently states something false. The RAG defence is to ground answers in retrieved context and instruct 'answer only from this; else say you don't know.'",
  },
  {
    term: "Bedrock",
    aliases: ["Amazon Bedrock"],
    short:
      "AWS's fully-managed service that gives you one API to call many foundation models (Claude, Nova/Titan, Llama, Cohere) with no GPUs to host. Knowledge Bases add managed RAG on top.",
  },
  {
    term: "Knowledge Base",
    aliases: ["Knowledge Bases"],
    caseSensitive: true, // only the Bedrock feature (title case), not "knowledge base" the phrase
    short:
      "Bedrock's managed RAG: point it at a data source and it does ingestion (fetch, chunk, embed, store) and exposes Retrieve / RetrieveAndGenerate APIs for serving, with built-in session context.",
  },
  {
    term: "Guardrails",
    short:
      "Bedrock's safety layer: content filtering, PII redaction, denied topics, and a contextual grounding check that flags answers unsupported by the retrieved context. Apply on input and output.",
  },
  {
    term: "foundation model",
    aliases: ["foundation models"],
    short:
      "A large, general-purpose model (like Claude) pretrained on broad data, which you then adapt via prompting, RAG, or fine-tuning rather than training from scratch.",
  },
];

// Escape a string for safe inclusion in a RegExp.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a lookup from every lowercased term/alias -> its entry, plus the master
// match regex. Longer phrases are listed first so "tail latency" wins over
// "latency" and "read replica" over "replica".
function buildIndex(entries) {
  const byKey = new Map();
  const keys = [];
  for (const entry of entries) {
    const forms = [entry.term, ...(entry.aliases || [])];
    for (const form of forms) {
      const k = form.toLowerCase();
      if (!byKey.has(k)) {
        byKey.set(k, entry);
        keys.push(form);
      }
    }
  }
  keys.sort((a, b) => b.length - a.length);
  // Match only when not flanked by another alphanumeric, so we hit whole terms
  // ("QPS", "p99", "write-back", "429") and never fragments inside a word.
  const pattern = "(?<![A-Za-z0-9])(?:" + keys.map(escapeRegExp).join("|") + ")(?![A-Za-z0-9])";
  return { byKey, pattern };
}

const { byKey: GLOSSARY_BY_KEY, pattern: GLOSSARY_PATTERN } = buildIndex(GLOSSARY_ENTRIES);

// Look up a matched piece of text (any casing) -> its glossary entry, or null.
export function lookupTerm(text) {
  return GLOSSARY_BY_KEY.get(String(text).toLowerCase()) || null;
}

/**
 * Split a paragraph into an ordered list of segments for rendering:
 *   { text }                              — a plain run of text
 *   { text, term, def }                   — a glossary hit (text = as written)
 *
 * `seen` is an optional Set of already-defined canonical terms. When supplied,
 * only the FIRST occurrence of each term is marked (per page), keeping dense
 * paragraphs from lighting up like a Christmas tree; later mentions stay plain.
 * The set is mutated so it can be threaded across a whole page's sections.
 */
export function splitWithGlossary(text, seen) {
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return [{ text: "" }];
  const re = new RegExp(GLOSSARY_PATTERN, "gi");
  const segments = [];
  let last = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    const hit = m[0];
    const entry = lookupTerm(hit);
    if (!entry) continue;
    // Acronyms that collide with common English words (BASE, CAP) only match in
    // their exact written casing, so "base" and "cap" stay plain text.
    if (entry.caseSensitive && ![entry.term, ...(entry.aliases || [])].includes(hit)) continue;
    if (seen) {
      if (seen.has(entry.term)) continue; // already defined earlier on the page
      seen.add(entry.term);
    }
    if (m.index > last) segments.push({ text: str.slice(last, m.index) });
    segments.push({ text: hit, term: entry.term, def: entry.short });
    last = m.index + hit.length;
  }
  if (last < str.length) segments.push({ text: str.slice(last) });
  return segments.length ? segments : [{ text: str }];
}

/**
 * Collect the distinct glossary entries that appear anywhere in a concept's
 * reading text (section bodies + key points), in first-appearance order. Drives
 * the per-page "Jargon decoder" list so the reader gets a scannable glossary of
 * exactly the terms this page uses.
 */
export function collectGlossaryTerms(concept) {
  if (!concept) return [];
  const chunks = [];
  for (const s of concept.sections || []) {
    for (const p of s.body || []) chunks.push(p);
  }
  for (const p of concept.keyPoints || []) chunks.push(p);
  const seen = new Set();
  const found = [];
  for (const chunk of chunks) {
    for (const seg of splitWithGlossary(chunk, seen)) {
      if (seg.term) found.push({ term: seg.term, def: seg.def });
    }
  }
  return found;
}
