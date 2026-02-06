import { Header } from '@/components/Header';
import { Radio } from 'lucide-react';

export default function Signals() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="content-wrapper text-center py-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-4">
            <Radio className="w-5 h-5 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">No signals yet</h2>
          <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
            Your daily intelligence briefing will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
