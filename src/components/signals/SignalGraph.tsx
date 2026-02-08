import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { ClusterWithColor, Signal } from '@/hooks/useSignalGraphData';
import { standaloneColor } from '@/lib/clusterColors';

interface SignalGraphProps {
  clusters: ClusterWithColor[];
  standaloneSignals: Signal[];
  clusterEdges: { clusterA: string; clusterB: string }[];
  onSelectSignal: (signal: Signal, cluster: ClusterWithColor | null) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  signal: Signal | null;
}

export function SignalGraph({
  clusters,
  standaloneSignals,
  clusterEdges,
  onSelectSignal,
}: SignalGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    signal: null,
  });

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || clusters.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = container.clientWidth;
    const height = container.clientHeight;
    const padding = 40;

    svg.attr('width', width).attr('height', height);

    // Calculate grid layout for clusters
    const clusterCount = clusters.length;
    let cols: number, rows: number;

    if (clusterCount <= 3) {
      cols = clusterCount;
      rows = 1;
    } else if (clusterCount <= 4) {
      cols = 2;
      rows = 2;
    } else if (clusterCount <= 6) {
      cols = 3;
      rows = 2;
    } else {
      cols = 3;
      rows = Math.ceil(clusterCount / 3);
    }

    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2 - (standaloneSignals.length > 0 ? 80 : 0);

    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;
    const clusterPadding = 24;

    // Position clusters
    const clusterPositions = new Map<
      string,
      { x: number; y: number; width: number; height: number }
    >();

    clusters.forEach((cluster, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = padding + col * cellWidth + clusterPadding;
      const y = padding + row * cellHeight + clusterPadding;
      const w = cellWidth - clusterPadding * 2;
      const h = cellHeight - clusterPadding * 2;

      clusterPositions.set(cluster.id, { x, y, width: w, height: h });
    });

    // Draw cluster edge lines
    const clusterMap = new Map(clusters.map((c) => [c.id, c]));

    clusterEdges.forEach((edge) => {
      const posA = clusterPositions.get(edge.clusterA);
      const posB = clusterPositions.get(edge.clusterB);

      if (posA && posB) {
        const centerAx = posA.x + posA.width / 2;
        const centerAy = posA.y + posA.height / 2;
        const centerBx = posB.x + posB.width / 2;
        const centerBy = posB.y + posB.height / 2;

        svg
          .append('line')
          .attr('x1', centerAx)
          .attr('y1', centerAy)
          .attr('x2', centerBx)
          .attr('y2', centerBy)
          .attr('stroke', 'rgba(140,140,160,0.15)')
          .attr('stroke-width', 0.5);
      }
    });

    // Draw clusters
    clusters.forEach((cluster) => {
      const pos = clusterPositions.get(cluster.id);
      if (!pos) return;

      const g = svg.append('g');

      // Cluster fill rectangle
      g.append('rect')
        .attr('x', pos.x)
        .attr('y', pos.y)
        .attr('width', pos.width)
        .attr('height', pos.height)
        .attr('rx', 16)
        .attr('ry', 16)
        .attr('fill', cluster.color.fill);

      // Cluster name label (above rect)
      g.append('text')
        .attr('x', pos.x)
        .attr('y', pos.y - 24)
        .attr('fill', cluster.color.text)
        .style('font-size', '11px')
        .style('font-weight', '500')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.12em')
        .text(cluster.name);

      // Cluster description
      g.append('text')
        .attr('x', pos.x)
        .attr('y', pos.y - 8)
        .attr('fill', '#44444f')
        .style('font-size', '11px')
        .style('font-weight', '300')
        .text(
          cluster.description.length > 50
            ? cluster.description.slice(0, 50) + '…'
            : cluster.description
        );

      // Draw signal nodes inside cluster
      const nodeSpacing = 20;
      const nodeRadius = 6;
      const nodesPerRow = Math.floor((pos.width - 24) / (nodeRadius * 2 + nodeSpacing));
      const startX = pos.x + 16;
      const startY = pos.y + 24;

      cluster.signals.forEach((signal, sIndex) => {
        const row = Math.floor(sIndex / nodesPerRow);
        const col = sIndex % nodesPerRow;

        const cx = startX + col * (nodeRadius * 2 + nodeSpacing) + nodeRadius;
        const cy = startY + row * (nodeRadius * 2 + nodeSpacing) + nodeRadius;

        const isUrgent = signal.urgency === 'urgent';
        const sourceCount = signal.source_urls?.length || 0;
        const r = sourceCount >= 7 ? 8 : nodeRadius;

        const node = g
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', r)
          .attr('fill', isUrgent ? cluster.color.nodeUrgent : cluster.color.node)
          .style('cursor', 'pointer')
          .style('transition', 'transform 150ms ease');

        if (isUrgent) {
          node.classed('animate-subtle-pulse', true);
        }

        node
          .on('mouseenter', (event) => {
            d3.select(event.target).attr('transform', `translate(${cx}, ${cy}) scale(1.3) translate(${-cx}, ${-cy})`);
            setTooltip({
              visible: true,
              x: cx,
              y: cy - 16,
              signal,
            });
          })
          .on('mouseleave', (event) => {
            d3.select(event.target).attr('transform', '');
            setTooltip({ visible: false, x: 0, y: 0, signal: null });
          })
          .on('click', () => {
            onSelectSignal(signal, cluster);
          });
      });
    });

    // Draw standalone signals
    if (standaloneSignals.length > 0) {
      const standaloneY = height - 60;
      const standaloneStartX = padding;

      // Label
      svg
        .append('text')
        .attr('x', standaloneStartX)
        .attr('y', standaloneY - 16)
        .attr('fill', '#44444f')
        .style('font-size', '11px')
        .style('font-weight', '500')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.12em')
        .text('STANDALONE');

      // Nodes
      standaloneSignals.forEach((signal, index) => {
        const cx = standaloneStartX + index * 26 + 6;
        const cy = standaloneY + 6;
        const isUrgent = signal.urgency === 'urgent';

        const node = svg
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 6)
          .attr('fill', isUrgent ? standaloneColor.nodeUrgent : standaloneColor.node)
          .style('cursor', 'pointer');

        if (isUrgent) {
          node.classed('animate-subtle-pulse', true);
        }

        node
          .on('mouseenter', (event) => {
            d3.select(event.target).attr('transform', `translate(${cx}, ${cy}) scale(1.3) translate(${-cx}, ${-cy})`);
            setTooltip({
              visible: true,
              x: cx,
              y: cy - 16,
              signal,
            });
          })
          .on('mouseleave', (event) => {
            d3.select(event.target).attr('transform', '');
            setTooltip({ visible: false, x: 0, y: 0, signal: null });
          })
          .on('click', () => {
            onSelectSignal(signal, null);
          });
      });
    }

    // Legend
    const legendY = height - 20;
    let legendX = padding;

    clusters.forEach((cluster) => {
      svg
        .append('circle')
        .attr('cx', legendX)
        .attr('cy', legendY)
        .attr('r', 4)
        .attr('fill', cluster.color.node);

      svg
        .append('text')
        .attr('x', legendX + 10)
        .attr('y', legendY + 3)
        .attr('fill', '#44444f')
        .style('font-size', '10px')
        .style('font-weight', '300')
        .text(cluster.name);

      legendX += cluster.name.length * 6 + 34;
    });
  }, [clusters, standaloneSignals, clusterEdges, onSelectSignal]);

  const sourceCount = tooltip.signal?.source_urls?.length || 0;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />

      {/* Tooltip */}
      {tooltip.visible && tooltip.signal && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div
            className="px-3 py-2 rounded-md"
            style={{
              background: '#1a1a24',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <div className="text-xs text-[#e8e8ed]" style={{ fontWeight: 400 }}>
              {tooltip.signal.title}
            </div>
            <div className="text-[10px] text-[#6b6b7b]" style={{ fontWeight: 300 }}>
              {sourceCount} source{sourceCount !== 1 ? 's' : ''} · {tooltip.signal.urgency || 'stable'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
