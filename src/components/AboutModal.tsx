import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  MessageSquare, 
  Share2, 
  ArrowRight, 
  Cpu, 
  Terminal, 
  Sparkles 
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

            <div className="p-6 sm:p-8 md:p-12">
              <div className="flex items-center gap-3 mb-6 pr-8">
                <div className="p-2.5 sm:p-3 bg-blue-50 rounded-xl sm:rounded-2xl shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight mb-0.5">Welcome to Prompt Registry</h2>
                  <p className="text-slate-500 font-medium font-mono text-[10px] uppercase tracking-widest">v1.0 Architecture</p>
                </div>
              </div>

              <div className="prose prose-slate mb-8 sm:mb-10">
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  The central hub for high-performance AI engineering. Discover, share, and optimize complex prompts for the world's most advanced language models.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
                <div className="p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                  <div className="mb-3 p-2 bg-white rounded-lg sm:rounded-xl w-fit shadow-sm border border-slate-200">
                    <Search className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 text-sm">Discover</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Search through thousands of verified technical prompts.</p>
                </div>

                <div className="p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                  <div className="mb-3 p-2 bg-white rounded-lg sm:rounded-xl w-fit shadow-sm border border-slate-200">
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 text-sm">Collaborate</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Like and bookmark prompts to build your personalized library.</p>
                </div>

                <div className="p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                  <div className="mb-3 p-2 bg-white rounded-lg sm:rounded-xl w-fit shadow-sm border border-slate-200">
                    <Terminal className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 text-sm">Execute</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Copy high-fidelity content ready for any professional workflow.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                  <Cpu className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium">Enterprise Grade Infrastructure</span>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all group text-sm sm:text-base"
                >
                  Start Engineering
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
