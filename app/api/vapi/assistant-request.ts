import { NextResponse } from "next/server";

import type { MinimalUser } from "@/lib/db";
import { joinAsSystemMessage, loadPrompt, renderTemplate } from "@/lib/prompt";

import type { VapiAssistant, VapiPayload } from "./types";
import { findUserByCall } from "./user";

const EMPTY_USER: MinimalUser = {
  id: "",
  first_name: "",
  last_name: "",
  phone_e164: "",
  timezone: "",
};

export async function handleAssistantRequest(payload: VapiPayload) {
  const user = (await findUserByCall(payload)) ?? EMPTY_USER;
  const hasUserContext = Boolean(user.id);
  const systemContent = await buildSystemPrompt(user, hasUserContext);

  const assistant = buildAssistant(
    systemContent,
    payload.assistantOverrides,
    user,
    hasUserContext,
  );

  return NextResponse.json({ assistant });
}

async function buildSystemPrompt(
  user: MinimalUser,
  hasUserContext: boolean,
): Promise<string> {
  const basePrompt = await loadPrompt("base.md");
  const baseContent = renderTemplate(basePrompt, { user });

  if (!hasUserContext) {
    return baseContent;
  }

  const userPrompt = await loadPrompt("user_template.md");
  const userContent = renderTemplate(userPrompt, { user });
  return joinAsSystemMessage(baseContent, userContent);
}

function buildAssistant(
  systemContent: string,
  overrides: VapiPayload["assistantOverrides"],
  user: MinimalUser,
  hasUserContext: boolean,
): VapiAssistant {
  const defaultFirstMessage = "Hey how are you doing?";
  const firstName = user.first_name?.trim();
  const personalizedGreeting =
    hasUserContext && firstName ? `Hi ${firstName}, how are you doing?` : null;

  const assistant: VapiAssistant = {
    endCallMessage: "Talk to you soon. Take care!",
    voicemailMessage:
      "Just wanted to check in to see how you were doing, call me back when you get a chance.",
    firstMessage: personalizedGreeting ?? defaultFirstMessage,
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    name: "Tomo",
    voice: {
      model: "eleven_flash_v2_5",
      voiceId: "56bWURjYFHyYyVf490Dp",
      provider: "11labs",
      stability: 0.7,
      similarityBoost: 0.8,
    },
    model: {
      provider: "google",
      model: "gemini-2.5-flash-lite",
      messages: [{ role: "system", content: systemContent }],
    },
  };

  if (overrides?.model?.model) assistant.model.model = overrides.model.model;
  if (overrides?.voice?.voiceId)
    assistant.voice.voiceId = overrides.voice.voiceId;
  if (typeof overrides?.firstMessage === "string")
    assistant.firstMessage = overrides.firstMessage;

  return assistant;
}
