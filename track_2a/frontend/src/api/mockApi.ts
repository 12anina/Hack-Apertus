// Fake backend that runs in the browser.
// Same behaviour as track_2a/docs/api.md, but with fixed questions and random scores.

import type { InterviewApi } from "./InterviewApi";
import {
  ApiError,
  type AnswerResponse,
  type AppConfig,
  type CreateSessionRequest,
  type HistoryEntry,
  type LanguageCode,
  type Phase,
  type Report,
  type Scores,
  type SessionState,
} from "./types";

const config: AppConfig = {
  languages: [
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "it", label: "Italiano" },
    { code: "gsw", label: "Schwiizerdütsch (Beta)" },
  ],
  occupations: [
    { id: "schreiner_efz", label: { de: "Schreiner/in EFZ", fr: "Menuisier/ère CFC", it: "Falegname/a AFC" } },
    { id: "informatiker_efz", label: { de: "Informatiker/in EFZ", fr: "Informaticien/ne CFC", it: "Informatico/a AFC" } },
    { id: "kv_efz", label: { de: "Kaufmann/-frau EFZ", fr: "Employé/e de commerce CFC", it: "Impiegato/a di commercio AFC" } },
    { id: "fage_efz", label: { de: "Fachmann/-frau Gesundheit EFZ", fr: "Assistant/e en soins et santé communautaire CFC", it: "Operatore/trice sociosanitario/a AFC" } },
  ],
  interviewer_styles: [
    { id: "friendly", label: { de: "Freundlich", fr: "Bienveillant", it: "Cordiale" } },
    { id: "strict", label: { de: "Streng", fr: "Exigeant", it: "Esigente" } },
  ],
  modes: [
    { id: "training", description: "Short feedback after every answer" },
    { id: "rehearsal", description: "Realistic, feedback only at the end" },
  ],
};

// 8 questions per language, in interview order. "{name}" is replaced by the first name.
const script: { phase: Phase; text: Record<LanguageCode, string> }[] = [
  {
    phase: "intro",
    text: {
      de: "Grüezi{name}! Erzähl mir doch zuerst etwas über dich.",
      fr: "Bonjour{name} ! Parle-moi d'abord un peu de toi.",
      it: "Buongiorno{name}! Raccontami prima qualcosa di te.",
      gsw: "Grüezi{name}! Verzell mer doch zersch chli öppis über dich.",
    },
  },
  {
    phase: "motivation",
    text: {
      de: "Wie bist du auf diesen Beruf gekommen?",
      fr: "Comment as-tu découvert ce métier ?",
      it: "Come hai scoperto questa professione?",
      gsw: "Wie bisch du uf dä Bruef cho?",
    },
  },
  {
    phase: "motivation",
    text: {
      de: "Warum möchtest du die Lehre gerade bei uns machen?",
      fr: "Pourquoi veux-tu faire ton apprentissage chez nous ?",
      it: "Perché vuoi fare l'apprendistato proprio da noi?",
      gsw: "Wieso wotsch du d Lehr grad bi üs mache?",
    },
  },
  {
    phase: "strengths_weaknesses",
    text: {
      de: "Was sind deine grössten Stärken?",
      fr: "Quels sont tes plus grands points forts ?",
      it: "Quali sono i tuoi punti di forza più grandi?",
      gsw: "Was sind dini gröschte Stärche?",
    },
  },
  {
    phase: "strengths_weaknesses",
    text: {
      de: "Und woran möchtest du noch arbeiten?",
      fr: "Et sur quoi aimerais-tu encore travailler ?",
      it: "E su cosa vorresti ancora lavorare?",
      gsw: "Und a was wotsch du no schaffe?",
    },
  },
  {
    phase: "situational",
    text: {
      de: "Stell dir vor, du machst bei der Arbeit einen Fehler. Was tust du?",
      fr: "Imagine que tu fais une erreur au travail. Que fais-tu ?",
      it: "Immagina di fare un errore al lavoro. Cosa fai?",
      gsw: "Stell der vor, du machsch bim Schaffe en Fehler. Was machsch du?",
    },
  },
  {
    phase: "situational",
    text: {
      de: "Erzähl von einer Situation, in der du im Team gearbeitet hast.",
      fr: "Raconte une situation où tu as travaillé en équipe.",
      it: "Racconta una situazione in cui hai lavorato in squadra.",
      gsw: "Verzell vo ere Situation, wo du im Team gschaffet hesch.",
    },
  },
  {
    phase: "candidate_questions",
    text: {
      de: "Hast du noch Fragen an uns?",
      fr: "As-tu encore des questions pour nous ?",
      it: "Hai ancora delle domande per noi?",
      gsw: "Hesch du no Frage a üs?",
    },
  },
];

const closingMessage: Record<LanguageCode, string> = {
  de: "Vielen Dank{name}! Wir melden uns bald bei dir.",
  fr: "Merci beaucoup{name} ! Nous te recontacterons bientôt.",
  it: "Grazie mille{name}! Ti faremo sapere presto.",
  gsw: "Merci vielmal{name}! Mir melded üs bald bi dir.",
};

const tips: Record<LanguageCode, string> = {
  de: "Gute Antwort! Versuch noch ein konkretes Beispiel zu nennen.",
  fr: "Bonne réponse ! Essaie d'ajouter un exemple concret.",
  it: "Bella risposta! Prova ad aggiungere un esempio concreto.",
  gsw: "Guet gseit! Probier no es konkrets Bispiil z nenne.",
};

