import type { InterviewApi } from "./InterviewApi";
import { httpApi } from "./httpApi";
import { mockApi } from "./mockApi";

// Switch with VITE_USE_MOCK=true in .env
export const api: InterviewApi = import.meta.env.VITE_USE_MOCK === "true" ? mockApi : httpApi;

export * from "./types";
