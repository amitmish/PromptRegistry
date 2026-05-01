import { motion } from 'motion/react';
import { Heart, Share2, Copy, Check, TrendingUp, Pencil, Trash2, Database, PenTool, Palette, Image as ImageIcon, Briefcase, Cpu } from 'lucide-react';
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
      case 'Coding': return 'bg-emerald-100 text-emerald-700';
      case 'Writing': return 'bg-blue-100 text-blue-700';
      case 'Creative': return 'bg-purple-100 text-purple-700';
      case 'Images': return 'bg-pink-100 text-pink-700';
      case 'Business': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const renderCategoryIcon = (category: string) => {
    const className = "w-10 h-10 opacity-30";
    switch (category) {
      case 'Coding': return <Database className={className} />;
      case 'Writing': return <PenTool className={className} />;
      case 'Creative': return <Palette className={className} />;
      case 'Images': return <ImageIcon className={className} />;
      case 'Business': return <Briefcase className={className} />;
      default: return <PenTool className={className} />;
    }
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full hover:border-slate-300"
      onClick={() => onClick(prompt)}
      id={`prompt-card-${prompt.id}`}
    >
      <div className="relative h-40 bg-slate-50 overflow-hidden border-b border-slate-100 flex items-center justify-center">
        {prompt.resultImage ? (
          <img 
            src={prompt.resultImage} 
            alt={prompt.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 w-full h-full group-hover:bg-slate-100 transition-colors">
            {renderCategoryIcon(prompt.category)}
            <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{prompt.category} Prompt</p>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 text-[10px] font-bold rounded-lg shadow-sm backdrop-blur-md uppercase tracking-wider ${getCategoryStyles(prompt.category)}`}>
            {prompt.category}
          </span>
        </div>
        {isAuthor && (
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleEdit}
              className="p-1.5 bg-white shadow-sm hover:bg-slate-50 rounded-lg text-blue-600 transition-colors relative z-10 border border-slate-100"
              title="Edit Prompt"
              data-track="Edit Prompt Card"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-1.5 bg-white shadow-sm hover:bg-rose-50 rounded-lg text-rose-500 transition-colors relative z-10 border border-slate-100"
              title="Delete Prompt"
              data-track="Delete Prompt Card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 flex-grow pr-2">
            {prompt.title}
          </h4>
          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <TrendingUp className="w-3 h-3" />
            <span>{prompt.usageCount || 0}</span>
          </div>
        </div>

        {prompt.aiModel && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
              <Cpu className="w-2.5 h-2.5" />
              <span>Best running with: <span className="text-slate-600">{prompt.aiModel}</span></span>
            </div>
          </div>
        )}
        
        <p className="text-slate-500 text-sm mb-6 line-clamp-2 italic leading-relaxed flex-grow">
          "{prompt.description}"
        </p>

        <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold overflow-hidden shadow-inner">
              {prompt.authorPhotoURL ? (
                <img src={prompt.authorPhotoURL} alt={prompt.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (prompt.authorName || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">@{ (prompt.authorName || 'user').toLowerCase().replace(/\s+/g, '_')}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleShare}
              className="text-slate-400 hover:text-blue-600 transition-colors"
              title="Share direct link"
              data-track="Share Prompt Card"
            >
              {shared ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onLike(prompt.id); }}
              className={`flex items-center gap-1 transition-colors px-1 ${
                userId && prompt.likes?.includes(userId) ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
              }`}
              data-track="Like Prompt Card"
            >
              <Heart className={`w-3.5 h-3.5 ${userId && prompt.likes?.includes(userId) ? 'fill-current' : ''}`} />
              <span className="text-[11px] font-bold">{prompt.likesCount || 0}</span>
            </button>
            <button 
              onClick={handleCopy}
              className="text-blue-600 text-[10px] font-bold uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 px-2 py-1 rounded-lg"
              data-track="Copy Prompt Card"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
