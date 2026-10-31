import React, { useState } from 'react';
import { MapPin, Navigation, Info, Radio, Sparkles } from 'lucide-react';
import type { ZoneStatus } from '../../types';

interface FiveZoneDistrictMapProps {
  zones: Record<string, ZoneStatus>;
  selectedZone: string;
  onSelectZone: (zoneId: string) => void;
}

interface MapNode {
  id: string;
  name: string;
  shortName: string;
  cx: number;
  cy: number;
  population: string;
  facilities: string;
}

const DISTRICT_NODES: MapNode[] = [
  { id: 'Z1_SATHY', name: 'Zone 1 — Sathyamangalam', shortName: 'Sathyamangalam', cx: 140, cy: 90, population: '280k', facilities: 'Taluk Hospital' },
  { id: 'Z5_BHAVANI', name: 'Zone 5 — Bhavani', shortName: 'Bhavani', cx: 330, cy: 90, population: '320k', facilities: 'Govt Hospital' },
  { id: 'Z2_GOBI', name: 'Zone 2 — Gobichettipalayam', shortName: 'Gobichettipalayam', cx: 210, cy: 190, population: '390k', facilities: 'Taluk Hospital' },
  { id: 'Z3_ERODE', name: 'Zone 3 — Erode Urban', shortName: 'Erode Urban', cx: 380, cy: 200, population: '540k', facilities: 'Medical College & Dist HQ' },
  { id: 'Z4_PERUNDURAI', name: 'Zone 4 — Perundurai', shortName: 'Perundurai', cx: 260, cy: 290, population: '240k', facilities: 'IRT Medical College' },
];

const TRANSIT_LINKS = [
  { from: 'Z1_SATHY', to: 'Z2_GOBI', label: 'NH-209', syntheticFlow: '3.4k/day' },
  { from: 'Z2_GOBI', to: 'Z5_BHAVANI', label: 'SH-15', syntheticFlow: '4.8k/day' },
  { from: 'Z5_BHAVANI', to: 'Z3_ERODE', label: 'Bhavani Road', syntheticFlow: '9.2k/day' },
  { from: 'Z2_GOBI', to: 'Z4_PERUNDURAI', label: 'SH-81', syntheticFlow: '2.9k/day' },
  { from: 'Z4_PERUNDURAI', to: 'Z3_ERODE', label: 'NH-544 Corridor', syntheticFlow: '11.5k/day' },
];

