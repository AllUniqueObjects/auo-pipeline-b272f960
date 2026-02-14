import { useState } from 'react';
import { Send } from 'lucide-react';

export function ChatBar() {
  const [query, setQuery] = useState('');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AUO anything..."
          className="flex-1 rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          disabled={!query.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
