import type { CareerFeature } from "@prisma/client";

/**
 * Career Tools copy and feature metadata.
 *
 * Deliberately client-safe: no `server-only` import and no database access, so
 * the teaser card can render this on the client. The feature flag itself lives in
 * `@/lib/settings` and is only read from server components and actions.
 *
 * Teaser and waitlist only. There is no resume upload, no document parsing and
 * no AI integration anywhere in this codebase.
 */

export const CAREER_FEATURES: Array<{
  key: CareerFeature;
  title: string;
  blurb: string;
}> = [
  {
    key: "RESUME_MAKER",
    title: "ATS-Friendly Resume Maker",
    blurb:
      "Clean, parseable templates aimed at DevOps and Cloud roles. Coming soon.",
  },
  {
    key: "JD_MATCH",
    title: "Job Description Match",
    blurb:
      "Paste a job description and see the skill gaps against your profile and quiz performance. Coming soon.",
  },
  {
    key: "AI_REVIEW",
    title: "AI Resume Review",
    blurb:
      "Suggestions on bullet wording and impact. Coming soon.",
  },
];

export const WAITLIST_CONSENT =
  "We'll email you when this launches, and nothing else.";

/**
 * URL slug for each feature, pointing at the reserved placeholder route.
 * Client-safe so the teaser card can build its links.
 */
export const FEATURE_SLUGS: Record<CareerFeature, string> = {
  RESUME_MAKER: "resume",
  JD_MATCH: "jd-match",
  AI_REVIEW: "review",
};
