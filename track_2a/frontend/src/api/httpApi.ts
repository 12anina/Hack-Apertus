// Real client: talks to the backend over HTTP (track_2a/docs/api.md).

import type { InterviewApi } from "./InterviewApi";
import { ApiError } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

/** Small fetch wrapper: sends JSON, parses JSON, turns error responses into ApiError. */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(BASE_URL + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Backend not reachable.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    throw new ApiError(error?.code ?? "INVALID_REQUEST", error?.message ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export const httpApi: InterviewApi = {
  getConfig: () => request("/config"),

  createSession: (req) => request("/sessions", { method: "POST", body: JSON.stringify(req) }),

  sendAnswer: (sessionId, questionId, text) =>
    request(`/sessions/${sessionId}/answers`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, text }),
    }),

  getSession: (sessionId) => request(`/sessions/${sessionId}`),

  getReport: (sessionId) => request(`/sessions/${sessionId}/report`),
};
