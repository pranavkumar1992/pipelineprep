import type { SeedTopic } from "./types";

export const monitoring: SeedTopic = {
  name: "Monitoring",
  slug: "monitoring",
  icon: "Activity",
  description:
    "Metrics, logs, traces and alerting. RED and USE, SLOs, cardinality control and building on-call runbooks that people actually read.",
  quizzes: [
    {
      title: "Metrics, Alerts and SLOs",
      slug: "monitoring-metrics-alerts",
      description:
        "Metric types, the RED and USE frameworks, cardinality costs and writing alerts that wake the right person.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["metrics", "prometheus", "alerting", "slo"],
      questions: [
        {
          text: "What are the three Prometheus metric types and when is each used?",
          options: [
            "Counter for monotonically increasing events, Gauge for values that go up and down, Histogram for distributions of observations",
            "Counter, Gauge and Summary, where Summary is used for distributions",
            "Integer, Float and String",
            "Counter, Gauge and Timer, where Timer measures wall clock time",
          ],
          correct: [0],
          explanation:
            "Counters only increase and are ideal for rates: http_requests_total. Gauges move in both directions and represent current state like queue depth or memory in use. Histograms bucket observations into configurable buckets, letting you compute quantiles and rates of buckets; Summaries compute quantiles client-side and cannot be aggregated across instances, which is why Histogram is preferred for aggregation.",
          difficulty: "EASY",
          tags: ["metrics", "prometheus", "fundamentals"],
        },
        {
          text: "What does the RED framework measure, and what is the USE framework for?",
          options: [
            "RED measures request rate, errors and duration for services; USE measures utilisation, saturation and errors for resources",
            "RED is for databases and USE is for HTTP services",
            "They measure the same things in different orders",
            "USE is the newer name for RED",
          ],
          correct: [0],
          explanation:
            "RED is the service-level view: Rate, Errors, Duration, what a user experiences. USE is the resource-level view: Utilisation, Saturation, Errors, applied to CPUs, disks, queues and connection pools. Saturation is the interesting one because high utilisation is fine right up until queues start building, which is where latency actually degrades.",
          difficulty: "MEDIUM",
          tags: ["frameworks", "metrics", "interview"],
        },
        {
          text: "Your Prometheus instance is running out of memory and ingest is high. Which change most directly reduces memory usage?",
          options: [
            "Drop high-cardinality labels such as user_id or request_id from metrics",
            "Increase the scrape interval to 5 minutes",
            "Switch from gauges to counters",
            "Add more Prometheus replicas",
          ],
          correct: [0],
          explanation:
            "Prometheus stores one time series per unique label combination, so an unbounded label like user_id multiplies series count and is the usual cause of high memory and slow queries. Drop the label and, if you need that dimension, route it to logs or traces instead. Longer intervals cut series count over time but degrade resolution; more replicas do not reduce per-replica memory.",
          difficulty: "MEDIUM",
          tags: ["cardinality", "prometheus", "performance"],
        },
        {
          text: "What is an SLO error budget and how does it guide decisions?",
          options: [
            "The allowed amount of unreliability (1 - SLO); spending it on releases is fine, and exhausting it means freeze risky changes and focus on reliability",
            "A fixed monetary budget for the observability stack",
            "The number of alerts allowed per week",
            "The time budget for a single request",
          ],
          correct: [0],
          explanation:
            "An error budget of 0.1% on a 99.9% SLO is the unreliability you can spend. While budget remains, shipping features is the right call; once it is exhausted, the team's priority shifts to stability work. This replaces the argument about 'moving fast' versus 'moving carefully' with a shared, objective number.",
          difficulty: "MEDIUM",
          tags: ["slo", "error-budget", "interview"],
        },
        {
          text: "What makes an alert actionable rather than noise?",
          options: [
            "It has a clear owner, a threshold tied to user impact or an SLO burn, a runbook link, and is routed so the responder can act",
            "It fires as often as possible to catch everything",
            "It alerts on every warning-level log line",
            "It is duplicated in both PagerDuty and Slack",
          ],
          correct: [0],
          explanation:
            "An actionable alert names what is broken for users, who owns it, and what to do. Page on symptoms and SLO burn rather than causes, because cause-based alerts fire for things that are not yet hurting anyone. Runbook links and a routing policy are what separate a page from a notification.",
          difficulty: "MEDIUM",
          tags: ["alerting", "oncall", "best-practices", "interview"],
        },
        {
          text: "What are the four golden signals?",
          options: [
            "Latency, traffic, errors and saturation",
            "CPU, memory, disk and network",
            "Availability, durability, consistency and partition tolerance",
            "Mean, median, mode and standard deviation",
          ],
          correct: [0],
          explanation:
            "The four golden signals, from Google's SRE book, are latency (how long requests take), traffic (how much demand), errors (explicit failures) and saturation (how full the constrained resource is). They generalise across services, queues and databases, which is why they work as a default starting point before you tailor RED or USE to a specific system.",
          difficulty: "EASY",
          tags: ["metrics", "sre", "interview"],
        },
      ],
    },
  ],
};

