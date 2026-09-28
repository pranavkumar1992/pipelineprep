import type { SeedTopic } from "./types";

export const cicd: SeedTopic = {
  name: "CI/CD",
  slug: "ci-cd",
  icon: "GitBranch",
  description:
    "Build pipelines, deployment strategies, secrets and flaky tests. How to ship faster without making rollback harder.",
  quizzes: [
    {
      title: "Pipelines, Artifacts and Caching",
      slug: "cicd-pipelines",
      description:
        "How build pipelines are structured, what to cache versus persist, and how to keep builds reproducible.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["pipelines", "caching", "artifacts", "github-actions"],
      questions: [
        {
          text: "What is the difference between a build artifact and a build cache in a CI pipeline?",
          options: [
            "An artifact is an output promoted between stages; a cache is reused input to speed up builds and is safe to discard",
            "They are the same thing with different names",
            "Artifacts are stored on the runner; caches are stored remotely",
            "Caches are always encrypted; artifacts never are",
          ],
          correct: [0],
          explanation:
            "Artifacts are the things you deploy, like a container image or a package, so their integrity matters and they are versioned. Caches are build inputs like dependencies or compilation output that merely speed things up and can be evicted at any time. Conflating them is a common design smell: caching a build output instead of caching dependencies makes builds non-reproducible and slow to invalidate correctly.",
          difficulty: "MEDIUM",
          tags: ["artifacts", "caching", "interview"],
        },
        {
          text: "Why should secrets be injected at runtime rather than baked into a container image?",
          options: [
            "Image layers are easily inspected and persist in registries and caches; a secret in an image leaks even after deletion of the original",
            "Secrets cannot be stored in environment variables",
            "Images are compressed, so env vars break",
            "Runtime injection makes containers immutable",
          ],
          correct: [0],
          explanation:
            "A secret added in a RUN or COPY instruction becomes a layer that anyone with pull access can read, and it survives in the registry and in build caches even after you push a fixed image. Inject secrets at runtime from a secret manager, and never use them as build args because those are also visible in image history.",
          difficulty: "EASY",
          tags: ["secrets", "security", "containers", "interview"],
        },
        {
          text: "What does GitHub Actions' OIDC integration replace?",
          options: [
            "Long-lived cloud access keys stored as repository secrets; the workflow exchanges a short-lived OIDC token for a cloud role",
            "The need for a self-hosted runner",
            "Docker layer caching",
            "Branch protection rules",
          ],
          correct: [0],
          explanation:
            "With OIDC, the workflow requests a signed identity token and AWS exchanges it for short-lived credentials via IAM role trust on the OIDC provider. This eliminates the long-lived keys that leak from CI logs and removes the manual key rotation problem. The trust policy must constrain the `sub` claim to a specific repo and ref, or any fork can assume the role.",
          difficulty: "MEDIUM",
          tags: ["oidc", "security", "github-actions", "interview"],
        },
        {
          text: "Your pipeline caches dependencies with a key derived from the lockfile hash. Why?",
          options: [
            "So the cache is invalidated exactly when dependencies change, giving both speed and correctness",
            "So the cache key is unique per pipeline run",
            "Because lockfile hashes are always shorter",
            "To prevent cache poisoning between branches",
          ],
          correct: [0],
          explanation:
            "Keying the cache on the lockfile hash means an unchanged lockfile reuses the cache and a changed one rebuilds it, which is the fast path with correct results. Keying only on branch name serves stale dependencies and hides upstream changes. The GitHub Actions security concern with pull_request_target is real but is a separate problem from cache keying.",
          difficulty: "MEDIUM",
          tags: ["caching", "best-practices"],
        },
      ],
    },
    {
      title: "Deployment Strategies and Flaky Tests",
      slug: "cicd-deploy-strategies",
      description:
        "Blue/green, canary and rolling releases, plus how to tell a real regression from a flaky test.",
      difficulty: "MEDIUM",
      isPremium: true,
      tags: ["deployments", "canary", "blue-green", "flaky-tests"],
      questions: [
        {
          text: "What is the main advantage of a canary deployment over blue/green?",
          options: [
            "A small percentage of traffic goes to the new version first, limiting blast radius while you observe real metrics",
            "It requires no monitoring",
            "It switches all traffic atomically",
            "It avoids the need for database migrations",
          ],
          correct: [0],
          explanation:
            "Canary limits exposure: 1% of traffic to the new version means an undetected bug affects a small slice while you compare error rate and latency against the baseline. Blue/green flips all traffic at once, so its safety comes from instant, reliable rollback rather than gradual exposure, and it costs double capacity during the switch. Neither solves schema migrations, which need expand-and-contract.",
          difficulty: "MEDIUM",
          tags: ["canary", "blue-green", "deployments", "interview"],
        },
        {
          text: "What is the expand-and-contract pattern for database migrations?",
          options: [
            "Add the new schema alongside the old, backfill, switch reads and writes, then remove the old schema in a later release",
            "Run the migration and the deploy in the same transaction",
            "Take a full outage, migrate, then restart",
            "Never change the schema; write code around it",
          ],
          correct: [0],
          explanation:
            "Expand-and-contract makes each step backwards compatible so old and new application versions can coexist during rollout. Expand adds the new column or table and backfills it; the deploy switches code to use it; contract later removes the old schema once nothing references it. This is what makes zero-downtime deploys possible when the schema must change.",
          difficulty: "HARD",
          tags: ["migrations", "deployments", "zero-downtime", "interview"],
        },
        {
          text: "A test fails on roughly one run in ten with no code change. What is the right first step?",
          options: [
            "Quarantine and retry the test to restore signal, then investigate the shared state, timing or ordering that causes it",
            "Delete the test immediately",
            "Increase the pipeline timeout",
            "Disable parallel test execution permanently",
          ],
          correct: [0],
          explanation:
            "Quarantine stops the flake from training the team to ignore red, which is how flaky suites destroy pipeline trust. Then look for the usual causes: shared fixtures or database state between tests, reliance on wall-clock time or random seeds, ordering dependencies, or assertions on network timing. Deleting the test loses the coverage; raising timeouts hides the bug.",
          difficulty: "MEDIUM",
          tags: ["flaky-tests", "testing", "best-practices", "interview"],
        },
        {
          text: "Why is it important to pin the base image by digest rather than by tag in a production pipeline?",
          options: [
            "Tags are mutable, so a rebuild can silently pick up different content and break a previously passing build",
            "Digests compress the image better",
            "Tags cannot be used with caching",
            "Digests enable multi-arch images",
          ],
          correct: [0],
          explanation:
            "A tag like `node:22` points at whatever that tag currently references, so two builds of the same commit can differ, and a base image update can turn green into red with no code change. Pinning by digest, usually combined with Renovate or Dependabot to bump digests on a schedule, gives reproducible builds with a controlled update path.",
          difficulty: "MEDIUM",
          tags: ["reproducibility", "containers", "pipelines"],
        },
        {
          text: "What is the purpose of a pipeline gate that requires manual approval before a production deploy?",
          options: [
            "It puts a human checkpoint where the blast radius of an automatic deploy is high",
            "It speeds up the pipeline",
            "It verifies the code compiles",
            "It replaces automated testing",
          ],
          correct: [0],
          explanation:
            "Manual gates are appropriate for risky, hard-to-reverse changes: production database migrations, irreversible infrastructure changes, or releases during a freeze window. Used on every deploy, they become a rubber stamp that trains the team to click through, so the value comes from being selective. Automatic tests and rollback safety should handle the routine path.",
          difficulty: "EASY",
          tags: ["deployments", "process", "interview"],
        },
      ],
    },
  ],
};
