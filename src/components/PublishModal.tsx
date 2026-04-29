import { motion, AnimatePresence } from 'motion/react';
import { X, Send, AlertCircle, Save } from 'lucide-react';
import { useState, FormEvent, useEffect } from 'react';
import { Category, Prompt } from '../types';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (data: {
    title: string;
    description: string;
    content: string;
    category: Category;
    tags: string[];
  }) => Promise<void>;
  initialData?: Prompt | null;
}

export default function PublishModal({ isOpen, onClose, onPublish, initialData }: PublishModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('Coding');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setContent(initialData.content);
      setCategory(initialData.category);
      setTags(initialData.tags.join(', '));
    } else {
      setTitle('');
      setDescription('');
      setContent('');
      setCategory('Coding');
      setTags('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !content || !category) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await onPublish({
        title,
        description,
        content,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      onClose();
    } catch (err) {
      setError('Failed to save prompt. Please try again.');
    } finally {
      setIsSubmitting(false);
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
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
            id="publish-modal"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {initialData ? 'Edit Prompt' : 'Publish New Prompt'}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Prompt Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Code Refactoring Assistant"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="Coding">Coding</option>
                    <option value="Writing">Writing</option>
                    <option value="Creative">Creative</option>
                    <option value="Business">Business</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Tags
                  </label>
                  <input 
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="react, clean-code"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Goal & Context
                </label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this prompt help with?"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Prompt Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your prompt here..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none shadow-inner"
                />
              </div>

              <div className="pt-6 flex space-x-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-slate-50 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {initialData ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      <span>{initialData ? 'Update Prompt' : 'Publish Prompt'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
