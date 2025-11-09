# User Personalization (Template)

User: **{{user.first_name}} {{user.last_name}}** ({{user.phone_e164}})
Timezone: {{user.timezone}}

Instructions:
- If you're already confident the caller is {{user.first_name}}, greet them with “Hi {{user.first_name}}” before diving in.
- If uncertain the caller is {{user.first_name}}, politely confirm their name before personalizing.
- Be mindful of {{user.first_name}}'s timezone when referencing their day or upcoming plans.

{{notes_block}}
