import type { SeedTopic } from "./types";

export const terraform: SeedTopic = {
  name: "Terraform",
  slug: "terraform",
  icon: "Blocks",
  description:
    "Infrastructure as code fundamentals and state management. Plan/apply discipline, module design and avoiding the state lock footguns.",
  quizzes: [
    {
      title: "State, Plan and Apply",
      slug: "terraform-state-and-workflow",
      description:
        "How Terraform tracks resources, what the plan actually shows you, and how to recover when state goes wrong.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["state", "plan", "apply", "workflow"],
      questions: [
        {
          text: "What does `terraform plan` produce that matters most for review?",
          options: [
            "A proposed set of create, update, destroy and replace actions derived from comparing config to state and real infrastructure",
            "A validated HCL syntax report",
            "A backup of the state file",
            "A list of IAM permissions the provider needs",
          ],
          correct: [0],
          explanation:
            "Plan is a diff between your configuration, the state file and the real world. The review value is in spotting unintended destroys and replacements. A line marked '# forces replacement' means changing that attribute cannot be done in place, so the resource will be destroyed and recreated, which is why you treat those as breaking changes.",
          difficulty: "EASY",
          tags: ["plan", "fundamentals", "interview"],
        },
        {
          text: "What causes a resource to be shown as 'forces replacement' in a plan?",
          options: [
            "A change to an attribute that cannot be updated in place, such as most VPC subnet attributes or an instance's availability zone",
            "The resource was manually modified outside Terraform",
            "The provider version is out of date",
            "The resource depends on another resource that changed",
          ],
          correct: [0],
          explanation:
            "Some attributes are immutable after creation. Changing an EC2 instance's subnet, an EBS volume's AZ, or an S3 bucket's region requires replacement. Read those '# forces replacement' markers carefully: in production, a replacement can mean downtime or an orphaned IP address, so you often need an ignore_changes block or a taint and replace strategy.",
          difficulty: "MEDIUM",
          tags: ["plan", "lifecycle", "interview"],
        },
        {
          text: "Why should remote Terraform state be stored in an encrypted backend with locking rather than in Git?",
          options: [
            "State contains plaintext secrets from resource attributes and must be locked so concurrent applies cannot corrupt it",
            "Git cannot store .tfstate files",
            "State files are too large for Git",
            "Terraform only supports remote backends",
          ],
          correct: [0],
          explanation:
            "State frequently holds passwords, tokens and connection strings in cleartext because providers persist every attribute, including sensitive ones. S3 backend with SSE and DynamoDB or S3 conditional-write locking prevents two engineers from applying simultaneously and overwriting each other. Use `prevent_destroy` and never commit state to a shared repo.",
          difficulty: "MEDIUM",
          tags: ["state", "security", "backend", "interview"],
        },
        {
          text: "What does `terraform state mv` do and when is it appropriate?",
          options: [
            "Moves a resource to a different address in the state without destroying or recreating anything, used after refactoring module structure",
            "Moves a resource to a different cloud provider",
            "Migrates a resource to a new region",
            "Renames a local variable",
          ],
          correct: [0],
          explanation:
            "`terraform state mv aws_instance.web[0] module.web.aws_instance.this[0]` updates the state mapping after you reorganise code, so Terraform still tracks the same real resource instead of destroying and recreating it. Use `terraform state rm` to forget a resource you want Terraform to stop managing, and never edit state by hand.",
          difficulty: "MEDIUM",
          tags: ["state", "refactoring"],
        },
        {
          text: "What is Terraform drift, and what is the recommended first response to it?",
          options: [
            "Real infrastructure has changed outside Terraform; investigate the cause before applying, because apply will overwrite the manual change",
            "The provider version drifted",
            "The state file is corrupted",
            "A module failed to load",
          ],
          correct: [0],
          explanation:
            "Someone changed resources in the console or another tool, so the next plan shows Terraform reverting them. Before applying, find out who changed it and why; if the manual change is correct, import it into state so Terraform adopts it. Otherwise bring config in line. Blindly applying during an incident can delete the very thing that was fixed.",
          difficulty: "HARD",
          tags: ["state", "drift", "operations", "interview"],
        },
      ],
    },
    {
      title: "Modules, Count and Best Practices",
      slug: "terraform-modules-and-patterns",
      description:
        "Module boundaries, dynamic instance control, provider pinning and the patterns that keep large configurations maintainable.",
      difficulty: "HARD",
      isPremium: true,
      tags: ["modules", "count", "for-each", "providers"],
      questions: [
        {
          text: "What is the difference between `count` and `for_each` in Terraform?",
          options: [
            "count takes a number and keys instances by index; for_each takes a set or map and keys by the given value, which is stable across changes",
            "count works with strings and for_each with numbers",
            "for_each is deprecated in favour of count",
            "They are interchangeable",
          ],
          correct: [0],
          explanation:
            "`count` indexes from 0, so removing an item from the middle of a list shifts every later index and forces Terraform to destroy and recreate resources. `for_each` keys by the map key or set element, so removing an item only affects that item. Rule of thumb: use for_each whenever the key set is known and meaningful.",
          difficulty: "MEDIUM",
          tags: ["count", "for-each", "best-practices"],
        },
        {
          text: "Why is it risky to set `sensitive = true` on a resource rather than only on outputs and variables?",
          options: [
            "Sensitive values are redacted in CLI output, but Terraform still writes them to state and plan files in plaintext",
            "It disables validation of the value",
            "It prevents the resource from being created",
            "It encrypts the value in state",
          ],
          correct: [0],
          explanation:
            "The sensitive flag only controls display in the CLI. The values persist in state and in plan output files, so the real fix is to keep secrets out of Terraform entirely and inject them at runtime (Secrets Manager, SSM) or use an external secrets provider. Sensitive on a resource just makes debugging harder because you cannot see what changed.",
          difficulty: "HARD",
          tags: ["sensitive", "security", "state", "interview"],
        },
        {
          text: "What does the `lifecycle` meta-argument `create_before_destroy` do, and when is it required?",
          options: [
            "Creates the replacement before destroying the original, required when two resources of a type cannot share a name, IP or port at the same time",
            "Reuses the existing resource instead of replacing it",
            "Runs the create step in a different region",
            "Prevents the resource from ever being destroyed",
          ],
          correct: [0],
          explanation:
            "For resources that cannot coexist, such as a security group attached to an ENI, a database instance name, or a record in a Route 53 hosted zone with the same name, you need create_before_destroy so the new one exists before the old is torn down. It often also needs a unique name and sometimes a depends_on to force ordering.",
          difficulty: "HARD",
          tags: ["lifecycle", "replacement", "interview"],
        },
        {
          text: "What is the purpose of pinning provider versions with required_providers and required_version?",
          options: [
            "Ensures the configuration is reproducible by requiring compatible Terraform CLI and provider versions",
            "Speeds up terraform init",
            "Prevents providers from making API calls",
            "Encrypts the state file",
          ],
          correct: [0],
          explanation:
            "`required_version` constrains the CLI, and each entry in `required_providers` constrains a provider with a version range. Without pins, an init can pull a provider with breaking behaviour and turn a working plan into a failed apply. In CI, commit the `.terraform.lock.hcl` file and run init with `-backend=false` only when you do not need state.",
          difficulty: "EASY",
          tags: ["providers", "reproducibility"],
        },
        {
          text: "What is the recommended practice for sharing an S3 backend across many small Terraform configurations?",
          options: [
            "Use one state key per configuration, isolated by path or workspace, and enable locking",
            "Share a single state key so all configurations update together",
            "Use local state and commit it to a private repo",
            "Use a separate AWS account per configuration with no backend",
          ],
          correct: [0],
          explanation:
            "Each configuration needs its own state, achieved with distinct S3 keys (a path per configuration) or Terraform Cloud workspaces. Sharing one key causes conflicting writes and lock contention. Many teams centralise the backend config in a wrapper module or use Terragrunt to avoid repeating the backend block everywhere.",
          difficulty: "MEDIUM",
          tags: ["backend", "state", "best-practices"],
        },
        {
          text: "What happens when a module has a variable with no default and the caller does not set it?",
          options: [
            "Terraform prompts for a value interactively, or errors in automation, because the variable is required",
            "It defaults to null and the resource is skipped",
            "Terraform infers a value from the resource type",
            "The module is skipped entirely",
          ],
          correct: [0],
          explanation:
            "A variable without a default is required. In an interactive terminal Terraform prompts; in CI there is no terminal, so it fails with a clear 'no value for required variable' error. Always set type constraints as well, since they catch wrong values at validate time rather than at apply time.",
          difficulty: "EASY",
          tags: ["modules", "variables", "fundamentals"],
        },
      ],
    },
  ],
};
