import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, User, Calendar, Tag } from 'lucide-react';
import { Prompt } from '../types';
import { useState } from 'react';

interface PromptModalProps {
  prompt: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptModal({ prompt, isOpen, onClose }: PromptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!prompt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Coding': return 'bg-emerald-100 text-emerald-700';
      case 'Writing': return 'bg-blue-100 text-blue-700';
      case 'Creative': return 'bg-purple-100 text-purple-700';
      case 'Business': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
            id="prompt-modal"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${getCategoryStyles(prompt.category)}`}>
                    {prompt.category}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{prompt.title}</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pb-10 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                    {prompt.authorPhotoURL ? (
                      <img src={prompt.authorPhotoURL} alt={prompt.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Author</p>
                    <p className="text-sm font-semibold text-slate-700">@{prompt.authorName.toLowerCase().replace(/\s+/g, '_')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Published</p>
                    <p className="text-sm font-semibold text-slate-700">
                      May 12, 2024
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Type</p>
                    <p className="text-sm font-semibold text-slate-700">
                      Standard
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-10">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Goal & Context</h4>
                <p className="text-slate-600 leading-relaxed text-sm italic">
                  "{prompt.description}"
                </p>
              </div>

              <div className="relative group">
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={handleCopy}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 shadow-md rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-all transform active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-6 pt-14 border border-slate-200 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[200px] shadow-inner">
                  {prompt.content}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Professional Prompt Registry
              </div>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors"
              >
                Close View
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
