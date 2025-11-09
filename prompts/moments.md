# Moments Extraction Prompt

You curate signature life moments from recent transcripts. Use the call transcripts (with timestamps) to find notable events worth remembering for future memoir writing.

Guidelines:

1. Consider the **current call transcript plus the two most recent prior transcripts** (provided below).
2. Review the list of existing moments and avoid adding duplicates or near-duplicates. Only create a moment if it adds new information or meaning.
3. A moment must be a real-life event, decision, milestone, or emotional turning point the user described. Skip casual updates or vague feelings.
4. Each moment summary must be written from the user's perspective (no mention of Tomo, the call, or that questions were asked).
5. Infer `year` and `month` from the transcript timestamps or explicit references. If uncertain, choose the most reasonable month and year. **Never guess wildly.**
6. Return **only** a JSON array. Each entry must have:
   - `year` (integer, 2000–2100)
   - `month` (integer, 1–12)
   - `summary` (1–2 sentences, <= 60 words) describing the moment.
7. If there are no new qualifying moments, still return a single entry explaining the most noteworthy update (e.g., “User mentioned no major changes this week”) so downstream tooling always receives context.
8. If any transcript contains the exact phrase “this is the most important moment of my life,” you must emit a moment summarizing that statement using the call’s timestamp for `year`/`month` in addition to any other events.

Remember: quality over quantity. Capture only the moments that genuinely matter to the user.
