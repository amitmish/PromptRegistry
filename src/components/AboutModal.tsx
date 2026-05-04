import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  MessageSquare, 
  ArrowRight, 
  Cpu, 
  Terminal, 
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl z-[101] overflow-y-auto border border-slate-200"
          >
            {/* Header / Accent */}
            <div className="sticky top-0 z-20">
              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            </div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-10 md:p-16">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-slate-900 rounded-2xl shadow-2xl shadow-blue-500/20">
                    <Terminal className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-none mb-1">SYSTEM PROTOCOL</h2>
                    <p className="text-blue-600 font-black font-mono text-[10px] uppercase tracking-[0.3em]">Registry Operations • v1.0.4</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Core Status: Optimal</span>
                </div>
              </div>

              <div className="space-y-8 mb-12">
                <div className="bg-slate-900 rounded-3xl p-8 font-mono text-xs sm:text-sm text-blue-400/80 leading-relaxed border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Cpu className="w-24 h-24" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <p><span className="text-blue-500 font-black">❯ INITIALIZING_REGISTRY...</span></p>
                    <p>The Prompt Registry is a high-fidelity execution layer designed for advanced AI engineering. It serves as a decentralized archive of optimized instructions, enabling seamless deployment across multi-model architectures.</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                       <div>
                          <p className="text-blue-600 font-black text-[10px] mb-1">LATENCY</p>
                          <p className="text-white text-xl font-black tracking-tighter">12ms</p>
                       </div>
                       <div>
                          <p className="text-blue-600 font-black text-[10px] mb-1">THROUGHPUT</p>
                          <p className="text-white text-xl font-black tracking-tighter">4.2 GB/s</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="group">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Search className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Query Layer</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Deep-index search capabilities across verified architectural blueprints.</p>
                </div>

                <div className="group">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Fast Deploy</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Single-cycle compilation of dynamic parameters into model-ready payloads.</p>
                </div>

                <div className="group">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <Globe className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Network Sync</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Collaborative intelligence sharing within a global engineering framework.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />)}
                   </div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connected Architects</span>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 group"
                >
                  Authorize System Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Subtle Grid Pattern Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] -z-10" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
