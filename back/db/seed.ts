import { getDb } from "./connection";
import type { CountRow } from "./types";

// Seeds the default learning content (courses + system-design topics) on a
// fresh DB. Each block is skipped when its table already has rows, so this is
// safe to call on every boot alongside the schema/migration steps.
export async function seedLearningData() {
  const db = getDb();

  // 1. Seed Courses if empty
  const courseCountRow = db.prepare("SELECT COUNT(*) as count FROM courses").get() as unknown as CountRow | undefined;
  if ((courseCountRow?.count ?? 0) === 0) {
    const courses = [
      {
        id: "course-sd-fundamentals",
        title: "System Design Fundamentals",
        track: "System Design",
        status: "In Progress",
        progress: 20,
        modules: [
          { name: "Scalability & Performance (Vertical vs Horizontal scaling, Latency vs Throughput)", completed: true },
          { name: "High Availability & Redundancy (SLA, Active-Passive vs Active-Active, Failover)", completed: false },
          { name: "Consistency & Database Partitioning (CAP Theorem, PACELC, Replication models)", completed: false },
          { name: "Network Protocols & APIs (REST, gRPC, WebSockets, GraphQL, TCP vs UDP)", completed: false },
          { name: "Microservices Architecture (Service Discovery, Saga Pattern, CQRS)", completed: false }
        ],
        resources: [
          "https://github.com/donnemartin/system-design-primer",
          "https://bytebytego.com/",
          "https://microservices.io/"
        ],
        notes: "Focus on understanding standard scalability building blocks first. Learn to calculate rough numbers (QPS, storage, bandwidth).",
        lastStudiedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "course-advanced-sd",
        title: "Advanced Architecture Design",
        track: "System Design",
        status: "Not Started",
        progress: 0,
        modules: [
          { name: "Designing a Large-Scale Video Streaming Platform (Netflix, YouTube)", completed: false },
          { name: "Designing a Distributed Real-time Chat/Messenger App (WhatsApp, Slack)", completed: false },
          { name: "Designing a Global Rate Limiter (Token Bucket, Distributed Redis)", completed: false },
          { name: "Designing a High-Throughput Web Crawler", completed: false },
          { name: "Designing a Distributed Cache (Redis-like, Consistent Hashing)", completed: false }
        ],
        resources: [
          "https://bytebytego.com/",
          "https://alexxu.io/"
        ],
        notes: "Dive into specific design scenarios. Focus on data modeling, message queues, and global consistency.",
        lastStudiedAt: "",
        nextReviewAt: ""
      },
      {
        id: "course-ds-algo",
        title: "Data Structures & Algorithms Mastery",
        track: "Algorithms",
        status: "In Progress",
        progress: 40,
        modules: [
          { name: "Arrays & Hashing (Two-sum, Group Anagrams, Top K Frequent Elements)", completed: true },
          { name: "Two Pointers & Sliding Window (Valid Palindrome, Container With Most Water, Longest Substring)", completed: true },
          { name: "Trees & Graphs (DFS/BFS, Dijkstra's, Topological Sort, Union Find)", completed: false },
          { name: "Dynamic Programming (Knapsack, LCS, LIS, Coin Change)", completed: false },
          { name: "Systematic Coding Mock Prep (Time management, constraints analysis)", completed: false }
        ],
        resources: [
          "https://neetcode.io/",
          "https://leetcode.com/"
        ],
        notes: "Focus on templates and pattern matching rather than memorizing solutions.",
        lastStudiedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "course-mock-prep",
        title: "Mock Interview Prep & Behavioral",
        track: "Interview Prep",
        status: "Not Started",
        progress: 0,
        modules: [
          { name: "Scoping & Requirements Gathering (Clarifying questions, estimating scale)", completed: false },
          { name: "High-Level Architecture & API Spec", completed: false },
          { name: "Detailed Component Deep Dive & Sharding", completed: false },
          { name: "Behavioral STAR Method (Leadership, resolving conflict, ownership)", completed: false }
        ],
        resources: [
          "https://tryexponent.com/",
          "https://www.pramp.com/"
        ],
        notes: "Practice talking out loud. Explain trade-offs clearly. Use the STAR framework for behavioral questions.",
        lastStudiedAt: "",
        nextReviewAt: ""
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO courses (
        id, title, track, status, progress, modules, resources, notes, lastStudiedAt, nextReviewAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN TRANSACTION");
    try {
      for (const item of courses) {
        stmt.run(
          item.id,
          item.title,
          item.track,
          item.status,
          item.progress,
          JSON.stringify(item.modules),
          JSON.stringify(item.resources),
          item.notes,
          item.lastStudiedAt,
          item.nextReviewAt
        );
      }
      db.exec("COMMIT");
      console.log("Seeded 4 default learning courses.");
    } catch (err) {
      db.exec("ROLLBACK");
      console.error("Seeded courses failed", err);
    }
  }

  // 2. Seed System Design Topics if empty
  const sdCountRow = db.prepare("SELECT COUNT(*) as count FROM system_design").get() as unknown as CountRow | undefined;
  if ((sdCountRow?.count ?? 0) === 0) {
    const topics = [
      {
        id: "sd-distributed-caching",
        title: "Distributed Caching",
        status: "In Progress",
        confidence: 3,
        prompts: [
          "Design a distributed cache like Redis.",
          "How do you handle the hotkey problem in a global cache?",
          "Explain cache consistency strategies in a write-heavy system."
        ],
        checklist: [
          { name: "Functional requirements & API Spec", completed: true },
          { name: "Eviction policies (LRU, LFU, FIFO)", completed: true },
          { name: "Cache hit/miss strategies (Cache-aside, Write-through, Write-behind)", completed: true },
          { name: "Cache stampede & Thundering Herd mitigation", completed: false },
          { name: "Consistent hashing & Redis clusters", completed: false },
          { name: "Cache invalidation & TTL mechanisms", completed: false }
        ],
        notes: "Core caching notes. LRU can be implemented with a doubly linked list + hash map. In a distributed environment, use consistent hashing to map keys to cache nodes to prevent massive invalidations when nodes scale up/down.\n\nRead-Through / Write-Through: Cache acts as main data interface, syncs with DB. Simple client code but latency penalty on writes.\n\nCache-Aside: Client queries cache; on miss, queries DB and updates cache. Highly popular, robust to DB outages, but risk of stale data.\n\nHotkey Mitigation: Use local memory cache on application nodes for extremely hot keys (e.g. celebrity profiles) to shield Redis cluster.",
        diagramLinks: "https://excalidraw.com/#json=consistent-hashing-example"
      },
      {
        id: "sd-rate-limiting",
        title: "Rate Limiting",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design an API Rate Limiter for a high-traffic SaaS.",
          "How do you build a distributed rate limiter with Redis?",
          "Explain how to handle race conditions in distributed rate limiting."
        ],
        checklist: [
          { name: "Algorithms: Token Bucket, Leaking Bucket, Fixed Window, Sliding Window", completed: false },
          { name: "Distributed rate limiting with Redis (Lua scripts to prevent race conditions)", completed: false },
          { name: "Handling HTTP 429 status and headers (Retry-After)", completed: false },
          { name: "API Gateway integration", completed: false },
          { name: "Client-side fallback and exponential backoff", completed: false }
        ],
        notes: "Algorithms:\n1. Token Bucket: Tokens added at constant rate. Requests consume tokens. Simple, handles bursts well. Used by AWS/Stripe.\n2. Leaky Bucket: Requests added to queue, processed at constant rate (FIFO). Smooths out traffic, but overflows drop packages.\n3. Sliding Window Log: Keep timestamps in sorted set. Extremely accurate but high memory cost.\n\nDistributed scale: Race conditions occur when multiple workers read and write counter. Fix this by using Redis with a Lua script (executed atomically) to read-and-decrement in a single operation.",
        diagramLinks: ""
      },
      {
        id: "sd-load-balancing",
        title: "Load Balancing",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design a scalable load balancer.",
          "Explain the difference between L4 and L7 load balancing.",
          "How does consistent hashing work in dynamic load balancers?"
        ],
        checklist: [
          { name: "L4 vs L7 load balancing capabilities", completed: false },
          { name: "Algorithms: Round Robin, Least Connections, Consistent Hashing", completed: false },
          { name: "Health checking & active/passive monitoring", completed: false },
          { name: "SSL/TLS termination at the load balancer", completed: false },
          { name: "DNS load balancing vs HAProxy/Nginx", completed: false }
        ],
        notes: "L4 (Transport Layer): Routes traffic based on IP & port (TCP/UDP). Super fast, doesn't inspect package payloads. No cookie-based sessions.\n\nL7 (Application Layer): Routes based on HTTP headers, URLs, cookies, SSL payloads. Enables smart routing (e.g. /images to image servers, header-based A/B testing) but has CPU overhead since it terminates and decrypts SSL.\n\nConsistent Hashing: Map servers and request hashes onto a 360-degree ring. When a server goes down, only keys mapped to that server move, preventing global reshuffling.",
        diagramLinks: ""
      },
      {
        id: "sd-db-sharding",
        title: "Database Sharding & Partitioning",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "How do you partition a multi-terabyte SQL database?",
          "Design a sharding scheme for a social media feed system.",
          "Explain consistent hashing vs range-based sharding."
        ],
        checklist: [
          { name: "Horizontal partitioning (sharding) vs Vertical partitioning", completed: false },
          { name: "Sharding keys: range-based, hash-based, directory-based", completed: false },
          { name: "Consistent Hashing & Virtual Nodes", completed: false },
          { name: "Distributed joins & cross-shard query performance", completed: false },
          { name: "Re-sharding & data migration strategies without downtime", completed: false }
        ],
        notes: "Sharding splits a table horizontally across multiple DB instances. Shard Key selection is the single most critical decision.\n\nAvoid hot spots: Sharding by user_id distributes load evenly. Sharding by date/time creates a hot shard on today's data.\n\nJoins: Cross-shard joins are extremely expensive. Mitigate by: De-normalizing data (duplicating tables), co-locating related records (e.g., sharding both posts and comments by user_id so they reside on the same server), or running background workers to compile aggregate results.",
        diagramLinks: ""
      },
      {
        id: "sd-message-queues",
        title: "Message Queues & Pub/Sub",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design a distributed message queue like Apache Kafka.",
          "How do you guarantee exactly-once delivery?",
          "Explain horizontal scaling in message brokers."
        ],
        checklist: [
          { name: "Point-to-point (Queue) vs Publish-Subscribe models", completed: false },
          { name: "Broker architecture (Partitions, Offsets, Consumer Groups)", completed: false },
          { name: "Delivery guarantees: At-least-once, At-most-once, Exactly-once", completed: false },
          { name: "Handling consumer slow-down & backpressure", completed: false },
          { name: "Message persistence & compaction algorithms", completed: false },
          { name: "Dead-letter queues (DLQ) for failed message handling", completed: false }
        ],
        notes: "Kafka Model: Messages are appended to an immutable commit log on disk. Scalability is achieved by splitting topics into Partitions.\n\nConsumer Groups: Dynamic balancing of consumers. Each partition is consumed by exactly one consumer per group.\n\nExactly-Once: Achieved by combining idempotent producers (message has unique ID and broker rejects duplicates) with two-phase commit transactions (message write and offset commit succeed or fail together).",
        diagramLinks: ""
      },
      {
        id: "sd-cdn",
        title: "Content Delivery Networks (CDN)",
        status: "Not Started",
        confidence: 2,
        prompts: [
          "Design a global Content Delivery Network.",
          "How do you invalidate static assets across thousands of edge locations?",
          "Explain dynamic site acceleration (DSA)."
        ],
        checklist: [
          { name: "Edge servers (PoPs) & GeoDNS routing", completed: true },
          { name: "Static asset caching vs Dynamic site acceleration", completed: false },
          { name: "Cache invalidation models (Purge, Versioning, TTL)", completed: false },
          { name: "Pull model vs Push model for content ingestion", completed: false },
          { name: "Security: DDoS protection & SSL at edge", completed: false }
        ],
        notes: "A CDN is a distributed network of edge servers (Points of Presence) that cache static files close to users.\n\nIngestion Models:\n1. Pull: Client requests file -> edge has miss -> fetches from origin -> caches at edge. Zero origin management, but first request is slow.\n2. Push: Origin uploads files directly to CDN. Great control over asset availability, but origin must push every update.\n\nDynamic Site Acceleration (DSA): Speeds up dynamic content by optimizing TCP routes (e.g. keeping connection pools active, route scouting) from the edge server to the origin.",
        diagramLinks: ""
      },
      {
        id: "sd-api-gateway",
        title: "API Gateway",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design an enterprise API Gateway.",
          "How does an API Gateway handle authentication and rate limiting at scale?",
          "Explain request aggregation in microservices."
        ],
        checklist: [
          { name: "Reverse proxy, routing, and request forwarding", completed: false },
          { name: "Cross-cutting concerns: Auth, SSL termination, Rate limiting, Logging", completed: false },
          { name: "Request/Response transformation & Request aggregation", completed: false },
          { name: "Service registry integration & Load balancing", completed: false },
          { name: "Resiliency: Circuit breaker & bulkhead patterns", completed: false }
        ],
        notes: "An API Gateway is a single entry point for clients, routing requests to appropriate downstream microservices.\n\nRequest Aggregation: If a client needs data from 3 services (e.g., User info, Order details, and Payment history), the Gateway can fetch all 3 in parallel and merge them into a single response, saving mobile bandwidth.\n\nCircuit Breaker: Tacks downstream service failures. If service A has failures > threshold, open circuit immediately (returning cached/default data) to prevent cascading system exhaust. Close gradually as health returns.",
        diagramLinks: ""
      },
      {
        id: "sd-distributed-kv",
        title: "Distributed Key-Value Store",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design a highly available distributed key-value store (like DynamoDB).",
          "How do you handle concurrent writes in a leaderless replication system?",
          "Explain the Gossip protocol and quorum writes."
        ],
        checklist: [
          { name: "Leaderless replication & Quorum model (W + R > N)", completed: false },
          { name: "Vector clocks & Conflict-free Replicated Data Types (CRDTs)", completed: false },
          { name: "SSTables & LSM Trees (write optimization)", completed: false },
          { name: "Gossip protocol for peer-to-peer membership", completed: false },
          { name: "Consistent hashing & Hinted Handoff / Read Repair", completed: false }
        ],
        notes: "Leaderless Replication (Dynamo-style):\nNo master node. Writes are sent to all N replica nodes. A write is successful if W nodes acknowledge. A read is successful if R nodes acknowledge. If W + R > N, we are guaranteed to read at least one node with the latest write.\n\nConflict Resolution:\n1. Last-Write-Wins (LWW): Simple but data-destructive (clock drifts can overwrite newer writes).\n2. Vector Clocks: Stems logical causality. If keys diverge, client resolves conflicts during read (e.g. shopping cart merges).\n3. CRDTs: Mathematical structures that merge automatically (commutative/associative). Great for counters and sets.",
        diagramLinks: ""
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO system_design (
        id, title, status, confidence, prompts, checklist, notes, diagramLinks, practiceHistory, lastPracticedAt, nextReviewAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN TRANSACTION");
    try {
      for (const t of topics) {
        stmt.run(
          t.id,
          t.title,
          t.status,
          t.confidence,
          JSON.stringify(t.prompts),
          JSON.stringify(t.checklist),
          t.notes,
          t.diagramLinks,
          JSON.stringify([]),
          "",
          ""
        );
      }
      db.exec("COMMIT");
      console.log("Seeded 8 system design architecture topics.");
    } catch (err) {
      db.exec("ROLLBACK");
      console.error("Seeding system design failed", err);
    }
  }
}
