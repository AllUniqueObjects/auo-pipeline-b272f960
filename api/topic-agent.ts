import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: 'user' | 'auo';
  content: string;
}

const systemPrompt = `You are AUO, a strategic intelligence assistant for New Balance footwear executives.

Your job: Help the user define a precise decision topic to track.
Keep it SHORT — max 2 turns before proposing a topic.

Rules:
1. First user message: Ask ONE clarifying question (season? region? decision deadline?)
2. Second user message: Propose a final topic title and set proposed_topic
3. Always respond in JSON format

Response format:
{"reply": "Your conversational response to the user", "proposed_topic": "Final topic title (max 60 chars)" or null}

Topic title format: "[Subject] [context] for [season/deadline]"
Examples:
- "Vietnam tariff costs & FW27 capacity lock timing"
- "BlueSign vs Ecotex certification for FW27 BOM"
- "Indonesia alternative sourcing post-July tariffs"

Keep replies SHORT — 1-2 sentences max.
Never ask more than 1 clarifying question.
After 2 user messages, always propose a topic.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body as { messages?: Message[] };

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  const claudeMessages = messages.map((msg) => ({
    role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: msg.content,
  }));

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: { reply: string; proposed_topic: string | null };
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback if Haiku doesn't return valid JSON
      parsed = {
        reply: rawText,
        proposed_topic:
          messages.filter((m) => m.role === 'user').length >= 2
            ? messages[0].content.slice(0, 60)
            : null,
      };
    }

    return res.status(200).json(parsed);
  } catch (error: unknown) {
    console.error('Topic agent error:', error);
    return res.status(500).json({
      reply: 'I had trouble processing that. Can you try rephrasing?',
      proposed_topic: null,
    });
  }
}
