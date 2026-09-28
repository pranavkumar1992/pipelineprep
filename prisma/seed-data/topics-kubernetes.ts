import type { SeedTopic } from "./types";

export const kubernetes: SeedTopic = {
  name: "Kubernetes",
  slug: "kubernetes",
  icon: "Ship",
  description:
    "Scheduling, networking, autoscaling and failure modes. Built around what actually breaks in clusters rather than YAML syntax.",
  quizzes: [
    {
      title: "Pods, Probes and the Pod Lifecycle",
      slug: "k8s-pods-and-probes",
      description:
        "What each pod phase means, how the three probe types differ, and why readiness rather than liveness is usually the right gate.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["pods", "probes", "lifecycle"],
      questions: [
        {
          text: "What does the pod phase Pending indicate?",
          options: [
            "The pod is being deleted",
            "The pod has been accepted by the cluster but one or more containers have not started yet",
            "The container exited with code 0",
            "The pod could not be scheduled due to insufficient memory",
          ],
          correct: [1],
          explanation:
            "Pending means the API server has accepted the pod but containers are not all running yet. That covers unschedulable pods waiting for resources or node selectors, as well as containers still pulling images. If it stays Pending, check `kubectl describe pod` for scheduling events. Running, Succeeded, Failed and Unknown are the other main phases.",
          difficulty: "EASY",
          tags: ["pods", "fundamentals"],
        },
        {
          text: "What is the key difference between a readiness probe and a liveness probe?",
          options: [
            "Readiness controls whether the pod receives traffic; liveness restarts the container when it fails",
            "Readiness restarts the container; liveness removes the pod from the Service",
            "They are configured identically but readiness is checked less often",
            "Readiness applies to Deployments and liveness applies to DaemonSets",
          ],
          correct: [0],
          explanation:
            "A failed readiness probe removes the pod from Service endpoints but leaves the container running, which is what you want for a temporary dependency issue like a database being slow to warm up. A failed liveness probe kills the container, triggering a restart. Wiring liveness to a dependency check is the classic mistake: it turns a downstream outage into a crash loop.",
          difficulty: "MEDIUM",
          tags: ["probes", "troubleshooting", "interview"],
        },
        {
          text: "Which pod phase means the kubelet on the node has lost contact with the control plane and cannot determine the pod state?",
          options: ["Pending", "Terminating", "Unknown", "Evicted"],
          correct: [2],
          explanation:
            "Unknown means the node's kubelet stopped reporting, so the control plane cannot say whether the pod is running. It is almost always a node or network-partition problem, not an application problem. Check the node with `kubectl get nodes` and look for NotReady, then inspect the kubelet on that instance.",
          difficulty: "MEDIUM",
          tags: ["pods", "nodes", "troubleshooting"],
        },
        {
          text: "What causes the CrashLoopBackOff state?",
          options: [
            "A container that keeps exiting and is being restarted with increasing backoff",
            "A pod that is waiting to be scheduled",
            "A container that passed its readiness check then failed",
            "A pod stuck terminating because of a finalizer",
          ],
          correct: [0],
          explanation:
            "CrashLoopBackOff means the container is repeatedly starting and failing, and Kubernetes is backing off between restarts (10s, 20s, 40s, capped at 5 minutes). Get the actual error with `kubectl logs <pod> --previous`, which shows the output from the prior failed instance rather than the currently restarting one.",
          difficulty: "EASY",
          tags: ["troubleshooting", "pods"],
        },
        {
          text: "A pod's container is terminated with exit code 137. What does this usually mean?",
          options: [
            "The container was sent SIGKILL, typically because it exceeded its memory limit",
            "The container failed a startup probe",
            "The container ran successfully",
            "The node ran out of disk space",
          ],
          correct: [0],
          explanation:
            "Exit code 137 is 128 plus signal 9 (SIGKILL). The usual cause is the cgroup OOM-killing the container for exceeding its memory limit, though an external SIGKILL looks identical. Exit 143 is the graceful version (SIGTERM from a normal shutdown). Check `kubectl describe pod` for the reason and `kubectl top pod` against the limit.",
          difficulty: "MEDIUM",
          tags: ["troubleshooting", "memory", "oom"],
        },
        {
          text: "What is the purpose of a startup probe, and when do you need it instead of a slow liveness probe?",
          options: [
            "It gives slow-starting apps time to boot; liveness waits for startup to succeed, then begins normal checks",
            "It checks that the pod has been assigned to a node",
            "It is used only by DaemonSets",
            "It replaces readiness during rolling updates",
          ],
          correct: [0],
          explanation:
            "A startup probe gates the other two: liveness and readiness do not run until it succeeds. Without it, an app that takes 60 seconds to warm up needs a huge `initialDelaySeconds` on liveness, and any hiccup during boot causes a kill loop. The alternative and worse option is setting failureThreshold high enough that slow boot is survivable.",
          difficulty: "MEDIUM",
          tags: ["probes", "performance"],
        },
      ],
    },
    {
      title: "Scheduling, Resources and Autoscaling",
      slug: "k8s-scheduling-autoscaling",
      description:
        "Requests and limits, QoS classes, node and pod eviction, and how the HPA actually computes desired replicas.",
      difficulty: "HARD",
      isPremium: true,
      tags: ["scheduling", "hpa", "resources", "eviction"],
      questions: [
        {
          text: "How does the Kubernetes scheduler use container resource requests when placing a pod?",
          options: [
            "It places the pod on a node with enough allocatable capacity for the sum of the pod's requests",
            "It places the pod on any node, and the kubelet enforces limits at runtime",
            "It fills the node to 100% of limits",
            "It only considers CPU requests for scoring",
          ],
          correct: [0],
          explanation:
            "Scheduling is driven by requests, not limits. Requests reserve capacity so a node is never oversubscribed at the CPU and memory level, while limits are a hard ceiling the kubelet enforces afterwards. This is why setting requests too low causes throttling and eviction storms even though the node looks half empty.",
          difficulty: "MEDIUM",
          tags: ["scheduling", "resources", "interview"],
        },
        {
          text: "What happens to a pod whose container exceeds its memory limit?",
          options: [
            "It is throttled like CPU",
            "The cgroup OOM-killer terminates the container, which restarts under a Deployment",
            "The kubelet increases the pod's limit",
            "The pod is evicted and rescheduled elsewhere",
          ],
          correct: [1],
          explanation:
            "Memory is not compressible, so exceeding the limit means the cgroup OOM killer kills the container, usually with exit code 137. CPU, by contrast, is throttled: the cgroup caps the quota and the container is slowed rather than killed. Pods restart under their controller; a bare Pod with restartPolicy Never would just fail.",
          difficulty: "MEDIUM",
          tags: ["resources", "oom", "interview"],
        },
        {
          text: "Which QoS class does a pod get when every container has requests and limits set for both CPU and memory?",
          options: [
            "Guaranteed",
            "Burstable",
            "BestEffort",
            "Always the default; QoS cannot be set explicitly",
          ],
          correct: [0],
          explanation:
            "Guaranteed requires equal requests and limits for CPU and memory on every container, and every container must set them. Equal requests and limits means the pod is the last to be evicted under node memory pressure. BestEffort is no requests or limits set (evicted first), Burstable is everything in between.",
          difficulty: "MEDIUM",
          tags: ["resources", "qos", "eviction"],
        },
        {
          text: "Why are Pods evicted from a node, and what does it typically indicate?",
          options: [
            "Node memory or disk pressure, so the kubelet evicts the lowest-priority pods; often means requests and limits are misconfigured",
            "An admin pressed delete; the pods reappear on another node",
            "The image pull failed",
            "The Service removed the endpoints",
          ],
          correct: [0],
          explanation:
            "Under memory or disk pressure the kubelet evicts pods by QoS class and priority, BestEffort first. Eviction storms almost always point to overcommitted requests, a leak, or node-level limits being too tight. Set requests based on actual p95 usage, and add a PodDisruptionBudget so voluntary disruptions drain nodes gracefully.",
          difficulty: "HARD",
          tags: ["eviction", "troubleshooting", "resources"],
        },
        {
          text: "How does the Horizontal Pod Autoscaler compute the desired replica count from a CPU utilisation target of 70%?",
          options: [
            "It compares current average CPU utilisation across pods against the target and scales the ratio of desired to current replicas",
            "It adds a fixed number of pods whenever utilisation exceeds 70%",
            "It uses the pod's memory limit rather than CPU usage",
            "It scales based on the node's total CPU allocation",
          ],
          correct: [0],
          explanation:
            "The formula is roughly desiredReplicas = ceil(currentReplicas x currentUtilisation / targetUtilisation), averaged across all pods, and then clamped by the min and max replica counts. Critically, the utilisation is measured against each pod's CPU *request*, so if requests are set wrong the HPA misbehaves. There is also a stabilisation window to prevent flapping.",
          difficulty: "HARD",
          tags: ["hpa", "autoscaling", "interview"],
        },
        {
          text: "What does a VPA in recommendation or auto mode do, and why is using it alongside the HPA risky?",
          options: [
            "VPA adjusts pod resource requests; running both can cause a feedback loop where VPA resizes and HPA thrashes on utilisation",
            "VPA scales the number of replicas and HPA adjusts limits, so they are complementary",
            "VPA only works on node pools and HPA only on Deployments",
            "VPA replaces the need for the HPA entirely and is always preferable",
          ],
          correct: [0],
          explanation:
            "VPA changes requests and limits on pods. Because the HPA computes utilisation as a percentage of requests, a VPA-driven request change immediately changes the HPA's observed percentage, which can cause both to oscillate. Use VPA in Off or Recommendation mode with the HPA, or let VPA own autoscaling on its own metric.",
          difficulty: "HARD",
          tags: ["vpa", "hpa", "autoscaling"],
        },
        {
          text: "A pod is Pending with the event '0/3 nodes are available: insufficient cpu'. Requests are set to 1 CPU on a 3-node cluster with 4 vCPU each. What is happening?",
          options: [
            "The cluster's total capacity is less than the pod's request; nodes already have pods reserving their 4 vCPU via requests",
            "The node has more CPU than the pod requested, so this event is wrong",
            "The image could not be pulled",
            "The pod needs a higher memory limit",
          ],
          correct: [0],
          explanation:
            "Because scheduling uses requests, existing pods have already reserved the nodes' capacity even if their actual usage is low. Three nodes x 4 vCPU = 12 vCPU reserved against a 12 vCPU request budget leaves nothing spare. This is exactly why under-requesting CPU in other workloads causes pending pods that look inexplicable.",
          difficulty: "MEDIUM",
          tags: ["scheduling", "troubleshooting", "resources"],
        },
        {
          text: "What is the effect of a PodDisruptionBudget with minAvailable equal to the replica count on node drains?",
          options: [
            "Drains will block until manually overridden, protecting availability",
            "Nothing; PDBs only affect the scheduler",
            "It forces the scheduler to place all replicas on one node",
            "It disables autoscaling for the workload",
          ],
          correct: [0],
          explanation:
            "A PDB constrains voluntary disruptions such as node drains and cluster upgrades, not involuntary ones like a crash. Setting minAvailable equal to the replica count means no drain can ever complete without an explicit override, which is a strong way to protect latency-critical services while still draining nodes one at a time. PDBs do not apply to the Scheduler or to DaemonSets.",
          difficulty: "HARD",
          tags: ["pdb", "availability", "interview"],
        },
      ],
    },
    {
      title: "Networking, Config and RBAC",
      slug: "k8s-networking-rbac",
      description:
        "How pods get addresses, how Services route, and how RBAC and ConfigMaps actually enforce or expose configuration.",
      difficulty: "MEDIUM",
      isPremium: true,
      tags: ["networking", "cni", "rbac", "configmap", "secrets"],
      questions: [
        {
          text: "What IP does a pod get before it is scheduled, and what does the API report its status as?",
          options: [
            "A real routable IP and status Running",
            "A reserved IP with status Pending until scheduled and the CNI assigns an address",
            "A ClusterIP and status Pending",
            "No IP at all until the container starts",
          ],
          correct: [1],
          explanation:
            "Before scheduling the pod shows status Pending with no IP field set at all. Once scheduled, the node's CNI plugin (EKS uses the AWS VPC CNI, which assigns an ENI) gives it a routable private IP and the status becomes Running. That gap is why pods sit in ContainerCreating while images pull.",
          difficulty: "MEDIUM",
          tags: ["networking", "cni", "fundamentals"],
        },
        {
          text: "Which Service type exposes a pod to the internet through the cloud provider's load balancer?",
          options: [
            "ClusterIP",
            "NodePort",
            "LoadBalancer",
            "Internal LoadBalancer",
          ],
          correct: [2],
          explanation:
            "LoadBalancer provisions an external load balancer (an AWS NLB or ELB) and exposes the Service outside the cluster. NodePort opens a port on every node's IP, which is simpler but bypasses cloud load balancers. ClusterIP is internal only. An Internal LoadBalancer annotation keeps the external load balancer private for internal-facing services.",
          difficulty: "EASY",
          tags: ["services", "networking"],
        },
        {
          text: "What is the fundamental difference between RBAC and admission control (webhooks)?",
          options: [
            "RBAC authorises requests to the API server; admission webhooks can validate and mutate objects being persisted",
            "They are two features of the same subsystem",
            "Admission webhooks only apply to Pods",
            "RBAC controls network traffic while admission controls storage",
          ],
          correct: [0],
          explanation:
            "RBAC answers 'is this identity allowed to perform this API action'. Admission control answers 'should this particular object be accepted or changed', after authorisation succeeds. Use RBAC for identity permissions and admission (OPA Gatekeeper, Kyverno, ValidatingAdmissionWebhook) for policy such as requiring labels or blocking privileged pods.",
          difficulty: "HARD",
          tags: ["rbac", "admission", "security", "interview"],
        },
        {
          text: "Are base64-encoded values in a Kubernetes Secret encrypted at rest by default?",
          options: [
            "Yes, Secrets are encrypted at rest automatically",
            "No, they are only base64-encoded; you must enable encryption at rest or use an external secrets manager",
            "Only in EKS managed clusters",
            "Only for ServiceAccount tokens",
          ],
          correct: [1],
          explanation:
            "A Secret's data is base64-encoded, not encrypted. You need `EncryptionConfiguration` in the API server, or better, integrate with AWS Secrets Manager or the AWS KMS provider for external secret management. Anyone with `get secrets` RBAC can read them, so RBAC scope and audit logging matter as much as at-rest encryption.",
          difficulty: "MEDIUM",
          tags: ["secrets", "security", "interview"],
        },
        {
          text: "What does the kubernetes.io/os and kubernetes.io/arch node label do?",
          options: [
            "Identifies the node's operating system and CPU architecture so the scheduler places compatible pods",
            "Enables multi-arch image pulls from the node",
            "Determines the node's taint tolerance",
            "Marks the node for the container runtime",
          ],
          correct: [0],
          explanation:
            "These well-known labels let nodeAffinity and pod spec requirements express 'linux/amd64' or 'arm64' so the scheduler does not place an arm64 pod on an x86 node. They also drive multi-architecture image selection. Taints are the other half of the puzzle: taint `node.kubernetes.io/os` plus tolerations control which pods are willing to land there.",
          difficulty: "MEDIUM",
          tags: ["scheduling", "nodes", "fundamentals"],
        },
        {
          text: "How does Kubernetes DNS resolve `my-service.my-namespace.svc.cluster.local` for a pod in the same namespace?",
          options: [
            "Through CoreDNS, which is exposed to pods via a Service and configured by kubelet with the cluster DNS address",
            "Directly through the cloud provider's DNS zone",
            "Through the Service's ExternalIP",
            "Through kube-proxy's iptables rules",
          ],
          correct: [0],
          explanation:
            "Kubelet passes the cluster DNS (CoreDNS) address as --cluster-dns to every pod's resolv.conf, and CoreDNS returns the Service's ClusterIP. kube-proxy handles the actual packet forwarding from ClusterIP to pod IPs, not DNS. The short name `my-service` resolves because CoreDNS also serves the search namespace domains from resolv.conf's `search` list.",
          difficulty: "MEDIUM",
          tags: ["dns", "networking", "coredns"],
        },
        {
          text: "Can you modify a ConfigMap that is mounted as a volume in a running pod?",
          options: [
            "Yes, the ConfigMap object updates and the kubelet refreshes the mounted files within about a minute",
            "No, you must recreate the pod",
            "Yes, but only if it is mounted with a ConfigMap key reference",
            "No, ConfigMaps are immutable once created",
          ],
          correct: [0],
          explanation:
            "Projected and ConfigMap volume mounts are eventually consistent: the kubelet syncs updates roughly every minute, and the atomic-writer pattern swaps a symlink so apps see the new content atomically. Filesystem changes propagate but env vars do not: an env value sourced from a ConfigMap is fixed at pod start, so apps must read from the mount or be restarted.",
          difficulty: "HARD",
          tags: ["configmap", "fundamentals", "interview"],
        },
      ],
    },
  ],
};
