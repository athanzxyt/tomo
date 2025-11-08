"use client";

import Image from "next/image";
import type { PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import memoirs from "@/public/memoirs.json";

const HIGHLIGHT_RADIUS = 60;
const PAUSE_DURATION = 3200;
const COOLDOWN_DURATION = 600;

type MemoEntry = {
  passage: string;
  title: string;
  author: string;
};

type MemoWord = {
  id: string;
  text: string;
  duration: number;
  pauseAfter: number;
};

type MemoColumn = MemoEntry & {
  id: string;
  words: MemoWord[];
};

type ReadingPhase = "reading" | "pause" | "cooldown";

type ReadingState = {
  columnIndex: number | null;
  wordIndex: number;
  phase: ReadingPhase;
};

export default function Home() {
  const columns = useMemo<MemoColumn[]>(() => {
    const entries = (memoirs as MemoEntry[]).slice(0, 4);

    return entries.map((entry, memoIndex) => {
      const words = entry.passage
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word, wordIndex) => {
          const punctuationMatch = word.match(/([.,!?;:—-]+)$/u);
          const punctuation = punctuationMatch?.[0] ?? "";
          const cleanWord = punctuation
            ? word.slice(0, -punctuation.length)
            : word;
          const lengthScore = Math.max(cleanWord.length, 2);
          const duration = Math.max(160, lengthScore * 42);

          let pauseAfter = 0;
          if (/[.?!]/u.test(punctuation)) {
            pauseAfter = 600;
          } else if (/,/u.test(punctuation)) {
            pauseAfter = 320;
          } else if (/[;:]/u.test(punctuation)) {
            pauseAfter = 400;
          } else if (/[-—]/u.test(punctuation)) {
            pauseAfter = 260;
          }

          return {
            id: `memo-${memoIndex}-word-${wordIndex}`,
            text: word,
            duration,
            pauseAfter,
          };
        });

      return {
        id: `memo-${memoIndex}`,
        title: entry.title,
        author: entry.author,
        passage: entry.passage,
        words,
      };
    });
  }, []);

  const [highlighted, setHighlighted] = useState<boolean[][]>(() =>
    columns.map((column) => new Array(column.words.length).fill(false)),
  );

  const wordRefs = useRef<Array<Array<HTMLSpanElement | null>>>(
    columns.map((column) => new Array(column.words.length).fill(null)),
  );

  const [readingState, setReadingState] = useState<ReadingState>(() => ({
    columnIndex: columns.length ? 0 : null,
    wordIndex: -1,
    phase: columns.length ? "reading" : "cooldown",
  }));

  useEffect(() => {
    setHighlighted((prev) =>
      columns.map((column, index) => {
        const columnHighlights = prev[index];
        if (
          !columnHighlights ||
          columnHighlights.length !== column.words.length
        ) {
          return new Array(column.words.length).fill(false);
        }
        return columnHighlights;
      }),
    );
  }, [columns]);

  useEffect(() => {
    wordRefs.current = columns.map((column, index) => {
      const existing = wordRefs.current[index] ?? [];
      existing.length = column.words.length;
      return existing;
    });
  }, [columns]);

  useEffect(() => {
    setReadingState({
      columnIndex: columns.length ? 0 : null,
      wordIndex: -1,
      phase: columns.length ? "reading" : "cooldown",
    });
  }, [columns.length]);

  useEffect(() => {
    if (!columns.length || readingState.columnIndex === null) {
      return;
    }

    let delay = COOLDOWN_DURATION;
    if (readingState.phase === "reading") {
      const column = columns[readingState.columnIndex];
      if (readingState.wordIndex < 0) {
        const upcoming = column?.words[0];
        delay = upcoming ? Math.max(140, upcoming.duration * 0.7) : 200;
      } else {
        const currentWord = column?.words[readingState.wordIndex];
        delay = (currentWord?.duration ?? 200) + (currentWord?.pauseAfter ?? 0);
      }
    } else if (readingState.phase === "pause") {
      delay = PAUSE_DURATION;
    }

    const timer = setTimeout(() => {
      setReadingState((prev) => {
        if (prev.columnIndex === null || !columns.length) {
          return prev;
        }

        const wordsCount = columns[prev.columnIndex]?.words.length ?? 0;

        if (prev.phase === "reading") {
          const nextWord = prev.wordIndex + 1;
          if (nextWord < wordsCount) {
            return { ...prev, wordIndex: nextWord };
          }
          return {
            columnIndex: prev.columnIndex,
            wordIndex: Math.max(wordsCount - 1, 0),
            phase: "pause",
          };
        }

        if (prev.phase === "pause") {
          return {
            columnIndex: prev.columnIndex,
            wordIndex: -1,
            phase: "cooldown",
          };
        }

        const nextColumn = (prev.columnIndex + 1) % columns.length;
        return {
          columnIndex: nextColumn,
          wordIndex: -1,
          phase: "reading",
        };
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [columns, readingState]);

  const updateHighlights = useCallback(
    (memoIndex: number, clientX: number, clientY: number) => {
      setHighlighted((prev) => {
        let changed = false;
        const next = prev.map((columnHighlights) => columnHighlights.slice());

        next.forEach((columnHighlights, idx) => {
          if (idx !== memoIndex && columnHighlights.some(Boolean)) {
            columnHighlights.fill(false);
            changed = true;
          }
        });

        const targetRefs = wordRefs.current[memoIndex] ?? [];
        const targetHighlights = next[memoIndex] ?? [];

        for (let i = 0; i < targetHighlights.length; i += 1) {
          const el = targetRefs[i];
          const prevValue = targetHighlights[i];

          if (!el) {
            if (prevValue) {
              targetHighlights[i] = false;
              changed = true;
            }
            continue;
          }

          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(clientX - centerX, clientY - centerY);
          const isNear = distance <= HIGHLIGHT_RADIUS;

          if (prevValue !== isNear) {
            targetHighlights[i] = isNear;
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    },
    [],
  );

  const handlePointerMove = useCallback(
    (memoIndex: number, event: PointerEvent<HTMLElement>) => {
      updateHighlights(memoIndex, event.clientX, event.clientY);
    },
    [updateHighlights],
  );

  const handlePointerLeave = useCallback((memoIndex: number) => {
    setHighlighted((prev) => {
      const target = prev[memoIndex];
      if (!target || !target.some(Boolean)) {
        return prev;
      }

      const next = prev.slice();
      next[memoIndex] = target.map(() => false);
      return next;
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-zinc-900 text-zinc-50">
      <section className="flex flex-col gap-10 px-6 py-8 md:px-10 md:py-12 lg:flex-row lg:gap-12">
        <div className="flex flex-1 flex-col gap-10">
          <div className="flex items-center gap-4">
            <Image
              src="/tomo-logo-white.png"
              alt="Tomo logo"
              width={56}
              height={56}
              priority
              className="h-12 w-12 rounded-lg object-cover"
            />
            <div className="leading-tight">
              <p className="text-lg font-semibold uppercase tracking-[0.08em] text-white">
                Tomo
              </p>
              <p className="text-sm text-zinc-400 tracking-[0.02em]">
                Everyone Has a Story
              </p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-400 sm:text-sm">
            Call Tomo at{" "}
            <a
              href="tel:+14075657490"
              className="text-yellow-500 transition hover:text-zinc-200"
            >
              +1 (407) 565 7490
            </a>{" "}
            to get started
          </p>
        </div>
        <div className="flex flex-1 items-start justify-between lg:justify-end">
          <p className="max-w-md text-sm leading-tight text-zinc-300 sm:text-base">
            Tomo captures your quick phone updates and turns them into a living
            memoir you can revisit anytime. We organize highlights, commitments,
            and reflections so your story is preserved while you keep moving.
          </p>
        </div>
      </section>

      <section className="flex flex-1 flex-col border-t border-white/10 px-6 pb-6 pt-8 md:px-10 md:pb-10">
        <div className="grid min-h-[24rem] grid-cols-1 gap-5 overflow-y-hidden sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column, memoIndex) => (
            <article
              key={column.id}
              className="flex flex-col justify-between rounded-2xl border border-white/5 bg-zinc-950/30 p-6"
              onPointerMove={(event) => handlePointerMove(memoIndex, event)}
              onPointerLeave={() => handlePointerLeave(memoIndex)}
            >
              <p className="text-sm font-light leading-[1.1] text-zinc-800 md:text-base">
                {column.words.flatMap((word, wordIndex) => {
                  const pointerActive =
                    highlighted[memoIndex]?.[wordIndex] ?? false;
                  const readingActive =
                    readingState.phase !== "cooldown" &&
                    readingState.columnIndex === memoIndex &&
                    readingState.wordIndex >= 0 &&
                    wordIndex <= readingState.wordIndex;
                  const isActive = pointerActive || readingActive;

                  const nodes: ReactNode[] = [
                    <span
                      key={word.id}
                      ref={(node) => {
                        if (!wordRefs.current[memoIndex]) {
                          wordRefs.current[memoIndex] = [];
                        }
                        wordRefs.current[memoIndex][wordIndex] = node;
                      }}
                      className={`memoir-word${isActive ? " memoir-word--active" : ""}`}
                    >
                      {word.text}
                    </span>,
                  ];

                  if (wordIndex < column.words.length - 1) {
                    nodes.push(" ");
                  }

                  return nodes;
                })}
              </p>
              <p className="mt-8 text-sm uppercase tracking-[0.2em] text-zinc-500">
                <span className="block text-white">"{column.title}"</span>
                <span className="block italic normal-case tracking-normal">
                  by {column.author}
                </span>
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
