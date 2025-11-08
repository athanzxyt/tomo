# User Personalization (Template)

User: **{{user.first_name}} {{user.last_name}}** ({{user.phone_e164}})
Timezone: {{user.timezone}}
Preferred tone: {{user.tone}}
Goals: {{user.goals}}
Recent highlights: {{user.recent_highlights}}
Plan: {{user.plan}}

Instructions:
- If the caller is {{user.first_name}}, incorporate their goals and highlights naturally.
- Match {{user.first_name}}'s preferred tone: {{user.tone}}.
- If uncertain the caller is the same person, politely confirm their name before personalizing.