type MockSession = {
  request: CreateSessionRequest;
  step: number; // index into `script` of the current question
  done: boolean;
  history: HistoryEntry[];
};

const sessions = new Map<string, MockSession>();

// ---------- helpers ----------

/** Wait 600-1200 ms so loading indicators are visible. */
function fakeDelay() {
  return new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 600));
}

function randomScore() {
  return 3 + Math.floor(Math.random() * 3); // 3, 4 or 5
}

function fill(text: string, session: MockSession) {
  const name = session.request.candidate?.first_name?.trim();
  return text.replace("{name}", name ? ` ${name}` : "");
}

function questionAt(session: MockSession, step: number) {
  return {
    id: `q${step + 1}`,
    text: fill(script[step].text[session.request.language], session),
    is_follow_up: false,
  };
}

function progress(step: number) {
  return { current: Math.min(step + 1, script.length), total: script.length };
}

function getOrThrow(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) throw new ApiError("SESSION_NOT_FOUND", "No session with this id.");
  return session;
}

// ---------- the mock API ----------

export const mockApi: InterviewApi = {
  async getConfig() {
    await fakeDelay();
    return config;
  },

  async createSession(req) {
    await fakeDelay();
    if (!req.language || !req.occupation_id) {
      throw new ApiError("INVALID_REQUEST", "language and occupation_id are required.");
    }
    const session: MockSession = { request: req, step: 0, done: false, history: [] };
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, session);

    const question = questionAt(session, 0);
    session.history.push({ role: "interviewer", question_id: question.id, text: question.text });

    return { session_id: sessionId, phase: script[0].phase, progress: progress(0), question };
  },

  async sendAnswer(sessionId, questionId, text): Promise<AnswerResponse> {
    await fakeDelay();
    const session = getOrThrow(sessionId);
    if (session.done) throw new ApiError("INTERVIEW_FINISHED", "The interview is already over.");
    if (questionId !== `q${session.step + 1}`) {
      throw new ApiError("WRONG_QUESTION", "This is not the current question.");
    }

    session.history.push({ role: "candidate", question_id: questionId, text });

    const scores: Scores = {
      relevance: randomScore(),
      structure: randomScore(),
      examples: randomScore(),
      motivation: randomScore(),
      language: randomScore(),
      self_reflection: randomScore(),
    };
    const turnFeedback =
      session.request.mode === "training"
        ? { short_tip: tips[session.request.language], scores }
        : null;

    session.step += 1;

    // Last question answered -> interview is over
    if (session.step >= script.length) {
      session.done = true;
      return {
        done: true,
        phase: "closing",
        progress: progress(script.length - 1),
        question: null,
        closing_message: fill(closingMessage[session.request.language], session),
        turn_feedback: turnFeedback,
        meta: { llm_calls: 0, latency_ms: 0 },
      };
    }

    const question = questionAt(session, session.step);
    session.history.push({ role: "interviewer", question_id: question.id, text: question.text });
    return {
      done: false,
      phase: script[session.step].phase,
      progress: progress(session.step),
      question,
      turn_feedback: turnFeedback,
      meta: { llm_calls: 0, latency_ms: 0 },
    };
  },

  async getSession(sessionId): Promise<SessionState> {
    await fakeDelay();
    const session = getOrThrow(sessionId);
    return {
      session_id: sessionId,
      language: session.request.language,
      occupation_id: session.request.occupation_id,
      mode: session.request.mode,
      done: session.done,
      phase: session.done ? "closing" : script[session.step].phase,
      progress: progress(session.step),
      history: session.history,
      current_question_id: session.done ? null : `q${session.step + 1}`,
    };
  },

  async getReport(sessionId): Promise<Report> {
    await fakeDelay();
    const session = getOrThrow(sessionId);
    if (!session.done) {
      throw new ApiError("INTERVIEW_NOT_FINISHED", "The interview is not finished yet.");
    }
    return {
      session_id: sessionId,
      language: session.request.language,
      overall_score: 3.8,
      criteria: [
        { id: "relevance", label: "Relevanz", score: 4, comment: "Du bist meistens direkt auf die Frage eingegangen." },
        { id: "structure", label: "Struktur", score: 3, comment: "Gib deinen Antworten einen klaren Anfang und Schluss." },
        { id: "examples", label: "Konkrete Beispiele", score: 4, comment: "Dein Beispiel aus der Freizeit war anschaulich." },
        { id: "motivation", label: "Motivation", score: 4, comment: "Man spürt dein Interesse am Beruf." },
        { id: "language", label: "Sprache & Ausdruck", score: 4, comment: "Freundlich und höflich formuliert." },
        { id: "self_reflection", label: "Selbstreflexion", score: 4, comment: "Du kennst deine Stärken gut." },
      ],
      strengths: ["Sympathischer Einstieg", "Echtes Interesse am Beruf"],
      improvements: [
        {
          tip: "Bereite eine Antwort auf 'Warum unsere Firma?' vor.",
          example_answer: "Mich spricht an, dass Sie Lernende früh in echte Projekte einbinden ...",
        },
      ],
      next_practice: ["structure", "motivation"],
    };
  },
};
