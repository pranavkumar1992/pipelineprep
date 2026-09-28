import type { SeedTopic } from "./types";

export const TOPIC_ICONS: Record<string, string> = {
  aws: "Cloud",
  linux: "Terminal",
  docker: "Box",
  kubernetes: "Ship",
  terraform: "Blocks",
  "cicd": "GitBranch",
  monitoring: "Activity",
  networking: "Network",
  iam: "ShieldCheck",
  interview: "MessagesSquare",
};

export const SEED_TOPICS: SeedTopic[] = [
  {
    name: "AWS",
    slug: "aws",
    icon: TOPIC_ICONS.aws!,
    description:
      "Core compute, storage, networking and scaling services. Covers the architecture decisions that show up in SAA/DVA interviews and in real incident reviews.",
    quizzes: [],
  },
  {
    name: "Linux",
    slug: "linux",
    icon: TOPIC_ICONS.linux!,
    description:
      "The operating system underneath everything in DevOps. Permissions, processes, filesystems, networking and the commands you reach for at 2am.",
    quizzes: [],
  },
  {
    name: "Docker",
    slug: "docker",
    icon: TOPIC_ICONS.docker!,
    description:
      "Images, containers, networking and build pipelines. How the overlay filesystem works and why your 1.2GB base image is costing you deploy speed.",
    quizzes: [],
  },
  {
    name: "Kubernetes",
    slug: "kubernetes",
    icon: TOPIC_ICONS.kubernetes!,
    description:
      "Scheduling, networking, autoscaling and failure modes. Built around what actually breaks in clusters rather than YAML syntax.",
    quizzes: [],
  },
  {
    name: "Terraform",
    slug: "terraform",
    icon: TOPIC_ICONS.terraform!,
    description:
      "Infrastructure as code fundamentals and state management. Plan/apply discipline, module design and avoiding the state lock footguns.",
    quizzes: [],
  },
  {
    name: "CI/CD",
    slug: "ci-cd",
    icon: TOPIC_ICONS.cicd!,
    description:
      "Build pipelines, deployment strategies, secrets and flaky tests. How to ship faster without making rollback harder.",
    quizzes: [],
  },
  {
    name: "Monitoring",
    slug: "monitoring",
    icon: TOPIC_ICONS.monitoring!,
    description:
      "Metrics, logs, traces and alerting. RED and USE, SLOs, cardinality control and building on-call runbooks that people actually read.",
    quizzes: [],
  },
  {
    name: "Networking",
    slug: "networking",
    icon: TOPIC_ICONS.networking!,
    description:
      "DNS, TCP, TLS and the routing between them. CIDR arithmetic, load balancing layers and the packet-level causes of latency.",
    quizzes: [],
  },
  {
    name: "IAM",
    slug: "iam",
    icon: TOPIC_ICONS.iam!,
    description:
      "Identity, access and policy design. Least privilege in practice, trust policies, role assumption and the boundaries that keep blast radius small.",
    quizzes: [],
  },
  {
    name: "Interview Prep",
    slug: "interview-prep",
    icon: TOPIC_ICONS.interview!,
    description:
      "Behavioural frameworks, system design framing and the follow-up questions product companies ask. Practice the story, not just the answer.",
    quizzes: [],
  },
];
