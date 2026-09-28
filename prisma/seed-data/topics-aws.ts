import type { SeedTopic } from "./types";

export const aws: SeedTopic = {
  name: "AWS",
  slug: "aws",
  icon: "Cloud",
  description:
    "Core compute, storage, networking and scaling services. Covers the architecture decisions that show up in SAA/DVA interviews and in real incident reviews.",
  quizzes: [
    {
      title: "AWS Storage: S3, EBS and Versioning",
      slug: "aws-storage-foundations",
      description:
        "Durability guarantees, versioning semantics, replication and the storage class and volume decisions that affect cost and recovery.",
      difficulty: "EASY",
      isPremium: false,
      tags: ["storage", "s3", "ebs", "s3a"],
      questions: [
        {
          text: "What is the minimum durability SLA for objects stored in Amazon S3 Standard, expressed as the probability of losing an object in a given year?",
          options: [
            "99.0000000% (8 nines)",
            "99.9999999% (11 nines)",
            "99.999999999% (12 nines)",
            "100%",
          ],
          correct: [1],
          explanation:
            "S3 Standard is designed for 11 nines of durability, and S3 One Zone-IA is 9 nines. Note the wording trap: this is a durability guarantee for the data, not an availability guarantee. Availability, measured as the fraction of time the service answers requests, is a separate figure.",
          difficulty: "EASY",
          tags: ["storage", "s3", "sla"],
        },
        {
          text: "A bucket has versioning enabled. An object is overwritten twice. How many versions does S3 retain, including delete markers?",
          options: [
            "Two versions, plus one delete marker if the object was explicitly deleted",
            "Exactly three versions",
            "Three versions, but S3 consolidates identical payloads",
            "Only the latest version, previous ones expire immediately",
          ],
          correct: [0],
          explanation:
            "Overwriting twice creates three versions: the original, the first overwrite, and the second. Delete markers are also stored as versions, which is why a deleted object still shows up in a version listing and can be restored.",
          difficulty: "EASY",
          tags: ["storage", "s3", "versioning"],
        },
        {
          text: "Which S3 delete behaviour requires versioning to be disabled first?",
          options: [
            "Soft delete via a lifecycle rule",
            "Permanent, irreversible deletion of an object version",
            "Moving an object to Glacier Deep Archive",
            "Setting a bucket policy that denies s3:DeleteObject",
          ],
          correct: [1],
          explanation:
            "You can always delete an individual version and that deletion is permanent. To delete the object and all its versions you must suspend versioning, which is why production buckets keep versioning on and lean on lifecycle rules for retention instead.",
          difficulty: "MEDIUM",
          tags: ["storage", "s3", "versioning"],
        },
        {
          text: "What is the maximum size of a single object you can store in S3?",
          options: ["5 GB", "50 GB", "5 TB", "100 GB"],
          correct: [2],
          explanation:
            "The limit is 5 TB per object. Objects larger than 100 MB should be uploaded with a multipart upload, which allows parts to be uploaded in parallel and retried independently, and it is required above 5 GB.",
          difficulty: "EASY",
          tags: ["storage", "s3", "multipart"],
        },
        {
          text: "Which storage class is the cheapest option for data accessed roughly once per quarter that you must retain for compliance?",
          options: [
            "S3 Standard-IA",
            "S3 Intelligent-Tiering",
            "S3 Glacier Deep Archive",
            "S3 One Zone-Standard",
          ],
          correct: [2],
          explanation:
            "Glacier Deep Archive has the lowest per-gigabyte price, with a minimum storage duration of 180 days and a retrieval time of 12 hours. If access is once a quarter, Glacier Flexible Retrieval (minutes to hours, 90-day minimum) is often the better fit. Standard-IA is for frequent access.",
          difficulty: "MEDIUM",
          tags: ["storage", "s3", "cost"],
        },
        {
          text: "An EBS volume is attached to an EC2 instance. Which combination allows you to detach and reattach it to a different AZ?",
          options: ["gp3 with DeleteOnTermination", "io2 with DeleteOnTermination", "st1 with DeleteOnTermination", "None of these"],
          correct: [3],
          explanation:
            "EBS is an AZ-bound resource. You can move a volume between instances in the same AZ, or use Multi-Attach io2 to attach to several instances in one AZ, but to change AZs you must snapshot and restore into the target AZ.",
          difficulty: "MEDIUM",
          tags: ["storage", "ebs", "availability-zones"],
        },
        {
          text: "What does EBS gp3 baseline performance consist of by default, before additional IOPS or throughput is provisioned?",
          options: [
            "3,000 IOPS and 125 MB/s",
            "2,000 IOPS and 125 MB/s",
            "3,000 IOPS and 250 MB/s",
            "16,000 IOPS and 1,000 MB/s",
          ],
          correct: [0],
          explanation:
            "gp3 defaults to 3,000 IOPS and 125 MB/s throughput and can be scaled independently up to 16,000 IOPS and 1,000 MB/s. Because the baseline performance is included rather than separately billed as it was with gp2, gp3 is usually cheaper for steady-state workloads.",
          difficulty: "MEDIUM",
          tags: ["storage", "ebs", "gp3"],
        },
        {
          text: "S3 Cross-Region Replication of an object encrypted with an SSE-KMS key requires what to be true?",
          options: [
            "The destination bucket must have versioning enabled",
            "The KMS key must be a multi-Region key",
            "The source and destination buckets must be in the same account",
            "A VPC endpoint to the KMS endpoint must exist",
          ],
          correct: [1],
          explanation:
            "Cross-region replication cannot read a customer managed CMK in another region, so the key must be an AWS KMS multi-Region key (replica key). Separately, CRR does require versioning on both the source and destination buckets.",
          difficulty: "HARD",
          tags: ["storage", "s3", "kms", "crr"],
        },
        {
          text: "An S3 bucket policy grants s3:GetObject to principal '*' while the bucket's Block Public Access setting denies public policies. What happens?",
          options: [
            "The policy is ignored and GetObject is denied for everyone",
            "The policy is applied and the bucket becomes public",
            "The request is allowed only for the bucket owner account",
            "S3 returns a 301 redirect to a signed URL",
          ],
          correct: [0],
          explanation:
            "Block Public Access is evaluated as an explicit deny that overrides any allow in the bucket or IAM policy. This is the recommended pattern: write the public policy you intend, then let BPA enforce the deny so a future policy edit cannot expose the bucket.",
          difficulty: "MEDIUM",
          tags: ["storage", "s3", "security"],
        },
        {
          text: "What is the effect of setting an S3 lifecycle transition to S3 Glacier Instant Retrieval on object read latency and minimum storage duration?",
          options: [
            "Milliseconds reads, no minimum storage duration",
            "Milliseconds reads, 30-day minimum storage duration",
            "Milliseconds reads, 90-day minimum storage duration",
            "Minutes reads, 128 KB minimum object size",
          ],
          correct: [1],
          explanation:
            "Instant Retrieval keeps objects in S3 but moves them to a low-cost storage class, so reads are still in milliseconds. It carries a 30-day minimum storage duration and a 128 KB minimum object size, and is aimed at 30-day-plus access patterns.",
          difficulty: "MEDIUM",
          tags: ["storage", "s3", "lifecycle"],
        },
        {
          text: "Your EC2 instance uses an IAM instance profile. What happens to the temporary credentials when the instance is stopped and started again?",
          options: [
            "They are re-fetched from the metadata service on next use",
            "They are persisted across the stop/start",
            "They expire and the instance loses all IAM access until reboot",
            "They are stored encrypted on the instance and reused for 12 hours",
          ],
          correct: [0],
          explanation:
            "Credentials are never persisted to disk. The instance profile delivers short-lived credentials on demand from the IMDS endpoint, so a stop/start transparently obtains fresh credentials. This is why a restart fixes 'AccessDenied' after long uptime.",
          difficulty: "MEDIUM",
          tags: ["compute", "iam", "ec2", "metadata"],
        },
        {
          text: "Which combination of S3 features lets you detect and remove an individual object within roughly 15 minutes?",
          options: ["Multi-Access Point", "S3 Object Lambda", "S3 Batch Operations", "S3 Access Analyzer"],
          correct: [2],
          explanation:
            "S3 Batch Operations can report on a manifest of objects and then delete or tag them in a single job, processing billions of keys. Access Analyzer finds public access, it does not remove objects.",
          difficulty: "HARD",
          tags: ["storage", "s3", "compliance"],
        },
        {
          text: "What is the consistency model for S3 as of December 2020?",
          options: [
            "Eventual consistency for all operations",
            "Strong read-after-write consistency for all operations, including LIST",
            "Strong consistency for PUT and GET, eventual for DELETE",
            "Read-after-write consistency only within a single region",
          ],
          correct: [1],
          explanation:
            "S3 has provided strong read-after-write consistency for PUT, overwrite, copy and DELETE since December 2020, and LIST is strongly consistent as well. That earlier eventual-consistency window is the cause behind a whole generation of stale-cache application bugs.",
          difficulty: "MEDIUM",
          tags: ["storage", "s3", "consistency"],
        },
        {
          text: "You need a file system that multiple Linux instances can mount read-write over the network with POSIX semantics, and the instances are all in one AZ. Which is the best fit?",
          options: ["EFS", "S3", "FSx for Lustre", "EC2 instance store"],
          correct: [0],
          explanation:
            "EFS is a managed NFS file system that Linux instances mount directly, so applications get normal POSIX file semantics rather than an object API. EFS Standard is single-AZ; EFS One Zone is the cheaper single-AZ variant. S3 would require rewriting the app for object semantics.",
          difficulty: "MEDIUM",
          tags: ["storage", "efs", "architecture"],
        },
      ],
    },
    {
      title: "Networking, Load Balancing and DNS",
      slug: "aws-networking-elb",
      description:
        "VPC design, security groups, load balancer target types, routing and Route 53 behaviours that decide whether traffic actually flows.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["vpc", "alb", "elb", "route53", "networking"],
      questions: [
        {
          text: "An ALB returns 502 Bad Gateway for every request. What does that specifically indicate?",
          options: [
            "The client could not resolve the DNS name",
            "The load balancer received the request but could not get a valid response from at least one target",
            "The ALB health checks are disabled",
            "The security group on the ALB blocks inbound traffic",
          ],
          correct: [1],
          explanation:
            "502 means the load balancer terminated the TCP connection and then failed talking to the target: connection refused, connection reset, or a target that closed the connection early. 504 is the timeout variant, and a 503 means no healthy targets at all. The ALB access logs carry the target_port and a deserialization error to pinpoint which.",
          difficulty: "MEDIUM",
          tags: ["alb", "troubleshooting", "interview"],
        },
        {
          text: "What is the key difference in target handling between an Application Load Balancer and a Network Load Balancer regarding target type?",
          options: [
            "NLB only supports instance targets; ALB supports everything",
            "ALB supports instance, IP, Lambda and Lambda-compatible targets; NLB supports instance, IP and Lambda",
            "Both only support EC2 instances",
            "ALB supports IP targets only within a VPC",
          ],
          correct: [1],
          explanation:
            "ALB can target instances, registered IP addresses, Lambda functions and ALB Lambda targets, and it interprets HTTP so it can route by path, host or header. NLB operates at layer 4 and supports instance, IP and Lambda targets, routing by port and IP rather than by HTTP content.",
          difficulty: "MEDIUM",
          tags: ["alb", "nlb", "architecture"],
        },
        {
          text: "An EC2 instance in a public subnet needs to reach the internet to download packages, but has no public IP and no NAT gateway. What happens?",
          options: [
            "It reaches the internet over the internet gateway via the route table",
            "It cannot reach the internet; outbound traffic requires an explicit path such as a NAT gateway",
            "It reaches the internet but only over IPv6",
            "It reaches the internet through the S3 VPC endpoint",
          ],
          correct: [1],
          explanation:
            "Reaching the internet requires a route to the internet gateway or a NAT gateway. With neither, there is no path and outbound calls hang until timeout. A NAT gateway is the usual answer for instances in private subnets because instances in a public subnet do not get a route to the internet gateway unless one is added explicitly.",
          difficulty: "EASY",
          tags: ["vpc", "nat", "networking"],
        },
        {
          text: "Security groups and network ACLs differ in which ways? Select the accurate comparison.",
          options: [
            "Security groups are stateful and allow rules only; NACLs are stateless and use explicit allow and deny rules including a default deny",
            "Security groups are stateless and NACLs are stateful",
            "Both are stateful and both default to allow",
            "NACLs can be attached to subnets only within the same AZ",
          ],
          correct: [0],
          explanation:
            "Security groups are stateful: allowing inbound automatically allows the response traffic outbound, and every rule is an allow. Network ACLs are stateless and evaluated in order top to bottom, lowest number first, so a deny at rule 100 beats an allow at rule 200, and return traffic must be explicitly allowed.",
          difficulty: "MEDIUM",
          tags: ["vpc", "security-groups", "nacl", "interview"],
        },
        {
          text: "You want zero-downtime cutover of a domain from one set of targets to another with DNS health checks. Which Route 53 record type fits?",
          options: [
            "Simple A record with a 300 second TTL",
            "Weighted round robin with weights 100 and 0",
            "Alias record with Evaluate Target Health enabled",
            "Latency-based record",
          ],
          correct: [2],
          explanation:
            "An alias record points at an AWS resource such as an ALB and can evaluate target health, so DNS health checks drive failover automatically. Remember the alias record's own TTL is fixed at 60 seconds and cannot be changed, which matters when planning a migration.",
          difficulty: "HARD",
          tags: ["route53", "dns", "migration"],
        },
        {
          text: "What does a Route 53 private hosted zone let you do that a public hosted zone cannot?",
          options: [
            "Answer queries for domains you own using records only resolvable inside your VPC(s)",
            "Reduce DNS query cost",
            "Provide DDoS protection",
            "Serve records from multiple AWS regions automatically",
          ],
          correct: [0],
          explanation:
            "A private hosted zone serves records only to resolvers inside the associated VPCs, via the Amazon-provided DNS at the .2 address of each VPC CIDR. It is the standard way to give internal services names without exposing them publicly.",
          difficulty: "EASY",
          tags: ["route53", "dns", "vpc"],
        },
        {
          text: "A VPC peering connection is in place. Which of these is NOT true?",
          options: [
            "Both VPCs must be owned by different AWS accounts for a valid peering connection",
            "Peering is transitive: if A peers with B and B peers with C, A cannot reach C",
            "Peering supports IPv4 and IPv6 CIDR ranges",
            "Security groups apply to traffic crossing a peering connection",
          ],
          correct: [0],
          explanation:
            "VPC peering works within the same account as well as across accounts. The classic interview trap is transitivity: routing information does not flow transitively, so three VPCs in a chain need a mesh of three connections to be fully connected.",
          difficulty: "MEDIUM",
          tags: ["vpc", "peering", "interview"],
        },
        {
          text: "What is the purpose of a VPC endpoint of type Gateway for S3?",
          options: [
            "To route S3 traffic through a NAT gateway to reduce cost",
            "To let instances reach S3 and DynamoDB via private routes without traversing the public internet",
            "To enforce S3 bucket encryption",
            "To accelerate S3 uploads globally",
          ],
          correct: [1],
          explanation:
            "A Gateway endpoint adds prefix-list routes for S3 and DynamoDB pointing at the endpoint, so traffic stays on the AWS backbone and never reaches a NAT gateway. Because no public IP or NAT is involved, bucket policies must also allow access via the endpoint's prefix list or `aws:SourceVpc`, or access is denied by the endpoint policy.",
          difficulty: "MEDIUM",
          tags: ["vpc", "vpc-endpoints", "s3"],
        },
        {
          text: "Your ALB health check uses path /health on port 8080 but targets serve health on 80. What is the likely result?",
          options: [
            "Health checks fail, targets go unhealthy, and requests get 503",
            "The ALB falls back to port 80 automatically",
            "Targets stay healthy and requests succeed",
            "The ALB starts using NLB-style TCP health checks",
          ],
          correct: [0],
          explanation:
            "Health check configuration is explicit: path, port, protocol, interval, timeout, healthy and unhealthy thresholds. A mismatch here is one of the most common causes of a 503 storm right after a deployment, since the new version has not yet moved its health endpoint.",
          difficulty: "EASY",
          tags: ["alb", "health-checks", "troubleshooting"],
        },
        {
          text: "Which NAT gateway option provides automatic failover between NAT gateways across two Availability Zones?",
          options: [
            "A single NAT gateway in one AZ with a cross-AZ route to the internet gateway",
            "One NAT gateway per AZ, each routing from the local subnet, giving per-AZ failover within an AZ",
            "A single NAT gateway per VPC with automatic zonal failover",
            "A VPC endpoint to S3 with NAT as backup",
          ],
          correct: [1],
          explanation:
            "AWS's recommended pattern for zonal resilience is one NAT gateway per AZ, each with its own route from the subnets in that AZ, and the AZ-independent route pointing at the internet gateway. This keeps the critical path inside a single AZ, so there is no cross-AZ NAT data charge and no single-AZ failure domain. NAT gateways are inherently zonal; there is no managed cross-AZ failover option.",
          difficulty: "HARD",
          tags: ["vpc", "nat", "ha", "interview"],
        },
      ],
    },
    {
      title: "Compute, Scaling and Serverless",
      slug: "aws-compute-scaling",
      description:
        "Auto Scaling behaviour, ECS versus EKS, Lambda limits and concurrency, and the trade-offs behind choosing a launch type.",
      difficulty: "MEDIUM",
      isPremium: true,
      tags: ["ec2", "autoscaling", "lambda", "ecs", "eks", "serverless"],
      questions: [
        {
          text: "What happens to an EC2 instance that is attached to an Auto Scaling group when a scale-in event removes it?",
          options: [
            "It is immediately terminated",
            "It enters a Terminating:Wait state, is taken out of service via a lifecycle hook or ELB deregistration delay, then terminated",
            "It is put into a stopped state and reattached to another group",
            "It stays running but is flagged unhealthy",
          ],
          correct: [1],
          explanation:
            "The instance is first moved to Terminating:Wait and taken out of the ELB rotation, with a 300-second default deregistration delay so in-flight requests drain. Termination only happens after the delay and any lifecycle hook succeed. Confusing this with immediate termination is a common cause of connection resets during scale-in.",
          difficulty: "MEDIUM",
          tags: ["autoscaling", "elb", "lifecycle-hooks"],
        },
        {
          text: "You configure an Auto Scaling policy using a custom CloudWatch metric with a target value, but instances are not scaling out. What is the most likely cause?",
          options: [
            "The metric's period is longer than the evaluation window",
            "The target value is unreachable because the metric is a Gauge that never exceeds it",
            "The alarm's action must point at the ASG, not the metric",
            "Auto Scaling only supports EC2 metrics from the built-in namespace",
          ],
          correct: [0],
          explanation:
            "Target tracking needs the metric to cross the target within the evaluation window; if the alarm's period is longer than the ASG's evaluation period or the metric rarely breaches, scaling never triggers. A common mistake is picking a Gauge metric for something that behaves like a counter.",
          difficulty: "MEDIUM",
          tags: ["autoscaling", "cloudwatch", "troubleshooting"],
        },
        {
          text: "What is the maximum default concurrency for a Lambda function, and how is it applied?",
          options: [
            "Reserved concurrency of 1,000 per region, applied as a hard cap",
            "Unreserved account concurrency limit of 1,000, with reserved concurrency carving out guaranteed capacity per function",
            "A hard cap of 1,000 per function",
            "No concurrency limit applies to Lambda",
          ],
          correct: [1],
          explanation:
            "Unreserved concurrency is a regional pool of 1,000 shared across all functions. Setting reserved concurrency on a function guarantees it that capacity and caps it, which is the mechanism for throttling a noisy neighbour and protecting a downstream database.",
          difficulty: "MEDIUM",
          tags: ["lambda", "serverless", "concurrency"],
        },
        {
          text: "What causes a Lambda cold start, and which change reduces it most directly?",
          options: [
            "Network latency to the function's code; placing the function in a region near callers",
            "The runtime container being cold; provisioning concurrency keeps a warm environment ready",
            "Cold DNS resolution for the Lambda service endpoint",
            "A low memory setting causing swap; raising memory also raises CPU allocation",
          ],
          correct: [1],
          explanation:
            "A cold start is the time to initialise a sandbox and is dominated by runtime and import time. Provisioning concurrency pre-initialises environments to remove it. The last option is also true and important: Lambda allocates CPU in proportion to memory, so a 512 MB function gets roughly a third of a vCPU.",
          difficulty: "EASY",
          tags: ["lambda", "serverless", "performance"],
        },
        {
          text: "In an ECS task using the awsvpc network mode, what must be true for a container to be reachable?",
          options: [
            "The task is assigned an ENI, gets its own private IP, and is reachable only from within the VPC",
            "The task always gets a public IP if the subnet has a route to the internet gateway",
            "The task shares the host's network stack",
            "The container must publish a port with docker -p equivalent in the task definition",
          ],
          correct: [0],
          explanation:
            "With awsvpc each task gets an ENI and a private IP in the task's subnet, so it behaves like a small VM. bridge mode, by contrast, shares the Docker bridge and needs port mappings. There is also a newer `host` network mode on ECS that shares the host network namespace on Fargate or EC2.",
          difficulty: "MEDIUM",
          tags: ["ecs", "vpc", "networking"],
        },
        {
          text: "When should you choose ECS Fargate over EC2-backed ECS?",
          options: [
            "Always, because Fargate removes capacity planning",
            "When you want to avoid managing hosts, patch the OS, or run privileged workloads with specific host access requirements",
            "Only when you need GPU workloads",
            "When you need SSH access to the container for debugging",
          ],
          correct: [1],
          explanation:
            "Fargate removes server management, which suits bursty and scheduled workloads. EC2-backed ECS wins when you need privileged mode, host networking, GPU drivers, a specific kernel or instance store volumes, or lower cost at high steady utilisation. GPUs on Fargate are possible but a narrower offering.",
          difficulty: "MEDIUM",
          tags: ["ecs", "fargate", "architecture"],
        },
        {
          text: "An EKS control plane in one region and worker nodes in another region. Which is the supported pattern?",
          options: [
            "Not supported; control plane and nodes must be in the same region",
            "Supported, but pod-to-pod latency makes cross-region networking impractical for most workloads",
            "Supported only with the cluster endpoint disabled",
            "Supported only with self-managed node groups",
          ],
          correct: [1],
          explanation:
            "EKS supports out-of-region worker nodes, but pods then rely on inter-region latency, and VPC CNI ENIs must exist in the node region. The trade-off is mostly about data residency or running capacity close to a remote data source, not about cross-region traffic for normal latency-sensitive pods.",
          difficulty: "HARD",
          tags: ["eks", "architecture", "networking"],
        },
        {
          text: "What is the difference between a launch template and a launch configuration in EC2 Auto Scaling?",
          options: [
            "They are identical, launch configurations are legacy",
            "Launch templates support versioned updates, and network interfaces and IAM instance profiles can be specified; launch configurations cannot",
            "Launch templates only work with Spot instances",
            "Launch configurations cannot be used with Auto Scaling",
          ],
          correct: [1],
          explanation:
            "Launch templates are the modern mechanism, support versioning, allow more parameters including multiple network interfaces, and have no published limits on the number of security groups per template. Launch configurations are deprecated but still work, and they cap security groups per instance.",
          difficulty: "MEDIUM",
          tags: ["autoscaling", "ec2", "launch-templates"],
        },
        {
          text: "Your Lambda writes to DynamoDB. Which environment variable and parameter combination gives the function access?",
          options: [
            "Any IAM policy in the account, as long as the role is not the basic execution role",
            "An execution role attached to the function whose trust policy allows lambda.amazonaws.com, with a permissions policy granting dynamodb actions",
            "An IAM user whose access keys are stored as environment variables",
            "A resource-based policy on the DynamoDB table naming the function",
          ],
          correct: [1],
          explanation:
            "Lambda assumes the execution role at invocation; the trust policy must allow lambda.amazonaws.com to assume it, and the permissions policy must allow the DynamoDB actions on the specific table and index ARNs. AWS SAM and CDK generate this for you from the function's resource dependencies.",
          difficulty: "MEDIUM",
          tags: ["lambda", "iam", "dynamodb"],
        },
        {
          text: "A Spot Fleet request is configured with capacity-optimized allocation. How does it choose where to place the capacity?",
          options: [
            "It picks the cheapest pools first, even if that makes interruption risk highest",
            "It analyses price history and interruption likelihood across pools to maximise spare capacity availability",
            "It fills the cheapest available pool and stays there until it is interrupted",
            "It randomises across all pools to avoid correlated interruption",
          ],
          correct: [1],
          explanation:
            "capacity-optimized trades lowest price for lowest interruption probability, which is the right default for interruption-tolerant work. lowest-price can be cheaper still but will concentrate on the pools most likely to be reclaimed first.",
          difficulty: "MEDIUM",
          tags: ["ec2", "spot", "cost"],
        },
      ],
    },
    {
      title: "RDS, DynamoDB and Data Services",
      slug: "aws-data-services",
      description:
        "Relational availability options, NoSQL consistency and capacity, and the caching and messaging services that sit alongside them.",
      difficulty: "MEDIUM",
      isPremium: true,
      tags: ["rds", "dynamodb", "elasticache", "sqs", "sns", "kinesis"],
      questions: [
        {
          text: "What is the difference between an RDS Multi-AZ deployment and a read replica?",
          options: [
            "Multi-AZ is synchronous standby for HA; a read replica is an asynchronous copy you can read from and promote",
            "Multi-AZ is for read scaling and read replicas are for backups",
            "Read replicas are synchronous and Multi-AZ is asynchronous",
            "They are two names for the same feature",
          ],
          correct: [0],
          explanation:
            "Multi-AZ maintains a synchronous standby in another AZ and fails over automatically in about a minute, but you cannot read from it. A read replica is asynchronous, readable, and must be promoted manually, which introduces replication lag and data loss at the moment of promotion.",
          difficulty: "MEDIUM",
          tags: ["rds", "ha", "interview"],
        },
        {
          text: "How does DynamoDB read consistency work by default, and what is the cost of using eventually consistent reads?",
          options: [
            "Eventually consistent by default, half the RCU cost of strong reads",
            "Strongly consistent by default, twice the RCU cost for eventual reads",
            "Strongly consistent only in a global table",
            "Eventually consistent only for global table replicas",
          ],
          correct: [0],
          explanation:
            "DynamoDB reads are eventually consistent by default and consume half the read capacity units; strongly consistent reads cost 2x and are not supported on global secondary indexes. Eventually consistent reads may return stale or missing data right after a write, which is usually fine and often desirable for throughput.",
          difficulty: "EASY",
          tags: ["dynamodb", "consistency"],
        },
        {
          text: "Which DynamoDB read or write is NOT guaranteed strongly consistent, even when asked for?",
          options: [
            "GetItem",
            "Query",
            "Global secondary index read",
            "BatchWriteItem",
          ],
          correct: [2],
          explanation:
            "GSIs are eventually consistent only; asking for strong consistency on a GSI read returns an error. A GSI also propagates asynchronously, so it can lag behind the base table. If you need a strongly consistent read path for those queries, denormalise into the base table instead.",
          difficulty: "HARD",
          tags: ["dynamodb", "gsi", "consistency"],
        },
        {
          text: "DynamoDB on-demand capacity is billed per request. What request is free?",
          options: [
            "Requests for tables smaller than 1 MB",
            "Requests that return no items",
            "Requests that only read attributes not projected into the index used",
            "The first 100 requests per second",
          ],
          correct: [1],
          explanation:
            "DynamoDB does not charge for requests that return no items, because no read capacity or data size is consumed. That means a LookupTable call with a primary key that does not exist is effectively free, which is useful to know when designing access patterns.",
          difficulty: "HARD",
          tags: ["dynamodb", "pricing"],
        },
        {
          text: "Your app receives 5,000 messages/second that need to be processed by 50 consumers in parallel. Which service fits and why?",
          options: [
            "SNS, because it fans out to many subscribers",
            "SQS, because standard queues scale horizontally and each message is handled by one consumer",
            "Kinesis Data Streams, because it retains data for 24 hours",
            "EventBridge, because it is push-based",
          ],
          correct: [1],
          explanation:
            "SQS decouples producers from 50 consumers; with a standard queue, each message is delivered to exactly one consumer, and you scale by adding consumers up to the queue's limits. SNS is the fan-out half of the pair, and the common pattern is SNS -> SQS per consumer for pub/sub plus buffering.",
          difficulty: "MEDIUM",
          tags: ["sqs", "sns", "architecture"],
        },
        {
          text: "What happens to messages in a standard SQS queue that a consumer reads but fails to delete within the visibility timeout?",
          options: [
            "They are lost permanently",
            "They become visible again and may be delivered to another consumer",
            "They move to a dead-letter queue automatically",
            "The queue is put on hold",
          ],
          correct: [1],
          explanation:
            "After the visibility timeout the message reappears, which is at-least-once delivery and the reason handlers must be idempotent. A FIFO queue's deduplication window applies here, not a true exactly-once guarantee. Configure a redrive policy to send repeated failures to a DLQ.",
          difficulty: "MEDIUM",
          tags: ["sqs", "reliability", "interview"],
        },
        {
          text: "What triggers an ElastiCache for Redis node failover?",
          options: [
            "Manual failover request only",
            "A node losing its primary shard, or an automatic failover when the replica detects the primary is unreachable for a period",
            "Scheduled maintenance windows",
            "Memory pressure on the node",
          ],
          correct: [1],
          explanation:
            "Automatic failover promotes a replica when the primary fails its status checks, so high availability comes from having replicas across AZs in the same shard. ElastiCache handles the promotion; your application must still handle brief connection errors and ideally use a cluster-aware client with a connection string.",
          difficulty: "MEDIUM",
          tags: ["elasticache", "redis", "ha"],
        },
        {
          text: "Which AWS service should you choose for real-time analytics over billions of events with sub-second latency and no capacity planning?",
          options: ["Amazon RDS", "Amazon Athena", "Amazon OpenSearch Service", "Amazon ElastiCache"],
          correct: [2],
          explanation:
            "OpenSearch Service gives a managed search and analytics engine with sub-second responses over streaming and batch data, scaling nodes automatically. Athena is the cheap serverless option for ad-hoc SQL over data lakes, but it is not a real-time store, and it is poor for high-QPS dashboards.",
          difficulty: "MEDIUM",
          tags: ["opensearch", "analytics"],
        },
        {
          text: "Kinesis Data Streams vs Amazon MSK (Kafka). Which pairing is correct?",
          options: [
            "Kinesis is a fully managed Kafka-compatible broker; MSK requires self-managed brokers",
            "Kinesis is a managed stream service with fixed shard-based throughput; MSK is managed Apache Kafka you operate and scale yourself",
            "Kinesis is for batch data; MSK is for streaming",
            "Both are managed Kafka offerings with identical APIs",
          ],
          correct: [1],
          explanation:
            "Kinesis abstracts away brokers: you get shards with fixed per-shard throughput and on-demand or provisioned scaling, but no consumer groups and a 7-day default retention. MSK is managed Kafka with your own topics, partitions and consumer groups, giving much larger scale and longer retention, at the cost of operating it.",
          difficulty: "MEDIUM",
          tags: ["kinesis", "msk", "kafka", "architecture"],
        },
        {
          text: "An RDS instance is showing high DatabaseConnections and your application is throwing 'too many connections'. Which is the best first mitigation?",
          options: [
            "Increase max_connections on the instance",
            "Put RDS Proxy in front to reuse and pool connections, and cap connections per application instance",
            "Switch to a larger instance class",
            "Enable Multi-AZ",
          ],
          correct: [1],
          explanation:
            "RDS Proxy multiplexes many application connections onto a smaller pool of database connections, which also fails over faster. Raising max_connections makes the failure worse because each connection consumes memory. A larger class helps somewhat, but pooling is the actual fix.",
          difficulty: "MEDIUM",
          tags: ["rds", "rds-proxy", "troubleshooting", "interview"],
        },
      ],
    },
  ],
};
