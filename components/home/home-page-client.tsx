"use client";

import { Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { AppSidebar, type ViewValue } from "@/components/home/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { CallLogRecord, EntryRecord, MomentRecord } from "@/lib/db";
import {
  generateEntryAction,
  updateEntryAction,
} from "@/server/actions/entries";

type HomePageClientProps = {
  calls: CallLogRecord[];
  moments: MomentRecord[];
  entries: EntryRecord[];
  initialView?: ViewValue;
  initialEntryId?: string | null;
  showEntryDetail?: boolean;
};

export default function HomePageClient({
  calls,
  moments,
  entries,
  initialView = "calls",
  initialEntryId = null,
  showEntryDetail = false,
}: HomePageClientProps) {
  const [activeView, setActiveView] = useState<ViewValue>(initialView);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  let panel: ReactNode = <CallsPanel calls={calls} />;

  if (activeView === "entries") {
    panel = (
      <EntriesPanel
        entries={entries}
        initialEntryId={initialEntryId}
        showDetail={showEntryDetail}
      />
    );
  } else if (activeView === "moments") {
    panel = <MomentsPanel moments={moments} />;
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} onSelectView={setActiveView} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-6 p-6">{panel}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function CallsPanel({ calls }: { calls: CallLogRecord[] }) {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Recent Calls</h1>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-925/70 shadow-inner shadow-black/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-zinc-400">Created</TableHead>
              <TableHead className="text-zinc-400">Duration</TableHead>
              <TableHead className="text-right text-zinc-400">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.length ? (
              calls.map((call) => (
                <TableRow
                  key={call.id}
                  className="border-white/5 bg-transparent transition-colors hover:bg-white/10 focus-within:bg-white/10"
                >
                  <TableCell className="font-medium text-white">
                    {formatCallTimestamp(call.startedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-300">
                    {formatDuration(call.durationSec)}
                  </TableCell>
                  <TableCell className="flex flex-wrap items-center justify-end gap-3">
                    <CallAudioPlayer audioUrl={call.audioUrl} />
                    <TranscriptSheetTrigger call={call} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-zinc-500"
                >
                  No calls yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

type EntriesPanelProps = {
  entries: EntryRecord[];
  initialEntryId?: string | null;
  showDetail: boolean;
};

function EntriesPanel({
  entries,
  initialEntryId,
  showDetail,
}: EntriesPanelProps) {
  const router = useRouter();
  const [entryList, setEntryList] = useState(entries);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    showDetail ? (initialEntryId ?? null) : null,
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    setEntryList(entries);
  }, [entries]);

  useEffect(() => {
    setSelectedEntryId(showDetail ? (initialEntryId ?? null) : null);
  }, [initialEntryId, showDetail]);

  const selectedEntry = useMemo(() => {
    if (!showDetail) {
      return null;
    }
    return entryList.find((entry) => entry.id === selectedEntryId) ?? null;
  }, [entryList, selectedEntryId, showDetail]);

  useEffect(() => {
    setDraftTitle(selectedEntry?.title ?? "");
    setDraftBody(selectedEntry?.body ?? "");
    setIsEditing(false);
  }, [selectedEntry]);

  const handleGenerate = () => {
    setActionError(null);
    startGenerating(async () => {
      const result = await generateEntryAction();
      if (!result.success) {
        setActionError(resolveEntryActionError(result.error));
        return;
      }

      setEntryList((prev) => {
        const filtered = prev.filter((entry) => entry.id !== result.entry.id);
        return [result.entry, ...filtered];
      });
      setSelectedEntryId(result.entry.id);
      router.push(`/home/entries/${result.entry.id}`);
    });
  };

  const handleSave = () => {
    if (!selectedEntry) {
      return;
    }

    setActionError(null);
    startSaving(async () => {
      const result = await updateEntryAction({
        entryId: selectedEntry.id,
        title: draftTitle,
        body: draftBody,
      });

      if (!result.success) {
        setActionError(resolveEntryActionError(result.error));
        return;
      }

      setEntryList((prev) =>
        prev.map((entry) =>
          entry.id === result.entry.id ? result.entry : entry,
        ),
      );
      setIsEditing(false);
    });
  };

  const handleResetDraft = () => {
    setDraftTitle(selectedEntry?.title ?? "");
    setDraftBody(selectedEntry?.body ?? "");
    setIsEditing(false);
  };

  const handleBackToList = () => {
    setSelectedEntryId(null);
    setIsEditing(false);
    router.push("/home?view=entries");
  };

  const renderList = () => {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 shadow-inner shadow-black/30">
          {entryList.length ? (
            <div className="divide-y divide-white/5">
              {entryList.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="flex w-full flex-col gap-1 py-3 text-left transition hover:text-white"
                  onClick={() => router.push(`/home/entries/${entry.id}`)}
                >
                  <span className="font-serif text-lg font-semibold text-white">
                    {entry.title || "Untitled entry"}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-white/60">
                    {formatMomentPeriod(entry.period_year, entry.period_month)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-300">
              No entries yet. Generate your first memoir chapter to begin.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedEntry) {
      return null;
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="border border-white/30 bg-transparent text-white/70 hover:border-white/40 hover:bg-white/5 hover:text-white"
            onClick={handleBackToList}
          >
            Back to entries
          </Button>
          {!isEditing ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          {isEditing ? (
            <Input
              id="entry-title"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="border-white/20 bg-transparent text-3xl font-semibold text-white font-serif"
            />
          ) : (
            <h2 className="font-serif text-4xl font-semibold text-white">
              {selectedEntry.title || "Untitled entry"}
            </h2>
          )}
          <p className="text-sm text-white/60">
            {formatMomentPeriod(
              selectedEntry.period_year,
              selectedEntry.period_month,
            )}
          </p>
        </div>

        {isEditing ? (
          <Textarea
            id="entry-body"
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            className="min-h-[360px] border-white/20 bg-transparent text-base text-white font-serif leading-relaxed"
          />
        ) : (
          <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-white/90">
            {selectedEntry.body}
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-black text-white hover:bg-black/80"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              type="button"
              onClick={handleResetDraft}
              disabled={isSaving}
              className="bg-black text-white hover:bg-black/80"
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      {!showDetail || !selectedEntry ? (
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Entries</h1>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="ml-auto border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            {isGenerating ? "Generating..." : "Generate Entry"}
          </Button>
        </div>
      ) : null}
      {actionError ? (
        <p className="text-sm text-rose-300">{actionError}</p>
      ) : null}
      {showDetail && selectedEntry ? renderDetail() : renderList()}
    </section>
  );
}

function MomentsPanel({ moments }: { moments: MomentRecord[] }) {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Moments</h1>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-925/70 shadow-inner shadow-black/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-zinc-400">Period</TableHead>
              <TableHead className="text-zinc-400">Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moments.length ? (
              moments.map((moment) => (
                <TableRow
                  key={moment.id}
                  className="border-white/5 bg-transparent transition-colors hover:bg-white/10 focus-within:bg-white/10"
                >
                  <TableCell className="font-medium text-white">
                    {formatMomentPeriod(
                      moment.period_year,
                      moment.period_month,
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-300 break-words whitespace-pre-wrap">
                    {moment.summary?.trim() || "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-6 text-center text-zinc-500"
                >
                  No moments yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

type CallRecord = CallLogRecord;

function TranscriptSheetTrigger({ call }: { call: CallRecord }) {
  const transcriptEntries = parseTranscript(call.transcript);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="h-10 border-white/20 bg-white/10 px-4 text-white hover:bg-white/20"
          size="sm"
          variant="secondary"
        >
          View transcript
        </Button>
      </SheetTrigger>
      <SheetContent
        className="border-white/10 bg-zinc-950 text-white"
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Transcript</SheetTitle>
          <SheetDescription className="text-zinc-400">
            {formatDuration(call.durationSec)}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 overflow-y-auto pr-4 text-sm leading-relaxed text-zinc-100">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Started {formatCallTimestamp(call.startedAt)}
          </p>
          {transcriptEntries.length ? (
            <div className="space-y-3">
              {transcriptEntries.map((entry, index) => (
                <div
                  key={`${entry.speaker}-${index}`}
                  className="rounded-xl bg-white/5 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {entry.speaker}
                  </p>
                  <p className="mt-1 text-sm text-zinc-100">{entry.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No transcript available.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CallAudioPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const hasAudio = Boolean(audioUrl);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setElapsed(audio.currentTime);
      setProgress(
        audio.duration ? (audio.currentTime / audio.duration) * 100 : 0,
      );
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setElapsed(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  const remaining = Math.max(duration - elapsed, 0);
  const remainingLabel = formatDuration(Math.round(remaining));

  const handleSeek = (event: React.MouseEvent<HTMLButtonElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);
    const newTime = duration * ratio;
    audio.currentTime = newTime;
    setElapsed(newTime);
    setProgress(ratio * 100);
  };

  return (
    <div className="flex min-w-[260px] items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
      <Button
        aria-label={isPlaying ? "Pause playback" : "Play recording"}
        disabled={!hasAudio}
        className="h-10 w-10"
        onClick={togglePlayback}
        size="icon"
        variant="secondary"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex flex-1 flex-col">
        <button
          aria-label="Seek audio"
          className="group relative h-1.5 cursor-pointer rounded-full bg-white/15"
          disabled={!hasAudio}
          onClick={hasAudio ? handleSeek : undefined}
          type="button"
        >
          <div
            className="absolute inset-y-0 rounded-full bg-white transition-[width] group-hover:bg-white/90"
            style={{ width: `${progress}%` }}
          />
        </button>
        <p className="mt-1 text-xs text-zinc-300">{remainingLabel} left</p>
      </div>
      <audio ref={audioRef} src={audioUrl || undefined} preload="metadata">
        <track kind="captions" />
      </audio>
    </div>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds || Number.isNaN(seconds)) {
    return "—";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatCallTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMomentPeriod(year: number, month: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return "—";
  }

  const normalizedMonth = Math.min(Math.max(month, 1), 12) - 1;
  const date = new Date(Date.UTC(year, normalizedMonth, 1));
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseTranscript(transcript: string) {
  if (!transcript?.trim()) {
    return [] as Array<{ speaker: string; message: string }>;
  }

  return transcript
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawSpeaker, ...rest] = line.split(":");
      const message = rest.join(":").trim();
      const normalizedSpeaker = rawSpeaker?.trim().toLowerCase();
      const speaker = normalizedSpeaker === "tomo" ? "Tomo" : "You";
      return { speaker, message };
    })
    .filter((entry) => entry.message);
}

function resolveEntryActionError(code: string) {
  switch (code) {
    case "no-transcripts":
      return "Not enough recent calls to craft a memoir chapter.";
    case "body-required":
      return "Memoir body cannot be empty.";
    case "profile-missing":
      return "No profile found for memoir generation.";
    case "entry-not-found":
      return "Entry was not found. Refresh and try again.";
    case "persist-failed":
      return "We couldn't save the entry. Please try again.";
    default:
      return "Something went wrong while saving. Please try again.";
  }
}
