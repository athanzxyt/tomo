"use client";

import { useState } from "react";

import { AppSidebar, type ViewValue } from "@/components/home/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const calls = [
  {
    id: "call-1",
    contact: "Ava Martinez",
    timestamp: "Today · 9:32 AM",
    summary: "Recapped weekend trip and captured two new follow-ups.",
  },
  {
    id: "call-2",
    contact: "Jordan Lee",
    timestamp: "Yesterday · 4:10 PM",
    summary: "Planned memorial letter outline and next recording schedule.",
  },
];

const entries = [
  {
    id: "entry-1",
    title: "Sunday Reflections",
    status: "Draft",
    excerpt:
      "Walked along Lake Eola and felt grateful for the quiet moments...",
  },
  {
    id: "entry-2",
    title: "Call with Dad",
    status: "Published",
    excerpt: "Captured his story about moving to the city with one suitcase...",
  },
  {
    id: "entry-3",
    title: "Commitments",
    status: "Published",
    excerpt: "Re-committed to recording Tuesday and Thursday mornings.",
  },
];

export default function HomePage() {
  const [activeView, setActiveView] = useState<ViewValue>("calls");

  const isCalls = activeView === "calls";

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} onSelectView={setActiveView} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-6 p-6">
          {isCalls ? (
            <section className="space-y-4">
              <h1 className="text-xl font-semibold text-white">Recent Calls</h1>
              {calls.map((call) => (
                <article
                  key={call.id}
                  className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-inner shadow-black/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-white">
                      {call.contact}
                    </p>
                    <span className="text-sm text-zinc-400">
                      {call.timestamp}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{call.summary}</p>
                </article>
              ))}

              <button
                type="button"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
              >
                View all calls
              </button>
            </section>
          ) : (
            <section className="space-y-4">
              <h1 className="text-xl font-semibold text-white">Entries</h1>
              <div className="grid gap-4 md:grid-cols-2">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-inner shadow-black/30"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-white">
                        {entry.title}
                      </p>
                      <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-300">
                      {entry.excerpt}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
