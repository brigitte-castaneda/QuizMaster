export enum GameState {
  SETUP = 'SETUP',
  LOBBY = 'LOBBY',
  PRE_QUESTION = 'PRE_QUESTION', // Added pre-question setup
  QUESTION_ACTIVE = 'QUESTION_ACTIVE',
  QUESTION_REVIEW = 'QUESTION_REVIEW', // Stats shown
  LEADERBOARD = 'LEADERBOARD',
  FINAL_RESULTS = 'FINAL_RESULTS'
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string; // Explanation of why this option is right or wrong
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  timeLimit: number; // Seconds
}

export interface Player {
  id: string;
  name: string;
  email?: string; // Added email field
  score: number;
  streak: number;
  lastAnswerTime?: number; // ms
  isBot?: boolean;
}

export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  optionId: string;
  timeTaken: number; // Seconds elapsed when answered
  pointsAwarded: number;
}

export interface QuizData {
  topic: string;
  questions: Question[];
}