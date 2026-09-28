import type { SeedTopic } from "./types";

export const networking: SeedTopic = {
  name: "Networking",
  slug: "networking",
  icon: "Network",
  description:
    "DNS, TCP, TLS and the routing between them. CIDR arithmetic, load balancing layers and the packet-level causes of latency.",
  quizzes: [
    {
      title: "DNS, TCP and TLS Fundamentals",
      slug: "networking-dns-tcp-tls",
      description:
        "Name resolution, connection establishment and the handshake, plus how these three interact to produce a slow page.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["dns", "tcp", "tls"],
      questions: [
        {
          text: "In what order does a typical HTTPS request resolve and connect?",
          options: [
            "TCP -> DNS -> TLS -> HTTP",
            "DNS -> TCP -> TLS -> HTTP",
            "TLS -> DNS -> TCP -> HTTP",
            "DNS -> HTTP -> TLS -> TCP",
          ],
          correct: [1],
          explanation:
            "The client resolves the hostname via DNS (unless using HTTP/3 over QUIC, which still needs an address to start), then establishes a TCP connection with a three-way handshake, then negotiates TLS, and only then can it send the HTTP request. Each step is a place to add latency, which is why connection reuse, caching and TLS session resumption matter.",
          difficulty: "EASY",
          tags: ["dns", "tcp", "tls", "fundamentals"],
        },
        {
          text: "What problem does DNS caching solve, and what is the trade-off?",
          options: [
            "It reduces lookup latency at the cost of delay when records change, bounded by the record's TTL",
            "It reduces packet loss at the cost of higher bandwidth",
            "It encrypts queries at the cost of DNS resolution speed",
            "It balances load across servers at the cost of higher memory use",
          ],
          correct: [0],
          explanation:
            "Resolvers, browsers and applications cache answers for the TTL the record publishes. This is why an incident can appear 'not fixed' right after a DNS change: caches still hold the old record. Choose TTLs by how quickly you need a change to propagate: 30s to a few minutes for incident response, longer for stability.",
          difficulty: "EASY",
          tags: ["dns", "performance", "interview"],
        },
        {
          text: "Which DNS record type maps a hostname directly to an IPv4 address?",
          options: ["CNAME", "A", "CNAME", "TXT"],
          correct: [1],
          explanation:
            "An A record maps a name to an IPv4 address; AAAA does the same for IPv6. A CNAME is an alias to another name and cannot coexist with other record types at the same name, which is why you cannot put a CNAME at the apex of a zone. TXT carries arbitrary text and is what SPF, DKIM and domain verification use.",
          difficulty: "EASY",
          tags: ["dns", "fundamentals"],
        },
        {
          text: "What does DNS TTL control in the context of an incident where you need to move traffic quickly?",
          options: [
            "How long resolvers cache the record; a high TTL slows your failover, a low TTL speeds it up at the cost of more DNS queries",
            "The time to live of the DNS server process",
            "How long a TLS certificate is cached",
            "The maximum number of DNS queries per second",
          ],
          correct: [0],
          explanation:
            "TTL is the cache lifetime for a record. Set a low TTL (say 30-60s) before you need to move traffic, and raise it again afterwards to reduce query volume. Note that some resolvers and ISPs ignore short TTLs and cache longer, so failover time is a floor, not a guarantee. Also remember the client-side cache, which is separate.",
          difficulty: "MEDIUM",
          tags: ["dns", "failover", "interview"],
        },
        {
          text: "What is the three-way TCP handshake and why does it add latency?",
          options: [
            "SYN, SYN-ACK, ACK; it requires a full round trip before any data can flow, so adding hops adds real latency",
            "It is only used for UDP connections",
            "It is a TLS concept, not a TCP one",
            "It only happens once per connection, so it never affects performance",
          ],
          correct: [0],
          explanation:
            "The client sends SYN, the server replies SYN-ACK, the client sends ACK, and only then may data flow. That is one full round trip before the first byte of the request. TLS adds at least one more round trip for certificate exchange (two in TLS 1.3 handshake, depending), which is why connection reuse and session resumption are such large wins for latency.",
          difficulty: "MEDIUM",
          tags: ["tcp", "performance", "fundamentals"],
        },
        {
          text: "Why does a TLS handshake verify the server certificate but usually not the client?",
          options: [
            "Because the server proves its identity to the client; mutual TLS adds a client certificate for two-way verification",
            "Because client certificates are not supported by TLS",
            "Because the client has no private key",
            "Because DNS already authenticates the client",
          ],
          correct: [0],
          explanation:
            "Standard TLS is one-way: the server presents a certificate signed by a CA the client trusts, proving it controls the private key for that hostname. Mutual TLS adds a client certificate so the server can authenticate the client too, which is how service meshes and zero-trust networks authenticate workloads. Intermediaries such as corporate proxies use exactly this to inspect traffic.",
          difficulty: "MEDIUM",
          tags: ["tls", "security", "interview"],
        },
      ],
    },
    {
      title: "Subnetting, Routing and Load Balancing",
      slug: "networking-subnetting-routing",
      description:
        "CIDR arithmetic, NAT, routing tables and how layer 4 and layer 7 load balancers differ in behaviour.",
      difficulty: "HARD",
      isPremium: true,
      tags: ["cidr", "routing", "load-balancing", "nat"],
      questions: [
        {
          text: "How many usable host addresses does a /28 IPv4 subnet provide in AWS VPCs?",
          options: ["14", "16", "12", "30"],
          correct: [0],
          explanation:
            "A /28 leaves 4 bits for hosts, giving 16 total addresses. AWS reserves all five of the first and last addresses in a subnet (the network address, the VPC router, the DNS resolver at .2, the future use address and the broadcast address), so 16 minus 5 leaves 11 usable. On a traditional network only two are reserved, giving 14. This asymmetry trips people up in VPC design.",
          difficulty: "MEDIUM",
          tags: ["cidr", "vpc", "interview"],
        },
        {
          text: "What address range covers all subnets in a 10.0.0.0/16 VPC CIDR?",
          options: [
            "10.0.0.0 - 10.0.255.255",
            "10.0.0.0 - 10.255.255.255",
            "10.0.0.1 - 10.0.0.254",
            "10.0.0.0 - 10.0.0.255",
          ],
          correct: [0],
          explanation:
            "A /16 fixes the first 16 bits (10.0) and lets the remaining 16 vary, giving 10.0.0.0 through 10.0.255.255. This matters for security groups and route tables: reference the broad VPC CIDR in peering and gateway routes, but use narrow subnet CIDRs in security groups.",
          difficulty: "MEDIUM",
          tags: ["cidr", "fundamentals", "interview"],
        },
        {
          text: "What is the role of NAT in a VPC, and why do instances in private subnets need one?",
          options: [
            "NAT translates private IPs to a public IP so outbound internet traffic can return; without a NAT gateway, private instances have no internet path",
            "NAT encrypts all traffic leaving the VPC",
            "NAT load-balances traffic between instances",
            "NAT is required for traffic between two peered VPCs",
          ],
          correct: [0],
          explanation:
            "NAT rewrites private source addresses to the NAT gateway's Elastic IP so the internet can reply, and translates back on the way in. Private subnets intentionally have no route to the internet gateway, so outbound calls need a NAT gateway. Inbound needs a public subnet plus Elastic IP, or a load balancer in a public subnet in front of private targets.",
          difficulty: "EASY",
          tags: ["nat", "vpc", "fundamentals"],
        },
        {
          text: "What is the difference between a layer 4 and layer 7 load balancer?",
          options: [
            "L4 forwards by IP and port with minimal parsing; L7 understands HTTP and can route by path, host or header and terminate TLS",
            "L4 is for TCP and L7 is for UDP only",
            "L7 is faster because it does less work",
            "L4 cannot be used with health checks",
          ],
          correct: [0],
          explanation:
            "An L4 balancer (NLB) just moves packets by port, so it preserves the client IP and can handle very high throughput with low latency, but it cannot route by path. An L7 balancer (ALB) parses HTTP, so it can send /api to one target group and / to another, terminate TLS, and enable sticky sessions or WebSocket support, at the cost of more CPU and latency.",
          difficulty: "MEDIUM",
          tags: ["load-balancing", "architecture", "interview"],
        },
        {
          text: "What are MTU and MSS, and how do they relate to a common packet-drop problem?",
          options: [
            "MTU is the largest packet an interface can send; MSS is the largest TCP payload. Encapsulation overhead can push packets past the path MTU, causing fragmentation or black-holing",
            "MTU is the number of concurrent connections; MSS is the timeout",
            "They are interchangeable terms for bandwidth",
            "MTU applies only to UDP traffic",
          ],
          correct: [0],
          explanation:
            "MTU is the maximum frame size the link supports (1500 on Ethernet). MSS is MTU minus IP and TCP headers, so about 1460 for IPv4 and 1440 for IPv6 with extensions. Tunnels and overlays add encapsulation headers; if the resulting packet exceeds the path MTU and the Don't Fragment bit is set, routers drop it silently. That shows up as a connection that works for small requests and hangs on larger ones, and the fix is clamping MSS at the load balancer or lowering the interface MTU.",
          difficulty: "HARD",
          tags: ["mtu", "networking", "troubleshooting", "interview"],
        },
        {
          text: "What is connection tracking (conntrack) and why does exhausting it break services?",
          options: [
            "The kernel tracks connection state; when the table fills, new connections are dropped or fail, often after a port or UDP scan or a traffic spike",
            "It balances new connections across backends",
            "It encrypts established connections",
            "It compresses TCP headers",
          ],
          correct: [0],
          explanation:
            "conntrack holds an entry per flow across the firewall. When the table fills, the kernel either drops new entries or refuses to create them, which presents as random connection failures under load. Raising `net.netfilter.nf_conntrack_max` and the buckets is the direct fix, and it is a classic cause of mysterious intermittent failures on NAT or load-balancer instances.",
          difficulty: "HARD",
          tags: ["conntrack", "troubleshooting", "performance"],
        },
        {
          text: "Why can a BGP route flap between availability zones cause application-level failures even though connectivity looks fine?",
          options: [
            "Because flapping route changes force new TCP connections to reset and shift traffic to unequally loaded or degraded targets",
            "Because BGP is a layer 2 protocol",
            "Because flapping only affects UDP",
            "Because BGP flapping blocks DNS resolution",
          ],
          correct: [0],
          explanation:
            "Route flapping means traffic repeatedly shifts between paths. Every shift can break in-flight TCP connections, remap clients to a cold cache or a cold cache layer, and create uneven load. It is also a common symptom of asymmetric routing, which breaks stateful firewalls and conntrack. Check for asymmetric paths between the client, the load balancer and the backend.",
          difficulty: "HARD",
          tags: ["bgp", "networking", "failover", "interview"],
        },
      ],
    },
  ],
};
