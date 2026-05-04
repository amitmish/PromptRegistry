import { motion } from 'motion/react';
import { 
  Heart, 
  Share2, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Database, 
  PenTool, 
  Palette, 
  Image as ImageIcon, 
  Briefcase, 
  Cpu,
  Terminal,
  Layers,
  Sparkles
} from 'lucide-react';
import { Prompt } from '../types';
import { useState, MouseEvent } from 'react';
import { analyticsService } from '../services/analyticsService';

interface PromptCardProps {
  prompt: Prompt;
  onLike: (id: string) => void;
  onClick: (prompt: Prompt) => void;
  onEdit?: (prompt: Prompt) => void;
  onDelete?: (id: string) => void;
  isAuthor?: boolean;
  userId?: string;
}

export default function PromptCard({ prompt, onLike, onClick, onEdit, onDelete, isAuthor, userId }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (e: MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${prompt.id}`;
    navigator.clipboard.writeText(shareUrl);
    setShared(true);
    analyticsService.trackShare();
    setTimeout(() => setShared(false), 2000);
  };

  const handleEdit = (e: MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(prompt);
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(prompt.id);
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Coding': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Writing': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Images': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Business': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const renderCategoryIcon = (category: string) => {
    const className = "w-4 h-4";
    switch (category) {
      case 'Coding': return <Terminal className={className} />;
      case 'Writing': return <PenTool className={className} />;
      case 'Creative': return <Palette className={className} />;
      case 'Images': return <ImageIcon className={className} />;
      case 'Business': return <Briefcase className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  // Detect variables
  const variables = prompt.content.match(/\{\{([^}]+)\}\}/g) || [];

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer group flex flex-col h-full hover:border-blue-400/30"
      onClick={() => onClick(prompt)}
      id={`prompt-card-${prompt.id}`}
    >
      {/* Visual Header */}
      <div className="relative h-44 bg-slate-50 overflow-hidden border-b border-slate-100">
        {prompt.resultImage ? (
          <>
            <img 
              src={prompt.resultImage} 
              alt={prompt.title} 
              className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 group-hover:bg-blue-50/30 transition-colors">
             <div className="opacity-10 scale-[3]">
                {renderCategoryIcon(prompt.category)}
             </div>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className={`px-2.5 py-1 text-[10px] font-black rounded-lg shadow-sm border uppercase tracking-[0.1em] flex items-center gap-1.5 backdrop-blur-md ${getCategoryStyles(prompt.category)}`}>
            {renderCategoryIcon(prompt.category)}
            {prompt.category}
          </div>
          {variables.length > 0 && (
            <div className="px-2.5 py-1 text-[10px] font-black bg-blue-600 text-white rounded-lg shadow-sm uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Cpu className="w-3 h-3" />
              Dynamic
            </div>
          )}
        </div>

        {/* Author Actions */}
        {isAuthor && (
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
            <button 
              onClick={handleEdit}
              className="p-2 bg-white/90 backdrop-blur-md shadow-lg hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-white/20"
              title="Edit Prompt"
              data-track="Edit Prompt Card"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-2 bg-white/90 backdrop-blur-md shadow-lg hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-white/20"
              title="Delete Prompt"
              data-track="Delete Prompt Card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* Title & Model */}
        <div className="mb-4">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
            {prompt.aiModel}
          </div>
          <h4 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
            {prompt.title}
          </h4>
        </div>

        <p className="text-slate-500 text-sm mb-6 line-clamp-3 italic leading-relaxed flex-1">
          "{prompt.description}"
        </p>

        {/* Footer Meta */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm">
                {prompt.authorPhotoURL ? (
                  <img src={prompt.authorPhotoURL} alt={prompt.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  (prompt.authorName || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Architect</p>
              <p className="text-[11px] font-bold text-slate-700 leading-none">{(prompt.authorName || 'User')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg"
              title="Share Link"
              data-track="Share Prompt Card"
            >
              {shared ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onLike(prompt.id); }}
              className={`flex items-center gap-1.5 p-2 rounded-lg transition-all ${
                userId && prompt.likes?.includes(userId) ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400 hover:text-rose-500'
              }`}
              data-track="Like Prompt Card"
            >
              <Heart className={`w-4 h-4 ${userId && prompt.likes?.includes(userId) ? 'fill-current' : ''}`} />
              <span className="text-[11px] font-black">{prompt.likesCount || 0}</span>
            </button>
            <button 
              onClick={handleCopy}
              className="px-3 py-2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all rounded-lg shadow-sm active:scale-95"
              data-track="Copy Prompt Card"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
