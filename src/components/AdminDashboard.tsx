import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  Eye, 
  LogIn, 
  ArrowLeft,
  Calendar,
  Layers,
  ArrowUpRight,
  Database,
  Loader2,
  Trash2,
  MousePointer2,
  Zap,
  RefreshCw,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { promptService } from '../services/promptService';

interface AdminStats {
  totalVisits: number;
  totalShares: number;
  totalSignIns: number;
  totalLikes: number;
  totalPrompts: number;
  totalClicks: number;
  clicksByButton?: Record<string, number>;
  userCount: number;
  promptCount: number;
  uniqueVisits?: number;
  users: any[];
  prompts: any[];
}

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState({ current: 0, total: 0 });
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsService.getAdminStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async (count: number) => {
    setSeeding(true);
    setSeedProgress({ current: 0, total: count });
    setSeedStatus(`Initializing seed of ${count} prompts...`);
    
    try {
      await promptService.seedSamplePrompts(count, (current, total) => {
        setSeedProgress({ current, total });
        if (current % 10 === 0 || current === total) {
          setSeedStatus(`Seeded ${current}/${total} prompts...`);
        }
      });
      
      setSeedStatus('Refreshing data...');
      const data = await analyticsService.getAdminStats();
      setStats(data);
      setSeedStatus(`Successfully seeded ${count} prompts!`);
      setTimeout(() => setSeedStatus(null), 5000);
    } catch (err) {
      setSeedStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleCleanup = async () => {
    setSeedStatus('Cleaning duplicates...');
    try {
      const removed = await promptService.cleanupDuplicates();
      const data = await analyticsService.getAdminStats();
      setStats(data);
      setSeedStatus(`Successfully removed ${removed} duplicates.`);
      setTimeout(() => setSeedStatus(null), 5000);
    } catch (err) {
      setSeedStatus('Cleanup failed.');
    }
  };

  const handlePurgeAndReseed = async () => {
    setSeeding(true);
    setSeedStatus("Starting deep purge...");
    
    try {
      let totalPurged = 0;
      let lastPurged = 1;
      
      // Purge in batches until empty or limit reached
      while (lastPurged > 0 && totalPurged < 500) {
        lastPurged = await promptService.purgeAllPrompts();
        totalPurged += lastPurged;
        setSeedStatus(`Purging older data... (${totalPurged} removed)`);
        if (lastPurged > 0) await new Promise(r => setTimeout(r, 200));
      }
      
      setSeedStatus(`Purge complete (${totalPurged} removed). Starting fresh seed...`);
      await handleSeed(50);
    } catch (err) {
      setSeedStatus(`Operation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setShowPurgeConfirm(false);
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-2xl text-center max-w-md">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">{error || 'You do not have permission to view this page.'}</p>
          <button 
            onClick={onBack}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors"
          >
            Back to Safety
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Visits', value: stats.totalVisits, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Unique Visitors', value: (stats as any).uniqueVisits || 0, icon: Layers, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Platform Users', value: stats.userCount, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Prompts', value: stats.promptCount, icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Likes', value: stats.totalLikes, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Total Shares', value: stats.totalShares, icon: Share2, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Total Clicks', value: stats.totalClicks || 0, icon: MousePointer2, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col h-full font-sans selection:bg-blue-100 italic-selection:bg-slate-900 selection:text-blue-900">
      {/* High-Tech Header */}
      <header className="h-20 border-b border-slate-100 flex items-center px-4 md:px-8 lg:px-12 justify-between bg-white relative z-20">
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={onBack}
            className="p-2.5 md:p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter leading-none mb-1">COMMAND CONSOLE</h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em]">System Level: Administrative • v1.0.4-Alpha</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
           <div className="hidden lg:block text-right">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Buffer Status</p>
              <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Synchronized • 0s Latency</p>
           </div>
           {seeding ? (
             <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 bg-blue-50 rounded-2xl border border-blue-100">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest">Compiling...</span>
             </div>
           ) : (
             <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Secured</span>
             </div>
           )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-8 lg:space-y-12">
          
          {/* Real-time Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-4 md:gap-6">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-default relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <stat.icon className="w-12 md:w-16 h-12 md:h-16" />
                </div>
                <div className={`w-8 h-8 md:w-10 md:h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:rotate-12 transition-transform`}>
                  <stat.icon className="w-4 md:w-5 h-4 md:h-5" />
                </div>
                <div>
                  <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter">{stat.value.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
             {/* System Engineering Panel */}
             <div className="lg:col-span-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-1 h-6 md:h-8 bg-blue-600 rounded-full" />
                      <div>
                         <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter">DATA SEEDING ENGINE</h3>
                         <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Synthetic Intelligence Injection</p>
                      </div>
                   </div>
                   <Database className="w-5 h-5 md:w-6 md:h-6 text-slate-200" />
                </div>
                
                <div className="p-6 md:p-10 space-y-10 lg:space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                      <div className="space-y-4 md:space-y-6">
                         <h4 className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-blue-500" />
                            Fast Deployment
                         </h4>
                         <p className="text-[11px] md:text-xs text-slate-500 font-medium italic leading-relaxed line-clamp-2 md:line-clamp-none">
                            "Directly inject high-fidelity architectural blueprints into the registry core. Optimized for initial system population."
                         </p>
                         <div className="grid grid-cols-2 gap-3 md:gap-4">
                            {[10, 50].map(count => (
                               <button
                                 key={count}
                                 onClick={() => handleSeed(count)}
                                 disabled={seeding}
                                 className="py-3 md:py-4 bg-slate-100 hover:bg-slate-900 border border-slate-200 hover:border-slate-900 text-slate-800 hover:text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-[0.98] group"
                               >
                                 {count} UNITS
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-4 md:space-y-6">
                         <h4 className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-purple-500" />
                            Extreme Load Build
                         </h4>
                         <p className="text-[11px] md:text-xs text-slate-500 font-medium italic leading-relaxed line-clamp-2 md:line-clamp-none">
                            "Concurrent archival of massive data clusters. Recommended for scalability benchmarking."
                         </p>
                         <div className="grid grid-cols-2 gap-3 md:gap-4">
                            {[100, 500].map(count => (
                               <button
                                 key={count}
                                 onClick={() => handleSeed(count)}
                                 disabled={seeding}
                                 className="py-3 md:py-4 bg-slate-100 hover:bg-blue-600 border border-slate-200 hover:border-blue-600 text-slate-800 hover:text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-[0.98]"
                               >
                                 {count} UNITS
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>

                   {seedStatus && (
                      <div className="p-6 md:p-8 bg-slate-900 rounded-2xl md:rounded-[2rem] relative overflow-hidden group">
                         <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-transparent" />
                         <div className="relative z-10 space-y-4 md:space-y-6">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                  <span className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest truncate max-w-[200px]">{seedStatus}</span>
                               </div>
                               <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase font-mono italic">
                                  {Math.round((seedProgress.current / seedProgress.total) * 100 || 0)}%
                               </span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                               <motion.div 
                                 className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                 initial={{ width: 0 }}
                                 animate={{ width: `${(seedProgress.current / (seedProgress.total || 1)) * 100}%` }}
                                 transition={{ duration: 0.3 }}
                               />
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>

             {/* Maintenance Architecture */}
             <div className="lg:col-span-4 space-y-6 md:space-y-8">
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm">
                   <h4 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-6">Core Maintenance</h4>
                   <div className="space-y-4">
                      <button
                        onClick={handleCleanup}
                        className="w-full flex items-center justify-between p-4 md:p-5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 rounded-xl md:rounded-2xl transition-all group"
                      >
                         <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-blue-600 transition-colors">
                               <RefreshCw className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-widest text-left">Deduplicate Archives</span>
                         </div>
                         <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </button>

                      {!showPurgeConfirm ? (
                        <button
                          onClick={() => setShowPurgeConfirm(true)}
                          disabled={seeding}
                          className="w-full flex items-center justify-between p-4 md:p-5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl md:rounded-2xl transition-all group"
                        >
                           <div className="flex items-center gap-4">
                              <div className="p-2 bg-white rounded-lg text-rose-400 group-hover:text-rose-600 transition-colors">
                                 <Trash2 className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] md:text-[11px] font-black text-rose-800 uppercase tracking-widest text-left">Protocol Reset</span>
                           </div>
                           <ChevronRight className="w-4 h-4 text-rose-300 group-hover:text-rose-600 transition-colors" />
                        </button>
                      ) : (
                        <div className="space-y-3 p-1">
                           <p className="text-[9px] md:text-[10px] font-black text-rose-600 uppercase tracking-widest text-center animate-pulse mb-2">INITIALIZING DEEP PURGE SEQUENCE</p>
                           <div className="flex gap-2">
                              <button
                                onClick={handlePurgeAndReseed}
                                disabled={seeding}
                                className="flex-1 py-3.5 md:py-4 bg-rose-600 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                              >
                                EXECUTE
                              </button>
                              <button
                                onClick={() => setShowPurgeConfirm(false)}
                                disabled={seeding}
                                className="px-4 md:px-6 py-3.5 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                              >
                                HALT
                              </button>
                           </div>
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                      <ShieldCheck className="w-24 md:w-32 h-24 md:h-32" />
                   </div>
                   <h4 className="text-[10px] md:text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] mb-3 md:mb-4">Security Protocol</h4>
                   <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed font-medium mb-6 md:mb-8">"Administrative actions are logged in the global audit trail. Level-7 lockdown protocol active."</p>
                   <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-white/10">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Secure</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-600 uppercase">Audit active</span>
                   </div>
                </div>
             </div>
          </div>

          {/* User & Blueprint Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-12">
             <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs md:text-sm">Operator Logs</h3>
                   </div>
                   <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase">{stats.userCount} IDs</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[500px]">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                         <tr>
                            <th className="px-6 md:px-8 py-3 md:py-4">Operator</th>
                            <th className="hidden sm:table-cell px-6 md:px-8 py-3 md:py-4">Credentials</th>
                            <th className="px-6 md:px-8 py-3 md:py-4">Entry</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {stats.users.map((u, i) => (
                            <tr key={u.uid || i} className="hover:bg-slate-50/50 transition-colors group">
                               <td className="px-6 md:px-8 py-4 md:py-6">
                                  <div className="flex items-center gap-3 md:gap-4">
                                     <div className="relative">
                                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-8 h-8 md:w-10 md:h-10 rounded-xl grayscale group-hover:grayscale-0 transition-all border border-slate-100 shadow-sm" alt="" />
                                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                                     </div>
                                     <span className="text-[11px] md:text-xs font-black text-slate-800 uppercase tracking-tighter truncate max-w-[80px] md:max-w-[120px]">{u.displayName}</span>
                                  </div>
                               </td>
                               <td className="hidden sm:table-cell px-6 md:px-8 py-4 md:py-6 text-[10px] text-slate-400 font-mono italic truncate max-w-[150px]">{u.email}</td>
                               <td className="px-6 md:px-8 py-4 md:py-6 text-[10px] text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">
                                  {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>

             <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs md:text-sm">Blueprint Streams</h3>
                   </div>
                   <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase">{stats.promptCount} Clusters</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[500px]">
                   <div className="divide-y divide-slate-50">
                      {stats.prompts.map((p, i) => (
                         <div key={p.id || i} className="p-6 md:p-8 hover:bg-slate-50/50 transition-all group flex items-start justify-between">
                            <div className="flex-1 pr-4 md:pr-6">
                               <div className="flex items-center gap-2 md:gap-3 mb-2">
                                  <span className="text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 bg-slate-900 text-white rounded uppercase tracking-[0.2em]">{p.category}</span>
                                  <span className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest">By {p.authorName}</span>
                               </div>
                               <h4 className="text-xs md:text-sm font-black text-slate-800 tracking-tighter mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{p.title}</h4>
                               <p className="text-[9px] md:text-[10px] text-slate-400 font-medium italic line-clamp-1 opacity-70">"{p.description}"</p>
                            </div>
                            <div className="flex items-center gap-4 md:gap-6 text-slate-300">
                               <div className="text-center group-hover:text-rose-500 transition-colors">
                                  <Heart className="w-3 md:w-4 h-3 md:h-4 mb-1" />
                                  <p className="text-[9px] md:text-[10px] font-black">{p.likesCount || 0}</p>
                                </div>
                               <div className="text-center group-hover:text-blue-500 transition-colors">
                                  <Eye className="w-3 md:w-4 h-3 md:h-4 mb-1" />
                                  <p className="text-[9px] md:text-[10px] font-black">{p.usageCount || 0}</p>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
