import { useNavigate } from 'react-router-dom';
import type { Signal } from '@/hooks/useSignalGraphData';
import type { ClusterWithColor } from '@/hooks/useSignalGraphData';
import { standaloneColor } from '@/lib/clusterColors';

interface MobileSignalListProps {
  clusters: ClusterWithColor[];
  standaloneSignals: Signal[];
  totalSignals: number;
}

export function MobileSignalList({
  clusters,
  standaloneSignals,
  totalSignals,
}: MobileSignalListProps) {
  const navigate = useNavigate();
  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate()} ${currentDate.toLocaleString('en', { month: 'short' })}`;

  return (
    <div className="min-h-screen" style={{ background: '#13131a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-12">
        <span
          className="text-[13px] tracking-[0.15em]"
          style={{ fontWeight: 500, color: '#6b6b7b' }}
        >
          AUO
        </span>
        <span className="text-[11px]" style={{ fontWeight: 300, color: '#44444f' }}>
          {formattedDate} · {totalSignals}
        </span>
      </div>

      {/* Summary */}
      <div className="px-6 py-4">
        <span className="text-[13px]" style={{ fontWeight: 400, color: '#6b6b7b' }}>
          {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cluster list */}
      <div className="px-6 space-y-8">
        {clusters.map((cluster) => (
          <div key={cluster.id}>
            {/* Cluster header */}
            <p
              className="text-[11px] tracking-[0.12em] uppercase mb-1"
              style={{ fontWeight: 500, color: cluster.color.text }}
            >
              {cluster.name}
            </p>
            <p
              className="text-[11px] mb-3"
              style={{ fontWeight: 300, color: '#44444f' }}
            >
              {cluster.description}
            </p>

            {/* Signals */}
            <div className="space-y-2">
              {cluster.signals.map((signal) => (
                <button
                  key={signal.id}
                  onClick={() => navigate(`/signals/${signal.id}`)}
                  className="w-full text-left py-2 hover:opacity-70 transition-opacity"
                >
                  <p className="text-[13px]" style={{ fontWeight: 400, color: '#e8e8ed' }}>
                    {signal.title}
                  </p>
                  <p className="text-[10px] mt-1" style={{ fontWeight: 300, color: '#44444f' }}>
                    {signal.sources || 0} sources · {signal.urgency || 'stable'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Standalone signals */}
        {standaloneSignals.length > 0 && (
          <div>
            <p
              className="text-[11px] tracking-[0.12em] uppercase mb-3"
              style={{ fontWeight: 500, color: standaloneColor.text }}
            >
              STANDALONE
            </p>
            <div className="space-y-2">
              {standaloneSignals.map((signal) => (
                <button
                  key={signal.id}
                  onClick={() => navigate(`/signals/${signal.id}`)}
                  className="w-full text-left py-2 hover:opacity-70 transition-opacity"
                >
                  <p className="text-[13px]" style={{ fontWeight: 400, color: '#e8e8ed' }}>
                    {signal.title}
                  </p>
                  <p className="text-[10px] mt-1" style={{ fontWeight: 300, color: '#44444f' }}>
                    {signal.sources || 0} sources · {signal.urgency || 'stable'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
