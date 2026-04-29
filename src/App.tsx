import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Sparkles, 
  Code, 
  PenTool, 
  Palette, 
  Briefcase, 
  TrendingUp,
  Image,
  LogIn,
  LogOut,
  ChevronRight,
  Heart
} from 'lucide-react';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Prompt, Category } from './types';
import { promptService } from './services/promptService';
import PromptCard from './components/PromptCard';
import PromptModal from './components/PromptModal';
import PublishModal from './components/PublishModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

const CATEGORIES: { label: Category; icon: any }[] = [
  { label: 'Coding', icon: Code },
  { label: 'Writing', icon: PenTool },
  { label: 'Creative', icon: Palette },
  { label: 'Images', icon: Image },
  { label: 'Business', icon: Briefcase },
  { label: 'Other', icon: Sparkles },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptToEdit, setPromptToEdit] = useState<Prompt | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    const cat = selectedCategory === 'All' ? undefined : selectedCategory;
    const data = await promptService.getAllPrompts(cat, searchQuery);
    setPrompts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrompts();
  }, [selectedCategory]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchPrompts();
  };

  const handleLike = async (id: string) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    await promptService.likePrompt(id);
    fetchPrompts();
  };

  const handlePromptClick = (p: Prompt) => {
    setSelectedPrompt(p);
    setIsPromptModalOpen(true);
  };

  const handleEditClick = (p: Prompt) => {
    setPromptToEdit(p);
    setIsPublishModalOpen(true);
  };

  const handleDeletePrompt = (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      setPromptToDelete(prompt);
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (promptToDelete) {
      await promptService.deletePrompt(promptToDelete.id);
      fetchPrompts();
      setPromptToDelete(null);
    }
  };

  const handlePublish = async (data: any) => {
    if (promptToEdit) {
      await promptService.updatePrompt(promptToEdit.id, data);
    } else {
      await promptService.createPrompt(data);
    }
    fetchPrompts();
  };

  const closePublishModal = () => {
    setIsPublishModalOpen(false);
    setPromptToEdit(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">PromptRegistry</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for professional prompts (e.g., 'React Refactor')" 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>

        <div className="flex items-center gap-4 shrink-0 pl-4">
          {user ? (
            <>
              <button 
                onClick={() => setIsPublishModalOpen(true)}
                className="hidden sm:block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
              >
                Publish Prompt
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <img src={user.photoURL || ''} className="w-9 h-9 rounded-full border border-slate-200 object-cover" alt="" />
                <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="px-5 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-all flex items-center gap-2 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white md:bg-transparent border-b md:border-b-0 md:border-r border-slate-200 p-6 shrink-0 overflow-y-auto">
          <nav className="space-y-8">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Categories</h3>
              <ul className="space-y-1">
                <li 
                  onClick={() => setSelectedCategory('All')}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition-all ${
                    selectedCategory === 'All' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4" />
                    <span>All Prompts</span>
                  </div>
                </li>
                {CATEGORIES.map((cat) => (
                  <li 
                    key={cat.label}
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                      selectedCategory === cat.label 
                      ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <cat.icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Workspace</h3>
              <ul className="space-y-1">
                <li className="flex items-center gap-3 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 cursor-pointer">
                  <Heart className="w-4 h-4" />
                  <span>Favorites</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 cursor-pointer">
                  <PenTool className="w-4 h-4" />
                  <span>My Published</span>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Feed */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Trending Prompts</h1>
              <p className="text-sm text-slate-500 mt-1">Discover, copy, and share high-quality AI instructions.</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:border-slate-300 transition-colors shadow-sm cursor-default">
                Most Popular
              </button>
              <button 
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); fetchPrompts(); }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {[1, 2, 4, 5, 6, 7].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 h-56 animate-pulse shadow-sm">
                  <div className="flex justify-between mb-4">
                    <div className="h-6 w-16 bg-slate-50 rounded"></div>
                    <div className="h-6 w-16 bg-slate-50 rounded"></div>
                  </div>
                  <div className="h-8 w-3/4 bg-slate-50 rounded mb-4"></div>
                  <div className="h-16 w-full bg-slate-50 rounded"></div>
                </div>
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No matching prompts</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                Try searching for something else or browse different categories to find inspiration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-12">
              <AnimatePresence mode="popLayout">
                {prompts.map((prompt) => (
                  <motion.div
                    key={prompt.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PromptCard 
                      prompt={prompt} 
                      onLike={handleLike}
                      onClick={handlePromptClick}
                      onEdit={handleEditClick}
                      onDelete={handleDeletePrompt}
                      isAuthor={user?.uid === prompt.authorId}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <PromptModal 
        isOpen={isPromptModalOpen} 
        onClose={() => setIsPromptModalOpen(false)} 
        prompt={selectedPrompt} 
      />
      
      <PublishModal 
        isOpen={isPublishModalOpen} 
        onClose={closePublishModal} 
        onPublish={handlePublish}
        initialData={promptToEdit}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setPromptToDelete(null); }}
        onConfirm={confirmDelete}
        title={promptToDelete?.title || ''}
      />
      
      {/* Mobile FAB */}
      {user && (
        <button 
          onClick={() => setIsPublishModalOpen(true)}
          className="fixed bottom-8 right-8 sm:hidden w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-all z-40 border-4 border-white"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}
