import React from "react";

// Theme-aware SVG schematics for concept pages. Each diagram uses CSS classes
// (styled in index.css via --md-* tokens) so it tracks the app theme. They exist
// to break up wall-of-text pages with a visual anchor. Add one by writing a
// component here and mapping a concept id to it in DIAGRAMS_BY_CONCEPT.

// --- animation helpers -------------------------------------------------------
// Each animatable element carries a `--i` custom property; the CSS stagger reads
// it to offset its entrance. Connectors additionally get an animated flowing
// dash. All of it is disabled under prefers-reduced-motion (see index.css).
const iv = (i) => (i == null ? undefined : { "--i": i });

// A straight arrow with a small triangular head at (x2,y2). `i` drives the
// staggered reveal; the line also carries an animated "flow" dash.
function Arrow({ x1, y1, x2, y2, i, muted }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const h = 6.5;
  const a1 = angle + Math.PI * 0.84;
  const a2 = angle - Math.PI * 0.84;
  const head = `${x2},${y2} ${x2 + h * Math.cos(a1)},${y2 + h * Math.sin(a1)} ${x2 + h * Math.cos(a2)},${y2 + h * Math.sin(a2)}`;
  return (
    <g className={muted ? "dg-arrow dg-arrow-muted" : "dg-arrow"} style={iv(i)}>
      <line className="dg-flow" x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon points={head} />
    </g>
  );
}

// An L-shaped (elbow) connector: goes from (x1,y1) to (x2,y2) bending at a
// right angle, so connectors stay in clean horizontal/vertical lanes instead of
// cutting diagonally across labels. `dir` = "hv" (horizontal then vertical) or
// "vh" (vertical then horizontal). Arrowhead points along the final segment.
function Elbow({ x1, y1, x2, y2, dir = "hv", i, muted }) {
  const bx = dir === "hv" ? x2 : x1; // bend point
  const by = dir === "hv" ? y1 : y2;
  // The arrowhead points along the FINAL segment (bend → end).
  const angle = Math.atan2(y2 - by, x2 - bx);
  const h = 6.5;
  const a1 = angle + Math.PI * 0.84;
  const a2 = angle - Math.PI * 0.84;
  const head = `${x2},${y2} ${x2 + h * Math.cos(a1)},${y2 + h * Math.sin(a1)} ${x2 + h * Math.cos(a2)},${y2 + h * Math.sin(a2)}`;
  return (
    <g className={muted ? "dg-arrow dg-arrow-muted" : "dg-arrow"} style={iv(i)}>
      <path className="dg-flow" d={`M${x1},${y1} L${bx},${by} L${x2},${y2}`} fill="none" />
      <polygon points={head} />
    </g>
  );
}

