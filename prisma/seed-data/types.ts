import type { Difficulty } from "@prisma/client";

export type SeedQuestion = {
  text: string;
  options: string[];
  /** Zero-based indexes into `options`. */
  correct: number[];
  explanation: string;
  difficulty: Difficulty;
  tags?: string[];
};

export type SeedQuiz = {
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  isPremium: boolean;
  tags?: string[];
  timeLimitSec?: number | null;
  questions: SeedQuestion[];
};

export type SeedTopic = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  quizzes: SeedQuiz[];
};

export type SeedCodeBlock = {
  language: string;
  code: string;
  caption?: string;
};

export type SeedStep = {
  prompt: string;
  options?: string[];
  correct?: number[];
  reasoning: string;
  code?: SeedCodeBlock[];
};

export type SeedScenario = {
  title: string;
  slug: string;
  summary: string;
  context: string;
  symptoms: string;
  environment: string;
  difficulty: Difficulty;
  isPremium: boolean;
  tags?: string[];
  durationMin: number;
  rootCause: string;
  fix: string;
  prevention: string;
  steps: SeedStep[];
};
