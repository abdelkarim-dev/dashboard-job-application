// Cloud & infrastructure reading track for the Learn hub.
//
// Hand-authored (not generated): a deep Terraform track plus an AWS track aimed
// squarely at the Solutions Architect – Associate (SAA-C03) exam. Same concept
// shape as concepts.js (sections / keyPoints / checklist / quiz), rendered
// generically by ConceptPage.jsx. Adding a page is just adding an entry here.
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
        heading: "Native option A — one config + workspaces",
        body: [
          "Terraform workspaces keep a single configuration and switch between multiple state files (`terraform workspace select prod`), branching behavior on `terraform.workspace`. They're built-in and DRY, but the isolation is weak: all environments share one backend and one set of credentials, and it's genuinely easy to apply to prod while you think you're in dev. There's no structural barrier — just a string you have to remember to set.",
          "Use workspaces for ephemeral or near-identical environments: per-developer sandboxes, short-lived PR-preview stacks, or per-region copies of an identical stack. Don't use them as your prod-vs-staging boundary when those environments differ in scale, account, or risk.",
        ],
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

// ── AWS (Solutions Architect – Associate) ─────────────────────────
const AWS_CONCEPTS = [
  {
    id: "aws-saa-overview",
    group: "AWS (SAA)",
    label: "SAA Exam & Well-Architected",
    icon: "☁",
    title: "AWS Solutions Architect – Associate: The Map",
    tagline:
      "What the SAA-C03 exam tests, the Well-Architected Framework it's built on, AWS global infrastructure, the shared responsibility model, and how to read exam questions.",
    sections: [
      {
        heading: "What the exam actually is",
        body: [
          "The AWS Certified Solutions Architect – Associate (exam code SAA-C03) tests whether you can design solutions on AWS that are secure, resilient, high-performing, and cost-optimized. It is 65 questions in 130 minutes, scored 100–1000, and you pass at 720. Questions are multiple-choice (one right answer) or multiple-response (pick two or three). About 15 of the 65 are unscored trial questions — you won't know which, so answer them all.",
          "It is not a trivia test of memorized limits. The dominant question shape is a scenario: 'A company needs X with constraint Y — which solution best meets the requirement?' Several answers will technically work; you pick the one that best fits the qualifier (most cost-effective, least operational overhead, highest availability, real-time). Learning to read that qualifier is half the exam.",
        ],
        table: {
          headers: ["Domain", "Weight", "In one line"],
          rows: [
            ["1. Design Secure Architectures", "30%", "IAM, encryption, network isolation, least privilege"],
            ["2. Design Resilient Architectures", "26%", "Multi-AZ, decoupling, fault tolerance, DR"],
            ["3. Design High-Performing Architectures", "24%", "Right service for the workload, scaling, caching"],
            ["4. Design Cost-Optimized Architectures", "20%", "Right-sizing, purchasing models, storage tiers"],
          ],
        },
      },
      {
        heading: "The Well-Architected Framework: the lens behind every question",
        body: [
          "AWS's Well-Architected Framework defines six pillars, and the exam is essentially these pillars turned into scenarios. Operational Excellence (run and monitor systems, automate change). Security (protect data and systems, least privilege, defense in depth). Reliability (recover from failure, scale to meet demand). Performance Efficiency (use the right resources and adapt as needs change). Cost Optimization (avoid unnecessary cost, pick the right pricing model). Sustainability (minimize environmental impact — the newest pillar).",
          "When two answers both work, the 'best' one is the one that better satisfies the pillar the question is emphasizing. 'Least operational overhead' → managed/serverless (the Operational Excellence + Cost lens). 'Must survive an AZ failure' → Multi-AZ (Reliability). 'Sensitive data at rest' → encryption with KMS (Security).",
        ],
        callout: {
          kind: "tip",
          title: "Map the qualifier to a pillar",
          text: "Underline the qualifier in every question. 'Cost-effective' → Cost. 'Highly available / fault tolerant' → Reliability. 'Least operational effort' → managed/serverless. 'Fastest / lowest latency' → Performance. The qualifier usually eliminates two answers immediately.",
        },
      },
      {
        heading: "Global infrastructure: Regions, AZs, edge",
        body: [
          "A Region is a separate geographic area (eu-west-1, us-east-1) — your data and services are isolated per region unless you explicitly replicate. You choose a region for latency to users, data-residency/compliance, service availability, and price (regions differ in cost).",
          "An Availability Zone (AZ) is one or more discrete data centers within a region, with independent power, cooling, and networking, connected to sibling AZs by low-latency links. Each region has at least three AZs. The core HA pattern on AWS is 'spread across multiple AZs' — an AZ can fail, a well-designed system survives it. Multi-Region is for disaster recovery and global latency, not everyday HA.",
          "Edge locations (and Regional Edge Caches) are the CloudFront/Route 53 points of presence near users — hundreds of them, far more than there are regions — used to cache content and terminate connections close to the user. Local Zones, Wavelength, and Outposts extend AWS into metros, 5G networks, and on-prem respectively.",
        ],
        callout: {
          kind: "key",
          title: "AZ vs Region rule of thumb",
          text: "High availability within a region = spread across multiple AZs. Disaster recovery / global reach = multiple regions. Most exam HA answers are 'use multiple AZs'; reach for multi-region only when the scenario says 'region outage' or 'global users'.",
        },
      },
      {
        heading: "The shared responsibility model",
        body: [
          "AWS secures the cloud; you secure what you put in the cloud. AWS is responsible for security OF the cloud — the physical data centers, hardware, the hypervisor, and the managed-service software (e.g. patching the RDS engine, the S3 service itself). You are responsible for security IN the cloud — your IAM configuration, security groups, encryption choices, OS patching on EC2, and your data.",
          "The line moves with how managed the service is. On EC2 you patch the guest OS; on RDS AWS patches the engine but you still manage users, encryption, and network access; on Lambda/S3 AWS handles even more, but IAM permissions and data classification are always yours. Exam traps often hinge on 'whose job is this' — encryption keys, OS patches, IAM, and bucket policies are always the customer's.",
        ],
      },
      {
        heading: "How to study (and how to read a question)",
        body: [
          "Study by service category mapped to the domains — that's exactly how the rest of this AWS track is organized: IAM & security, compute, storage, networking, databases, then resilience/decoupling/cost. For each service, learn what problem it solves, when to pick it over alternatives, and its one or two distinctive exam facts (S3 storage classes, RDS Multi-AZ vs read replica, ALB vs NLB).",
          "Question technique: read the last sentence first (it states what's being asked and the qualifier), eliminate clearly wrong answers, then choose among survivors by the qualifier. Watch for distractor patterns: an answer that's more expensive/more operational than needed, a service that's close but wrong (Firehose vs Kinesis Data Streams, NLB vs ALB), or a security anti-pattern (hard-coded keys, public buckets). Use AWS's official sample questions and the exam guide as your source of truth, and do timed practice tests until you're consistently above the pass mark.",
        ],
        steps: [
          "Learn services by domain category (security → compute → storage → network → data → resilience/cost).",
          "For each service: the problem it solves, when to choose it, its 1–2 distinctive facts.",
          "Read each question's qualifier (cost / HA / latency / least-ops) and map it to a pillar.",
          "Eliminate the over-built and the security-anti-pattern answers first.",
          "Drill timed practice exams; review every wrong answer until you know WHY it's wrong.",
        ],
      },
    ],
    keyPoints: [
      "SAA-C03: 65 questions, 130 min, pass at 720/1000; ~15 unscored. Four domains: Secure 30%, Resilient 26%, Performing 24%, Cost 20%.",
      "Well-Architected = 6 pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.",
      "The exam is scenario-based: several answers 'work', the qualifier (cost / HA / latency / least-ops) picks the best one.",
      "Region = isolated geo; AZ = independent DC within a region (≥3 per region). HA = multi-AZ; DR/global = multi-region.",
      "Edge locations (CloudFront/Route 53) are many more than regions; for caching content near users.",
      "Shared responsibility: AWS secures OF the cloud (hardware, managed-service software); you secure IN the cloud (IAM, data, encryption, OS on EC2).",
      "Read the qualifier, eliminate over-built and anti-pattern answers, then choose by pillar.",
    ],
    checklist: [
      "Memorized the four domains and their weights",
      "Can name all six Well-Architected pillars and what each emphasizes",
      "Can explain AZ vs Region and when to use multi-AZ vs multi-region",
      "Can state the shared responsibility split for EC2 vs RDS vs S3/Lambda",
      "Practiced mapping a question's qualifier to a pillar to eliminate answers",
      "Took at least one timed full-length practice exam above 72%",
    ],
    quiz: [
      {
        q: "A question says: 'The solution must remain available if a single data center fails, at the lowest cost.' The best design direction is…",
        options: [
          "Deploy to multiple Regions with active-active replication",
          "Deploy across multiple Availability Zones within one Region",
          "Use a single large instance with extra EBS volumes",
          "Add CloudFront in front of one instance",
        ],
        answer: 1,
        explain:
          "An AZ is an independent data center; spreading across AZs survives a DC failure cheaply. Multi-region is for region outages/global reach and costs more.",
      },
      {
        q: "Under the shared responsibility model, who is responsible for patching the guest OS on an EC2 instance?",
        options: ["AWS", "The customer", "Neither — EC2 has no OS", "AWS for the first 90 days"],
        answer: 1,
        explain:
          "On EC2 (IaaS) the customer patches the guest OS. AWS handles the hardware and hypervisor (security OF the cloud).",
      },
      {
        q: "Two answers both satisfy the requirement, but the question stresses 'least operational overhead.' You should prefer…",
        options: [
          "The self-managed solution on EC2 you can fully control",
          "The managed / serverless option that removes undifferentiated heavy lifting",
          "Whichever is cheapest regardless of operations",
          "The one using the most services",
        ],
        answer: 1,
        explain:
          "'Least operational overhead' points to managed/serverless services (RDS, Lambda, Fargate, DynamoDB) that offload patching, scaling, and HA to AWS.",
      },
    ],
  },

  {
    id: "aws-iam-security",
    group: "AWS (SAA)",
    label: "Identity & Security",
    icon: "🔐",
    title: "IAM, Encryption & the Security Domain",
    tagline:
      "The biggest exam domain (30%): IAM users/roles/policies and how policies are evaluated, Organizations & SCPs, KMS encryption, and the security services you must recognize.",
    sections: [
      {
        heading: "IAM building blocks",
        body: [
          "IAM (Identity and Access Management) is global (not per-region) and free. Its four nouns: a user is a person or app with long-term credentials; a group is a bucket of users you attach policies to (groups can't be nested and aren't 'principals'); a role is a set of permissions with no long-term credentials that any trusted principal can assume to get temporary credentials; a policy is the JSON document that grants or denies permissions.",
          "Roles are the heart of good AWS security and a heavy exam theme. An EC2 instance gets permissions via an instance profile (a role), not by storing access keys on disk. Lambda runs with an execution role. Cross-account access, federation (SSO, web identity), and service-to-service access all work by assuming roles via STS, which hands back short-lived credentials. The recurring right answer to 'how should this app/instance get AWS permissions?' is 'an IAM role', and the recurring wrong answer is 'embed access keys'.",
        ],
        code: {
          lang: "json",
          source: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::claire-assets-prod/*",
      "Condition": {
        "Bool": { "aws:SecureTransport": "true" }
      }
    }
  ]
}`,
        },
      },
      {
        heading: "Policy types and how evaluation works",
        body: [
          "Identity-based policies attach to a user/group/role ('what can this identity do'). Resource-based policies attach to a resource ('who can touch this'), like an S3 bucket policy or an SQS queue policy — these have a Principal. Other types you should recognize: permissions boundaries (a ceiling on what an identity-based policy can grant), and Service Control Policies (SCPs) at the Organizations level (org-wide guardrails).",
          "The evaluation rule you must know cold: access is denied by default; an explicit Deny anywhere always wins; otherwise an explicit Allow is needed from some applicable policy, and an SCP must also permit the action. So the order of precedence is: explicit Deny > (SCP boundary) > explicit Allow > implicit (default) Deny. If nothing explicitly allows it, it's denied.",
        ],
        callout: {
          kind: "key",
          title: "The one rule to memorize",
          text: "Default = deny. Explicit deny always beats explicit allow. You need an explicit allow AND no explicit deny AND (if in an Org) the SCP must allow it. SCPs and permission boundaries only LIMIT — they never grant.",
        },
      },
      {
        heading: "Organizations, SCPs, and account strategy",
        body: [
          "AWS Organizations groups many accounts under one management account, with consolidated billing (volume discounts pooled across accounts) and Organizational Units (OUs) for structure. The recommended pattern is multi-account: separate prod, dev, and security/logging accounts so a blast radius and permissions are isolated by account boundary — the strongest isolation AWS offers.",
          "Service Control Policies (SCPs) are org-wide guardrails attached to OUs or accounts. They define the maximum permissions available in those accounts but grant nothing on their own — you still need IAM allows inside the account. Classic SCP uses: deny use of regions you don't operate in, deny disabling CloudTrail, deny leaving the org. IAM Identity Center (formerly AWS SSO) is the modern way to give humans federated, role-based access across all accounts.",
        ],
      },
      {
        heading: "Encryption and KMS",
        body: [
          "Encryption in transit is TLS; encryption at rest is the exam's focus, and KMS (Key Management Service) is the center of it. KMS manages encryption keys (KMS keys, formerly CMKs) and integrates with almost every service — S3, EBS, RDS, DynamoDB, Secrets Manager. AWS-managed keys are automatic and free-ish; customer-managed keys give you control over rotation, key policies (who can use the key), and auditability, which compliance scenarios want.",
          "Know envelope encryption: KMS encrypts a data key, the data key encrypts your data; the service stores the encrypted data key alongside the ciphertext. KMS keys never leave KMS (FIPS-validated HSMs). Customer-managed keys support automatic annual rotation. For very high compliance you can use CloudHSM (single-tenant dedicated HSM). For HTTPS certs, ACM (Certificate Manager) issues and auto-renews TLS certificates for free on ALB/CloudFront.",
        ],
        table: {
          headers: ["Need", "Service"],
          rows: [
            ["Manage encryption keys, encrypt at rest", "KMS"],
            ["Dedicated single-tenant HSM (compliance)", "CloudHSM"],
            ["Store + auto-rotate DB credentials/API keys", "Secrets Manager"],
            ["Cheap config/params (with optional SecureString)", "SSM Parameter Store"],
            ["Free auto-renewing TLS certs for ALB/CloudFront", "ACM"],
          ],
        },
      },
      {
        heading: "Security services to recognize",
        body: [
          "The exam expects you to map a security need to the right service. Detective: GuardDuty (intelligent threat detection from logs), Inspector (automated vulnerability scans of EC2/ECR/Lambda), Macie (finds sensitive data/PII in S3), Security Hub (aggregates findings), CloudTrail (records every API call — the audit log), Config (tracks resource configuration and compliance over time).",
          "Protective: WAF (layer-7 web ACL rules on ALB/CloudFront/API Gateway — SQL injection, rate limiting), Shield (DDoS protection; Standard free, Advanced paid), Firewall Manager (manages WAF/Shield rules org-wide), Secrets Manager (rotating secrets). Know the difference between CloudTrail (who did what, API audit) and CloudWatch (metrics, logs, alarms — performance/operations) — they're frequently confused.",
        ],
        callout: {
          kind: "tip",
          title: "CloudTrail vs CloudWatch vs Config",
          text: "CloudTrail = who called which API and when (audit/forensics). CloudWatch = metrics, logs, alarms (operations/performance). Config = what does my resource configuration look like and is it compliant over time. Different questions, different answers.",
        },
      },
    ],
    keyPoints: [
      "IAM is global and free. User = identity with long-term creds; group = users + policies; role = assumable temp permissions; policy = JSON of allow/deny.",
      "Always use roles for EC2/Lambda/cross-account/federation (via STS) — never embed long-lived access keys.",
      "Identity-based vs resource-based policies; SCPs and permission boundaries only LIMIT, never grant.",
      "Evaluation: default deny; explicit Deny always wins; need an explicit Allow and (in an Org) an SCP that permits it.",
      "Organizations = many accounts, consolidated billing, OUs; multi-account is the strongest isolation; SCPs are org guardrails.",
      "KMS manages keys for at-rest encryption (envelope encryption); customer-managed keys add control + annual rotation; CloudHSM for single-tenant.",
      "Secrets Manager (rotating secrets) vs Parameter Store (cheap config); ACM (free TLS certs).",
      "Recognize: GuardDuty/Inspector/Macie/Security Hub (detect), CloudTrail (audit), Config (compliance), WAF/Shield (protect).",
    ],
    checklist: [
      "Can explain user vs group vs role vs policy and when to use a role",
      "Know the policy evaluation order (explicit deny > allow > implicit deny) cold",
      "Can describe an SCP and that it limits but never grants",
      "Can explain envelope encryption and customer-managed vs AWS-managed KMS keys",
      "Can pick Secrets Manager vs Parameter Store for a given need",
      "Can distinguish CloudTrail vs CloudWatch vs Config, and GuardDuty vs Inspector vs Macie",
    ],
    quiz: [
      {
        q: "An application on EC2 needs to read from an S3 bucket. The most secure way to grant access is…",
        options: [
          "Store IAM access keys in a config file on the instance",
          "Attach an IAM role (instance profile) to the EC2 instance with least-privilege S3 permissions",
          "Make the bucket public",
          "Put the access keys in an environment variable baked into the AMI",
        ],
        answer: 1,
        explain:
          "An instance role provides temporary, automatically-rotated credentials via STS — no long-lived keys to leak. This is the canonical right answer.",
      },
      {
        q: "An identity-based policy allows an action, but an SCP on the account does not permit it. The result is…",
        options: [
          "Allowed — identity policies override SCPs",
          "Denied — the SCP sets the maximum and doesn't permit it, so the allow has no effect",
          "Allowed only in us-east-1",
          "It depends on the time of day",
        ],
        answer: 1,
        explain:
          "SCPs cap the permissions available in an account. If the SCP doesn't allow the action, no identity policy can grant it.",
      },
      {
        q: "You need to record every AWS API call for a security audit. Which service?",
        options: ["CloudWatch", "CloudTrail", "Config", "GuardDuty"],
        answer: 1,
        explain:
          "CloudTrail logs API calls (who did what, when) — the audit/forensics trail. CloudWatch is metrics/logs; Config tracks configuration compliance.",
      },
    ],
  },

  {
    id: "aws-compute",
    group: "AWS (SAA)",
    label: "Compute",
    icon: "🖥",
    title: "Compute — EC2, Auto Scaling, Load Balancers, Serverless & Containers",
    tagline:
      "EC2 purchasing models (the cost questions live here), Auto Scaling, the three load balancers, Lambda, and the container trio (ECS/EKS/Fargate).",
    sections: [
      {
        heading: "EC2 instances and families",
        body: [
          "EC2 is resizable virtual machines. Instance types are grouped into families by what they optimize: general purpose (T3/T4g burstable, M-series balanced), compute optimized (C-series — CPU-heavy, batch, gaming), memory optimized (R/X — in-memory DBs, caches, analytics), storage optimized (I/D — high local IOPS), and accelerated computing (P/G — GPUs for ML/graphics). The exam tests matching a workload to a family: 'high-performance in-memory database' → memory optimized; 'batch CPU processing' → compute optimized.",
          "Placement groups control how instances are physically placed: cluster (packed in one AZ for lowest latency/highest throughput — HPC), spread (each on distinct hardware, max 7 per AZ, for critical instances that must not share a failure), and partition (grouped into isolated partitions for large distributed systems like HDFS/Kafka).",
        ],
      },
      {
        heading: "EC2 purchasing models — where the cost questions live",
        body: [
          "This is the single richest vein of cost questions. On-Demand: pay per second, no commitment, most expensive per hour — for spiky or short-term workloads. Reserved Instances (RI): commit to a specific instance type for 1 or 3 years for up to ~72% off — for steady, predictable baseline load. Savings Plans: commit to a $/hour spend for 1 or 3 years (Compute Savings Plans are the most flexible across instance family, region, and even Lambda/Fargate) — the modern, flexible way to get RI-level discounts.",
          "Spot Instances: bid on spare capacity for up to ~90% off, but AWS can reclaim them with a 2-minute warning — for fault-tolerant, interruptible, stateless work (batch, CI, big-data, rendering). Dedicated Hosts/Instances: physical isolation for licensing or compliance, most expensive. The exam pattern: steady 24/7 baseline → Reserved/Savings Plan; unpredictable spikes on top → On-Demand; interruption-tolerant batch → Spot; bring-your-own-license / compliance → Dedicated.",
        ],
        table: {
          headers: ["Model", "Discount", "Commitment", "Best for"],
          rows: [
            ["On-Demand", "Baseline (0%)", "None", "Spiky / short-lived / dev"],
            ["Savings Plans", "up to ~72%", "1 or 3 yr $/hr", "Steady spend, flexible (incl. Lambda/Fargate)"],
            ["Reserved Instances", "up to ~72%", "1 or 3 yr instance", "Steady predictable workloads"],
            ["Spot", "up to ~90%", "None (reclaimable)", "Fault-tolerant, interruptible batch"],
            ["Dedicated Host", "Highest cost", "Optional", "Licensing / compliance isolation"],
          ],
        },
        callout: {
          kind: "tip",
          title: "The cost-optimization combo",
          text: "A common 'best' answer: cover the steady baseline with a Savings Plan / Reserved Instances, handle bursts with On-Demand, and run interruptible batch on Spot. Mixing models is usually cheaper than one model for everything.",
        },
      },
      {
        heading: "Auto Scaling Groups",
        body: [
          "An Auto Scaling Group (ASG) keeps a fleet between a minimum and maximum size at a desired capacity, replaces unhealthy instances, and spreads them across AZs — the foundation of both elasticity and self-healing. It launches instances from a launch template.",
          "Scaling policies: target tracking (keep a metric like average CPU at 50% — the simplest and most recommended), step scaling (add/remove N instances at metric thresholds), scheduled scaling (scale up before a known peak), and predictive scaling (ML forecasts demand). ASGs integrate with load balancers so new instances are registered automatically and traffic only goes to healthy ones. Combine an ASG across multiple AZs behind a load balancer and you have the canonical highly-available, elastic web tier.",
        ],
      },
      {
        heading: "Elastic Load Balancing: ALB vs NLB vs GWLB",
        body: [
          "Load balancers distribute traffic and are central to HA. Application Load Balancer (ALB) operates at layer 7 (HTTP/HTTPS): host- and path-based routing, routing to target groups (EC2, IP, Lambda, containers), WebSockets, and native auth — the default for web apps and microservices. Network Load Balancer (NLB) operates at layer 4 (TCP/UDP/TLS): ultra-low latency, millions of requests per second, a static IP per AZ (and Elastic IP support) — for extreme performance, non-HTTP protocols, or when you need a fixed IP.",
          "Gateway Load Balancer (GWLB) operates at layer 3 to deploy and scale third-party virtual appliances (firewalls, IDS/IPS) transparently in the traffic path. (The Classic Load Balancer is legacy — avoid in new designs.) Cross-zone load balancing evens traffic across AZs; it's on by default for ALB and off by default for NLB.",
        ],
        callout: {
          kind: "key",
          title: "Pick the LB fast",
          text: "HTTP/HTTPS, path/host routing, microservices → ALB (L7). TCP/UDP, extreme throughput, low latency, static/Elastic IP → NLB (L4). Inline third-party security appliances → GWLB (L3).",
        },
      },
      {
        heading: "Serverless and containers",
        body: [
          "Lambda runs code without managing servers: event-driven, pay per invocation and duration, auto-scaling to thousands of concurrent executions, up to 15 minutes per execution and up to 10 GB memory. It's the 'least operational overhead' answer for event processing, lightweight APIs (behind API Gateway), and glue between services. Watch the limits: long-running or stateful workloads don't fit Lambda — that's a container or EC2.",
          "Containers: ECS is AWS's container orchestrator; EKS is managed Kubernetes (pick it when you need the Kubernetes ecosystem/portability). Both can run on two launch types: EC2 (you manage the instances, cheaper at scale, more control) or Fargate (serverless containers — no servers to manage, the 'least operational overhead' container answer). ECR is the container registry. The decision tree: simple AWS-native containers without server management → ECS on Fargate; need Kubernetes → EKS; lots of steady container load and want max control/cost → ECS/EKS on EC2.",
        ],
        table: {
          headers: ["Workload", "Best fit"],
          rows: [
            ["Event-driven, short, spiky, least ops", "Lambda"],
            ["Containers, no server management", "ECS on Fargate"],
            ["Need Kubernetes / portability", "EKS"],
            ["Steady heavy containers, max control/cost", "ECS/EKS on EC2"],
            ["Full OS control / legacy / specific kernel", "EC2"],
          ],
        },
      },
    ],
    keyPoints: [
      "Instance families: general (T/M), compute (C), memory (R/X), storage (I/D), accelerated/GPU (P/G) — match the family to the workload.",
      "Purchasing: On-Demand (spiky), Savings Plans/Reserved (steady baseline, up to ~72% off), Spot (interruptible, up to ~90% off), Dedicated (licensing/compliance).",
      "Cost combo: baseline on Savings Plans/RI + bursts On-Demand + batch on Spot.",
      "ASG: min/desired/max across AZs, self-heals, scales (target tracking is the go-to); pair with an ELB for HA + elasticity.",
      "ALB = L7 HTTP routing (microservices); NLB = L4 TCP/UDP, static IP, ultra-low latency; GWLB = L3 inline appliances.",
      "Lambda = serverless, event-driven, ≤15 min, least ops — but not for long-running/stateful work.",
      "Containers: ECS on Fargate (no servers), EKS (Kubernetes), ECS/EKS on EC2 (control/cost). ECR = registry.",
    ],
    checklist: [
      "Can match a workload to an instance family (memory/compute/storage/GPU)",
      "Can choose a purchasing model for steady vs spiky vs interruptible workloads",
      "Can describe an ASG (min/desired/max, target tracking) and how it self-heals across AZs",
      "Can pick ALB vs NLB vs GWLB from a scenario in seconds",
      "Know Lambda's limits (15 min, event-driven) and when it's the wrong choice",
      "Can choose between Lambda, Fargate, EKS, and EC2 for a container/compute need",
    ],
    quiz: [
      {
        q: "A batch image-processing job is fault-tolerant and can restart any failed task. The most cost-effective compute is…",
        options: [
          "On-Demand instances",
          "Reserved Instances",
          "Spot Instances",
          "Dedicated Hosts",
        ],
        answer: 2,
        explain:
          "Spot offers up to ~90% off for interruptible, restartable workloads — exactly fault-tolerant batch. The 2-minute reclaim warning is acceptable here.",
      },
      {
        q: "A microservices app needs path-based routing (/api → one service, /img → another) over HTTPS. Which load balancer?",
        options: [
          "Network Load Balancer",
          "Application Load Balancer",
          "Gateway Load Balancer",
          "Classic Load Balancer",
        ],
        answer: 1,
        explain:
          "Path/host-based HTTP routing is a layer-7 feature → ALB. NLB is L4 (no path routing); GWLB is for inline appliances.",
      },
      {
        q: "A team wants to run containers with the least operational overhead — no servers to patch or scale. Best fit?",
        options: [
          "ECS on EC2",
          "EKS on EC2",
          "ECS (or EKS) on Fargate",
          "Containers on a single large EC2 instance",
        ],
        answer: 2,
        explain:
          "Fargate runs containers serverlessly — no instances to manage. It's the 'least operational overhead' container answer.",
      },
    ],
  },

  {
    id: "aws-storage",
    group: "AWS (SAA)",
    label: "Storage",
    icon: "🪣",
    title: "Storage — S3, EBS, EFS & the Rest",
    tagline:
      "S3 (the most-tested service: storage classes, lifecycle, versioning, encryption, replication), block storage (EBS), shared file storage (EFS/FSx), and data transfer.",
    sections: [
      {
        heading: "S3 fundamentals",
        body: [
          "S3 is object storage: you store objects (files up to 5 TB) in globally-named buckets, accessed over HTTP APIs — not a filesystem and not a block device. It's designed for 11 nines of durability (99.999999999%) by replicating across multiple AZs automatically, and it scales effectively without limit. Use it for backups, data lakes, static website assets, logs, and as the integration point for almost every analytics service.",
          "Security: buckets are private by default and Block Public Access is on by default. Access is controlled by IAM policies, bucket policies (resource-based), and (legacy) ACLs which are now disabled by default. Encryption at rest is on by default (SSE-S3); you can choose SSE-KMS (customer-controlled keys, auditable) or SSE-C (you supply the key). Presigned URLs grant temporary access to a specific object without making it public. Object Lock provides WORM (write-once-read-many) for compliance/retention.",
        ],
        callout: {
          kind: "warn",
          title: "The classic exam trap: public buckets",
          text: "If a scenario hints at a data leak or 'accidentally public' bucket, the answer involves Block Public Access, bucket policies, and least privilege — never 'make it public' or 'use ACLs'. For private downloads use presigned URLs or CloudFront with OAC.",
        },
      },
      {
        heading: "S3 storage classes — match access pattern to class",
        body: [
          "S3's storage classes trade retrieval speed and cost; choosing the right one (often via lifecycle rules) is a core cost question. S3 Standard: frequent access, highest storage cost, no retrieval fee. S3 Intelligent-Tiering: automatically moves objects between tiers based on access — the right default when access patterns are unknown or changing (small monitoring fee, no retrieval fees). S3 Standard-IA (infrequent access): cheaper storage, retrieval fee, still multi-AZ — for backups accessed occasionally. S3 One Zone-IA: like Standard-IA but stored in a single AZ (cheaper, less durable) — for re-creatable data.",
          "Glacier tiers are for archival: Glacier Instant Retrieval (archive needing millisecond access, e.g. medical images), Glacier Flexible Retrieval (minutes-to-hours retrieval, cheap), and Glacier Deep Archive (lowest cost of all, 12-hour retrieval, for long-term compliance archives). Lifecycle policies automate the transitions: 'Standard for 30 days → Standard-IA for 90 days → Glacier Deep Archive after a year → expire after 7 years.'",
        ],
        table: {
          headers: ["Class", "Use when", "Trade-off"],
          rows: [
            ["Standard", "Frequent access", "Highest storage cost"],
            ["Intelligent-Tiering", "Unknown/changing access", "Small monitoring fee, auto-optimizes"],
            ["Standard-IA", "Infrequent, multi-AZ", "Retrieval fee"],
            ["One Zone-IA", "Infrequent, re-creatable", "Single AZ (less durable)"],
            ["Glacier Instant", "Archive, ms retrieval", "Higher retrieval cost"],
            ["Glacier Flexible", "Archive, mins–hrs", "Slow retrieval"],
            ["Glacier Deep Archive", "Long-term compliance", "Cheapest; ~12h retrieval"],
          ],
        },
      },
      {
        heading: "Versioning, lifecycle, replication",
        body: [
          "Versioning keeps every version of an object so you can recover from deletes and overwrites (a delete just adds a delete marker). It's a prerequisite for replication and pairs with MFA Delete for extra protection of critical data. Lifecycle rules then manage cost over an object's life — transition between classes and expire old versions automatically.",
          "Replication copies objects to another bucket: Cross-Region Replication (CRR) for disaster recovery, lower-latency global access, or compliance; Same-Region Replication (SRR) for log aggregation or prod→test copies. Replication requires versioning on both buckets and is asynchronous. For moving large existing datasets in fast, S3 Transfer Acceleration uses CloudFront edge locations; for uploading large files reliably, use multipart upload.",
        ],
      },
      {
        heading: "Block storage: EBS and instance store",
        body: [
          "EBS (Elastic Block Store) is network-attached block storage for a single EC2 instance — like a virtual hard disk. It lives in one AZ (a volume can only attach to an instance in the same AZ), persists independently of the instance, and is backed up via snapshots to S3 (snapshots are how you move a volume to another AZ/region). Volume types: gp3/gp2 (general-purpose SSD — the default; gp3 lets you provision IOPS/throughput independently), io1/io2 (provisioned IOPS SSD for high-performance databases; io2 Block Express for the most demanding), st1 (throughput-optimized HDD for big sequential workloads like log processing), and sc1 (cold HDD, cheapest, infrequent access).",
          "Instance store is physically-attached ephemeral disk: very fast, but data is lost when the instance stops or terminates — only for caches, scratch, or buffers you can lose. EBS encryption (via KMS) is transparent and encrypts data at rest, snapshots, and in-transit between volume and instance.",
        ],
        callout: {
          kind: "key",
          title: "EBS is single-AZ, single-instance (mostly)",
          text: "EBS attaches to one instance in one AZ. Need it in another AZ? Snapshot → restore there. Need shared access from many instances? That's not EBS — use EFS. (io1/io2 Multi-Attach is a narrow exception for clustered apps.)",
        },
      },
      {
        heading: "Shared file storage: EFS and FSx",
        body: [
          "EFS (Elastic File System) is a managed NFS filesystem that many EC2 instances (and Lambda/containers) across multiple AZs can mount simultaneously — it grows and shrinks automatically and is the answer when the scenario needs shared POSIX file storage across instances. It's Linux-only. It has lifecycle management to move infrequently-accessed files to a cheaper IA class.",
          "FSx provides managed third-party/specialized filesystems: FSx for Windows File Server (SMB/Active Directory for Windows workloads), FSx for Lustre (high-performance computing, ML, big data — integrates with S3), plus NetApp ONTAP and OpenZFS. Decision shortcut: shared Linux files → EFS; Windows/SMB shares → FSx for Windows; HPC scratch → FSx for Lustre; single-instance block disk → EBS; object/API access → S3.",
        ],
      },
      {
        heading: "Moving data into AWS",
        body: [
          "For migrations, recognize the tools. AWS DataSync automates online transfer from on-prem (NFS/SMB) to S3/EFS/FSx. Storage Gateway bridges on-prem and AWS storage (File Gateway presents S3 as NFS/SMB; Volume Gateway for block; Tape Gateway replaces physical tape). The Snow Family ships physical devices for offline transfer when the network is too slow or expensive: Snowcone (small/edge), Snowball Edge (tens of TB, with compute). Direct Connect gives a dedicated private network link for ongoing high-bandwidth, consistent-latency transfer.",
          "The exam pattern: a few TB over a decent link → DataSync; petabytes or a poor link → Snowball; ongoing hybrid file access → Storage Gateway; permanent high-throughput private connectivity → Direct Connect.",
        ],
      },
    ],
    keyPoints: [
      "S3 = object storage, 11 nines durability (multi-AZ), private + encrypted by default; control access via IAM/bucket policies, not public/ACLs.",
      "Storage classes trade cost vs retrieval: Standard, Intelligent-Tiering (unknown access), Standard-IA, One Zone-IA, Glacier Instant/Flexible/Deep Archive.",
      "Lifecycle rules automate class transitions + expiration; Intelligent-Tiering auto-optimizes when access is unpredictable.",
      "Versioning protects against deletes/overwrites and is required for replication; CRR (cross-region DR), SRR (same-region).",
      "EBS = single-AZ block disk for one instance (snapshot to move across AZ/region); gp3 default, io1/io2 for high IOPS, st1/sc1 HDD.",
      "Instance store = ephemeral fast disk (lost on stop/terminate).",
      "EFS = shared multi-AZ NFS for many Linux instances; FSx = Windows/Lustre/specialized; pick by protocol + sharing need.",
      "Data transfer: DataSync (online), Snow Family (offline bulk), Storage Gateway (hybrid), Direct Connect (dedicated ongoing).",
    ],
    checklist: [
      "Can pick an S3 storage class from an access pattern (and design a lifecycle policy)",
      "Know S3 is private/encrypted by default and how to serve private content (presigned URL / CloudFront OAC)",
      "Can explain versioning + CRR/SRR and that replication needs versioning",
      "Can choose an EBS volume type and explain it's single-AZ (snapshot to move)",
      "Can choose EBS vs instance store vs EFS vs FSx vs S3 for a storage need",
      "Can pick DataSync vs Snowball vs Storage Gateway vs Direct Connect for a migration",
    ],
    quiz: [
      {
        q: "Backups are accessed a few times a year, must be retrievable within milliseconds, and durability across AZs matters. Best S3 class?",
        options: [
          "S3 Standard",
          "S3 Glacier Deep Archive",
          "S3 Standard-IA (or Glacier Instant Retrieval)",
          "S3 One Zone-IA",
        ],
        answer: 2,
        explain:
          "Infrequent but instant, multi-AZ → Standard-IA (or Glacier Instant Retrieval for archival ms access). Deep Archive is too slow; One Zone-IA sacrifices multi-AZ durability.",
      },
      {
        q: "Multiple EC2 instances across two AZs need to read and write the same set of files concurrently. Which storage?",
        options: [
          "An EBS volume attached to each instance",
          "EFS (shared NFS across AZs)",
          "Instance store",
          "Separate S3 buckets per instance",
        ],
        answer: 1,
        explain:
          "EFS is a shared, multi-AZ NFS filesystem many instances can mount at once. EBS is single-AZ/single-instance; instance store is ephemeral and local.",
      },
      {
        q: "You must transfer 80 TB to S3 but the site has a slow internet link. Best approach?",
        options: [
          "Upload directly over the internet",
          "Use AWS DataSync over the existing link",
          "Order an AWS Snowball Edge device",
          "Enable S3 Transfer Acceleration and upload",
        ],
        answer: 2,
        explain:
          "Tens of TB over a slow link is the Snowball use case — ship the data physically. DataSync/Transfer Acceleration still depend on the slow link.",
      },
    ],
  },

  {
    id: "aws-networking",
    group: "AWS (SAA)",
    label: "Networking & VPC",
    icon: "🌐",
    title: "Networking — VPC, Connectivity, Route 53 & CloudFront",
    tagline:
      "The VPC building blocks (subnets, gateways, security groups vs NACLs), how to connect VPCs and on-prem, DNS routing policies, and the CDN.",
    sections: [
      {
        heading: "VPC anatomy",
        body: [
          "A VPC (Virtual Private Cloud) is your isolated private network in a region, defined by a CIDR block (e.g. 10.0.0.0/16). You carve it into subnets, each living in one AZ. A subnet is 'public' if its route table sends 0.0.0.0/0 to an Internet Gateway; otherwise it's private. The standard secure design: public subnets hold only internet-facing things (load balancers, NAT), private subnets hold your app and database tiers.",
          "Key components: the Internet Gateway (IGW) gives a VPC internet access; a route table decides where traffic goes; a NAT Gateway (managed, in a public subnet, per-AZ for HA) lets instances in private subnets make outbound internet connections (e.g. to download patches) without being reachable from the internet. A NAT instance is the old self-managed alternative — prefer NAT Gateway. An Egress-Only Internet Gateway is the IPv6 equivalent of NAT.",
        ],
        callout: {
          kind: "key",
          title: "Public vs private subnet",
          text: "Public subnet = route to an Internet Gateway (put LBs/bastion/NAT here). Private subnet = no direct inbound from internet; outbound via a NAT Gateway (put app + DB here). This tiered layout is the default 'secure architecture' answer.",
        },
      },
      {
        heading: "Security Groups vs Network ACLs",
        body: [
          "Both filter traffic, and the exam loves the distinction. A Security Group is a stateful firewall at the instance/ENI level: it has allow rules only (no deny), and because it's stateful, return traffic for an allowed inbound request is automatically permitted. You reference security groups by id (even another SG), which is how you say 'the app tier may talk to the DB tier'.",
          "A Network ACL (NACL) is a stateless firewall at the subnet level: it has both allow and deny rules, evaluated in numbered order, and because it's stateless you must explicitly allow both directions (including ephemeral return ports). Use SGs as your primary control (allow exactly what's needed); use NACLs for coarse subnet-level deny rules (e.g. block a malicious IP range). Default deny applies to SGs; the default NACL allows all.",
        ],
        table: {
          headers: ["", "Security Group", "Network ACL"],
          rows: [
            ["Level", "Instance / ENI", "Subnet"],
            ["State", "Stateful (return auto-allowed)", "Stateless (allow both ways)"],
            ["Rules", "Allow only", "Allow and Deny"],
            ["Evaluation", "All rules", "In number order, first match wins"],
            ["Typical use", "Primary, fine-grained allow", "Coarse subnet deny (block IPs)"],
          ],
        },
      },
      {
        heading: "Connecting VPCs and on-prem",
        body: [
          "VPC Peering connects two VPCs privately, but it's non-transitive (A↔B and B↔C does not give A↔C) and doesn't scale to many VPCs. Transit Gateway is the hub-and-spoke router that connects hundreds of VPCs and on-prem connections through one place — the answer when 'many VPCs need to interconnect at scale'.",
          "VPC Endpoints let resources reach AWS services privately without traversing the internet: a Gateway Endpoint (free, route-table based) is only for S3 and DynamoDB; an Interface Endpoint (powered by PrivateLink, an ENI with a private IP, hourly + data cost) is for most other services and for exposing your own service privately to other VPCs.",
          "To on-prem: Site-to-Site VPN runs an encrypted IPsec tunnel over the public internet — quick and cheap but variable latency. Direct Connect is a dedicated physical private link — consistent low latency and high bandwidth, but takes time to provision; combine with a VPN for an encrypted, resilient hybrid link.",
        ],
        callout: {
          kind: "tip",
          title: "Private access to S3 from a private subnet",
          text: "Don't route S3 traffic through a NAT Gateway — use a Gateway VPC Endpoint for S3 (it's free and keeps traffic on the AWS network). Gateway endpoints exist only for S3 and DynamoDB; everything else uses Interface (PrivateLink) endpoints.",
        },
      },
      {
        heading: "Route 53: DNS and routing policies",
        body: [
          "Route 53 is AWS's DNS and a major exam topic for its routing policies. Simple (one record, no health check). Weighted (split traffic by percentage — canary/blue-green). Latency-based (send users to the region with lowest latency). Failover (active-passive: route to a secondary when the primary's health check fails — core DR pattern). Geolocation (route by the user's location, e.g. for compliance/localization). Geoproximity (route by geographic distance, with a bias to shift load). Multivalue answer (return several healthy records for simple client-side load balancing).",
          "Alias records are an AWS extension that points a record (even the zone apex like example.com) at an AWS resource (ALB, CloudFront, S3 website) for free, and they auto-track the resource's IP — unlike a CNAME, which can't be used at the apex and isn't free. Route 53 health checks drive failover.",
        ],
        table: {
          headers: ["Goal", "Routing policy"],
          rows: [
            ["Canary / blue-green split", "Weighted"],
            ["Lowest latency per user", "Latency-based"],
            ["Active-passive DR failover", "Failover (+ health checks)"],
            ["Compliance / localized content", "Geolocation"],
            ["Shift load across regions by distance", "Geoproximity"],
            ["Return multiple healthy endpoints", "Multivalue answer"],
          ],
        },
      },
      {
        heading: "CloudFront and edge",
        body: [
          "CloudFront is the CDN: it caches content at hundreds of edge locations close to users, cutting latency and offloading your origin (S3, an ALB, or any HTTP server). It also terminates TLS at the edge, integrates with WAF and Shield for security, and serves private content via signed URLs/cookies. For an S3 origin, use Origin Access Control (OAC) so the bucket stays private and only CloudFront can read it.",
          "Don't confuse CloudFront (content caching/delivery, pull-based) with Global Accelerator (uses the AWS backbone and anycast IPs to speed up and fail over TCP/UDP traffic to regional endpoints — for non-cacheable, latency-sensitive apps and fast regional failover). CloudFront = cache static/dynamic web content near users; Global Accelerator = accelerate and fail over whole applications at the network layer.",
        ],
      },
    ],
    keyPoints: [
      "VPC = isolated regional network (CIDR) split into per-AZ subnets; public subnet routes to an IGW, private subnet egresses via a NAT Gateway.",
      "Tiered design: LBs/bastion/NAT in public subnets, app + DB in private subnets — the default secure architecture.",
      "Security Group = stateful, instance-level, allow-only; NACL = stateless, subnet-level, allow + deny (coarse blocks).",
      "VPC Peering is non-transitive and small-scale; Transit Gateway is the hub for many VPCs/on-prem.",
      "VPC Endpoints keep AWS traffic private: Gateway (free, S3 + DynamoDB only) vs Interface/PrivateLink (most services, ENI + cost).",
      "On-prem: Site-to-Site VPN (IPsec over internet, quick) vs Direct Connect (dedicated, consistent, high-bandwidth).",
      "Route 53 policies: weighted, latency, failover, geolocation, geoproximity, multivalue; Alias points apex records at AWS resources free.",
      "CloudFront = CDN caching near users (S3 origin via OAC); Global Accelerator = backbone/anycast acceleration + failover for whole apps.",
    ],
    checklist: [
      "Can design a VPC with public/private subnets, IGW, and NAT Gateway across AZs",
      "Can explain Security Group (stateful) vs NACL (stateless) and when to use each",
      "Know when to use VPC Peering vs Transit Gateway",
      "Can choose Gateway vs Interface VPC endpoints (and use a Gateway endpoint for S3)",
      "Can pick a Route 53 routing policy from a scenario",
      "Can distinguish CloudFront from Global Accelerator",
    ],
    quiz: [
      {
        q: "An instance in a private subnet must download OS patches from the internet but must NOT be reachable from the internet. What enables this?",
        options: [
          "Attach an Internet Gateway route to the subnet",
          "A NAT Gateway in a public subnet, with the private subnet's route table pointing 0.0.0.0/0 to it",
          "An Elastic IP on the instance",
          "A VPC peering connection",
        ],
        answer: 1,
        explain:
          "A NAT Gateway gives private-subnet instances outbound internet access while blocking inbound — the standard pattern for patching private servers.",
      },
      {
        q: "You need return traffic handled automatically and rules that only ALLOW specific access between app and DB tiers. Which control?",
        options: [
          "Network ACL",
          "Security Group",
          "Route table",
          "Internet Gateway",
        ],
        answer: 1,
        explain:
          "Security Groups are stateful (return traffic auto-allowed) and allow-only; you can reference one SG from another to permit app→DB. NACLs are stateless and subnet-level.",
      },
      {
        q: "A global app needs users sent to the AWS region that gives them the lowest latency. Which Route 53 routing policy?",
        options: ["Weighted", "Geolocation", "Latency-based", "Simple"],
        answer: 2,
        explain:
          "Latency-based routing sends each user to the region with the lowest measured latency. Geolocation routes by where the user is, not by latency.",
      },
    ],
  },

  {
    id: "aws-databases",
    group: "AWS (SAA)",
    label: "Databases",
    icon: "🗃",
    title: "Databases — RDS, Aurora, DynamoDB, Caching & Analytics",
    tagline:
      "Picking the right database is a core skill: relational (RDS/Aurora) with Multi-AZ vs read replicas, NoSQL (DynamoDB), caching (ElastiCache), and the warehouse (Redshift).",
    sections: [
      {
        heading: "RDS: managed relational databases",
        body: [
          "RDS runs managed relational engines — MySQL, PostgreSQL, MariaDB, Oracle, SQL Server — handling provisioning, patching, backups, and recovery so you don't. Pick RDS when the data is relational and you need SQL, joins, and transactions (ACID) without operating the database yourself. Automated backups give point-in-time recovery; manual snapshots are user-triggered and retained until deleted. Encryption at rest is via KMS, and it must generally be enabled at creation (you encrypt an existing DB by restoring an encrypted snapshot).",
          "The two scaling/availability features are constantly confused and constantly tested: Multi-AZ is for high availability — a synchronous standby replica in another AZ that AWS fails over to automatically on failure; it does NOT serve reads. Read Replicas are for read scaling — asynchronous copies (same region or cross-region) that offload read traffic and can be promoted to standalone DBs. Need automatic failover/HA → Multi-AZ. Need to handle more read load → Read Replicas. Many designs use both.",
        ],
        callout: {
          kind: "key",
          title: "Multi-AZ vs Read Replica",
          text: "Multi-AZ = availability (synchronous standby, auto-failover, NOT readable). Read Replica = performance (async, serves reads, can be cross-region, promotable). If the question says 'survive an AZ failure' → Multi-AZ; if it says 'reduce read load on the primary' → Read Replicas.",
        },
      },
      {
        heading: "Aurora: AWS's cloud-native relational engine",
        body: [
          "Aurora is AWS's own MySQL- and PostgreSQL-compatible engine, built for the cloud: it claims up to 5× MySQL / 3× PostgreSQL throughput, and stores data as 6 copies across 3 AZs with self-healing storage that auto-grows to 128 TB. It supports up to 15 low-latency read replicas with automatic failover, and exposes a writer endpoint and a reader endpoint (which load-balances across replicas).",
          "Aurora Serverless v2 auto-scales capacity up and down for variable or unpredictable workloads, billing for what you use — great when load is spiky or you don't want to size instances. Aurora Global Database replicates to other regions with typically sub-second lag for low-latency global reads and fast cross-region disaster recovery. Choose Aurora over plain RDS when you want higher performance, stronger built-in HA, or these cloud-native features and you're on MySQL/PostgreSQL.",
        ],
      },
      {
        heading: "DynamoDB: serverless NoSQL",
        body: [
          "DynamoDB is a fully-managed, serverless, key-value and document NoSQL database with single-digit-millisecond latency at any scale — no servers, no patching, automatic multi-AZ replication. Reach for it when you need massive scale, predictable low latency, a flexible schema, and access by key (user sessions, shopping carts, IoT, gaming, high-traffic metadata). It's the 'serverless database' and 'least operational overhead at scale' answer.",
          "Know the capacity modes: on-demand (pay per request, auto-scales instantly — for spiky/unknown traffic) vs provisioned (set read/write capacity units, cheaper for steady predictable load, with auto scaling available). DAX is an in-memory cache that drops read latency to microseconds. Global Tables give multi-region, active-active replication. DynamoDB Streams emit a change log (great for triggering Lambda). Other features: TTL for auto-expiring items, point-in-time recovery. Data modeling is via partition key (+ optional sort key) and secondary indexes (LSI/GSI).",
        ],
        table: {
          headers: ["Need", "Database"],
          rows: [
            ["Relational, SQL, managed", "RDS"],
            ["Relational + high perf / built-in HA / global", "Aurora"],
            ["Key-value/document, massive scale, serverless", "DynamoDB"],
            ["Microsecond reads in front of a DB", "ElastiCache / DAX"],
            ["Analytics / OLAP data warehouse", "Redshift"],
            ["Graph relationships", "Neptune"],
          ],
        },
      },
      {
        heading: "Caching with ElastiCache",
        body: [
          "ElastiCache is managed in-memory caching to take read load off a database and cut latency to sub-millisecond. Two engines: Redis (rich data structures, persistence, replication, Multi-AZ failover, pub/sub, sorted sets — for leaderboards, sessions, anything needing durability/HA) and Memcached (simple, multi-threaded, easily scaled out, no persistence — for a plain, large, ephemeral cache). If a scenario needs HA, persistence, or advanced data types → Redis; if it needs the simplest possible scalable cache → Memcached.",
          "Caching strategies worth knowing: lazy loading (cache on read miss — only requested data is cached, but a miss is slower and data can go stale) and write-through (write to cache on every DB write — cache always fresh, but writes are slower and you cache data that may never be read). A TTL bounds staleness. Common exam cue: 'reduce read latency / offload the database for repeated reads' → ElastiCache (or DAX specifically for DynamoDB).",
        ],
      },
      {
        heading: "Analytics and purpose-built databases",
        body: [
          "Redshift is the data warehouse: a columnar, massively-parallel (MPP) database for OLAP — complex analytical queries over terabytes/petabytes — not for transactional (OLTP) workloads. The cue is 'analytics', 'business intelligence', 'data warehouse', 'complex queries over large historical data'. Redshift Spectrum queries data directly in S3.",
          "AWS pushes 'purpose-built databases' — match the data shape to the engine: Neptune (graph — social networks, fraud, recommendations), DocumentDB (MongoDB-compatible document), ElastiCache/MemoryDB (in-memory), Keyspaces (Cassandra-compatible wide-column), Timestream (time-series/IoT), QLDB (immutable ledger). You don't need deep expertise in each for SAA, but you should recognize which problem each solves so you can eliminate wrong answers.",
        ],
        callout: {
          kind: "tip",
          title: "OLTP vs OLAP",
          text: "OLTP (many small transactions — orders, users) → RDS/Aurora/DynamoDB. OLAP (few huge analytical queries — reporting, BI) → Redshift. If a question mentions 'data warehouse' or 'analytics over historical data', it's Redshift, not RDS.",
        },
      },
    ],
    keyPoints: [
      "RDS = managed relational (MySQL/Postgres/MariaDB/Oracle/SQL Server); use for SQL, joins, ACID without ops.",
      "Multi-AZ = HA (synchronous standby, auto-failover, NOT readable); Read Replicas = read scaling (async, promotable, can be cross-region).",
      "Aurora = AWS-native MySQL/Postgres: 6 copies/3 AZs, up to 15 replicas, writer/reader endpoints, Serverless v2, Global Database.",
      "DynamoDB = serverless NoSQL key-value, single-digit-ms at scale; on-demand vs provisioned; DAX (µs cache), Global Tables, Streams, TTL.",
      "ElastiCache = in-memory cache: Redis (persistence/HA/data structures) vs Memcached (simple, scalable, ephemeral); DAX for DynamoDB.",
      "Redshift = columnar MPP data warehouse for OLAP/analytics — not OLTP.",
      "Purpose-built DBs: Neptune (graph), DocumentDB (Mongo), Keyspaces (Cassandra), Timestream (time-series), QLDB (ledger).",
    ],
    checklist: [
      "Can state Multi-AZ vs Read Replica from memory and pick the right one",
      "Can explain when Aurora beats plain RDS",
      "Can recognize a DynamoDB use case and choose on-demand vs provisioned capacity",
      "Can choose Redis vs Memcached for a caching scenario",
      "Can distinguish OLTP (RDS/Aurora/DynamoDB) from OLAP (Redshift)",
      "Can map a data shape (graph/document/time-series/ledger) to a purpose-built DB",
    ],
    quiz: [
      {
        q: "An RDS database must automatically fail over to another AZ with no manual intervention if its AZ goes down. What do you enable?",
        options: [
          "A Read Replica in another AZ",
          "Multi-AZ deployment (synchronous standby)",
          "DynamoDB Global Tables",
          "Cross-region snapshots",
        ],
        answer: 1,
        explain:
          "Multi-AZ keeps a synchronous standby in another AZ and fails over automatically. Read Replicas are async and for read scaling, not automatic HA failover.",
      },
      {
        q: "An app needs single-digit-millisecond key-value access at massive, unpredictable scale with no servers to manage. Best database?",
        options: ["RDS MySQL", "Redshift", "DynamoDB (on-demand)", "ElastiCache Memcached"],
        answer: 2,
        explain:
          "DynamoDB is serverless NoSQL with consistent low latency at any scale; on-demand mode handles unpredictable traffic without capacity planning.",
      },
      {
        q: "A team needs complex analytical queries (BI reporting) over petabytes of historical sales data. Which service?",
        options: ["Aurora", "DynamoDB", "Amazon Redshift", "RDS PostgreSQL"],
        answer: 2,
        explain:
          "Redshift is the columnar MPP data warehouse built for OLAP/analytics over huge datasets. RDS/Aurora are OLTP; DynamoDB is key-value.",
      },
    ],
  },

  {
    id: "aws-resilience-cost",
    group: "AWS (SAA)",
    label: "Resilience, Decoupling & Cost",
    icon: "💸",
    title: "Resilience, Decoupling & Cost Optimization",
    tagline:
      "The patterns that win the resilient + cost domains: decoupling with SQS/SNS/Kinesis, designing for failure, DR strategies and RTO/RPO, and the cost-optimization toolkit.",
    sections: [
      {
        heading: "Decoupling: SQS, SNS, EventBridge, Kinesis",
        body: [
          "Tightly-coupled synchronous calls fail together; decoupling with a queue or topic lets components fail and scale independently — a core resilience theme. SQS is a managed message queue (a producer drops messages, consumers poll and process): it absorbs spikes, smooths load, and lets you scale consumers separately. Standard queues are high-throughput with at-least-once delivery and best-effort ordering; FIFO queues give exactly-once processing and strict ordering at lower throughput. Visibility timeout hides a message while it's processed; a dead-letter queue (DLQ) captures messages that repeatedly fail.",
          "SNS is pub/sub: publish once to a topic, fan out to many subscribers (SQS queues, Lambda, HTTP, email/SMS) — the answer for 'notify multiple systems of an event'. The classic fan-out pattern is SNS → multiple SQS queues. EventBridge is the event bus for event-driven architectures: routes events by rules, integrates with SaaS sources, and runs scheduled (cron) jobs. Kinesis is for streaming/real-time data: Data Streams for real-time processing with ordering and replay (sharded), Data Firehose for near-real-time delivery to S3/Redshift/OpenSearch (no replay, fully managed). Cue: 'decouple/buffer work' → SQS; 'fan out to many' → SNS; 'event routing/scheduling' → EventBridge; 'real-time streaming analytics' → Kinesis.",
        ],
        table: {
          headers: ["Need", "Service"],
          rows: [
            ["Decouple producer/consumer, buffer spikes", "SQS"],
            ["One event → many subscribers (fan-out)", "SNS"],
            ["Event routing, SaaS events, cron schedules", "EventBridge"],
            ["Real-time stream, ordering + replay", "Kinesis Data Streams"],
            ["Near-real-time load to S3/Redshift", "Kinesis Data Firehose"],
            ["Strict order + no duplicates", "SQS FIFO"],
          ],
        },
      },
      {
        heading: "Designing for failure",
        body: [
          "AWS's mantra is 'everything fails all the time — design for it.' The building blocks: spread across multiple AZs (and regions for DR), put stateless app tiers behind a load balancer in an Auto Scaling Group so failed instances are replaced automatically, push state out of the compute tier (into RDS/DynamoDB/S3/ElastiCache) so any instance can serve any request, and decouple with queues so a slow or down component doesn't cascade.",
          "Add the resilience kit you'd discuss anywhere: health checks (ELB/Route 53) to route around failures, retries with exponential backoff and jitter, idempotency so retries are safe, and graceful degradation (serve cached/reduced functionality rather than erroring). The exam reads 'highly available' as multi-AZ + ASG + managed services, and 'fault tolerant' as 'keeps working through a component failure with no data loss'.",
        ],
        callout: {
          kind: "key",
          title: "The HA web-app reference architecture",
          text: "Route 53 → CloudFront → ALB → Auto Scaling Group of stateless instances across ≥2 AZs → RDS Multi-AZ (or DynamoDB) → ElastiCache. Stateless compute + managed multi-AZ data + decoupling is the answer to most 'design a highly available app' questions.",
        },
      },
      {
        heading: "Disaster recovery: RTO, RPO, and the four strategies",
        body: [
          "Two metrics frame every DR question. RTO (Recovery Time Objective) is how long you can be down — time to recover. RPO (Recovery Point Objective) is how much data you can afford to lose — the age of the last usable backup. Lower RTO/RPO costs more.",
          "The four DR strategies trade cost against RTO/RPO. Backup & Restore: cheapest, highest RTO/RPO — restore from backups/snapshots after disaster (hours). Pilot Light: a minimal core (e.g. the database replicating) always on; scale up the rest on failover (tens of minutes). Warm Standby: a scaled-down but fully functional copy always running; scale it up on failover (minutes). Multi-Site Active-Active: full production running in multiple regions serving traffic simultaneously — near-zero RTO/RPO, highest cost. Match the strategy to the stated RTO/RPO and budget.",
        ],
        table: {
          headers: ["Strategy", "RTO/RPO", "Cost", "Idea"],
          rows: [
            ["Backup & Restore", "Hours (high)", "$", "Restore from backups after disaster"],
            ["Pilot Light", "10s of min", "$$", "Core (DB) live; spin up the rest"],
            ["Warm Standby", "Minutes", "$$$", "Scaled-down full copy always on"],
            ["Multi-Site Active-Active", "~Zero", "$$$$", "Full prod in multiple regions"],
          ],
        },
      },
      {
        heading: "The cost-optimization toolkit",
        body: [
          "Cost is 20% of the exam and shows up inside the other domains. The levers: right-size (match instance/volume size to actual use; Compute Optimizer recommends), use the right purchasing model (Savings Plans/Reserved for steady load, Spot for interruptible, On-Demand for spiky), scale elastically (ASG/serverless so you pay only for what you use), pick the right storage class (S3 lifecycle/Intelligent-Tiering, the right EBS type), and prefer managed/serverless to cut operational cost. Watch data transfer — egress to the internet and cross-AZ/region traffic are commonly-forgotten costs; keep traffic in-region and use VPC endpoints/CloudFront to reduce it.",
          "The cost-management services to recognize: Cost Explorer (visualize and analyze spend and trends), AWS Budgets (set thresholds and get alerted before you overshoot), Cost and Usage Report (the granular billing data), Trusted Advisor (checks for idle/under-utilized resources and savings), Compute Optimizer (right-sizing recommendations), and consolidated billing via Organizations (pool volume discounts across accounts). Cue mapping: 'alert when spend exceeds X' → Budgets; 'analyze where the money goes' → Cost Explorer; 'find idle resources' → Trusted Advisor/Compute Optimizer.",
        ],
        callout: {
          kind: "tip",
          title: "Forgotten cost: data transfer",
          text: "Inbound data is usually free; outbound to the internet and cross-AZ/region transfer cost money. NAT Gateway data processing adds up too. Keeping traffic in-region, using Gateway endpoints for S3, and CloudFront for egress are real cost wins.",
        },
      },
    ],
    keyPoints: [
      "Decouple to survive failure: SQS (buffer/queue, Standard vs FIFO, DLQ, visibility timeout), SNS (fan-out pub/sub), EventBridge (event routing + cron), Kinesis (real-time streaming, Streams=replay vs Firehose=delivery).",
      "Design for failure: multi-AZ, stateless compute in an ASG behind a load balancer, state in managed data stores, health checks + retries/backoff + idempotency + graceful degradation.",
      "HA reference: Route 53 → CloudFront → ALB → ASG (≥2 AZs) → RDS Multi-AZ/DynamoDB → ElastiCache.",
      "RTO = downtime tolerated; RPO = data loss tolerated; lower = more expensive.",
      "DR strategies by cost/RTO: Backup & Restore < Pilot Light < Warm Standby < Multi-Site Active-Active.",
      "Cost levers: right-size, right purchasing model, elastic scaling, right storage class, managed/serverless, and minimize data-transfer/egress.",
      "Cost tools: Budgets (alerts), Cost Explorer (analysis), Trusted Advisor/Compute Optimizer (find savings), consolidated billing (pool discounts).",
    ],
    checklist: [
      "Can pick SQS vs SNS vs EventBridge vs Kinesis from a scenario",
      "Can explain SQS Standard vs FIFO and what a DLQ/visibility timeout do",
      "Can sketch the multi-AZ, stateless, auto-scaled HA reference architecture",
      "Can define RTO vs RPO and order the four DR strategies by cost/recovery",
      "Can list the main cost-optimization levers including data-transfer pitfalls",
      "Can map Budgets / Cost Explorer / Trusted Advisor / Compute Optimizer to their jobs",
    ],
    quiz: [
      {
        q: "A web app's checkout calls a slow downstream service synchronously, and spikes cause failures. The best decoupling fix is…",
        options: [
          "Add more EC2 instances and retry synchronously",
          "Place an SQS queue between the app and the downstream so it can absorb spikes and consumers scale independently",
          "Move everything to one larger instance",
          "Use SNS to email the user on failure",
        ],
        answer: 1,
        explain:
          "SQS decouples producer from consumer, buffers spikes, and lets you scale consumers separately — the components no longer fail together.",
      },
      {
        q: "A company needs an RPO of a few seconds and an RTO of about a minute, and accepts higher cost. Which DR strategy fits best?",
        options: [
          "Backup & Restore",
          "Pilot Light",
          "Warm Standby",
          "Multi-region active-active is the only option",
        ],
        answer: 2,
        explain:
          "Warm Standby keeps a scaled-down full copy running for minute-scale RTO and very low RPO. Backup & Restore/Pilot Light are too slow; active-active is more than required (and costlier).",
      },
      {
        q: "Finance wants an alert when monthly spend is forecast to exceed a threshold. Which service?",
        options: ["Cost Explorer", "AWS Budgets", "Trusted Advisor", "CloudWatch"],
        answer: 1,
        explain:
          "AWS Budgets sets spend/usage thresholds and sends alerts (including on forecasts). Cost Explorer analyzes spend; it doesn't alert on thresholds.",
      },
    ],
  },
];

export const CLOUD_CONCEPTS = [...TERRAFORM_CONCEPTS, ...AWS_CONCEPTS];
