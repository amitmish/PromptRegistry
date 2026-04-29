import { motion } from 'motion/react';
import { Heart, Share2, Copy, Check, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { Prompt } from '../types';
import { useState, MouseEvent } from 'react';

interface PromptCardProps {
  prompt: Prompt;
  onLike: (id: string) => void;
  onClick: (prompt: Prompt) => void;
  onEdit?: (prompt: Prompt) => void;
  onDelete?: (id: string) => void;
  isAuthor?: boolean;
}

export default function PromptCard({ prompt, onLike, onClick, onEdit, onDelete, isAuthor }: PromptCardProps) {
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

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full hover:border-slate-300"
      onClick={() => onClick(prompt)}
      id={`prompt-card-${prompt.id}`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${getCategoryStyles(prompt.category)}`}>
          {prompt.category}
        </span>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button 
                onClick={handleEdit}
                className="p-2 hover:bg-slate-100 rounded-full text-blue-600 hover:text-blue-700 transition-colors relative z-10"
                title="Edit Prompt"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                className="p-2 hover:bg-rose-100/50 rounded-full text-rose-500 hover:text-rose-600 transition-colors relative z-10"
                title="Delete Prompt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          <TrendingUp className="w-3 h-3" />
          <span>{prompt.usageCount || 0}</span>
        </div>
      </div>

      <h4 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
        {prompt.title}
      </h4>
      
      <p className="text-slate-500 text-sm mb-6 line-clamp-2 italic leading-relaxed flex-grow">
        "{prompt.description}"
      </p>

      <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold overflow-hidden shadow-inner">
            {prompt.authorPhotoURL ? (
              <img src={prompt.authorPhotoURL} alt={prompt.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              prompt.authorName.charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-xs font-medium text-slate-600">@{prompt.authorName.toLowerCase().replace(/\s+/g, '_')}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleShare}
            className="text-slate-400 hover:text-blue-600 transition-colors"
            title="Share direct link"
          >
            {shared ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onLike(prompt.id); }}
            className="flex items-center gap-1 text-slate-400 hover:text-rose-500 transition-colors px-1"
          >
            <Heart className={`w-3.5 h-3.5 ${prompt.likesCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="text-[11px] font-bold">{prompt.likesCount}</span>
          </button>
          <button 
            onClick={handleCopy}
            className="text-blue-600 text-xs font-bold hover:text-blue-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