export const iam: SeedTopic = {
  name: "IAM",
  slug: "iam",
  icon: "ShieldCheck",
  description:
    "Identity, access and policy design. Least privilege in practice, trust policies, role assumption and the boundaries that keep blast radius small.",
  quizzes: [
    {
      title: "IAM Policies and Least Privilege",
      slug: "iam-policies",
      description:
        "Policy evaluation logic, statement structure and the boundaries that constrain what a principal can ever do.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["policies", "least-privilege", "boundaries", "interview"],
      questions: [
        {
          text: "In IAM policy evaluation, what does an explicit Deny in any attached policy do?",
          options: [
            "It overrides any Allow in identity-based, resource-based, SCP or permissions boundary policies",
            "It is overridden by a resource-based policy Allow",
            "It applies only within the same account",
            "It applies only to IAM users, not roles",
          ],
          correct: [0],
          explanation:
            "Explicit deny always wins. If any policy contains an explicit Deny for the action and resource, the request is denied regardless of any Allow. That is why a permissions boundary or SCP Deny cannot be bypassed by a permissive inline or resource policy, making Deny the right tool for hard guardrails.",
          difficulty: "MEDIUM",
          tags: ["policies", "deny", "interview"],
        },
        {
          text: "What is the difference between a permissions boundary and an SCP?",
          options: [
            "A boundary is attached to a principal or resource and caps what it can ever do; an SCP is attached to an account or OU and caps what everything inside can do",
            "They are two names for the same feature",
            "A boundary can only deny, an SCP can only allow",
            "A boundary applies to resources, an SCP applies to users only",
          ],
          correct: [0],
          explanation:
            "A permissions boundary intersects with identity-based policies, so it is the maximum the principal can do. An SCP applies to every principal in the account or OU and is the maximum for the whole account. Both work as guardrails; the combination of a broad allowlist SCP plus per-team boundaries is a common, well-regarded design.",
          difficulty: "MEDIUM",
          tags: ["boundaries", "scp", "architecture", "interview"],
        },
        {
          text: "Which IAM element is required for a principal to assume a role, beyond having sts:AssumeRole permission?",
          options: [
            "The role's trust policy must name the principal in its Principal or Condition block",
            "The role must have a permission boundary",
            "The principal must be an IAM user, not a role",
            "The role must be in the root account",
          ],
          correct: [0],
          explanation:
            "Identity-based permissions say what a principal may do; the trust policy says who is allowed to assume this role. Both sides must agree. A trust policy with a Condition on aws:PrincipalTag, aws:SourceVpce or external ID is how you require MFA, restrict to a specific VPC endpoint, or require a third party to supply an ID you issued.",
          difficulty: "MEDIUM",
          tags: ["roles", "trust-policy", "interview"],
        },
        {
          text: "What does NotAction in an IAM policy statement do?",
          options: [
            "Allows or denies every action except the listed ones, which is useful for deny-list guardrails",
            "Same as Action but inverted at the resource level",
            "Ignores permissions boundaries",
            "Restricts actions to a single service",
          ],
          correct: [0],
          explanation:
            "NotAction is the complement of Action: it matches everything not listed. That makes it dangerous with Allow, because new services and actions automatically fall inside the allow. With Deny it is a strong guardrail, for example denying every action except a specific list, which survives the introduction of new AWS services.",
          difficulty: "HARD",
          tags: ["policies", "notaction", "security"],
        },
        {
          text: "Why is a long-lived IAM user discouraged in favour of roles and OIDC?",
          options: [
            "Keys leak through code, logs and CI variables and need manual rotation; roles issue short-lived, automatically rotated credentials",
            "IAM users cannot access the console",
            "Roles cost more",
            "IAM users are limited to one per account",
          ],
          correct: [0],
          explanation:
            "Access keys are the single most common cause of AWS breaches because they end up in environment variables, committed config and build logs, and they stay valid until someone notices. Roles with OIDC or STS give credentials that last minutes to an hour and need no rotation. Service accounts such as `sandbox.awsapps.com/roles/...` automate it entirely.",
          difficulty: "MEDIUM",
          tags: ["roles", "security", "best-practices", "interview"],
        },
        {
          text: "What does an external ID in a role trust policy protect against?",
          options: [
            "The confused deputy problem, where a third party you granted access to can use their own credentials to call AWS as you",
            "Credential expiration",
            "Cross-region access",
            "Cost allocation",
          ],
          correct: [0],
          explanation:
            "A third-party provider holding long-lived AWS keys could call AssumeRole on your role and impersonate you. Requiring an external ID that only you and the provider can construct, then putting a condition on sts:ExternalId, ensures the request comes from the specific arrangement you set up, so a leaked provider key alone is not enough.",
          difficulty: "HARD",
          tags: ["roles", "trust-policy", "security", "interview"],
        },
      ],
    },
  ],
};
