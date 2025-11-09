export type VapiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type VapiAssistant = {
  endCallMessage: string;
  voicemailMessage: string;
  firstMessage: string;
  transcriber: { provider: string; model: string; language?: string };
  name: string;
  voice: {
    model: string;
    provider: string;
    voiceId: string;
    stability?: number;
    similarityBoost?: number;
  };
  model: { provider: string; model: string; messages: VapiMessage[] };
};

export type VapiCall = {
  from?: { phoneNumber?: string };
  customer?: { number?: string };
  startedAt?: string;
  started_at?: string;
  createdAt?: string;
  created_at?: string;
  duration?: number;
  durationMs?: number;
  durationSec?: number;
  duration_sec?: number;
  duration_ms?: number;
  recordingUrl?: string;
  audioUrl?: string;
  recording?: { url?: string; audioUrl?: string };
  recordings?: Array<{ url?: string; audioUrl?: string }>;
  transcript?: unknown;
};

export type VapiConversationTurn = {
  role?: string;
  message?: string;
  content?: string;
};

export type VapiArtifact = {
  recording?: { url?: string; audioUrl?: string };
  transcript?: string;
  messages?: VapiConversationTurn[];
};

export type VapiPayload = {
  type?: string;
  endedReason?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  call?: VapiCall;
  artifact?: VapiArtifact;
  assistantOverrides?: {
    model?: { model?: string };
    voice?: { voiceId?: string };
    firstMessage?: string;
  };
  transcript?: unknown;
};

export type VapiRequestBody = {
  message?: VapiPayload;
};
