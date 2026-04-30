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
  ArrowUpRight
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

interface AdminStats {
  totalVisits: number;
  totalShares: number;
  totalSignIns: number;
  totalLikes: number;
  totalPrompts: number;
  userCount: number;
  promptCount: number;
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
  }, []);

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
  ];

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Command Center</h1>
            <p className="text-slate-500 text-sm">Real-time platform health and activity tracking</p>
          </div>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center"
            >
              <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl mb-3`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-800">{stat.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Recent Users</h3>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full uppercase tracking-wider">
                Total: {stats.userCount}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.users.slice(0, 10).map((u, i) => (
                    <tr key={u.uid || i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                            className="w-8 h-8 rounded-full shadow-sm"
                            alt={u.displayName}
                          />
                          <span className="text-sm font-bold text-slate-700">{u.displayName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 font-mono">{u.email}</td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats.users.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic">No users found yet</div>
              )}
            </div>
          </div>

          {/* Recent Prompts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">Latest Prompts</h3>
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-wider">
                Total: {stats.promptCount}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <div className="divide-y divide-slate-50">
                {stats.prompts.slice(0, 10).map((p, i) => (
                  <div key={p.id || i} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex-1 pr-4">
                      <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{p.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="font-bold text-slate-500 uppercase tracking-widest">{p.category}</span>
                        <span>•</span>
                        <span>by {p.authorName}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="flex flex-col items-center">
                        <Heart className="w-3.5 h-3.5 mb-1" />
                        <span className="text-[10px] font-bold">{p.likesCount || 0}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Eye className="w-3.5 h-3.5 mb-1" />
                        <span className="text-[10px] font-bold">{p.usageCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {stats.prompts.length === 0 && (
                  <div className="p-8 text-center text-slate-400 italic">No prompts published yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
