import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Message {
  role: 'user' | 'auo';
  content: string;
}

interface AgentResponse {
  reply: string;
  proposed_topic: string | null;
  options: string[];
}

function buildSystemPrompt(activeThreads: string[]): string {
  const threadList = activeThreads.length > 0
    ? activeThreads.map(t => `- ${t}`).join('\n')
    : '- (no topics yet)';

  return `You are AUO, a strategic intelligence assistant for a New Balance VP of Footwear & Apparel Product Development.

The user is currently tracking these topics:
${threadList}

Your job: Help define a NEW topic to track. Be smart and specific.

BEHAVIOR RULES:
1. If input is broad (e.g. "textile innovation", "Vietnam", "pricing"):
   - Propose 2-3 SPECIFIC trackable angles as options
   - Reference existing threads where relevant
   - Return options array

2. If user picks an option or is already specific:
   - Propose final topic title immediately
   - Return proposed_topic

3. Max 1 exchange before proposing. Never ask 2 clarifying questions.
4. Replies: 1 sentence max (before options or proposal).
5. Topic titles: specific, actionable, max 60 chars.
   Format: "[Subject] [context] for [season/deadline]"
6. Topic titles must NEVER repeat words from the user's input verbatim.
   Rephrase and make specific.
   BAD:  "foam technology — foam technology for FW27 season"
   GOOD: "Proprietary vs licensed foam — FW27 material decision"
   BAD:  "Vietnam — Vietnam sourcing for FW27"
   GOOD: "Vietnam vs Indonesia sourcing lock-in — FW27"

RESPONSE FORMAT (strict JSON only, no markdown):
{
  "reply": "short message",
  "proposed_topic": "Final title (60 chars max)" or null,
  "options": ["Option A title", "Option B title", "Option C title"] or []
}

EXAMPLES:

User already tracks: BlueSign vs Ecotex, Vietnam vs Indonesia

Input: "textile innovation"
Response: {"reply":"A few angles beyond your BlueSign work:","proposed_topic":null,"options":["Competitor textile strategies — Nike, Adidas, On","PFAS-alternative material pipeline for FW27","Bio-based & recycled supplier landscape 2026"]}

Input: "first option" or "Competitor textile strategies — Nike, Adidas, On"
Response: {"reply":"Got it.","proposed_topic":"Competitor textile strategies — Nike, Adidas, On FW27","options":[]}

Input: "Nike FW27 shelf positioning in key accounts"
Response: {"reply":"Got it.","proposed_topic":"Nike FW27 shelf positioning in key accounts","options":[]}

Input: "pricing"
Response: {"reply":"A few pricing angles:","proposed_topic":null,"options":["Consumer price elasticity at $130-$150 FW27","Nike & On pricing pressure on 880 positioning","Vietnam tariff impact on landed cost targets"]}

Input: "foam technology"
WRONG: {"reply":"Got it.","proposed_topic":"Foam technology — foam technology for FW27 season","options":[]}
RIGHT: {"reply":"A few foam angles:","proposed_topic":null,"options":["Proprietary vs licensed foam — FW27 material decision","ZoomX & Lightstrike competitive foam benchmarking","Bio-based foam supplier readiness for FW27"]}

Input: "Vietnam"
WRONG: {"reply":"Got it.","proposed_topic":"Vietnam — Vietnam sourcing for FW27","options":[]}
RIGHT: {"reply":"Some Vietnam-specific angles beyond your current thread:","proposed_topic":null,"options":["Vietnam vs Indonesia sourcing lock-in — FW27","Vietnam tariff exposure & contingency planning","Vietnam Tier-1 supplier capacity for FW27 ramp"]}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userId } = req.body as { messages?: Message[]; userId?: string };

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  // Fetch active threads for context
  let activeThreads: string[] = [];
  if (userId) {
    try {
      const { data } = await supabase
        .from('decision_threads')
        .select('title')
        .eq('user_id', userId)
        .neq('level', 'decided')
        .neq('level', 'archived')
        .order('created_at', { ascending: false })
        .limit(10);
      activeThreads = data?.map(t => t.title) || [];
    } catch (err) {
      console.warn('Failed to fetch threads for context:', err);
    }
  }

  const claudeMessages = messages.map((msg) => ({
    role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: msg.content,
  }));

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: buildSystemPrompt(activeThreads),
      messages: claudeMessages,
    });

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: AgentResponse;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
      if (!parsed.options) parsed.options = [];
    } catch {
      parsed = {
        reply: rawText,
        proposed_topic:
          messages.filter((m) => m.role === 'user').length >= 2
            ? messages[0].content.slice(0, 60)
            : null,
        options: [],
      };
    }

    return res.status(200).json(parsed);
  } catch (error: unknown) {
    console.error('Topic agent error:', error);
    return res.status(500).json({
      reply: 'I had trouble processing that. Can you try rephrasing?',
      proposed_topic: null,
      options: [],
    });
  }
}
