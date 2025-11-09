## Inspiration

A few years ago I fell in love with memoirs. Steve Jobs by Walter Isaacson showed me how a life can be rendered with clarity and depth; Skunk Works by Ben Rich revealed a person and a company evolving together. That intimacy of memory (how a biographer follows, notices, and stitches meaning over time) became the spark for Tomo.

As I’ve gotten older, I’ve realized I don’t remember past events as vividly. I wanted a companion that remembers with me: human and friendly, not a watcher; someone you want to talk to who grows alongside your life. Tomo is that idea, an always-there biographer that learns over time, without needing to hire a human to keep your story.

## What it does

Tomo captures your quick phone updates and turns them into a living memoir you can revisit anytime. It organizes highlights, commitments, and reflections so your story stays vivid while you keep moving. Voice-first and personable, Tomo checks in like a friend, remembers what mattered last time, and weaves those moments into simple monthly diary entries. Our slogan: “Everyone Has a Story.”

## How we built it

- Voice-native Agent Loop: We used Vapi for telephony/barge-in to manage the actual voice of Tomo. We then used ElevenLabs for low-latency yet expressive TTS.
- Transient Per-call Agents: Every inbound call spins up a fresh assistant hydrated with the caller’s latest context with stateless infra, highly personal behavior.
- LLM Brain: Gemini runs modular prompts (opener > extractor > memoir composer) with strict JSON specs to prevent drift. We use this brain to manage short and long term memory for Tomo.
- Data and API: We used Next.js API to build our webhooks with Supabase for auth, storage, and edge functions.
- UI/UX: We used Next.js, Tailwind, Shadcn/ui, and Typescript.

## Challenges we ran into

- Unable to register SMS agents
- Getting the memory management to properly detect salient thoughts
- Properly handling voice agent-loop
- Making the voice assistant feel human (speaking too much, cutting off mid-thought)
- Keeping personas stable across interuptions.

## Accomplishments that we're proud of

- Truly personalized voice agents that have a brain and memory for each user.
- Getting the end-to-end pipeline of call > transcrption > extraction > short term memory > long term memory > memoir working
- Voice UX and Visual App UI feel really clean and there isn't terrible latency.

## What's next for Tomo

- Scheduled outbound calls (Tomo will check in on you!)
- SMS (text Tomo instead)
- Upload Images (scrapbooking too instead of just diarying)
