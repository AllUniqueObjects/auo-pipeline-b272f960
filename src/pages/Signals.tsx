import { Header } from '@/components/Header';
import { SignalCard, Signal } from '@/components/SignalCard';
import { Radio } from 'lucide-react';

const mockSignals: Signal[] = [
  {
    id: "1",
    category: "competitive",
    title: "Hoka Takes 12% US Running Share — Closing Gap on NB's #3",
    summary: "Hoka's US running market share hit 12%, narrowing the gap with NB from 8pts to 3pts in 18 months.",
    urgency: "urgent",
    sourceCount: 4,
    createdAt: "2026-02-07"
  },
  {
    id: "2",
    category: "policy",
    title: "USTR Signals 5% Tariff Increase on Vietnamese Footwear",
    summary: "Draft proposal would raise Section 301 tariffs on Vietnam-origin footwear from 20% to 25% by Q3 2026.",
    urgency: "emerging",
    sourceCount: 3,
    createdAt: "2026-02-07"
  },
  {
    id: "3",
    category: "technology",
    title: "BASF Launches Next-Gen PEBA Foam — 15% Lighter Than FuelCell",
    summary: "New Elastopan Sport compound could reshape the super-foam race. Available for sampling Q2 2026.",
    urgency: "emerging",
    sourceCount: 2,
    createdAt: "2026-02-06"
  },
  {
    id: "4",
    category: "market",
    title: "Gen Z Trail Running Participation Up 34% YoY",
    summary: "SFIA data shows trail running is the fastest-growing outdoor activity among 18-24 demo, outpacing hiking.",
    urgency: "monitor",
    sourceCount: 2,
    createdAt: "2026-02-05"
  }
];

export default function Signals() {
  const signals = mockSignals;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <div className="content-wrapper">
          {signals.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-4">
                <Radio className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium mb-2">No signals yet</h2>
              <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                Your daily intelligence briefing will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
