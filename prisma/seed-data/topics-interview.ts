import type { SeedTopic } from "./types";

export const interview: SeedTopic = {
  name: "Interview Prep",
  slug: "interview-prep",
  icon: "MessagesSquare",
  description:
    "Behavioural frameworks, system design framing and the follow-up questions product companies ask. Practice the story, not just the answer.",
  quizzes: [
    {
      title: "Behavioural and Situational Questions",
      slug: "interview-behavioural",
      description:
        "Frameworks for telling your story, and the situations DevOps engineers are most often asked about.",
      difficulty: "MEDIUM",
      isPremium: false,
      tags: ["interview", "behavioural", "star"],
      questions: [
        {
          text: "You are asked to describe a production incident you handled. Which structure is most effective?",
          options: [
            "STAR: Situation, Task, Action, Result, with emphasis on your specific actions and the measurable result",
            "Chronological: list everything that happened in order",
            "Technical only: describe the root cause and the fix in depth",
            "Blame-focused: describe what the other team did wrong",
          ],
          correct: [0],
          explanation:
            "STAR gives the interviewer a predictable structure so they can follow the decision points. Spend the most time on Action, because that is what they are assessing, and end with a quantified Result plus what you changed afterwards. Chronological recounts bury the decision points, and a technical-only answer leaves them unable to judge how you operate with others under pressure.",
          difficulty: "EASY",
          tags: ["behavioural", "star", "interview"],
        },
        {
          text: "What makes a strong answer to 'tell me about a time you disagreed with a decision'?",
          options: [
            "You raised the concern with evidence, respected the decision if it went against you, and committed to helping measure the outcome",
            "You disagreed, were overruled, and quietly did things your own way",
            "You avoided raising it until after the decision shipped",
            "You escalated to your manager immediately",
          ],
          correct: [0],
          explanation:
            "Interviewers are testing whether you raise concerns with evidence and can commit once a decision is made. Quietly doing it your own way is far worse than disagreeing, and escalating immediately looks political. The follow-up they are listening for is what you did after: did you help measure the outcome, or keep complaining?",
          difficulty: "MEDIUM",
          tags: ["behavioural", "interview"],
        },
        {
          text: "In a system design round, how should you open?",
          options: [
            "Clarify requirements, scale, constraints and success criteria before proposing any architecture",
            "Propose your preferred architecture immediately to show expertise",
            "Start with the database choice since it is the hardest decision",
            "Ask what technology the company uses and design with that",
          ],
          correct: [0],
          explanation:
            "Requirements and constraints drive every later choice, and asking them signals that you can size a system rather than guess. In an interview, say your assumptions out loud so the interviewer can correct you early. Jumping to an architecture means you may build the wrong system convincingly.",
          difficulty: "MEDIUM",
          tags: ["system-design", "interview"],
        },
        {
          text: "What is a good answer to 'where do you see yourself in three years'?",
          options: [
            "A specific direction tied to the role, such as owning reliability for a service or platform area, without demanding a title",
            "A specific job title you will have achieved",
            "That you want to manage people",
            "That you are unsure and open to anything",
          ],
          correct: [0],
          explanation:
            "Answering with a direction that builds on the role reads as committed and coachable, whereas demanding a title or declaring management ambition can narrow you unnecessarily. 'Unsure and open' suggests no drive. The interviewer wants to see that your next step is contiguous with what they offer, so tie it to their team's actual problems.",
          difficulty: "MEDIUM",
          tags: ["behavioural", "interview"],
        },
        {
          text: "Which question signals real interest in a DevOps role and tends to land well at the end of an interview?",
          options: [
            "How does the team handle a deployment when the on-call engineer is already engaged in an incident?",
            "What is the tech stack?",
            "How many people are on the team?",
            "When is the next interview round?",
          ],
          correct: [0],
          explanation:
            "This question is specific, shows you already understand that reliability work overlaps with incident response, and invites a real answer about process and tooling. The stack question can get you a list; the on-call question gets you the team's operating philosophy, which is what you are actually deciding on.",
          difficulty: "EASY",
          tags: ["behavioural", "interview"],
        },
      ],
    },
    {
      title: "Career Transition and Technical Deep-Dives",
      slug: "interview-career-and-deep-dives",
      description:
        "Moving into DevOps, handling the 'explain this deeply' follow-ups, and questions about your own gaps.",
      difficulty: "MEDIUM",
      isPremium: true,
      tags: ["interview", "transition", "deep-dive"],
      questions: [
        {
          text: "You are a developer moving into DevOps. What is the most credible first step to demonstrate capability?",
          options: [
            "Own one production service end to end, including its pipeline, monitoring, alerts and on-call, and document the outcomes",
            "Collect every cloud certification available",
            "Contribute to open source infrastructure tooling",
            "Complete a Kubernetes administrator course",
          ],
          correct: [0],
          explanation:
            "Interviewers want evidence you have run systems, not studied them. Owning one service with real on-call responsibility and documented reliability numbers is a far stronger signal than certifications, which prove attendance. Open-source contributions are also strong but slower; certifications are cheap signals that experienced interviewers discount.",
          difficulty: "MEDIUM",
          tags: ["transition", "interview"],
        },
        {
          text: "An interviewer says 'you said you know Kubernetes, explain how a pod gets an IP address'. What are they testing?",
          options: [
            "Depth of understanding, so answer with the CNI mechanism and be honest about what you know hands-on versus from documentation",
            "Whether you can recite the documentation",
            "Whether you have memorised source code",
            "Your certification number",
          ],
          correct: [0],
          explanation:
            "This is the classic follow-up that separates people who have used Kubernetes from people who have read about it. Walk through it honestly: the kubelet asks the CNI plugin, the plugin allocates from the network (in EKS the AWS VPC CNI attaches an ENI), the result is assigned to the pod's network namespace, and kube-proxy programs routing so Service and Pod CIDRs work. Saying 'I have operated this rather than written it' is a strength, not a weakness, as long as you know the mechanism.",
          difficulty: "MEDIUM",
          tags: ["deep-dive", "kubernetes", "interview"],
        },
        {
          text: "How should you answer about a gap in your experience, such as having never run a multi-region failover?",
          options: [
            "State the gap, describe the closest adjacent experience, and outline how you would approach it, being clear it is theoretical",
            "Avoid the question and highlight a different strength",
            "Claim you have done it but describe it vaguely",
            "Say you would need training and stop there",
          ],
          correct: [0],
          explanation:
            "Honesty plus a clear approach beats either a dodge or an overclaim. Interviewers assess judgement, and showing you can reason about a problem you have not solved is a good signal. Overclaiming is the worst option: it is easy to probe and expensive when discovered. Vagueness to avoid the question reads as evasive.",
          difficulty: "MEDIUM",
          tags: ["behavioural", "deep-dive", "interview"],
        },
        {
          text: "Why do interviewers ask about a time something broke that you caused?",
          options: [
            "To assess how you respond to failure, whether you surface it early, communicate it, and fix the class of problem rather than the instance",
            "to catch candidates with poor judgement",
            "because incidents are common and they need someone to blame internally",
            "to see if you can hide a mistake",
          ],
          correct: [0],
          explanation:
            "Everyone causes incidents; what distinguishes senior engineers is the response. A good answer shows you noticed quickly, told stakeholders before they noticed, fixed the immediate problem, then made the class of failure less likely through a review, alert, or test. What they listen for is 'we' rather than 'they' and a systemic fix, not a heroics story.",
          difficulty: "MEDIUM",
          tags: ["behavioural", "incident", "interview"],
        },
      ],
    },
  ],
};
