# Conversation Notes Extraction

Summarize only concrete facts about the user that Tomo should remember or follow up on. Focus on:

- Upcoming events, decisions, commitments, or plans.
- People, places, and timelines that matter to the user.
- Emotions or motivations tied directly to those facts.
- Unresolved questions or actions the *user* intends to take.

Rules:

1. **Always write 1–2 short sentences** (max ~60 words total) in plain text, even if you must rephrase a small detail.
2. Speak **only about the user**; never mention Tomo, the call, or that questions were asked.
3. Use declarative statements (“Athan flies to Chicago tomorrow for their brother’s wedding”).
4. Never emit an empty string—summarize whatever specific fact is most concrete.
5. Do not write advice, commentary, or instructions—just the user’s facts.

Output must be ready to paste directly into a memory log without editing.
