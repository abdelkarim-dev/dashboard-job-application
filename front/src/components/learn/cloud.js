// Cloud & infrastructure reading track for the Learn hub.
//
// Hand-authored (not generated): a deep Terraform / Infrastructure-as-Code track.
// Same concept shape as concepts.js (sections / keyPoints / checklist / quiz),
// rendered generically by ConceptPage.jsx. Adding a page is just adding an entry
// here.
//
// Code blocks are JS template literals; HCL interpolation must be written as
// `\${...}` so the JS parser doesn't try to evaluate it.

// ── Terraform ─────────────────────────────────────────────────────
const TERRAFORM_CONCEPTS = [
  {
    id: "terraform-foundations",
    group: "Terraform",
    label: "Terraform Basics",
    icon: "⬡",
    title: "Terraform Foundations — IaC, HCL & the Core Workflow",
    tagline:
      "What Infrastructure as Code buys you, how Terraform's declarative model works, and the init → plan → apply loop you'll run a hundred times a day.",
    sections: [
      {
        heading: "Why Infrastructure as Code at all",
        body: [
          "Clicking through the AWS console is fast for one resource and a disaster for fifty. There's no record of what you did, no review, no way to recreate it in another account, and 'it works on prod but not staging' becomes a guessing game. Infrastructure as Code (IaC) makes your infrastructure a text file: versioned in git, reviewed in a pull request, diffable, and reproducible. The same code that built staging builds prod.",
          "Terraform is the dominant IaC tool because it is declarative and cloud-agnostic. Declarative means you describe the desired end state ('I want one S3 bucket with versioning on') and Terraform figures out the API calls to get there — you don't script the steps. Cloud-agnostic means one tool and one language (HCL) drives AWS, Azure, GCP, Cloudflare, Datadog, GitHub, and ~3000 other providers, instead of learning CloudFormation for AWS and ARM/Bicep for Azure.",
          "The mental model: Terraform keeps a record of what it built (state), compares your code (desired) against that record plus the real world (actual), and computes the minimal set of creates, updates, and deletes to reconcile them. That reconciliation is the whole game.",
        ],
        callout: {
          kind: "tip",
          title: "Declarative vs imperative",
          text: "Imperative (a bash script): 'create bucket, then enable versioning, then set policy.' Declarative (Terraform): 'this is the bucket I want.' If it already exists correctly, Terraform does nothing. Re-running is safe and idempotent.",
        },
      },
      {
        heading: "The vocabulary, in plain language",
        body: [
          "Terraform throws a lot of words at you on day one. Here's the whole starter glossary in one place — keep this open while the rest of the page builds intuition around each term. You don't need to memorize it; you'll absorb it by doing.",
        ],
        defs: [
          { term: "Infrastructure as Code (IaC)", def: "Describing your servers, networks, and databases in text files instead of clicking around a web console — so it can be versioned, reviewed, and rebuilt." },
          { term: "Declarative", def: "You write the end state you want ('one bucket, versioning on'); Terraform figures out the steps. The opposite, imperative, is a script of explicit commands." },
          { term: "Provider", def: "A plugin that teaches Terraform how to talk to one API or platform — aws, google, kubernetes, github. You download providers with `terraform init`." },
          { term: "Resource", def: "A single piece of infrastructure Terraform creates and owns — an EC2 instance, an S3 bucket, a DNS record. Written as `resource \"<type>\" \"<name>\"`." },
          { term: "Data source", def: "A read-only lookup of something Terraform does NOT manage — the latest AMI id, your account number, an existing VPC. Written as `data \"<type>\" \"<name>\"`." },
          { term: "Argument", def: "A `key = value` setting inside a block, like `instance_type = \"t3.micro\"`." },
          { term: "Attribute", def: "A value you read back FROM a resource after Terraform knows it, like `aws_instance.web.id`. Arguments go in; attributes come out." },
          { term: "HCL", def: "HashiCorp Configuration Language — the blocks-and-arguments syntax you write Terraform in (`.tf` files)." },
          { term: "Interpolation", def: "Inserting a value into a string with `${...}`, e.g. `\"web-${var.environment}\"`. In this learning file we escape it as `\\${...}` so the page doesn't try to evaluate it." },
          { term: "State", def: "Terraform's memory — a file recording what it built and which real resource each block maps to. Covered in depth on the next page." },
          { term: "Plan", def: "A dry run: Terraform shows you exactly what it would create (+), change (~), or destroy (-) before touching anything." },
          { term: "Apply", def: "The command that actually makes the changes the plan described." },
          { term: "Idempotent", def: "Safe to run repeatedly — running `apply` again when nothing changed does nothing, instead of creating duplicates." },
          { term: "Init", def: "`terraform init` — sets up a working directory: downloads providers and wires up where state lives. Run it first." },
        ],
      },
      {
        heading: "The pieces: providers, resources, data sources",
        body: [
          "A provider is a plugin that knows how to talk to one API — `aws`, `azurerm`, `google`, `kubernetes`. You declare which providers you need and pin their versions in a `required_providers` block; `terraform init` downloads them into `.terraform/`.",
          "A resource is a thing Terraform creates and manages — an EC2 instance, an S3 bucket, an IAM role. The block label is `<TYPE> <NAME>`, e.g. `resource \"aws_s3_bucket\" \"logs\"`. The TYPE comes from the provider; the NAME is a local handle you use to reference it elsewhere as `aws_s3_bucket.logs.arn`.",
          "A data source reads something Terraform does NOT manage — looking up the latest Amazon Linux AMI, your account ID, an existing VPC. It's read-only input to your config. The block is `data \"<TYPE>\" \"<NAME>\"` and you reference it as `data.<TYPE>.<NAME>.<attr>`.",
        ],
        code: {
          lang: "hcl",
          source: `terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"        # allow 5.x, not 6.0 — pin to avoid surprise upgrades
    }
  }
}

provider "aws" {
  region = "eu-west-1"
}

# data source: read-only lookup of something we don't manage
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# resource: something Terraform creates & owns
resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id   # reference the data source
  instance_type = "t3.micro"
  tags = { Name = "web-server" }
}`,
        },
      },
      {
        heading: "HCL: the language, in one screen",
        body: [
          "HashiCorp Configuration Language (HCL) is mostly blocks and arguments. A block is `TYPE \"LABEL\" { ... }`; inside, arguments are `key = value`. Values can be strings, numbers, bools, lists `[\"a\", \"b\"]`, and maps `{ env = \"prod\" }`. Multi-line strings use heredocs (`<<-EOT ... EOT`).",
          "References are how blocks wire together and how Terraform discovers the dependency graph automatically — if `aws_instance.web` references `aws_security_group.web.id`, Terraform knows the security group must be created first. You almost never need explicit `depends_on`; the references build the graph for you.",
          "Interpolation puts a reference or expression inside a string with `${...}`. Comments are `#` (preferred) or `//` and `/* */`.",
        ],
        code: {
          lang: "hcl",
          source: `resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow HTTP/HTTPS"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  # referencing .id here makes the SG an implicit dependency
  vpc_security_group_ids = [aws_security_group.web.id]

  # interpolation inside a string
  tags = { Name = "web-\${var.environment}" }
}`,
        },
      },
      {
        heading: "The core workflow: write → init → plan → apply",
        body: [
          "Four commands carry 95% of your day. `terraform init` initializes a working directory: it downloads providers and configures the backend (where state lives). Run it once per project and again whenever you add a provider or change the backend.",
          "`terraform plan` is the dry run — Terraform refreshes the real-world state, diffs it against your code, and prints exactly what it would create (`+`), change (`~`), or destroy (`-`). Reading plans carefully is the single most important Terraform habit; a stray `-` or a 'forces replacement' is how outages happen.",
          "`terraform apply` executes the plan after you confirm (it shows the plan again and waits for `yes`). `terraform destroy` tears everything down. Two more you'll use constantly: `terraform fmt` (canonical formatting) and `terraform validate` (syntax/type check, no API calls).",
        ],
        steps: [
          "terraform init — download providers, wire up the backend (run once, re-run on provider/backend changes).",
          "terraform fmt -recursive — auto-format to canonical style before committing.",
          "terraform validate — catch syntax and type errors without hitting any API.",
          "terraform plan -out=tf.plan — preview the diff and save it so apply runs exactly what you reviewed.",
          "terraform apply tf.plan — make it real. (Or `terraform destroy` to remove everything.)",
        ],
        callout: {
          kind: "warn",
          title: "Read every plan before apply",
          text: "'forces replacement' means destroy-then-create — for a database or EBS volume that can mean data loss. A red `-` you didn't expect means Terraform is about to delete something. Never auto-approve in prod without reading the diff.",
        },
      },
      {
        heading: "A complete first example",
        body: [
          "Putting it together: a versioned S3 bucket with public access blocked — a safe, idempotent starting point that touches resources, references, and a separate config resource (modern AWS provider splits bucket settings into their own resources rather than inline arguments).",
        ],
        code: {
          lang: "hcl",
          source: `resource "aws_s3_bucket" "assets" {
  bucket = "claire-assets-\${var.environment}"
  tags   = { Project = "claire", Env = var.environment }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "bucket_arn" {
  value = aws_s3_bucket.assets.arn
}`,
        },
      },
      {
        heading: "Common beginner mistakes",
        body: [
          "Everyone trips on the same handful of things in their first week. None are hard once you've seen them — the trick is recognizing them, so here they are up front.",
        ],
        callout: {
          kind: "warn",
          title: "The day-one traps",
          text: "Editing in the console after Terraform built it (then being surprised the next plan reverts your change — that's drift). Committing terraform.tfstate or your AWS keys to git. Auto-approving instead of reading the plan, then deleting something live. Forgetting to re-run `terraform init` after adding a provider or backend. Hand-editing the state file. Leaving provider versions unpinned, so the same code plans differently for a teammate.",
        },
      },
      {
        heading: "How to actually learn it",
        body: [
          "Don't read the whole docs — build something small and grow it. Path that works: (1) install Terraform + the AWS CLI, configure credentials; (2) create one S3 bucket, run the full init/plan/apply/destroy loop until it's muscle memory; (3) add a second resource and wire them with a reference so you see the dependency graph; (4) introduce variables and outputs; (5) extract a module; (6) move state to a remote backend. Each step is a separate page in this track.",
          "Use the official HashiCorp 'Get Started — AWS' tutorial and the provider docs (registry.terraform.io) as your reference — every resource's full argument list lives there. The HashiCorp Certified: Terraform Associate (003) exam is a good forcing function if you want a credential; it covers exactly this workflow plus state and modules.",
        ],
        callout: {
          kind: "tip",
          title: "Fastest feedback loop",
          text: "Keep a throwaway sandbox AWS account. `terraform apply` then `terraform destroy` costs cents and teaches more in an hour than a day of reading. Tag everything so you can find and kill stragglers.",
        },
      },
    ],
    keyPoints: [
      "IaC = infrastructure as versioned, reviewed, reproducible text; Terraform is declarative (describe end state) and multi-cloud (one HCL for ~3000 providers).",
      "Provider = API plugin; resource = managed thing; data source = read-only lookup of something you don't manage.",
      "References between resources build the dependency graph automatically — you rarely need depends_on.",
      "Core loop: init (providers + backend) → fmt → validate → plan (the diff) → apply. destroy tears down.",
      "plan is the safety mechanism: read it every time; 'forces replacement' = destroy + recreate = possible data loss.",
      "Pin provider versions with `~>` so upgrades are deliberate, not accidental.",
      "Learn by building one resource and growing it, not by reading docs front to back.",
    ],
    checklist: [
      "Ran init → plan → apply → destroy on a single S3 bucket end to end",
      "Can explain declarative vs imperative and why re-running apply is safe (idempotent)",
      "Wired two resources with a reference and saw the implicit dependency in the plan",
      "Can read a plan and identify create (+), update (~), replace (-/+), destroy (-)",
      "Pinned the AWS provider version with required_providers",
    ],
    quiz: [
      {
        q: "You run `terraform apply` twice in a row with no code changes. What happens the second time?",
        options: [
          "It creates duplicate resources",
          "Nothing — the desired state already matches, so the plan is empty (idempotent)",
          "It errors because the resources already exist",
          "It destroys and recreates everything",
        ],
        answer: 1,
        explain:
          "Terraform is declarative and idempotent. It reconciles desired vs actual; if they already match, there's nothing to do.",
      },
      {
        q: "A plan shows `aws_db_instance.main must be replaced` with `# forces replacement`. The senior move is to…",
        options: [
          "Apply immediately — Terraform knows best",
          "Stop and investigate: replacement means destroy-then-create, which can drop the database",
          "Run terraform refresh first",
          "Add -auto-approve to skip the prompt",
        ],
        answer: 1,
        explain:
          "'forces replacement' is destroy + create. For a database that risks data loss. Find which attribute forces it and whether there's a non-destructive path.",
      },
      {
        q: "What's the difference between a `resource` and a `data` source?",
        options: [
          "Nothing — they're aliases",
          "resource creates/manages infrastructure; data reads existing infrastructure read-only",
          "data is for AWS, resource is for Azure",
          "resource is deprecated in favor of data",
        ],
        answer: 1,
        explain:
          "A resource is something Terraform owns (creates, updates, destroys). A data source is a read-only lookup of something that already exists.",
      },
    ],
  },

  {
    id: "terraform-state",
    group: "Terraform",
    label: "State & Backends",
    icon: "🗄",
    title: "Terraform State — The Heart of How Terraform Works",
    tagline:
      "State is Terraform's source of truth and its biggest footgun. Remote backends, locking, drift, secrets, and the state commands every team needs.",
    sections: [
      {
        heading: "What state is and why it exists",
        body: [
          "After `apply`, Terraform writes a `terraform.tfstate` JSON file recording exactly what it created and the mapping from each config block (`aws_instance.web`) to the real resource id (`i-0abc123`). Without it, Terraform couldn't tell whether your code means 'create new' or 'update the existing thing I made last time'.",
          "State serves three jobs: (1) mapping config to real resources, (2) tracking metadata like dependency order and resource dependencies, and (3) performance — for large infra Terraform can use cached attributes instead of querying every resource on every plan. It is the bridge between your declarative code and the messy real world.",
          "The catch: state is the source of truth, so if it's lost, corrupted, or out of sync, Terraform gets confused — it may try to recreate things that exist or 'forget' things it made. Protecting state is operationally critical.",
        ],
        callout: {
          kind: "warn",
          title: "State can contain secrets",
          text: "Terraform stores resource attributes in plaintext in state — including RDS passwords, generated keys, and `sensitive` values. Never commit tfstate to git. Use a remote backend with encryption and tight access control.",
        },
      },
      {
        heading: "The state vocabulary, in plain language",
        body: [
          "State has its own cluster of jargon. Here's the plain-English version so the rest of the page reads easily.",
        ],
        defs: [
          { term: "State (tfstate)", def: "Terraform's record of what it built — a JSON file mapping each block in your code to a real resource id (e.g. aws_instance.web → i-0abc123)." },
          { term: "Backend", def: "Where state is stored and how operations run. Default is a local file; a remote backend (like S3) stores it centrally so a team can share it." },
          { term: "Remote state", def: "State kept in a shared, durable location (S3, HCP Terraform) instead of one person's laptop — required for any team." },
          { term: "Locking", def: "A mechanism that stops two `apply`s from running at once and corrupting shared state. With S3 it's done via a DynamoDB table or a native lockfile." },
          { term: "Drift", def: "When the real infrastructure no longer matches what state says — usually because someone changed it by hand in the console." },
          { term: "Refresh", def: "Terraform re-reading the real world to update its view before planning. `plan -refresh-only` shows drift without proposing code-driven changes." },
          { term: "Import", def: "Adopting an existing, hand-created resource into Terraform's state so it starts managing it — without recreating it." },
          { term: "Bootstrap", def: "Creating the state bucket/lock table first, by hand or with a tiny separate config, because the main config can't create the place its own state lives." },
        ],
      },
      {
        heading: "Local vs remote backends",
        body: [
          "By default state is a local file. That's fine for a solo experiment and unacceptable for a team: the file lives on one laptop, two people can't collaborate, there's no locking, and a lost laptop loses the state. The fix is a remote backend.",
          "A backend is where state is stored and how operations run. The classic AWS pattern is the S3 backend: state in an S3 bucket (durable, versioned, encrypted) with a DynamoDB table for state locking so two `apply`s can't run at once. (Terraform 1.10+ can also lock natively via an S3 lockfile with `use_lockfile = true`, but DynamoDB locking is still the most common pattern in the wild and on exams.)",
          "Terraform Cloud / HCP Terraform is the managed option: remote state, locking, a run UI, policy enforcement, and remote execution, without you running the S3/DynamoDB plumbing.",
        ],
        code: {
          lang: "hcl",
          source: `terraform {
  backend "s3" {
    bucket         = "claire-tf-state"      # pre-created, versioned, encrypted
    key            = "prod/network/terraform.tfstate"  # path within the bucket
    region         = "eu-west-1"
    dynamodb_table = "claire-tf-locks"      # holds the lock; prevents concurrent applies
    encrypt        = true
  }
}`,
        },
        callout: {
          kind: "tip",
          title: "Chicken-and-egg",
          text: "The S3 bucket and DynamoDB table that hold your state can't be created by the same config that uses them. Bootstrap them once (a small separate config with local state, or click-ops/CLI), then point everything else at them.",
        },
      },
      {
        heading: "State locking and the team workflow",
        body: [
          "Locking prevents the corruption that happens when two people (or a human and CI) apply simultaneously and write conflicting state. With the S3+DynamoDB backend, Terraform writes a lock item before any write operation and releases it after. If someone else holds the lock, you get a clear error with the lock id and who holds it.",
          "If a process dies mid-apply and leaves a stale lock, `terraform force-unlock <LOCK_ID>` clears it — but only after you've confirmed no apply is actually running, or you can corrupt state.",
          "The `key` in the backend is what separates environments and components. A common layout gives each environment+component its own state file (`prod/network`, `prod/app`, `staging/app`) so a blast radius is contained and applies are independent.",
        ],
      },
      {
        heading: "Drift, refresh, import",
        body: [
          "Drift is when the real world diverges from state — someone changed a security group in the console, or AWS modified something. `terraform plan` refreshes state against reality and shows drift as a diff; the next apply reconciles your code back over the manual change. Use `terraform plan -refresh-only` to see drift without proposing code-driven changes, and `terraform apply -refresh-only` to absorb drift into state.",
          "`terraform import` adopts an existing resource into state so Terraform manages it going forward — essential when migrating click-ops infra into code. Since Terraform 1.5 you can also write a declarative `import` block (and even have Terraform generate the resource config), which is reviewable in a PR instead of a one-off CLI command.",
        ],
        code: {
          lang: "hcl",
          source: `# CLI form: adopt an existing bucket into the state for this resource block
#   terraform import aws_s3_bucket.legacy my-existing-bucket-name

# Declarative form (Terraform 1.5+) — reviewable, and can generate config:
import {
  to = aws_s3_bucket.legacy
  id = "my-existing-bucket-name"
}
#   terraform plan -generate-config-out=generated.tf`,
        },
      },
      {
        heading: "The state commands you'll actually use",
        body: [
          "You manipulate state rarely, but when you do these matter. `terraform state list` shows everything under management. `terraform state show <addr>` prints one resource's tracked attributes. `terraform state mv` renames/moves a resource in state without destroying it (e.g. after refactoring into a module) — though `moved` blocks in code are now the safer, reviewable way to do this. `terraform state rm` tells Terraform to forget a resource (stop managing it) without destroying the real thing.",
          "`terraform output` prints root output values; `terraform show` renders the current state or a saved plan. To share outputs across separate state files, use the `terraform_remote_state` data source — e.g. the app config reads the VPC id from the network config's state.",
        ],
        table: {
          headers: ["Command", "What it does", "When"],
          rows: [
            ["state list", "List managed resources", "Sanity-check what's tracked"],
            ["state show <addr>", "Show one resource's attributes", "Debug a specific resource"],
            ["state mv", "Move/rename in state, no destroy", "After refactor (or use `moved` blocks)"],
            ["state rm", "Stop managing (real resource untouched)", "Hand a resource off / split state"],
            ["force-unlock <id>", "Clear a stale lock", "After a crashed apply (verify first!)"],
            ["output", "Print root outputs", "Feed values to scripts / other configs"],
          ],
        },
        callout: {
          kind: "warn",
          title: "Never hand-edit tfstate",
          text: "Editing the JSON directly is how you corrupt state. Use the `state` subcommands, `moved`/`import` blocks, and remote-state versioning (S3 versioning lets you roll back a bad write).",
        },
      },
      {
        heading: "Your first time: local state, then go remote",
        body: [
          "On your very first project you don't need any of this — Terraform writes a local `terraform.tfstate` next to your code and it just works. The moment a second person (or CI) touches the project, you move that state into a shared backend. Here's exactly what that transition looks like at the CLI.",
          "Migrating is painless: add the backend block to your config, re-run `init`, and Terraform offers to copy your existing local state up to the remote. Say yes and you're done.",
        ],
        code: {
          lang: "bash",
          source: `# 1) Solo start: no backend block at all — state is a local file.
terraform init          # sets up the dir
terraform apply         # writes ./terraform.tfstate locally

# 2) Going to a team: add a backend "s3" block to your .tf, then:
terraform init          # Terraform detects the new backend and asks:
#   "Do you want to copy existing state to the new backend?"  ->  yes

# 3) Everyday state inspection (read-only, safe to run anytime):
terraform state list                 # what is Terraform managing?
terraform state show aws_s3_bucket.assets   # one resource's tracked attributes

# 4) Adopt a resource you created by hand (so Terraform stops ignoring it):
terraform import aws_s3_bucket.legacy my-existing-bucket-name`,
        },
        callout: {
          kind: "warn",
          title: "Common beginner state mistakes",
          text: "Committing terraform.tfstate (and the .terraform/ dir) to git — add them to .gitignore. Running apply from two machines with only local state, so each has a different truth. Deleting the state file to 'start fresh' (now Terraform wants to recreate everything that already exists). Confusing `state rm` (forget it, keep the real thing) with `destroy` (delete the real thing).",
        },
      },
    ],
    keyPoints: [
      "State maps your config to real resource ids, tracks dependencies, and is Terraform's source of truth — lose it and Terraform gets confused.",
      "State holds secrets in plaintext: never commit it; use an encrypted remote backend with locked-down access.",
      "Team-grade setup = remote backend (S3) + locking (DynamoDB or S3 lockfile) so concurrent applies can't corrupt state.",
      "Bootstrap the state bucket/lock table separately — they can't be created by the config that uses them.",
      "Separate state per environment+component (the backend `key`) to contain blast radius.",
      "Drift = real world diverges from state; plan shows it, -refresh-only inspects/absorbs it.",
      "import (CLI or 1.5+ import block) adopts existing resources; state mv / `moved` blocks refactor without destroying.",
      "Never hand-edit tfstate — use the state subcommands and S3 versioning to recover.",
    ],
    checklist: [
      "Ran a project with local state, then migrated it to a remote backend with init",
      "Added terraform.tfstate and .terraform/ to .gitignore",
      "Configured an S3 backend with DynamoDB (or S3 lockfile) locking",
      "Can explain why state must be remote and locked for a team",
      "Triggered and read a lock conflict; know when force-unlock is safe",
      "Used terraform import (or an import block) to adopt an existing resource",
      "Used terraform_remote_state to read an output from another state file",
      "Know that state contains secrets and is encrypted + access-controlled",
    ],
    quiz: [
      {
        q: "Why is a remote backend with locking essential for a team?",
        options: [
          "It makes apply faster",
          "It prevents two concurrent applies from corrupting shared state and lets everyone use the same source of truth",
          "It encrypts your HCL code",
          "It removes the need for terraform plan",
        ],
        answer: 1,
        explain:
          "Shared, locked remote state is what lets a team collaborate safely; locking stops simultaneous writes that would corrupt state.",
      },
      {
        q: "Someone changed a security group rule in the AWS console. What does the next `terraform plan` show?",
        options: [
          "Nothing — Terraform ignores console changes",
          "Drift: it detects the difference and proposes reverting the resource to match your code",
          "An error that halts Terraform permanently",
          "It silently adopts the change into your code",
        ],
        answer: 1,
        explain:
          "plan refreshes against reality and shows drift. The next apply reconciles the real resource back to what your code declares.",
      },
      {
        q: "You want Terraform to stop managing a resource WITHOUT deleting the real infrastructure. You use…",
        options: [
          "terraform destroy",
          "terraform state rm",
          "terraform import",
          "Delete the resource block and apply",
        ],
        answer: 1,
        explain:
          "`state rm` removes it from state so Terraform forgets it; the real resource is untouched. (Deleting the block and applying would destroy it.)",
      },
    ],
  },

  {
    id: "terraform-modules",
    group: "Terraform",
    label: "Variables & Modules",
    icon: "📦",
    title: "Variables, Expressions, Loops & Modules",
    tagline:
      "From hard-coded resources to reusable, parameterized infrastructure: variables, outputs, for_each/count, dynamic blocks, and modules.",
    sections: [
      {
        heading: "Variables, locals, outputs",
        body: [
          "Input variables parameterize a config so the same code builds staging and prod. Declare with a `variable` block — give it a `type`, a `description`, optionally a `default`, a `validation` rule, and `sensitive = true` to keep it out of CLI/log output. Reference as `var.name`.",
          "Locals (`locals { ... }`, referenced as `local.name`) are named expressions computed once — use them for values derived from variables or repeated across the file (a common tag map, a name prefix). Outputs (`output` blocks) expose values after apply: for humans, for scripts, and for other configs via remote state.",
          "Type constraints are real and worth using: `string`, `number`, `bool`, `list(...)`, `set(...)`, `map(...)`, `object({...})`, `tuple([...])`, and `any`. A typed `object` variable catches a malformed input at plan time instead of producing a confusing API error.",
        ],
        code: {
          lang: "hcl",
          source: `variable "environment" {
  type        = string
  description = "Deployment environment"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}

variable "instance_count" {
  type    = number
  default = 2
}

locals {
  name_prefix = "claire-\${var.environment}"
  common_tags = {
    Project   = "claire"
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

output "name_prefix" {
  value = local.name_prefix
}`,
        },
      },
      {
        heading: "The reuse vocabulary, in plain language",
        body: [
          "This page introduces the words you'll use to make configs reusable. Skim them now; the sections below show each in action.",
        ],
        defs: [
          { term: "Input variable", def: "A parameter for your config (a `variable` block), so the same code can build dev and prod. Referenced as `var.name`." },
          { term: "Default", def: "The value a variable takes when nobody supplies one. Optional — a variable with no default must be provided." },
          { term: "Local value", def: "A named expression computed once (`locals { ... }`, read as `local.name`) — for derived or repeated values like a name prefix or a shared tag map." },
          { term: "Output", def: "A value a config exposes after apply (`output` block) — for humans, scripts, or other configs to consume." },
          { term: "Sensitive", def: "`sensitive = true` on a variable or output hides its value in CLI output and logs (it's still stored in state)." },
          { term: "tfvars file", def: "A file of variable values (`prod.tfvars`) you load with `-var-file`. Keep secrets OUT of these and out of git." },
          { term: "count", def: "Create N copies of a resource, addressed by numeric index (`aws_instance.web[0]`). Simple, but removing a middle item shifts indexes." },
          { term: "for_each", def: "Create one instance per entry in a map/set, addressed by a stable key (`aws_instance.web[\"api\"]`). Safer than count for named things." },
          { term: "Module", def: "A directory of `.tf` files used as a reusable building block, with its own inputs (variables) and outputs. The dir you run commands in is the root module." },
          { term: "Source", def: "Where a module's code comes from — a local path (`./modules/vpc`), the Terraform Registry, or a git URL." },
          { term: "dynamic block", def: "A loop that generates repeated nested blocks (like several `ingress` rules) inside one resource — not whole resources." },
        ],
      },
      {
        heading: "Where variable values come from (precedence)",
        body: [
          "Terraform gathers variable values from several sources; when the same variable is set twice, later sources win. From lowest to highest precedence: defaults in the `variable` block, then `TF_VAR_name` environment variables, then `terraform.tfvars`, then `terraform.tfvars.json`, then any `*.auto.tfvars` (alphabetical), and finally `-var` / `-var-file` on the command line, which override everything.",
          "Practical convention: keep non-secret per-environment values in `prod.tfvars` / `staging.tfvars` and select with `-var-file=prod.tfvars`. Keep secrets out of tfvars entirely — pull them from a secrets manager or `TF_VAR_` env vars in CI, never commit them.",
        ],
        callout: {
          kind: "tip",
          title: "Remember the order",
          text: "Command line (-var / -var-file) beats *.auto.tfvars beats terraform.tfvars beats TF_VAR_ env beats defaults. CLI always wins — handy for one-off overrides.",
        },
      },
      {
        heading: "count vs for_each",
        body: [
          "Both create multiple instances of a resource. `count = n` gives you an indexed list (`aws_instance.web[0]`, `[1]`…). It's fine for N identical copies, but it has a sharp edge: if you remove an item from the middle of a list, every later item's index shifts and Terraform destroys and recreates them.",
          "`for_each` iterates a map or set and keys instances by a stable string (`aws_instance.web[\"api\"]`). Because the key is stable, removing one item only destroys that one — the rest are untouched. Rule of thumb: use `for_each` whenever the things you're creating have natural identities (named buckets, named users); reserve `count` for 'give me N of the same' or a simple on/off (`count = var.enabled ? 1 : 0`).",
        ],
        code: {
          lang: "hcl",
          source: `# for_each over a map — instances keyed by stable names
variable "buckets" {
  type = map(object({ versioned = bool }))
  default = {
    assets = { versioned = true }
    logs   = { versioned = false }
  }
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = "claire-\${each.key}-\${var.environment}"   # each.key = "assets"/"logs"
  tags     = local.common_tags
}

# conditional create with count
resource "aws_cloudwatch_log_group" "audit" {
  count = var.enable_audit ? 1 : 0
  name  = "/claire/audit"
}`,
        },
      },
      {
        heading: "Expressions, functions, dynamic blocks",
        body: [
          "HCL has a real expression language. Conditionals: `var.is_prod ? \"m5.large\" : \"t3.micro\"`. `for` expressions transform collections: `[for s in var.subnets : s.id]` or `{ for u in var.users : u.name => u.role }`. The splat operator pulls an attribute from every instance: `aws_instance.web[*].id`.",
          "Built-in functions cover strings (`upper`, `replace`, `format`, `join`, `split`), collections (`merge`, `lookup`, `flatten`, `concat`, `toset`), numbers, encoding (`jsonencode`, `base64encode`), filesystem (`file`, `templatefile`), and IP math (`cidrsubnet`). `merge(local.common_tags, { Name = \"x\" })` is the everyday one.",
          "`dynamic` blocks generate repeated nested blocks (like multiple `ingress` rules) from a collection — the loop equivalent for sub-blocks, not whole resources.",
        ],
        code: {
          lang: "hcl",
          source: `variable "ingress_ports" {
  type    = list(number)
  default = [80, 443]
}

resource "aws_security_group" "web" {
  name = "\${local.name_prefix}-web"

  dynamic "ingress" {            # one ingress block per port
    for_each = toset(var.ingress_ports)
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  tags = merge(local.common_tags, { Name = "\${local.name_prefix}-web" })
}`,
        },
      },
      {
        heading: "Modules: the unit of reuse",
        body: [
          "A module is just a directory of `.tf` files. The directory you run commands in is the root module; any module it calls is a child module. A well-designed module has clear inputs (`variable`), creates a coherent set of resources, and exposes useful `output`s — a black box you parameterize, like 'a VPC' or 'a tagged S3 bucket with logging'.",
          "Call a module with a `module` block and a `source`. Sources can be local (`./modules/vpc`), the public Terraform Registry (`terraform-aws-modules/vpc/aws`), or a git URL. For registry and git sources, always pin a `version` so an upstream change can't silently alter your infra.",
          "Modules are how you stay DRY across environments: write the pattern once, instantiate it per environment with different inputs. Don't over-abstract early though — a module that wraps a single resource for no reason is just indirection. Extract a module when you've repeated a pattern two or three times.",
        ],
        code: {
          lang: "hcl",
          source: `# Using the well-maintained community VPC module from the registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"            # pin it

  name = "\${local.name_prefix}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "prod"  # one NAT in non-prod to save cost
  tags               = local.common_tags
}

# consume the module's outputs
resource "aws_instance" "app" {
  subnet_id = module.vpc.private_subnets[0]
  ami       = data.aws_ami.al2023.id
  # ...
}`,
        },
        callout: {
          kind: "tip",
          title: "Don't reinvent the VPC",
          text: "The community `terraform-aws-modules` (VPC, EKS, RDS, security-group) are battle-tested and save you from subtle networking bugs. Reading their source is also a great way to learn idiomatic Terraform.",
        },
      },
      {
        heading: "Common beginner mistakes",
        body: [
          "The variables-and-modules stage has its own predictable potholes. Watching for these saves a lot of confused `terraform plan` output.",
        ],
        callout: {
          kind: "warn",
          title: "What trips people up here",
          text: "Using count for named resources, then watching everything after the removed one get recreated — reach for for_each. Putting secrets in a tfvars file and committing it. Forgetting to pin a module's `version`, so an upstream release silently changes your infra. Hard-coding values you should have made variables (then copy-pasting the file per environment). Over-modularizing — wrapping a single resource in a module adds indirection with no payoff; extract on the rule of three.",
        },
      },
    ],
    keyPoints: [
      "Variables parameterize configs (type, validation, sensitive); locals name derived/repeated values; outputs expose results.",
      "Value precedence (low→high): defaults < TF_VAR_ env < terraform.tfvars < *.auto.tfvars < CLI -var/-var-file. CLI wins.",
      "for_each (keyed by stable map/set keys) is safer than count (positional index) — removing a middle item won't recreate the rest.",
      "HCL has conditionals, for-expressions, splat, and rich built-in functions (merge, lookup, jsonencode, templatefile, cidrsubnet).",
      "dynamic blocks generate repeated nested blocks (e.g. ingress rules); count = condition ? 1 : 0 toggles a resource.",
      "A module = a directory with inputs/outputs; root module calls child modules; pin module versions.",
      "Modules keep environments DRY — but extract on the rule of three, don't wrap single resources for no reason.",
    ],
    checklist: [
      "Wrote a typed variable with a validation rule and used a sensitive variable",
      "Can state the variable precedence order from memory",
      "Refactored a count to for_each and can explain why for_each is safer",
      "Used a for-expression and merge() to build tags",
      "Wrote a dynamic block to generate repeated nested blocks",
      "Authored a local module with clean inputs/outputs and consumed a registry module (pinned)",
    ],
    quiz: [
      {
        q: "You manage 4 named S3 buckets and occasionally remove one. Which is safer, and why?",
        options: [
          "count — indexes are simpler",
          "for_each over a map — instances are keyed by stable names, so removing one doesn't recreate the others",
          "Neither, they're identical",
          "count, because for_each can't handle removal",
        ],
        answer: 1,
        explain:
          "With count, removing a middle item shifts every later index and recreates them. for_each keys by stable strings, so only the removed item is destroyed.",
      },
      {
        q: "The same variable is set in terraform.tfvars and via `-var` on the command line. Which wins?",
        options: [
          "terraform.tfvars",
          "The command-line -var",
          "It errors on conflict",
          "Whichever is alphabetically first",
        ],
        answer: 1,
        explain:
          "Command-line -var/-var-file has the highest precedence and overrides tfvars, auto.tfvars, env vars, and defaults.",
      },
      {
        q: "When should you extract infrastructure into a reusable module?",
        options: [
          "Always wrap every single resource in its own module",
          "When you've repeated a coherent pattern a few times and want one parameterized definition",
          "Never — modules add complexity",
          "Only for resources in the Terraform Registry",
        ],
        answer: 1,
        explain:
          "Modules earn their keep on repetition (rule of three). Wrapping a lone resource is needless indirection; a repeated VPC/app pattern is a real module.",
      },
    ],
  },

  {
    id: "terraform-environments",
    group: "Terraform",
    label: "Managing Environments",
    icon: "🌎",
    title: "Managing Environments — Workspaces, Terragrunt & Beyond",
    tagline:
      "The question every team hits: how do you run dev, staging, and prod from one codebase without drift or copy-paste? The full menu — native layouts, Terragrunt, Stacks, and orchestrators — and what's actually best.",
    sections: [
      {
        heading: "What good environment management has to deliver",
        body: [
          "Before comparing tools, name the goals, because every approach is judged against them. (1) Isolation: a mistake in dev must never touch prod — that means separate state per environment and, ideally, a separate AWS account per environment (the strongest blast-radius boundary AWS offers). (2) DRY: the environments should share the same infrastructure definitions so they don't drift apart; you change the pattern once. (3) Promotion: you want to roll the exact same, tested module versions from dev → staging → prod, not hand-edit each. (4) Low blast radius and fast plans: state split by component and environment. (5) Least privilege: each environment's pipeline can only touch its own resources.",
          "Almost every 'how do I manage environments' debate is really about hitting isolation and DRY at the same time. Workspaces lean DRY but weak isolation; copy-pasting whole configs gives isolation but zero DRY and guaranteed drift. The good options give you both.",
        ],
        callout: {
          kind: "key",
          title: "The non-negotiables",
          text: "Separate state per environment, ideally a separate AWS account per environment, and shared version-pinned modules so environments can't silently drift. Everything below is a different way to achieve exactly that.",
        },
      },
      {
        heading: "The environments vocabulary, in plain language",
        body: [
          "This page compares several approaches; here are the terms they all lean on, in one place.",
        ],
        defs: [
          { term: "Environment", def: "A separate copy of your infrastructure for a purpose — dev, staging, prod. The goal is to keep them isolated yet defined by the same code." },
          { term: "Isolation", def: "A guarantee that a mistake in one environment can't touch another — strongest when each env has its own state and its own AWS account." },
          { term: "DRY", def: "\"Don't Repeat Yourself\" — share one definition (a module) across environments so they can't drift apart, instead of copy-pasting." },
          { term: "Blast radius", def: "How much can break from one bad change. Splitting state by environment and component keeps it small." },
          { term: "Workspace", def: "A built-in way to keep one config but switch between multiple state files (`terraform workspace select prod`). DRY, but weak isolation." },
          { term: "Directory per environment", def: "A folder per env (environments/prod, environments/staging), each with its own backend and tfvars, all calling shared modules. The common production default." },
          { term: "Partial backend config", def: "Leaving the backend block's keys empty in code and supplying them per env at init time with `-backend-config` — same code, different state location." },
          { term: "Promotion", def: "Rolling the same tested module version from dev → staging → prod. You promote versions, not git branches." },
          { term: "Orchestrator", def: "A platform (HCP Terraform, Atlantis, Spacelift) that runs plan/apply centrally with approvals, policy, and drift detection — instead of from a laptop." },
        ],
      },
      {
        heading: "Native option A — one config + workspaces",
        body: [
          "Terraform workspaces keep a single configuration and switch between multiple state files (`terraform workspace select prod`), branching behavior on `terraform.workspace`. They're built-in and DRY, but the isolation is weak: all environments share one backend and one set of credentials, and it's genuinely easy to apply to prod while you think you're in dev. There's no structural barrier — just a string you have to remember to set.",
          "Use workspaces for ephemeral or near-identical environments: per-developer sandboxes, short-lived PR-preview stacks, or per-region copies of an identical stack. Don't use them as your prod-vs-staging boundary when those environments differ in scale, account, or risk.",
        ],
        code: {
          lang: "bash",
          source: `# Workspaces in practice — one config, several state files
terraform workspace list           # * default
terraform workspace new dev        # create + switch to "dev"
terraform workspace new prod       # create + switch to "prod"

terraform workspace select dev     # <- which env you're operating on
terraform apply                    # writes to the "dev" state only

# In the config you branch on terraform.workspace:
#   instance_type = terraform.workspace == "prod" ? "m5.large" : "t3.micro"

# The danger: this is just a label. Forget to 'select dev' and you
# apply to prod. That's why directories (next section) are safer for prod.`,
        },
      },
      {
        heading: "Native option B — directory per environment (the solid default)",
        body: [
          "The layout most production teams settle on: a thin root module per environment, each with its own backend config and `.tfvars`, all calling the same shared modules. The environment is explicit (you `cd environments/prod`), state is fully isolated, and prod and staging can intentionally differ. The shared `modules/` directory keeps it DRY; the per-env roots are tiny.",
          "The piece I didn't cover earlier and that makes this clean is partial backend configuration: leave the backend block keys empty in code and supply them per environment at `init` time with `-backend-config`. Same code, different state location per env — no duplication.",
        ],
        code: {
          lang: "hcl",
          source: `# live/
# ├── modules/                 # shared, versioned building blocks
# │   ├── network/
# │   └── app/
# └── environments/
#     ├── dev/   { main.tf, dev.tfvars, backend.hcl }
#     ├── staging/
#     └── prod/

# environments/prod/main.tf — a thin root that just wires modules
terraform {
  backend "s3" {}            # left partial on purpose
}

module "app" {
  source       = "../../modules/app"
  environment  = "prod"
  instance_type = var.instance_type   # comes from prod.tfvars
}

# environments/prod/backend.hcl — the per-env state location
#   bucket = "claire-tf-state"
#   key    = "prod/app/terraform.tfstate"
#   region = "eu-west-1"
#   dynamodb_table = "claire-tf-locks"

#   terraform init -backend-config=backend.hcl
#   terraform apply -var-file=prod.tfvars`,
        },
        callout: {
          kind: "tip",
          title: "Why this beats workspaces for prod",
          text: "Different directory + different backend config + (ideally) different AWS account = you physically cannot apply to prod by accident. That structural safety is worth the small extra verbosity.",
        },
      },
      {
        heading: "Terragrunt — keep the directory layout DRY",
        body: [
          "The directory-per-env layout has one weakness: as you add environments, regions, and accounts, the per-root boilerplate (backend block, provider block, the same module call) repeats. Terragrunt (by Gruntwork) is a thin wrapper around Terraform that removes exactly that repetition. You write the backend and provider config once in a root `terragrunt.hcl`; each leaf `terragrunt.hcl` `include`s it and supplies only `inputs`. Terragrunt generates the backend/provider blocks and even computes the state key from the folder path, so a new environment is a tiny file, not a copied directory.",
          "Its other big wins: `dependency` blocks let one component consume another's outputs (the app stack reads the network stack's VPC id) with mock outputs for planning, and `terragrunt run-all apply` plans/applies across many components in dependency order. That's the answer when you have many small states that must be wired together across accounts.",
          "The trade-off: it's a third-party layer with its own concepts and another binary in your toolchain. For a handful of environments, plain directories are simpler. Reach for Terragrunt when the boilerplate and cross-stack wiring genuinely hurt — many accounts/regions, many small states.",
        ],
        code: {
          lang: "hcl",
          source: `# root terragrunt.hcl — backend defined ONCE for every environment
remote_state {
  backend = "s3"
  config = {
    bucket         = "claire-tf-state"
    key            = "\${path_relative_to_include()}/terraform.tfstate"  # auto per folder
    region         = "eu-west-1"
    dynamodb_table = "claire-tf-locks"
    encrypt        = true
  }
}

# environments/prod/app/terragrunt.hcl — a leaf: include root + inputs only
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "git::git@github.com:claire/modules.git//app?ref=v1.4.0"  # pinned
}

dependency "network" {
  config_path = "../network"     # consume another stack's outputs
}

inputs = {
  environment = "prod"
  vpc_id      = dependency.network.outputs.vpc_id
  instance_type = "m5.large"
}`,
        },
      },
      {
        heading: "Native multi-instance — Terraform Stacks",
        body: [
          "HashiCorp's newer answer is Terraform Stacks (on HCP Terraform): a native construct for managing many instances of the same infrastructure. You define components (modules to deploy) in a `.tfcomponent.hcl` and deployments (the variations — dev, staging, prod, or per-region) in a `.tfdeploy.hcl`, and the platform plans/applies each deployment from one definition with shared orchestration. It targets the exact problem Terragrunt solves — many similar environments — but built into the workflow rather than bolted on.",
          "It's the strategic direction if you're on HCP Terraform, though it's newer than the battle-tested directory and Terragrunt patterns, so weigh maturity for critical prod. Know it exists and what it's for; many teams will adopt it as it matures.",
        ],
      },
      {
        heading: "Orchestration platforms — the workflow layer",
        body: [
          "Separate from how you lay out code is how you run plan/apply. An orchestrator runs Terraform centrally with a PR-driven workflow, state, locking, approvals, policy-as-code, and drift detection — so applies don't depend on whose laptop ran them. The options: Terraform Cloud / HCP Terraform (HashiCorp's managed service, workspaces per environment, Sentinel policy), Spacelift and env0 (powerful policy + multi-IaC SaaS), and Atlantis (free, open-source, self-hosted PR automation). These complement any layout above — you can run directory-per-env or Terragrunt under Atlantis or Spacelift.",
          "For environment management specifically, these platforms add per-environment approval gates (require a human to approve prod), per-environment credentials (least privilege via OIDC), and continuous drift detection that flags when reality diverges from code. At scale, the orchestrator is often what actually enforces your environment discipline.",
        ],
      },
      {
        heading: "Choosing — and the anti-patterns",
        body: [
          "There's no single 'best' — it scales with your situation. For most teams: directory-per-environment + shared pinned modules + separate state and ideally separate AWS accounts, run through an orchestrator. Add Terragrunt when that gets repetitive across many accounts/regions. Consider Terraform Stacks if you're on HCP Terraform and want the native multi-instance model. Use workspaces only for ephemeral/identical environments.",
          "Avoid the anti-patterns: branch-per-environment (a git branch per env) drifts and makes promotion a merge nightmare — promote module versions, not branches. One giant state for everything gives a huge blast radius and slow plans. Copy-pasting whole configs per environment guarantees they diverge. And never share one state file across environments.",
        ],
        table: {
          headers: ["Approach", "DRY", "Isolation", "Extra tooling", "Best for"],
          rows: [
            ["Workspaces", "High", "Weak", "None", "Ephemeral / identical envs"],
            ["Directory per env + modules", "Medium", "Strong", "None", "Most teams; prod vs staging"],
            ["Terragrunt", "High", "Strong", "Terragrunt", "Many accounts/regions, cross-stack wiring"],
            ["Terraform Stacks", "High", "Strong", "HCP Terraform", "Native multi-instance (newer)"],
            ["Orchestrator (TFC/Spacelift/Atlantis)", "—", "Strong", "Platform", "PR workflow, policy, drift at scale"],
          ],
        },
        callout: {
          kind: "warn",
          title: "Common beginner mistakes",
          text: "Using workspaces as the prod/staging boundary, then applying to prod because you forgot to switch. Sharing one state file (or one backend key) across environments — a change to one can clobber another. Copy-pasting a whole config per environment, which guarantees they drift. Branch-per-environment: promotion becomes a merge nightmare — promote pinned module versions instead. Reaching for Terragrunt or Stacks on day one when two plain directories would do.",
        },
      },
    ],
    keyPoints: [
      "Goals first: isolation (separate state, ideally separate account per env) + DRY (shared pinned modules) + safe promotion + low blast radius + least privilege.",
      "Workspaces: built-in, DRY, but weak isolation (shared backend, easy to target the wrong env) — only for ephemeral/identical envs.",
      "Directory-per-env + shared modules + partial backend config (-backend-config) is the solid default: explicit, isolated, still DRY.",
      "Terragrunt removes per-root boilerplate (generates backend/provider, auto state keys), adds dependency wiring + run-all — for many accounts/regions/small states.",
      "Terraform Stacks (HCP) is the native multi-instance answer: components + deployments; newer, weigh maturity.",
      "Orchestrators (TFC/HCP, Spacelift, Atlantis, env0) add PR-driven plan/apply, per-env approvals, OIDC creds, policy, and drift detection on top of any layout.",
      "Anti-patterns: branch-per-env, one giant state, copy-pasted configs, sharing state across envs — promote module versions, not branches.",
    ],
    checklist: [
      "Each environment has its own state file (and ideally its own AWS account)",
      "Environments share version-pinned modules; I promote versions dev→staging→prod",
      "Used partial backend config (-backend-config) for per-env state without duplication",
      "Can explain when Terragrunt earns its keep over plain directories",
      "Know that Terraform Stacks is the native multi-instance model on HCP Terraform",
      "Have (or can describe) an orchestrator giving per-env approvals + drift detection",
      "Avoid branch-per-env and a single shared state file",
    ],
    quiz: [
      {
        q: "A team needs prod and staging that differ in scale and live in different AWS accounts, with no risk of applying to the wrong one. Best baseline approach?",
        options: [
          "One config with Terraform workspaces for prod and staging",
          "Directory-per-environment with separate state/backends and separate accounts, sharing pinned modules",
          "A git branch per environment",
          "One state file with a prod flag variable",
        ],
        answer: 1,
        explain:
          "Separate directories + state + accounts give structural isolation (you can't apply to the wrong env), while shared pinned modules keep it DRY. Workspaces share a backend and are easy to mis-target; branch-per-env drifts.",
      },
      {
        q: "Your directory-per-env setup now spans 12 accounts and 3 regions, and the backend/provider boilerplate is duplicated everywhere with cross-stack dependencies. The strongest fix is…",
        options: [
          "Switch everything to workspaces",
          "Adopt Terragrunt to generate backend/provider config, auto state keys, and wire dependencies with run-all",
          "Put it all in one giant state file",
          "Copy the configs and edit each by hand",
        ],
        answer: 1,
        explain:
          "Terragrunt exists for exactly this: remove repeated backend/provider boilerplate, auto-derive state keys, and wire components together with dependency blocks + run-all across many accounts/regions.",
      },
      {
        q: "Which is an environment-management anti-pattern?",
        options: [
          "Promoting the same pinned module versions from dev to prod",
          "A separate state file per environment",
          "A separate git branch per environment that you merge to promote",
          "Separate AWS accounts per environment",
        ],
        answer: 2,
        explain:
          "Branch-per-environment drifts and turns promotion into merge conflicts. Promote tested module versions, not branches; keep state (and ideally accounts) separate per env.",
      },
    ],
  },

  {
    id: "terraform-workflow",
    group: "Terraform",
    label: "Production Workflow",
    icon: "🚀",
    title: "Terraform in Production — Environments, CI/CD, Testing, Security",
    tagline:
      "Going from 'works on my laptop' to a safe team workflow: structuring environments, running plans in CI, testing, scanning, and the gotchas that bite real teams.",
    sections: [
      {
        heading: "Structuring environments: directories vs workspaces",
        body: [
          "Two ways to get separate state per environment. Workspaces (`terraform workspace new prod`) keep one config and switch between multiple state files; reference the current one as `terraform.workspace`. They're lightweight but share the same code and backend `key`, and it's easy to apply to the wrong workspace by accident — risky for prod.",
          "The directory-per-environment layout is the more common production pattern: `environments/prod`, `environments/staging`, each with its own backend config and `.tfvars`, all calling the same shared `modules/`. It's more verbose but the environment is explicit (you `cd` into it), state is fully isolated, and prod and staging can drift in version intentionally.",
          "Guidance: workspaces are fine for ephemeral or near-identical envs (per-developer sandboxes, PR previews). For prod vs staging with different scale, accounts, and risk, prefer explicit directories. Either way, give each environment its own state file and ideally its own AWS account.",
        ],
        table: {
          headers: ["", "Workspaces", "Directory per env"],
          rows: [
            ["Isolation", "Same code, separate state", "Separate code + state"],
            ["Risk of wrong target", "Higher (silent switch)", "Lower (explicit cd)"],
            ["Drift between envs", "Hard (one codebase)", "Easy (intentional)"],
            ["Best for", "Ephemeral / identical envs", "prod vs staging"],
          ],
        },
      },
      {
        heading: "The production vocabulary, in plain language",
        body: [
          "Going from laptop to team adds a layer of words. Here's the short version so the rest of the page lands.",
        ],
        defs: [
          { term: "CI/CD", def: "Continuous Integration / Delivery — the automated pipeline that runs your checks and apply when code is merged, instead of someone running it locally." },
          { term: "Plan artifact", def: "A saved plan file (`-out=tf.plan`) so `apply` runs exactly what was reviewed — no gap between review and execution." },
          { term: "OIDC federation", def: "Letting CI assume a short-lived IAM role via a trust relationship, so no long-lived AWS keys are stored in the pipeline." },
          { term: "Policy as code", def: "Rules enforced automatically at plan time (Sentinel, OPA/Conftest) — e.g. 'no public S3 bucket', 'every resource needs a cost-center tag'." },
          { term: "tflint", def: "A linter that catches provider-specific mistakes (invalid instance types, deprecated arguments) before you apply." },
          { term: "tfsec / checkov", def: "Security scanners that read your HCL for misconfigurations (public buckets, open SSH, unencrypted volumes) before anything is built." },
          { term: "terraform test", def: "The built-in test framework (1.6+, `.tftest.hcl` files) for plan-time assertions and real apply/destroy integration tests." },
          { term: "lifecycle", def: "A meta-argument controlling update behavior: create_before_destroy, prevent_destroy, ignore_changes." },
          { term: "Provisioner", def: "A script run during create/destroy (local-exec, remote-exec). A last resort — it breaks the plan/apply guarantees; prefer cloud-init or baked AMIs." },
          { term: "Lock file (.terraform.lock.hcl)", def: "Records the exact provider versions chosen, so every teammate and CI gets identical plans. Commit it." },
        ],
      },
      {
        heading: "The CI/CD pipeline for Terraform",
        body: [
          "The team workflow mirrors application code review, but the artifact under review is a plan. On a pull request, CI runs `fmt -check`, `validate`, a security scan, and `terraform plan`, then posts the plan as a PR comment so a human reviews exactly what will change. On merge to main, CI runs `apply` against the saved plan.",
          "Two practices make this safe: (1) `plan -out=tf.plan` then `apply tf.plan` so apply executes precisely what was reviewed — no drift between review and execution; (2) CI authenticates with short-lived credentials (OIDC federation to an IAM role), never long-lived access keys in the pipeline.",
          "For larger setups, remote execution (HCP Terraform / Terraform Cloud, Atlantis, Spacelift, env0) runs the plan/apply centrally with state, locking, approvals, and policy built in — so applies don't depend on whose laptop ran them.",
        ],
        steps: [
          "PR opened → CI: terraform fmt -check, validate, tflint, tfsec/checkov.",
          "CI: terraform plan -out=tf.plan, post the human-readable plan as a PR comment.",
          "Reviewer reads the plan diff and approves the PR (the plan IS the review artifact).",
          "Merge → CI: terraform apply tf.plan using OIDC short-lived credentials.",
          "Apply output and outputs captured; state stored remotely with locking.",
        ],
        callout: {
          kind: "tip",
          title: "Review the plan, not just the code",
          text: "A one-line code change can produce a destructive plan. The plan in the PR comment is the real review surface — train reviewers to read it like a diff, watching for replacements and deletes.",
        },
      },
      {
        heading: "Testing and policy: catch problems before apply",
        body: [
          "Static checks come first and cheapest: `terraform fmt -check` (style), `terraform validate` (syntax/types), and `tflint` (provider-aware lint — invalid instance types, deprecated args). They run in seconds and need no cloud access.",
          "Security and compliance scanning reads your HCL for misconfigurations before anything is built: `tfsec` / Trivy and `checkov` flag public S3 buckets, unencrypted volumes, `0.0.0.0/0` SSH, missing logging — exactly the issues that become incidents.",
          "Behavioral testing: Terraform 1.6+ ships a native `terraform test` framework (`.tftest.hcl` files) that can run plan-time assertions and real apply/destroy integration tests. Terratest (Go) is the established alternative for end-to-end tests. For guardrails that must hold across all configs, policy-as-code (Sentinel on HCP Terraform, or Open Policy Agent / Conftest) enforces rules like 'no resource without a cost-center tag' or 'no public ingress' at plan time.",
        ],
        code: {
          lang: "hcl",
          source: `# example.tftest.hcl — native Terraform test (1.6+)
run "bucket_is_private" {
  command = plan

  assert {
    condition     = aws_s3_bucket_public_access_block.assets.block_public_acls == true
    error_message = "Asset bucket must block public ACLs."
  }
}`,
        },
      },
      {
        heading: "Lifecycle, dependencies, and provisioners",
        body: [
          "The `lifecycle` meta-argument handles tricky update behavior. `create_before_destroy = true` builds the replacement before deleting the old one (avoids downtime when a resource must be replaced). `prevent_destroy = true` is a guardrail that makes Terraform refuse to delete a critical resource (a prod database). `ignore_changes = [tags[\"LastModified\"]]` tells Terraform to stop fighting an attribute that something else mutates.",
          "Use explicit `depends_on` only when there's a real ordering dependency Terraform can't infer from references (e.g. an IAM policy must exist before an instance that uses it at boot, but nothing references it). Reach for it rarely — implicit dependencies via references are the norm.",
          "Provisioners (`local-exec`, `remote-exec`) run scripts during create/destroy. Treat them as a last resort: they're not declarative, they break the plan/apply guarantees, and they fail in non-idempotent ways. Prefer cloud-init/user_data, AMIs baked with Packer, or a config-management tool. HashiCorp's own docs call provisioners a last resort.",
        ],
        callout: {
          kind: "warn",
          title: "prevent_destroy is a seatbelt, not a vault",
          text: "It stops `terraform destroy`/replacement of that resource, which is great for a prod DB — but it also blocks legitimate replacements until you remove the flag. And it won't save you from `terraform state rm` + manual deletion. Pair it with deletion protection on the resource itself.",
        },
      },
      {
        heading: "The gotchas that bite real teams",
        body: [
          "Secrets in state: any generated password or key lands in state in plaintext. Encrypt the backend, restrict access, and prefer having the resource generate/store the secret in Secrets Manager rather than passing it through Terraform.",
          "Drift from click-ops: someone fixes prod in the console; the next apply reverts it. Make the console read-only in prod (or use SCPs), and treat the plan as the alarm.",
          "Provider/version sprawl: unpinned providers or modules mean two engineers get different plans. Commit `.terraform.lock.hcl`, pin `required_providers` and module `version`s.",
          "Giant blast radius: one state file for the whole org means a bad apply can wreck everything and every plan is slow. Split state by component and environment.",
          "Long-lived IAM keys in CI: use OIDC federation to assume a role with least privilege scoped to what the pipeline actually manages.",
        ],
        table: {
          headers: ["Gotcha", "Fix"],
          rows: [
            ["Secrets in plaintext state", "Encrypt + lock down backend; generate secrets into Secrets Manager"],
            ["Manual console changes (drift)", "Plan as alarm; restrict console in prod via IAM/SCP"],
            ["Inconsistent plans", "Commit .terraform.lock.hcl; pin provider + module versions"],
            ["Huge blast radius / slow plans", "Split state by component + environment"],
            ["Long-lived keys in CI", "OIDC federation → short-lived least-privilege role"],
            ["Destructive replacements", "Read plans; create_before_destroy; prevent_destroy on critical resources"],
          ],
        },
        callout: {
          kind: "warn",
          title: "Common beginner mistakes going to production",
          text: "Storing long-lived AWS access keys as CI secrets instead of using OIDC. Not committing .terraform.lock.hcl, so you and CI resolve different provider versions. Auto-approving apply in CI without a human reading the plan. Reaching for a provisioner (local-exec) to glue something together when user_data or a baked AMI would do. Putting the whole org in one state file. Skipping tfsec/checkov and shipping a public bucket.",
        },
      },
    ],
    keyPoints: [
      "Directory-per-environment (explicit, isolated) beats workspaces for prod vs staging; workspaces suit ephemeral/identical envs.",
      "CI reviews the PLAN, not just the code: fmt-check, validate, scan, plan -out → human-reviewed → apply the saved plan on merge.",
      "Authenticate CI with OIDC short-lived roles, never long-lived access keys.",
      "Layered testing: fmt/validate/tflint (static) → tfsec/checkov (security) → terraform test/Terratest (behavior) → Sentinel/OPA (policy).",
      "lifecycle: create_before_destroy (no downtime), prevent_destroy (guard), ignore_changes (stop fighting external mutation).",
      "Provisioners and depends_on are last resorts; prefer references and cloud-init/Packer.",
      "Top gotchas: secrets in state, click-ops drift, unpinned versions, giant blast radius — each has a standard fix.",
    ],
    checklist: [
      "Chose and justified workspaces vs directory-per-env for a real setup",
      "Built a CI pipeline that posts a plan to the PR and applies the saved plan on merge",
      "CI authenticates via OIDC, not stored access keys",
      "Wired tfsec/checkov and a terraform test (or Terratest) into CI",
      "Used create_before_destroy and prevent_destroy where they matter",
      "Committed .terraform.lock.hcl and pinned provider + module versions",
      "Split state by component/environment to bound blast radius",
    ],
    quiz: [
      {
        q: "In a Terraform CI pipeline, what is the primary artifact a human reviews on a pull request?",
        options: [
          "The HCL diff only",
          "The `terraform plan` output showing exactly what will be created/changed/destroyed",
          "The state file",
          "The apply logs after the fact",
        ],
        answer: 1,
        explain:
          "A small code change can yield a destructive plan. The plan is the real review surface; review it, then apply that exact saved plan.",
      },
      {
        q: "You must replace a load-balanced resource with zero downtime. Which lifecycle setting helps?",
        options: [
          "prevent_destroy = true",
          "create_before_destroy = true",
          "ignore_changes = all",
          "depends_on = []",
        ],
        answer: 1,
        explain:
          "create_before_destroy builds the replacement before tearing down the old one, avoiding a gap. prevent_destroy would just block the replacement.",
      },
      {
        q: "How should a CI pipeline authenticate to AWS for terraform apply?",
        options: [
          "Long-lived IAM access keys stored as CI secrets",
          "The root account credentials",
          "OIDC federation to assume a short-lived, least-privilege IAM role",
          "A shared key committed to the repo",
        ],
        answer: 2,
        explain:
          "OIDC lets CI assume a scoped role for short-lived credentials — no long-lived keys to leak. Least privilege limits blast radius.",
      },
    ],
  },
];

export const CLOUD_CONCEPTS = [...TERRAFORM_CONCEPTS];
