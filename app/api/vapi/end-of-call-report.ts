import { NextResponse } from "next/server";

import { type CallLogInput, insertCallLog } from "@/lib/db";

import type { VapiCall, VapiConversationTurn, VapiPayload } from "./types";
import { findUserByCall } from "./user";

export async function handleEndOfCallReport(payload: VapiPayload) {
  const user = await findUserByCall(payload);
  if (!user?.id) {
    return NextResponse.json({ ok: true, skipped: "profile-not-found" });
  }

  const logPayload = buildCallLogPayload(payload, user.id);
  if (!logPayload) {
    return NextResponse.json(
      { error: "missing call metadata" },
      { status: 400 },
    );
  }

  const saved = await insertCallLog(logPayload);
  if (!saved) {
    return NextResponse.json(
      { error: "failed to persist call log" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function buildCallLogPayload(
  payload: VapiPayload,
  profileId: string,
): CallLogInput | null {
  const call = payload.call;
  if (!call) {
    return null;
  }

  const startedAt = normalizeTimestamp(
    call.startedAt ??
      call.started_at ??
      call.createdAt ??
      call.created_at ??
      null,
  );

  const durationSec = resolveDurationSeconds(payload, call);
  const audioUrl = resolveAudioUrl(payload, call);
  const transcript = extractTranscript(payload) ?? "";
  const normalizedTranscript = normalizeTranscriptSpeakers(transcript);
  return {
    profile_id: profileId,
    started_at: startedAt,
    duration_sec: durationSec,
    audio_url: audioUrl,
    transcript: normalizedTranscript,
  };
}

function normalizeTimestamp(raw: string | null): string {
  if (!raw) {
    return new Date().toISOString();
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function resolveDurationSeconds(
  payload: VapiPayload,
  call: VapiCall,
): number | null {
  if (
    typeof payload.durationSeconds === "number" &&
    Number.isFinite(payload.durationSeconds)
  ) {
    return Math.round(payload.durationSeconds);
  }

  return normalizeCallDurationSeconds(call);
}

function normalizeCallDurationSeconds(call: VapiCall): number | null {
  if (
    typeof call.durationSec === "number" &&
    Number.isFinite(call.durationSec)
  ) {
    return Math.round(call.durationSec);
  }
  if (
    typeof call.duration_sec === "number" &&
    Number.isFinite(call.duration_sec)
  ) {
    return Math.round(call.duration_sec);
  }
  if (typeof call.durationMs === "number" && Number.isFinite(call.durationMs)) {
    return Math.round(call.durationMs / 1000);
  }
  if (
    typeof call.duration_ms === "number" &&
    Number.isFinite(call.duration_ms)
  ) {
    return Math.round(call.duration_ms / 1000);
  }
  if (typeof call.duration === "number" && Number.isFinite(call.duration)) {
    if (call.duration > 6000) {
      return Math.round(call.duration / 1000);
    }
    return Math.round(call.duration);
  }
  return null;
}

function resolveAudioUrl(payload: VapiPayload, call: VapiCall): string {
  if (payload.recordingUrl) {
    return payload.recordingUrl;
  }

  const artifactRecording = payload.artifact?.recording;
  if (artifactRecording?.audioUrl) return artifactRecording.audioUrl;
  if (artifactRecording?.url) return artifactRecording.url;

  return extractAudioUrlFromCall(call);
}

function extractAudioUrlFromCall(call: VapiCall): string {
  if (call.recordingUrl) return call.recordingUrl;
  if (call.audioUrl) return call.audioUrl;
  if (call.recording?.audioUrl) return call.recording.audioUrl;
  if (call.recording?.url) return call.recording.url;
  const first = call.recordings?.find((rec) => rec?.audioUrl || rec?.url);
  return first?.audioUrl ?? first?.url ?? "";
}

function extractTranscript(payload: VapiPayload): string | null {
  const artifactTranscript = payload.artifact?.transcript?.trim();
  if (artifactTranscript) {
    return artifactTranscript;
  }

  const artifactMessages = stringifyArtifactMessages(
    payload.artifact?.messages,
  );
  if (artifactMessages) {
    return artifactMessages;
  }

  const candidates = [payload.transcript, payload.call?.transcript];
  for (const value of candidates) {
    const text = coerceTranscript(value);
    if (text) return text;
  }
  return null;
}

function coerceTranscript(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const maybeText = (value as { text?: string }).text;
    if (typeof maybeText === "string") return maybeText;
    if (
      Array.isArray((value as { segments?: Array<{ text?: string }> }).segments)
    ) {
      const segments = (value as { segments?: Array<{ text?: string }> })
        .segments;
      const joined = segments
        ?.map((segment) => segment?.text?.trim())
        .filter(Boolean)
        .join(" ");
      if (joined) return joined;
    }
  }
  return null;
}

function stringifyArtifactMessages(
  messages?: VapiConversationTurn[] | null,
): string | null {
  if (!messages?.length) {
    return null;
  }

  const parts = messages
    .map((turn) => {
      const content = turn?.message ?? turn?.content ?? "";
      const text = content.trim();
      if (!text) {
        return null;
      }
      const role = turn?.role?.trim();
      return role ? `${role}: ${text}` : text;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length ? parts.join(" ") : null;
}

function normalizeTranscriptSpeakers(transcript: string): string {
  return transcript
    .replace(/^AI:/gim, "Tomo:")
    .replace(/^Assistant:/gim, "Tomo:")
    .replace(/^Bot:/gim, "Tomo:")
    .trim();
}
