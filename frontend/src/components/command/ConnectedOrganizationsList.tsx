import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Cpu, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Database,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import type { AdminOrganization } from '../../types';

interface ConnectedOrganizationsListProps {
  selectedZone: string;
  onSelectOrganization?: (orgId: string) => void;
}

export const ConnectedOrganizationsList: React.FC<ConnectedOrganizationsListProps> = ({
  selectedZone,
  onSelectOrganization,
}) => {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Map zone to location ID
  const zoneToLoc: Record<string, string> = {
    Z1_SATHY: 'SATHYAMANGALAM',
    Z2_GOBI: 'GOBICHETTIPALAYAM',
    Z3_ERODE: 'ERODE',
    Z4_PERUNDURAI: 'ERODE',
    Z5_BHAVANI: 'SATHYAMANGALAM',
  };

  const locId = zoneToLoc[selectedZone] || 'SATHYAMANGALAM';

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getAdminOrganizations(locId)
      .then((res) => {
        if (isMounted) setOrganizations(res.organizations || []);
      })
      .catch((err) => {
        console.warn('Could not load organizations:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [locId]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'pharmacy':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'clinic':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'laboratory':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'school':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'hospital':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Sentinel Data Partners ({locId})
          </h2>
          <p className="text-xs text-slate-400">
            Tenant-isolated edge nodes transmitting aggregated privacy-preserved telemetry into central command.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 self-start sm:self-auto flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Zero Direct Identifiers
        </span>
      </div>

      {/* Grid of Partner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-1">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl hover:border-slate-700 hover:bg-slate-950 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getTypeBadge(org.type)}`}>
                  {org.type}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-200 line-clamp-1" title={org.name}>
                  {org.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5" title={org.id}>
                  {org.id}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{org.connector.records_count} records</span>
              {onSelectOrganization && (
                <button
                  onClick={() => onSelectOrganization(org.id)}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 text-[10px] font-sans font-medium"
                >
                  View Client <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

