import type { SeedTopic } from "./types";

export const docker: SeedTopic = {
  name: "Docker",
  slug: "docker",
  icon: "Box",
  description:
    "Images, containers, networking and build pipelines. How the overlay filesystem works and why your 1.2GB base image is costing you deploy speed.",
  quizzes: [
    {
      title: "Images, Layers and the Union Filesystem",
      slug: "docker-images-layers",
      description:
        "How images are stored and shared, why size explodes, and the commands that reveal what is actually in your image.",
      difficulty: "EASY",
      isPremium: false,
      tags: ["images", "layers", "dockerfile"],
      questions: [
        {
          text: "How does Docker's union filesystem keep image layers small when a container modifies a file?",
          options: [
            "Each layer is a full snapshot; the writable layer stores copy-on-write diffs on top",
            "The container layer merges changes back into the image layer",
            "Modified files are stored in memory only",
            "Layers are deduplicated at runtime by content hash",
          ],
          correct: [0],
          explanation:
            "The writable container layer is an overlay: writes go to a new layer and lower layers stay untouched, which is why deleting a large file in a RUN step does not shrink the image. Layers are shared between images and cached between builds by cache key, which is why instruction order in a Dockerfile determines build speed.",
          difficulty: "MEDIUM",
          tags: ["layers", "images", "fundamentals"],
        },
        {
          text: "Why does `RUN rm -rf /var/lib/apt/lists/*` followed by `apt-get install` in the same later layer not reduce final image size?",
          options: [
            "rm deletes the files but the earlier layer still contains them, and image size counts all layers",
            "rm does not work inside images",
            "apt-get automatically cleans its cache",
            "The image is rebuilt without the rm layer",
          ],
          correct: [0],
          explanation:
            "Each RUN creates a new layer and never shrinks previous ones. Apt lists downloaded in layer N remain in the final image even if deleted in layer N+1, because the filesystem is a union of layers. Fix by combining install and cleanup into one RUN with `&&`.",
          difficulty: "MEDIUM",
          tags: ["dockerfile", "image-size", "layers"],
        },
        {
          text: "What does a multi-stage Dockerfile build let you do?",
          options: [
            "Build in a fat builder image, then copy only artefacts into a small runtime image",
            "Run the same container in multiple architectures",
            "Run multiple containers from one image",
            "Cache dependencies across separate repositories",
          ],
          correct: [0],
          explanation:
            "Multi-stage builds keep compilers, package managers and dev dependencies in a throwaway stage, so the final image carries only the built artefact. A Go or Node build image can shrink from over a gigabyte to tens of megabytes, which directly reduces pull time and registry cost.",
          difficulty: "EASY",
          tags: ["dockerfile", "image-size", "best-practices"],
        },
        {
          text: "What does the difference between ENTRYPOINT and CMD mean when both are set?",
          options: [
            "ENTRYPOINT is fixed and CMD provides default arguments that can be overridden at run time",
            "ENTRYPOINT overrides CMD entirely and CMD is ignored",
            "CMD runs before ENTRYPOINT",
            "They are aliases for the same instruction",
          ],
          correct: [0],
          explanation:
            "The final process is ENTRYPOINT followed by CMD. With `ENTRYPOINT [\"python\"]` and `CMD [\"app.py\"]`, running the image with an argument replaces CMD and executes `python <arg>`. A shell-form ENTRYPOINT runs via `/bin/sh -c`, which turns your process into a shell and breaks signal handling, so use the exec form.",
          difficulty: "MEDIUM",
          tags: ["dockerfile", "fundamentals", "interview"],
        },
        {
          text: "Why does a container need a command like `nginx -g 'daemon off;'` instead of just `nginx`?",
          options: [
            "Because the foreground process must be PID 1 in the container",
            "Because nginx requires root to start",
            "Because nginx cannot bind to port 80 without that flag",
            "Because the flag enables IPv6 in nginx",
          ],
          correct: [0],
          explanation:
            "The container lives as long as PID 1 runs. The `-g 'daemon off;'` option stops nginx from forking into the background, keeping it as the foreground process so Docker can track and signal it. Running a daemon without it makes the container exit immediately.",
          difficulty: "MEDIUM",
          tags: ["dockerfile", "processes", "interview"],
        },
      ],
    },
    {
      title: "Runtime Networking and Storage",
      slug: "docker-runtime-networking",
      description:
        "Container network modes, DNS, volumes versus binds, and how isolation actually works.",
      difficulty: "MEDIUM",
      isPremium: true,
      tags: ["networking", "volumes", "runtime"],
      questions: [
        {
          text: "Which docker network modes give a container its own network namespace that can publish ports to the host?",
          options: ["none, bridge, host", "bridge, host, none", "host, none, container", "none, host"],
          correct: [0],
          explanation:
            "The four modes are none (only a loopback interface, for security-sensitive jobs), bridge (the default, with NAT to the host and port publishing), host (shares the host network namespace, so no port publishing needed) and container:<name|id> to share another container's namespace, which is how you run a sidecar such as a syslog collector.",
          difficulty: "MEDIUM",
          tags: ["networking", "fundamentals", "interview"],
        },
        {
          text: "How do containers on the default bridge network resolve each other by name?",
          options: [
            "The legacy default bridge does not provide automatic DNS; you must create a user-defined bridge",
            "Docker's embedded DNS resolves names on any bridge",
            "Names resolve only via /etc/hosts inside each container",
            "The host's DNS resolves container names via TXT records",
          ],
          correct: [0],
          explanation:
            "Automatic service discovery by container name works on user-defined bridge networks (and on Compose's default network), where Docker runs an embedded DNS server. The legacy default bridge lacks that, which is why `--link` existed and why the advice is always to create a named network. Compose sidesteps the issue by creating one for you.",
          difficulty: "HARD",
          tags: ["networking", "dns", "interview"],
        },
        {
          text: "What is the key difference between a named volume and a bind mount?",
          options: [
            "A named volume is managed by Docker and is the right choice for data that must survive container replacement; a bind mount maps a host path and is better for source code and config",
            "Bind mounts require root; volumes do not",
            "Named volumes cannot be shared between containers",
            "Bind mounts are only supported on Linux",
          ],
          correct: [0],
          explanation:
            "Named volumes are created and owned by Docker and survive container deletion, which makes them right for database and stateful data. Bind mounts mount an arbitrary host path, ideal for live-reloading source code or injecting config and certificates, and can be risky because the container can write to the host filesystem. Bind mounts do work on Windows and macOS via Docker Desktop.",
          difficulty: "EASY",
          tags: ["volumes", "storage", "fundamentals"],
        },
        {
          text: "A container needs to talk to a database on the host. How do you reach it from inside the container on Linux?",
          options: [
            "host.docker.internal, which is available on Docker Desktop and, on Linux, needs the --add-host=host.docker.internal:host-gateway flag",
            "127.0.0.1, which resolves to the host from inside a container",
            "The host's private IP on the same subnet as the container",
            "The bridge gateway address is always correct",
          ],
          correct: [0],
          explanation:
            "127.0.0.1 inside a container is the container itself, not the host, so it never reaches a host-bound database. On Docker Desktop, host.docker.internal is provided automatically; on Linux you add `--add-host=host.docker.internal:host-gateway`, or publish the DB port and use the host IP. Both, plus the firewall and bind address of the database, must line up.",
          difficulty: "MEDIUM",
          tags: ["networking", "troubleshooting", "interview"],
        },
        {
          text: "What does the Docker HEALTHCHECK instruction do and why does it matter in production?",
          options: [
            "Runs a command periodically inside the container to report healthy or unhealthy; orchestrators can then stop sending traffic and restart",
            "Checks that the image layers are not corrupted",
            "Verifies the registry signature of the image",
            "Scans the container for vulnerabilities",
          ],
          correct: [0],
          explanation:
            "A HEALTHCHECK runs in the container and writes 0 for healthy or 1 for unhealthy. Docker itself barely acts on it, but orchestrators do: ECS marks the task unhealthy and can replace it, Swarm restarts the task, and Kubernetes translates it into readiness and liveness probes. Without one, a container can be running but completely broken and nothing will notice.",
          difficulty: "MEDIUM",
          tags: ["healthcheck", "reliability", "interview"],
        },
        {
          text: "Why does an application get SIGKILL'd and exit 137 when running in a container, even though the host has free memory?",
          options: [
            "The container hit its cgroup memory limit, and the OOM killer terminated the process",
            "The host ran out of memory",
            "Docker's storage driver ran out of disk",
            "The process exceeded its CPU share",
          ],
          correct: [0],
          explanation:
            "Containers are bounded by cgroup limits, which are independent of host capacity. If you did not set `--memory`, the cgroup limit inherits whatever the parent cgroup allows, and a process can be OOM-killed with the host showing plenty free. Check `docker stats` for the container's memory usage against its limit, and set the limit explicitly.",
          difficulty: "MEDIUM",
          tags: ["memory", "oom", "troubleshooting"],
        },
        {
          text: "What does `docker system prune` remove, and what should you think about before running it?",
          options: [
            "Stopped containers, unused networks, build cache and dangling images; it will not remove volumes without --volumes, but plan for slow rebuilds",
            "All images including those in use",
            "Only build cache",
            "Everything except running containers, including volumes",
          ],
          correct: [0],
          explanation:
            "`docker system prune` removes stopped containers, unused networks, dangling (untagged) images and build cache. Running with `--volumes` additionally deletes unused volumes, which can destroy real database data. The usual disk-pressure fix is targeted: `docker builder prune` for cache or `docker image prune` rather than the blanket command.",
          difficulty: "EASY",
          tags: ["disk", "operations"],
        },
      ],
    },
  ],
};