// A multi-segment orthogonal connector through an explicit list of points
// [[x,y],...]. Keeps connectors in reserved lanes (right-angle bends only).
// Arrowhead points along the last segment.
function Pipe({ points, i, muted }) {
  const d = points.map((p, k) => `${k === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const [px, py] = points[points.length - 1];
  const [qx, qy] = points[points.length - 2];
  const angle = Math.atan2(py - qy, px - qx);
  const h = 6.5;
  const a1 = angle + Math.PI * 0.84;
  const a2 = angle - Math.PI * 0.84;
  const head = `${px},${py} ${px + h * Math.cos(a1)},${py + h * Math.sin(a1)} ${px + h * Math.cos(a2)},${py + h * Math.sin(a2)}`;
  return (
    <g className={muted ? "dg-arrow dg-arrow-muted" : "dg-arrow"} style={iv(i)}>
      <path className="dg-flow" d={d} fill="none" />
      <polygon points={head} />
    </g>
  );
}

function Box({ x, y, w, h, label, sub, accent, i }) {
  return (
    <g className="dg-node" style={iv(i)}>
      <rect x={x} y={y} width={w} height={h} rx="9" className={accent ? "dg-box dg-box-accent" : "dg-box"} />
      <text x={x + w / 2} y={sub ? y + h / 2 - 2 : y + h / 2 + 4} className="dg-label" textAnchor="middle">{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 13} className="dg-sub" textAnchor="middle">{sub}</text>}
    </g>
  );
}

// A container that groups nodes: a rounded rect with a subtle stroke/fill and a
// label that sits in the container's top padding (never overlapping inner
// content — callers reserve ~26px of top padding for it). `tone` picks an
// accent: "public", "private", "region", or default (neutral).
function Group({ x, y, w, h, label, tone, i }) {
  return (
    <g className="dg-group" style={iv(i)}>
      <rect x={x} y={y} width={w} height={h} rx="13" className={`dg-grouprect${tone ? " dg-group-" + tone : ""}`} />
      {label && (
        <text x={x + 14} y={y + 17} className="dg-grouplabel" textAnchor="start">{label}</text>
      )}
    </g>
  );
}

const svgProps = (label) => ({
  className: "learn-dg",
  role: "img",
  "aria-label": label,
  preserveAspectRatio: "xMidYMid meet",
});

// Tell Me About Yourself: present → past → future → handoff, widths ∝ airtime.
function PitchArc() {
  return (
    <svg viewBox="0 0 600 122" {...svgProps("Pitch arc: present, past, future, handoff")}>
      <Box x={16} y={28} w={92} h={54} label="Present" sub="~15s" i={0} />
      <Box x={116} y={28} w={276} h={54} label="Past" sub="~45s" accent i={1} />
      <Box x={400} y={28} w={120} h={54} label="Future" sub="~20s" i={2} />
      <Box x={528} y={28} w={56} h={54} label="Hand-off" sub="~10s" i={3} />
      <Arrow x1={16} y1={100} x2={584} y2={100} i={4} />
      <text x={300} y={118} className="dg-sub" textAnchor="middle">most airtime on Past; rehearse the arc, not the script</text>
    </svg>
  );
}

// STAR-L: bar lengths show where airtime should go (Action + Result dominate).
function StarL() {
  const rows = [
    { label: "Situation", w: 88 },
    { label: "Task", w: 88 },
    { label: "Action", w: 440, accent: true },
    { label: "Result", w: 352, accent: true },
    { label: "Learning", w: 150 },
  ];
  return (
    <svg viewBox="0 0 560 178" {...svgProps("STAR-L: weight answers toward Action and Result")}>
      {rows.map((r, i) => {
        const y = 16 + i * 31;
        return (
          <g key={r.label} className="dg-node" style={{ "--i": i }}>
            <text x={84} y={y + 15} className="dg-label" textAnchor="end">{r.label}</text>
            <rect x={96} y={y} width={440} height={20} rx="6" className="dg-bar-track" />
            <rect x={96} y={y} width={r.w} height={20} rx="6" className={r.accent ? "dg-bar dg-bar-accent dg-bar-grow" : "dg-bar dg-bar-grow"} />
          </g>
        );
      })}
      <text x={96} y={172} className="dg-sub">~70% of airtime on Action + Result; close with the Learning</text>
    </svg>
  );
}

// The loop: recruiter → phone screen → onsite → debrief → offer.
function InterviewLoop() {
  return (
    <svg viewBox="0 0 664 120" {...svgProps("Interview loop stages")}>
      <Box x={12} y={26} w={104} h={50} label="Recruiter" sub="screen" i={0} />
      <Box x={140} y={26} w={104} h={50} label="Phone" sub="screen" i={1} />
      <Box x={268} y={20} w={150} h={62} label="Onsite loop" sub="coding · design · behavioral" accent i={2} />
      <Box x={442} y={26} w={96} h={50} label="Debrief" sub="bar raiser" i={3} />
      <Box x={562} y={26} w={90} h={50} label="Offer" i={4} />
      <Arrow x1={116} y1={51} x2={140} y2={51} i={5} />
      <Arrow x1={244} y1={51} x2={268} y2={51} i={6} />
      <Arrow x1={418} y1={51} x2={442} y2={51} i={7} />
      <Arrow x1={538} y1={51} x2={562} y2={51} i={8} />
      <text x={332} y={108} className="dg-sub" textAnchor="middle">each round is graded independently; the debrief weighs the whole signal</text>
    </svg>
  );
}

// The five-step interview framework: clarify → estimate → high-level → deep
// dive → bottlenecks. Equal cards on one row with an arrow between each.
function SystemDesignFramework() {
  const steps = [
    { label: "Clarify", sub: "requirements" },
    { label: "Estimate", sub: "scale / load" },
    { label: "High-level", sub: "boxes + arrows", accent: true },
    { label: "Deep dive", sub: "1–2 parts" },
    { label: "Bottlenecks", sub: "& trade-offs" },
  ];
  const w = 128;
  const gap = 14;
  const y = 30;
  const h = 54;
  const xAt = (k) => 12 + k * (w + gap);
  return (
    <svg viewBox="0 0 720 116" {...svgProps("The five-step system design framework")}>
      {steps.map((s, k) => (
        <Box key={s.label} x={xAt(k)} y={y} w={w} h={h} label={s.label} sub={s.sub} accent={s.accent} i={k} />
      ))}
      {steps.slice(1).map((_, k) => (
        <Arrow key={k} x1={xAt(k) + w} y1={y + h / 2} x2={xAt(k + 1)} y2={y + h / 2} i={k + 5} />
      ))}
      <text x={360} y={104} className="dg-sub" textAnchor="middle">drive every question through these five steps — the framework is what stops you freezing</text>
    </svg>
  );
}

// Classic request flow: client → LB → service → cache / db / queue → worker.
function SystemDesignFlow() {
  return (
    <svg viewBox="0 0 720 196" {...svgProps("System design request flow")}>
      <Box x={16} y={78} w={92} h={46} label="Client" i={0} />
      <Box x={150} y={78} w={104} h={46} label="LB / API GW" i={1} />
      <Box x={296} y={78} w={114} h={46} label="Service" accent i={2} />
      <Box x={470} y={14} w={130} h={44} label="Cache" sub="hot reads" i={3} />
      <Box x={470} y={76} w={130} h={48} label="Database" sub="source of truth" i={4} />
      <Box x={470} y={140} w={130} h={44} label="Queue" sub="async work" i={5} />
      <Box x={630} y={140} w={80} h={44} label="Worker" i={6} />
      <Arrow x1={108} y1={101} x2={150} y2={101} i={7} />
      <Arrow x1={254} y1={101} x2={296} y2={101} i={8} />
      <Elbow x1={410} y1={92} x2={470} y2={36} dir="hv" i={9} />
      <Arrow x1={410} y1={101} x2={470} y2={100} i={10} />
      <Elbow x1={410} y1={110} x2={470} y2={162} dir="hv" i={11} />
      <Arrow x1={600} y1={162} x2={630} y2={162} i={12} />
    </svg>
  );
}

// Bias–variance: training error falls; validation error is U-shaped.
function BiasVariance() {
  return (
    <svg viewBox="0 0 440 232" {...svgProps("Bias-variance trade-off curve")}>
      {/* axes */}
      <line x1={44} y1={20} x2={44} y2={196} className="dg-axis" />
      <line x1={44} y1={196} x2={414} y2={196} className="dg-axis" />
      <text x={229} y={222} className="dg-sub" textAnchor="middle">model complexity →</text>
      <text x={16} y={108} className="dg-sub" textAnchor="middle" transform="rotate(-90 16 108)">error →</text>
      {/* training error: decreasing */}
      <path d="M60,70 C150,135 250,168 410,182" className="dg-curve dg-curve-muted" />
      <text x={372} y={176} className="dg-sub" textAnchor="end">training</text>
      {/* validation/total error: U-shaped */}
      <path d="M60,78 C150,170 210,156 240,150 C320,138 372,98 410,58" className="dg-curve dg-curve-accent" />
      <text x={392} y={66} className="dg-label" textAnchor="end">validation</text>
      {/* sweet spot */}
      <line x1={240} y1={36} x2={240} y2={196} className="dg-dash" />
      <text x={240} y={32} className="dg-label" textAnchor="middle">sweet spot</text>
      <text x={92} y={50} className="dg-sub" textAnchor="middle">underfit</text>
      <text x={392} y={196 - 6} className="dg-sub" textAnchor="end">overfit</text>
    </svg>
  );
}

// RAG: ingest (offline) builds the vector store; query (online) retrieves + generates.
function RagPipeline() {
  return (
    <svg viewBox="0 0 620 248" {...svgProps("RAG pipeline: ingestion and query paths")}>
      <text x={12} y={20} className="dg-head">Ingest (offline)</text>
      <Box x={12} y={32} w={92} h={44} label="Docs" i={0} />
      <Box x={132} y={32} w={92} h={44} label="Chunk" i={1} />
      <Box x={252} y={32} w={92} h={44} label="Embed" i={2} />
      <Box x={384} y={28} w={150} h={52} label="Vector store" sub="ANN index" accent i={3} />
      <Arrow x1={104} y1={54} x2={132} y2={54} i={4} />
      <Arrow x1={224} y1={54} x2={252} y2={54} i={5} />
      <Arrow x1={344} y1={54} x2={384} y2={54} i={6} />

      <text x={12} y={150} className="dg-head">Query (online)</text>
      <Box x={12} y={162} w={92} h={44} label="Query" i={7} />
      <Box x={132} y={162} w={92} h={44} label="Embed" i={8} />
      <Box x={252} y={162} w={104} h={44} label="Retrieve k" i={9} />
      <Box x={384} y={158} w={84} h={52} label="LLM" accent i={10} />
      <Box x={496} y={162} w={92} h={44} label="Answer" i={11} />
      <Arrow x1={104} y1={184} x2={132} y2={184} i={12} />
      <Arrow x1={224} y1={184} x2={252} y2={184} i={13} />
      <Arrow x1={356} y1={184} x2={384} y2={184} i={14} />
      <Arrow x1={468} y1={184} x2={496} y2={184} i={15} />
      {/* vector store feeds retrieval: down then across to Retrieve k's top */}
      <Pipe points={[[459, 80], [459, 119], [304, 119], [304, 162]]} i={16} muted />
      <text x={12} y={236} className="dg-sub">levers: chunking · hybrid search · re-rank · groundedness eval</text>
    </svg>
  );
}

// Managed RAG on Bedrock: an offline ingest band (S3 → Knowledge Base → vector
// store) over an online serve band (user → API/Lambda → retrieve → model →
// answer). The vector store feeds retrieval via a single orthogonal pipe.
function BedrockRag() {
  return (
    <svg viewBox="0 0 640 250" {...svgProps("RAG on Bedrock: ingestion and serving paths")}>
      <text x={12} y={20} className="dg-head">Ingest (offline)</text>
      <Box x={12} y={32} w={104} h={44} label="S3 docs" sub="PDF · MD · HTML" i={0} />
      <Box x={150} y={28} w={150} h={52} label="Bedrock KB" sub="chunk · embed" accent i={1} />
      <Box x={336} y={32} w={150} h={44} label="Vector store" sub="OpenSearch" i={2} />
      <Arrow x1={116} y1={54} x2={150} y2={54} i={3} />
      <Arrow x1={300} y1={54} x2={336} y2={54} i={4} />

      <text x={12} y={150} className="dg-head">Serve (online)</text>
      <Box x={12} y={162} w={84} h={44} label="User" i={5} />
      <Box x={116} y={162} w={104} h={44} label="API GW + λ" i={6} />
      <Box x={240} y={162} w={104} h={44} label="Retrieve" sub="top-K" accent i={7} />
      <Box x={364} y={158} w={96} h={52} label="Claude" sub="on Bedrock" i={8} />
      <Box x={480} y={162} w={148} h={44} label="Answer" sub="+ citations" i={9} />
      <Arrow x1={96} y1={184} x2={116} y2={184} i={10} />
      <Arrow x1={220} y1={184} x2={240} y2={184} i={11} />
      <Arrow x1={344} y1={184} x2={364} y2={184} i={12} />
      <Arrow x1={460} y1={184} x2={480} y2={184} i={13} />
      {/* vector store feeds retrieval: down then across into Retrieve's top */}
      <Pipe points={[[411, 76], [411, 119], [292, 119], [292, 162]]} i={14} muted />
      <text x={12} y={238} className="dg-sub">RetrieveAndGenerate = one call · Retrieve = chunks you prompt · Guardrails screen I/O</text>
    </svg>
  );
}

// Default secure VPC. Internet + Internet Gateway sit above the VPC. Inside the
// VPC container: a Public subnet (ALB + NAT) over a Private subnet (App + RDS).
// Routing lives in clear vertical lanes: the inbound path runs down the LEFT
// column (Internet→IGW→ALB→App) and the egress path runs up the RIGHT column
// (App→NAT→IGW). Group labels sit top-left, well clear of both lanes, so no
// connector ever crosses a label or an unrelated box.
function AwsVpc() {
  // Boxes live in the lower half of each subnet, leaving the top ~28px for the
  // group label (kept short so it never reaches a connector lane).
  const colL = 70; // left box x   → spans 70..238
  const colR = 318; // right box x → spans 318..486
  const colW = 168;
  const lCx = colL + colW / 2; // 154 — inbound lane (left column centre)
  const rCx = colR + colW / 2; // 402 — right column centre
  const gap = 278; // central lane between the two columns (238..318)
  return (
    <svg viewBox="0 0 540 408" {...svgProps("VPC with public and private subnets")}>
      {/* Above the VPC (inbound entry, aligned to the left lane) */}
      <Box x={lCx - 70} y={10} w={140} h={38} label="Internet" i={0} />
      <Box x={lCx - 70} y={64} w={140} h={38} label="Internet Gateway" accent i={1} />
      <Arrow x1={lCx} y1={48} x2={lCx} y2={64} i={2} />

      {/* VPC container */}
      <Group x={20} y={120} w={500} h={272} label="VPC · 10.0.0.0/16" i={3} />

      {/* Public subnet — short label top-left, well left of the x=154 lane */}
      <Group x={34} y={136} w={472} h={96} label="PUBLIC SUBNET" tone="public" i={4} />
      <Box x={colL} y={168} w={colW} h={50} label="ALB" sub="internet-facing" accent i={5} />
      <Box x={colR} y={168} w={colW} h={50} label="NAT Gateway" sub="egress only" i={6} />

      {/* Private subnet */}
      <Group x={34} y={246} w={472} h={96} label="PRIVATE SUBNET" tone="private" i={7} />
      <Box x={colL} y={278} w={colW} h={50} label="App tier (ASG)" accent i={8} />
      <Box x={colR} y={278} w={colW} h={50} label="RDS (Multi-AZ)" i={9} />

      {/* Inbound lane (x=154): IGW → ALB → App */}
      <Arrow x1={lCx} y1={102} x2={lCx} y2={168} i={10} />
      <Arrow x1={lCx} y1={218} x2={lCx} y2={278} i={11} />
      {/* Egress: App → NAT via the central gap lane (x=278) */}
      <Pipe points={[[238, 303], [gap, 303], [gap, 193], [318, 193]]} i={12} muted />
      {/* NAT → IGW: up the right lane then across to the IGW's right edge */}
      <Pipe points={[[rCx, 168], [rCx, 83], [224, 83]]} i={13} muted />
      <text x={270} y={406} className="dg-sub" textAnchor="middle">inbound down the left lane · private egress returns via NAT → IGW</text>
    </svg>
  );
}

// The highly-available web-app reference architecture. Edge→ALB→compute run on a
// shared centre line (y=84); the data tier is grouped on the right and fed from
// the ASG through clean elbows in the gap between compute and data.
function AwsHaReference() {
  const mid = 84; // shared centre line for the request path
  return (
    <svg viewBox="0 0 716 188" {...svgProps("Highly available web app reference architecture")}>
      <Box x={12} y={mid - 24} w={100} h={48} label="Route 53" sub="DNS" i={0} />
      <Box x={130} y={mid - 24} w={112} h={48} label="CloudFront" sub="CDN / edge" i={1} />
      <Box x={260} y={mid - 24} w={92} h={48} label="ALB" sub="load balancer" accent i={2} />
      <Box x={370} y={mid - 42} w={156} h={84} label="Auto Scaling Grp" sub="stateless · ≥2 AZs" accent i={3} />

      {/* Data tier grouped on the right */}
      <Group x={560} y={30} w={148} h={108} label="DATA TIER" tone="region" i={4} />
      <Box x={572} y={48} w={124} h={42} label="RDS Multi-AZ" sub="sync standby" i={5} />
      <Box x={572} y={96} w={124} h={42} label="ElastiCache" sub="hot reads" i={6} />

      {/* Request path on the centre line */}
      <Arrow x1={112} y1={mid} x2={130} y2={mid} i={7} />
      <Arrow x1={242} y1={mid} x2={260} y2={mid} i={8} />
      <Arrow x1={352} y1={mid} x2={370} y2={mid} i={9} />
      {/* ASG → data tier: elbows that split in the gap lane (x=543) */}
      <Elbow x1={526} y1={mid} x2={572} y2={69} dir="hv" i={10} />
      <Elbow x1={526} y1={mid} x2={572} y2={117} dir="hv" i={11} />
      <text x={358} y={180} className="dg-sub" textAnchor="middle">stateless compute across AZs + managed multi-AZ data = default HA</text>
    </svg>
  );
}

// Disaster-recovery strategies on the cost vs recovery-time spectrum. Four
// equal-height cards on one row; a labelled spectrum rail runs beneath them.
function AwsDrStrategies() {
  const cards = [
    { label: "Backup & Restore", sub: "hours · $" },
    { label: "Pilot Light", sub: "10s of min · $$" },
    { label: "Warm Standby", sub: "minutes · $$$" },
    { label: "Active-Active", sub: "~zero · $$$$", accent: true },
  ];
  const x0 = 16;
  const cw = 138;
  const cgap = 8;
  return (
    <svg viewBox="0 0 600 184" {...svgProps("Disaster recovery strategies by cost and recovery time")}>
      {cards.map((c, k) => (
        <Box key={c.label} x={x0 + k * (cw + cgap)} y={26} w={cw} h={62} label={c.label} sub={c.sub} accent={c.accent} i={k} />
      ))}
      {/* spectrum rail */}
      <Arrow x1={x0} y1={120} x2={584} y2={120} i={4} />
      <text x={x0} y={140} className="dg-sub" textAnchor="start">cheaper · slower recovery</text>
      <text x={584} y={140} className="dg-sub" textAnchor="end">costlier · faster recovery</text>
      <text x={300} y={162} className="dg-sub" textAnchor="middle">pick the cheapest strategy that still meets your RTO / RPO</text>
    </svg>
  );
}

// Regions, Availability Zones, and cross-region DR replication. Each region is a
// real container holding its AZs; a single async-replication connector crosses
// the clear gap between the two region containers (well below their labels).
function AwsRegions() {
  return (
    <svg viewBox="0 0 660 184" {...svgProps("Regions, Availability Zones, and DR replication")}>
      {/* Primary region container with three AZs */}
      <Group x={14} y={20} w={418} h={108} label="REGION · eu-west-1 (primary)" tone="region" i={0} />
      <Box x={28} y={56} w={124} h={58} label="AZ a" sub="independent DC" i={1} />
      <Box x={154} y={56} w={124} h={58} label="AZ b" sub="independent DC" accent i={2} />
      <Box x={280} y={56} w={124} h={58} label="AZ c" sub="independent DC" i={3} />

      {/* DR region container */}
      <Group x={476} y={20} w={170} h={108} label="REGION · us-east-1 (DR)" tone="region" i={4} />
      <Box x={490} y={56} w={142} h={58} label="AZs a / b / c" sub="standby" i={5} />

      {/* async replication across the gap (centre line, clear of both labels) */}
      <Arrow x1={432} y1={85} x2={490} y2={85} i={6} />
      <text x={461} y={78} className="dg-sub" textAnchor="middle">async</text>
      <text x={330} y={156} className="dg-sub" textAnchor="middle">Multi-AZ = high availability within a region · Multi-Region = disaster recovery / global reach</text>
    </svg>
  );
}

// The compute decision: one question fans to the three ways to run code, each
// with its cue. The senior heuristic lives in the caption.
function AwsComputeDecision() {
  const top = { x: 250, y: 14, w: 160, h: 42 };
  const cx = top.x + top.w / 2; // 330
  const cards = [
    { x: 24, label: "Lambda", sub: "event-driven · short", cue: "billed only while running" },
    { x: 234, label: "Containers / Fargate", sub: "long service · portable", cue: "serverless containers" },
    { x: 444, label: "EC2", sub: "full machine control", cue: "you patch & scale it" },
  ];
  const cw = 192;
  return (
    <svg viewBox="0 0 660 196" {...svgProps("AWS compute decision: Lambda vs Fargate vs EC2")}>
      <Box x={top.x} y={top.y} w={top.w} h={top.h} label="Run code on AWS" accent i={0} />
      {cards.map((c, k) => (
        <Box key={c.label} x={c.x} y={96} w={cw} h={52} label={c.label} sub={c.sub} accent={k === 0} i={k + 1} />
      ))}
      {/* funnel from the question down into each card top */}
      <Arrow x1={cx} y1={56} x2={cx} y2={96} i={4} />
      <Pipe points={[[cx, 56], [cx, 78], [120, 78], [120, 96]]} i={5} muted />
      <Pipe points={[[cx, 56], [cx, 78], [540, 78], [540, 96]]} i={6} muted />
      {cards.map((c, k) => (
        <text key={c.label} x={c.x + cw / 2} y={166} className="dg-sub" textAnchor="middle">{c.cue}</text>
      ))}
      <text x={330} y={188} className="dg-sub" textAnchor="middle">event-driven & short → Lambda · long-running & portable → Fargate · need the box → EC2</text>
    </svg>
  );
}

// The decoupling/messaging picker: four services, each reduced to its verb.
function AwsMessaging() {
  const cards = [
    { label: "SQS", sub: "queue", verb: "hand off work" },
    { label: "SNS", sub: "pub / sub", verb: "broadcast 1→many" },
    { label: "EventBridge", sub: "event bus", verb: "route by rules" },
    { label: "Kinesis", sub: "stream", verb: "ordered · replayable" },
  ];
  const x0 = 16;
  const cw = 146;
  const gap = 10;
  return (
    <svg viewBox="0 0 632 150" {...svgProps("AWS messaging services: SQS, SNS, EventBridge, Kinesis")}>
      {cards.map((c, k) => (
        <Box key={c.label} x={x0 + k * (cw + gap)} y={26} w={cw} h={56} label={c.label} sub={c.sub} accent={k === 0} i={k} />
      ))}
      {cards.map((c, k) => (
        <text key={c.label} x={x0 + k * (cw + gap) + cw / 2} y={104} className="dg-sub" textAnchor="middle">{c.verb}</text>
      ))}
      <text x={316} y={138} className="dg-sub" textAnchor="middle">SQS to hand off work · SNS to broadcast · EventBridge to route events · Kinesis to stream</text>
    </svg>
  );
}

// DynamoDB partitioning: a lopsided key sends all traffic to one partition (hot,
// throttling) while the rest sit idle; a high-cardinality / sharded key spreads
// it evenly. The traffic-share subs carry the story (no fan-out arrows to cross).
function DynamoPartitions() {
  const parts = [0, 1, 2, 3];
  const px = (k) => 178 + k * 110;
  return (
    <svg viewBox="0 0 640 212" {...svgProps("DynamoDB hot partition vs write sharding")}>
      {/* Hot row */}
      <Box x={16} y={28} w={140} h={48} label="key: ACTIVE" sub="low cardinality" i={0} />
      {parts.map((k) => (
        <Box key={`h${k}`} x={px(k)} y={28} w={96} h={48} label={`P${k + 1}`} sub={k === 0 ? "100% ⚠" : "0%"} accent={k === 0} i={k + 1} />
      ))}
      {/* Sharded row */}
      <Box x={16} y={120} w={140} h={48} label="key: ACTIVE#n" sub="high cardinality" accent i={5} />
      {parts.map((k) => (
        <Box key={`s${k}`} x={px(k)} y={120} w={96} h={48} label={`P${k + 1}`} sub="~25%" i={k + 6} />
      ))}
      <text x={88} y={96} className="dg-sub" textAnchor="middle">hot partition</text>
      <text x={88} y={188} className="dg-sub" textAnchor="middle">balanced</text>
      <text x={320} y={206} className="dg-sub" textAnchor="middle">spread load with a high-cardinality key or a write-sharding suffix — never design a hot key</text>
    </svg>
  );
}

// S3 storage classes on the hot→cold / cost spectrum, aged down by lifecycle.
function S3StorageClasses() {
  const cards = [
    { label: "Standard", sub: "hot · $$$$" },
    { label: "Standard-IA", sub: "cool · $$" },
    { label: "Glacier", sub: "cold · $" },
    { label: "Deep Archive", sub: "frozen · ¢" },
  ];
  const x0 = 16;
  const cw = 138;
  const gap = 10;
  const cyTop = 30;
  return (
    <svg viewBox="0 0 608 178" {...svgProps("S3 storage classes by access frequency and cost")}>
      {cards.map((c, k) => (
        <Box key={c.label} x={x0 + k * (cw + gap)} y={cyTop} w={cw} h={56} label={c.label} sub={c.sub} accent={k === 0} i={k} />
      ))}
      {/* lifecycle arrows ageing data down between adjacent classes */}
      {[0, 1, 2].map((k) => {
        const ax = x0 + k * (cw + gap) + cw;
        return <Arrow key={k} x1={ax} y1={cyTop + 28} x2={ax + gap} y2={cyTop + 28} i={k + 4} muted />;
      })}
      <Arrow x1={x0} y1={114} x2={592} y2={114} i={7} />
      <text x={x0} y={134} className="dg-sub" textAnchor="start">frequent access</text>
      <text x={592} y={134} className="dg-sub" textAnchor="end">rare / archival</text>
      <text x={304} y={166} className="dg-sub" textAnchor="middle">lifecycle rules age objects down on a schedule · Intelligent-Tiering auto-moves when access is unpredictable</text>
    </svg>
  );
}

// Lambda cold start: the first invocation pays init + handler; a warm one pays
// only the handler. The named fixes shrink or skip the init segment.
function LambdaColdStart() {
  return (
    <svg viewBox="0 0 640 172" {...svgProps("Lambda cold start vs warm start timeline")}>
      <text x={16} y={52} className="dg-sub" textAnchor="start">Cold</text>
      <Box x={64} y={30} w={300} h={36} label="Init · download + bootstrap" accent i={0} />
      <Box x={372} y={30} w={150} h={36} label="Handler" i={1} />
      <text x={16} y={112} className="dg-sub" textAnchor="start">Warm</text>
      <Box x={64} y={90} w={150} h={36} label="Handler" i={2} />
      {/* latency brackets */}
      <text x={214} y={20} className="dg-sub" textAnchor="middle">extra latency only on cold</text>
      <text x={320} y={152} className="dg-sub" textAnchor="middle">fixes: provisioned concurrency · SnapStart · smaller package · lazy-load deps</text>
    </svg>
  );
}

const REGISTRY = {
  "pitch-arc": PitchArc,
  "star-l": StarL,
  "interview-loop": InterviewLoop,
  "sd-framework": SystemDesignFramework,
  "system-design-flow": SystemDesignFlow,
  "bias-variance": BiasVariance,
  "rag-pipeline": RagPipeline,
  "bedrock-rag": BedrockRag,
  "aws-vpc": AwsVpc,
  "aws-ha": AwsHaReference,
  "aws-dr": AwsDrStrategies,
  "aws-regions": AwsRegions,
  "aws-compute-decision": AwsComputeDecision,
  "aws-messaging": AwsMessaging,
  "dynamo-partitions": DynamoPartitions,
  "s3-storage-classes": S3StorageClasses,
  "lambda-coldstart": LambdaColdStart,
};

// Which diagram(s) render on which concept page, with a caption.
export const DIAGRAMS_BY_CONCEPT = {
  "my-pitch": [{ id: "pitch-arc", caption: "The 90-second arc — widths show where your time goes." }],
  "my-stories": [{ id: "star-l", caption: "STAR-L: keep setup short, spend your airtime on Action and Result." }],
  behavioral: [{ id: "star-l", caption: "STAR-L: setup short; Action and Result carry the answer." }],
  "amazon-lp": [{ id: "interview-loop", caption: "The LP loop — behavioral-heavy, with a bar raiser and a written debrief." }],
  "interview-tactics": [{ id: "interview-loop", caption: "Where each tactic applies across the loop." }],
  "toast-interview": [{ id: "interview-loop", caption: "A typical SWE loop shape." }],
  "autodesk-interview": [{ id: "interview-loop", caption: "A typical SWE loop shape." }],
  "treasure-data-interview": [{ id: "interview-loop", caption: "A typical SWE loop shape." }],
  "system-design-core": [{ id: "system-design-flow", caption: "The building blocks most designs assemble from." }],
  "system-design-framework": [
    { id: "sd-framework", caption: "Run every question through these five steps — start simple, then scale." },
    { id: "system-design-flow", caption: "The building blocks most designs assemble from." },
  ],
  "rag-bedrock": [{ id: "bedrock-rag", caption: "Managed RAG on Bedrock: ingest offline into a Knowledge Base; retrieve + generate online, with citations." }],
  "ai-system-design": [{ id: "rag-pipeline", caption: "A RAG/LLM feature: ingestion offline, retrieval + generation online." }],
  "rag-vector-search": [{ id: "rag-pipeline", caption: "RAG end to end — the diagonal arrow is retrieval against the store at query time." }],
  "ml-fundamentals": [{ id: "bias-variance", caption: "The bias-variance trade-off: the gap between curves is overfitting." }],
  "aws-saa-overview": [{ id: "aws-regions", caption: "Spread across AZs for HA within a region; replicate to another region for DR / global reach." }],
  "aws-networking": [{ id: "aws-vpc", caption: "The default secure VPC: public subnet holds the ALB + NAT, private subnet holds the app + database." }],
  "aws-resilience-cost": [
    { id: "aws-ha", caption: "The HA web-app reference architecture most 'design a resilient app' answers reduce to." },
    { id: "aws-dr", caption: "The four DR strategies on the cost vs recovery-time spectrum." },
    { id: "aws-messaging", caption: "The decoupling picker: match the service to the verb — hand off, broadcast, route, or stream." },
  ],
  "aws-compute": [
    { id: "aws-compute-decision", caption: "The compute decision: carry one cue per option into the room." },
    { id: "lambda-coldstart", caption: "Cold start = init + handler; the named fixes shrink or skip the init segment." },
  ],
  "aws-storage": [{ id: "s3-storage-classes", caption: "S3 cost = storage class + lifecycle. Age data down; let Intelligent-Tiering guess when you can't." }],
  "aws-databases": [{ id: "dynamo-partitions", caption: "Design the partition key for even spread — the hot-partition trap and the write-sharding fix." }],
  "aws-interview-decisions": [
    { id: "aws-compute-decision", caption: "Compute: one decision, one tradeoff per option." },
    { id: "aws-messaging", caption: "Decoupling: match the service to the verb." },
    { id: "dynamo-partitions", caption: "DynamoDB: design the key for even spread; shard hot keys." },
  ],
};

export function Diagram({ id }) {
  const Cmp = REGISTRY[id];
  return Cmp ? <Cmp /> : null;
}
