import type { SeedTopic } from "./types";

export const linux: SeedTopic = {
  name: "Linux",
  slug: "linux",
  icon: "Terminal",
  description:
    "The operating system underneath everything in DevOps. Permissions, processes, filesystems, networking and the commands you reach for at 2am.",
  quizzes: [
    {
      title: "Linux Fundamentals: Permissions, Processes and Signals",
      slug: "linux-fundamentals",
      description:
        "The core mental model: how the kernel treats processes, what permission bits mean, and how to read process state without guessing.",
      difficulty: "EASY",
      isPremium: false,
      tags: ["fundamentals", "permissions", "processes"],
      questions: [
        {
          text: "A file has permissions -rwxr-xr-- and is owned by user app, group devops. Who can read it?",
          options: [
            "Only the owner and the devops group",
            "Only the owner",
            "Owner, devops group, and everyone else",
            "Everyone on the system",
          ],
          correct: [0],
          explanation:
            "Read the the three triplets in order: owner rwx, group r-x, other r--. So the owner has read, write and execute; the devops group has read and execute; everyone else has read only. A common mistake is to read the triplets as three separate permissions rather than three sets of permissions.",
          difficulty: "EASY",
          tags: ["permissions", "fundamentals"],
        },
        {
          text: "What does the setgid bit on a directory do?",
          options: [
            "Makes new files inherit the directory's group owner",
            "Makes new files inherit the directory's permissions",
            "Prevents deletion by the owner",
            "Allows the owner to give away the file",
          ],
          correct: [0],
          explanation:
            "setgid on a directory (chmod g+s dir) makes new files and subdirectories inherit the directory's group rather than the creator's primary group. That is how shared project directories work so a team can all edit files. On a regular file, setgid instead makes it executable as the file's group owner, which is what /usr/bin/sudo uses.",
          difficulty: "MEDIUM",
          tags: ["permissions", "shared-directories"],
        },
        {
          text: "Which signal cannot be caught or ignored by a process?",
          options: ["SIGTERM", "SIGINT", "SIGKILL", "SIGHUP"],
          correct: [2],
          explanation:
            "SIGKILL and SIGSTOP are the only two the kernel does not allow a process to intercept. SIGKILL is used when you must guarantee termination, for example with kill -9, but it gives the process no chance to clean up, so prefer SIGTERM first and only escalate. SIGHUP is the terminal hangup that daemons traditionally use to reload config.",
          difficulty: "MEDIUM",
          tags: ["processes", "signals"],
        },
        {
          text: "What does a process state of D mean in `ps` output?",
          options: [
            "The process is being debugged",
            "The process is sleeping in an interruptible wait",
            "The process is in uninterruptible disk sleep, waiting on I/O",
            "The process has been stopped by a debugger",
          ],
          correct: [2],
          explanation:
            "D is uninterruptible sleep, usually waiting on storage or NFS. It cannot be killed until the I/O completes, which is why processes stuck in D survive kill -9. A flood of D-state processes pointing at an unresponsive NFS mount is a classic cause of a totally wedged host.",
          difficulty: "HARD",
          tags: ["processes", "troubleshooting", "nfs"],
        },
        {
          text: "What is the difference between `kill 1234` and `kill -9 1234`?",
          options: [
            "No difference; both send SIGTERM",
            "kill sends SIGTERM, allowing graceful cleanup; kill -9 sends SIGKILL, which cannot be caught",
            "kill -9 waits nine seconds before sending SIGKILL",
            "kill only works on process groups",
          ],
          correct: [1],
          explanation:
            "Plain kill sends SIGTERM (15), which a well-written service handles by draining connections and flushing state before exiting. kill -9 sends SIGKILL (9), which the kernel enforces immediately, leaving temp files and half-written state behind. In init systems, `systemctl stop` sends SIGTERM by default and escalates to SIGKILL only after TimeoutStopSec.",
          difficulty: "EASY",
          tags: ["processes", "signals", "fundamentals"],
        },
        {
          text: "What does the `tty` field `?` in ps output mean?",
          options: [
            "The process is a zombie",
            "The process has no controlling terminal",
            "The process is in a different session",
            "The process is a system daemon",
          ],
          correct: [1],
          explanation:
            "A `?` in the TTY column means the process has no controlling terminal, which is typical of daemons and kernel threads. A system daemon would still show `?` or `*` depending on flags. This is a quick way to spot user-initiated processes among a list of services.",
          difficulty: "MEDIUM",
          tags: ["processes", "ps"],
        },
        {
          text: "Which command shows the environment variables of a running process?",
          options: [
            "ps e -p <pid>",
            "env <pid>",
            "printenv <pid>",
            "cat /proc/<pid>/environ",
          ],
          correct: [0],
          explanation:
            "`ps e -p <pid>` (or `ps auxeww | grep <pid>`) appends the environment to each process line. `env` and `printenv` take variable names, not PIDs. Note that `/proc/<pid>/environ` shows the initial environment, which will not reflect anything the process changed later with putenv or that a wrapper injected.",
          difficulty: "MEDIUM",
          tags: ["processes", "debugging"],
        },
        {
          text: "Where do per-user customisations and startup scripts live, and what is the difference from /etc?",
          options: [
            "$HOME holds per-user files; /etc holds system-wide configuration",
            "$HOME holds system-wide files; /etc holds per-user files",
            "Both hold identical scopes",
            "$HOME is read-only and /etc is writable by all",
          ],
          correct: [0],
          explanation:
            "/etc is system-wide configuration owned by root, while $HOME contains dotfiles and per-user scripts such as ~/.bashrc and ~/.ssh/config. A rule of thumb: anything that should apply to every user on the host belongs in /etc, anything specific to one account belongs in $HOME.",
          difficulty: "EASY",
          tags: ["filesystem", "fundamentals"],
        },
      ],
    },
    {
      title: "Debugging and Troubleshooting on the Shell",
      slug: "linux-troubleshooting",
      description:
        "The actual command-line workflow for diagnosing disk, memory, network and service problems under time pressure.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["troubleshooting", "debugging", "networking", "disk"],
      questions: [
        {
          text: "A filesystem reports 'No space left on device' but `df -h` shows plenty of free space. What should you check next?",
          options: [
            "df -i to check inode exhaustion",
            "The root filesystem size",
            "Reboot the server",
            "mount -o remount,rw /",
          ],
          correct: [0],
          explanation:
            "`df -h` measures data blocks but not inodes. A directory holding hundreds of thousands of tiny files exhausts inodes long before blocks are used, and df shows free space. `df -i` reveals 0% inode use. The fix is to find and remove the small-file culprit, often a runaway session or cache directory.",
          difficulty: "MEDIUM",
          tags: ["disk", "troubleshooting"],
        },
        {
          text: "Which command shows which process is holding a TCP port open?",
          options: [
            "ss -tlnp",
            "ps aux",
            "top -u nobody",
            "free -h",
          ],
          correct: [0],
          explanation:
            "`ss -tlnp` lists listening TCP sockets with the process name and PID (`-p` needs root for other users' processes). `lsof -i :8080` is the classic equivalent. `netstat -tlnp` works on older images where `ss` is missing from a minimal container.",
          difficulty: "EASY",
          tags: ["networking", "ports", "troubleshooting"],
        },
        {
          text: "Your service is slow. Which command best shows per-CPU core utilisation to detect single-threaded bottlenecks?",
          options: [
            "top -H -p <pid>, then look at the thread-level CPU lines",
            "uptime",
            "vmstat",
            "ls -l /proc",
          ],
          correct: [0],
          explanation:
            "`top` with `-H` (or `-H -p <pid>`) shows a line per thread, which is how you tell 'CPU is pegged' from 'CPU is fine but one thread is busy'. If a single thread is at 100% while others idle, you have a single-threaded bottleneck. `vmstat` shows block I/O and context switches, useful for a different class of problem.",
          difficulty: "MEDIUM",
          tags: ["cpu", "performance", "troubleshooting"],
        },
        {
          text: "A server's free memory is near zero. Should you be concerned?",
          options: [
            "No, Linux uses free memory for page cache; what matters is available memory and swap activity",
            "Yes, the system will crash",
            "Yes, you should run a memory leak detector immediately",
            "No, because Linux does not use RAM for caching",
          ],
          correct: [0],
          explanation:
            "Linux deliberately fills unused RAM with page cache and reclaims it under pressure, so low 'free' with healthy 'buff/cache' and high 'available' is normal and good. The signals that actually matter are `available` dropping, swap being used, and si/so in vmstat showing active swapping. In containers, watch the cgroup limit rather than the host.",
          difficulty: "MEDIUM",
          tags: ["memory", "performance", "interview"],
        },
        {
          text: "What does `curl -v https://example.com` show that a plain `curl https://example.com` does not?",
          options: [
            "The response body",
            "The full request/response headers and TLS handshake details for debugging",
            "Only the status code",
            "The resolved IP addresses in reverse",
          ],
          correct: [1],
          explanation:
            "`-v` adds verbose output: the request line, all headers, the TLS certificate chain and handshake, and timing per phase. That's exactly what you need when diagnosing certificate errors or redirect loops. `-I` fetches headers only, which is faster when you just need status codes.",
          difficulty: "EASY",
          tags: ["networking", "tls", "troubleshooting"],
        },
        {
          text: "How do you find which files under a directory are consuming the most space?",
          options: [
            "du -h --max-depth=1 /path | sort -h",
            "ls -lh /path",
            "df -h /path",
            "find /path -type l",
          ],
          correct: [0],
          explanation:
            "`du` sums disk usage per directory and `sort -h` orders it human-readably, so the last line is the biggest consumer. `--max-depth=1` limits it to immediate children. Use `du -shx` to avoid crossing mount points (important for / and for network mounts) and `du -sh *` when hunting the largest individual files.",
          difficulty: "EASY",
          tags: ["disk", "troubleshooting"],
        },
        {
          text: "A systemd service keeps entering 'failed' state and you see 'status=203/EXEC'. What does that mean?",
          options: [
            "The unit file is malformed",
            "The ExecStart command could not be executed, usually a bad path, missing execute permission, or wrong interpreter",
            "The service ran but exited non-zero",
            "The service has unmet dependencies",
          ],
          correct: [1],
          explanation:
            "203/EXEC specifically means systemd could not execute the binary named in ExecStart. Typical causes: a wrong absolute path, CRLF line endings from a file edited on Windows, a missing `#!/usr/bin/env bash` shebang, or a mount with noexec. `systemctl status <unit>` plus `journalctl -u <unit> -e` gives the precise message.",
          difficulty: "HARD",
          tags: ["systemd", "troubleshooting"],
        },
        {
          text: "What is the difference between `kill` and `pkill` and `killall`?",
          options: [
            "kill targets by PID; pkill by process name pattern; killall by exact process name",
            "They are aliases for the same command",
            "kill targets users, pkill targets groups, killall targets PIDs",
            "killall is deprecated and does nothing",
          ],
          correct: [0],
          explanation:
            "`kill` needs a PID. `pkill` takes a pattern matched against the process name (so `pkill -f pattern` matches the full command line, which is what you usually want). `killall` matches exact names and refuses to act if the name is ambiguous, which is safer for common names like `node`.",
          difficulty: "MEDIUM",
          tags: ["processes", "fundamentals"],
        },
        {
          text: "You need to see live HTTP headers while a request is in flight. Which flag on tcpdump shows ASCII payload?",
          options: ["tcpdump -A", "tcpdump -X", "tcpdump -v", "tcpdump -nn -c 100"],
          correct: [0],
          explanation:
            "`-A` prints the payload as ASCII, so HTTP headers are readable in the capture. `-X` shows both hex and ASCII, useful when you suspect binary content. Always add `-nn` to avoid reverse-DNS and port-name lookups that slow the capture and clutter output, and `-i any` to capture across all interfaces.",
          difficulty: "MEDIUM",
          tags: ["networking", "troubleshooting"],
        },
        {
          text: "How do you follow which files a process opens, live?",
          options: [
            "lsof -p <pid>",
            "strace -p <pid> -e trace=openat",
            "ps -ef",
            "top -p <pid>",
          ],
          correct: [0],
          explanation:
            "`lsof -p <pid>` lists open file descriptors, including regular files, sockets and the current working directory, which is often the fastest way to spot a process writing somewhere unexpected. `strace -p <pid>` attaches a syscall tracer and shows exactly which paths it tries to open, which pinpoints the cause when lsof only shows the symptom.",
          difficulty: "MEDIUM",
          tags: ["troubleshooting", "files", "debugging"],
        },
      ],
    },
  ],
};