export const FiveZoneDistrictMap: React.FC<FiveZoneDistrictMapProps> = ({
  zones,
  selectedZone,
  onSelectZone,
}) => {
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);

  const getNodeColor = (zoneId: string) => {
    const status = zones[zoneId]?.status_color || 'emerald';
    if (status === 'rose') return { fill: '#e11d48', stroke: '#fb7185', glow: 'drop-shadow(0 0 10px rgba(225, 29, 72, 0.7))' };
    if (status === 'amber') return { fill: '#d97706', stroke: '#fbbf24', glow: 'drop-shadow(0 0 10px rgba(217, 119, 6, 0.6))' };
    return { fill: '#059669', stroke: '#34d399', glow: 'drop-shadow(0 0 6px rgba(5, 150, 105, 0.4))' };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-indigo-400" />
            Interactive 5-Zone District Surveillance Schematic
          </h2>
          <p className="text-xs text-slate-400">
            Click any zone to filter timeline analysis & healthcare capacity forecasts.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Normal
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Investigation
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Priority Review
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[16/10] max-h-[360px] bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
        <svg
          viewBox="0 0 520 360"
          className="w-full h-full select-none"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            {/* Radial glow for selected zone */}
            <radialGradient id="selectGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <rect width="520" height="360" fill="url(#grid)" />

          {/* Boundary Background Polygon */}
          <path
            d="M 120 70 L 350 65 L 430 190 L 320 320 L 190 310 L 90 180 Z"
            fill="#0b1120"
            fillOpacity="0.6"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Transit Corridors */}
          {TRANSIT_LINKS.map((link, idx) => {
            const src = DISTRICT_NODES.find((n) => n.id === link.from);
            const dst = DISTRICT_NODES.find((n) => n.id === link.to);
            if (!src || !dst) return null;

            const midX = (src.cx + dst.cx) / 2;
            const midY = (src.cy + dst.cy) / 2;

            return (
              <g key={idx} className="transition-all">
                <line
                  x1={src.cx}
                  y1={src.cy}
                  x2={dst.cx}
                  y2={dst.cy}
                  stroke="#334155"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1={src.cx}
                  y1={src.cy}
                  x2={dst.cx}
                  y2={dst.cy}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
                <rect
                  x={midX - 35}
                  y={midY - 9}
                  width="70"
                  height="16"
                  rx="4"
                  fill="#030712"
                  stroke="#1e293b"
                  strokeWidth="0.8"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {link.label}
                </text>
              </g>
            );
          })}

          {/* District Zone Nodes */}
          {DISTRICT_NODES.map((node) => {
            const isSelected = selectedZone === node.id;
            const zStatus = zones[node.id];
            const colors = getNodeColor(node.id);
            const isActiveAnomaly = zStatus?.active_anomaly;

            return (
              <g
                key={node.id}
                onClick={() => onSelectZone(node.id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer group"
              >
                {/* Selection Halo */}
                {isSelected && (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r="44"
                    fill="url(#selectGlow)"
                    className="animate-pulse"
                  />
                )}

                {/* Animated Pulsing Ring for Active Anomalies */}
                {isActiveAnomaly && (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r="32"
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="2"
                    className="animate-pulse-ring"
                    opacity="0.75"
                  />
                )}

                {/* Outer Node Circle */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="24"
                  fill="#0f172a"
                  stroke={isSelected ? '#818cf8' : colors.stroke}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  style={{ filter: colors.glow }}
                  className="transition-all duration-200 group-hover:scale-105"
                />

                {/* Center Core Indicator */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="10"
                  fill={colors.fill}
                />

                {/* Zone Label Text */}
                <text
                  x={node.cx}
                  y={node.cy + 38}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : '#cbd5e1'}
                  fontSize="10"
                  fontWeight={isSelected ? '700' : '600'}
                  className="transition-colors group-hover:fill-white select-none"
                >
                  {node.shortName}
                </text>

                {/* Status Subtext */}
                <text
                  x={node.cx}
                  y={node.cy + 50}
                  textAnchor="middle"
                  fill={colors.stroke}
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {zStatus?.severity_level || 'Normal'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && zones[hoveredNode.id] && (
          <div className="absolute top-3 left-3 bg-slate-950/95 border border-slate-700/80 p-2.5 rounded-xl text-xs space-y-1 shadow-2xl pointer-events-none max-w-xs backdrop-blur-md z-20">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-white flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                {hoveredNode.name}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                zones[hoveredNode.id].status_color === 'rose'
                  ? 'bg-rose-950 text-rose-300'
                  : zones[hoveredNode.id].status_color === 'amber'
                  ? 'bg-amber-950 text-amber-300'
                  : 'bg-emerald-950 text-emerald-300'
              }`}>
                {zones[hoveredNode.id].severity_level}
              </span>
            </div>

            <div className="text-[11px] text-slate-300 space-y-0.5 pt-0.5">
              <div>Facility: <span className="text-slate-200">{hoveredNode.facilities}</span></div>
              <div>Anomaly Score: <span className="font-mono font-bold text-white">{(zones[hoveredNode.id].anomaly_score * 10).toFixed(1)}/10</span></div>
              {zones[hoveredNode.id].contributing_signals.length > 0 && (
                <div className="text-[10px] text-amber-300 pt-1">
                  Contributing: {zones[hoveredNode.id].contributing_signals.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Mobility transit corridors modeled with synthetic flow indicators</span>
        <span className="text-indigo-400">Selected Zone: {selectedZone}</span>
      </div>
    </div>
  );
};
