import { useEffect, useState, useCallback } from "react";
import { SystemStats } from "../types";
import { formatBytes } from "../lib/format";
import { Database, Activity, HardDrive, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

interface StatsDashboardProps {
  refreshTrigger: number;
}

interface FullStats extends SystemStats {
  activeBytes: number;
}

export default function StatsDashboard({ refreshTrigger }: StatsDashboardProps) {
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch system stats:", error);
    } finally {
      setLoading(false);
      // Brief timeout to show visual spin feedback
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  // Set up periodic sync
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStats();
    }, 15000); // 15s refresh
    return () => clearInterval(timer);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 p-6 md:px-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          Transfer Network Status
        </h3>
        
        <button
          onClick={fetchStats}
          disabled={isRefreshing}
          className="text-slate-400 hover:text-indigo-600 transition-colors duration-200 disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Force Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? "Syncing..." : "Sync"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Shares */}
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-indigo-100 transition-all duration-200"
        >
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Transfers</p>
            <p className="text-xl font-bold tracking-tight text-slate-900 font-mono">
              {stats?.activeTransfers ?? 0}
            </p>
          </div>
        </motion.div>

        {/* Storage Size Shared */}
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-teal-100 transition-all duration-200"
        >
          <div className="p-2.5 bg-teal-50 rounded-lg text-teal-600">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Transferred</p>
            <p className="text-xl font-bold tracking-tight text-slate-900 font-mono">
              {formatBytes(stats?.totalBytesShared ?? 0, 1)}
            </p>
          </div>
        </motion.div>

        {/* Current Hot Disk Cache */}
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-amber-100 transition-all duration-200"
        >
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Pending Cache</p>
            <p className="text-xl font-bold tracking-tight text-slate-900 font-mono">
              {formatBytes(stats?.activeBytes ?? 0, 1)}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
