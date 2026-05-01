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
  Heart,
  Menu,
  X,
  LayoutDashboard,
  ShieldCheck,
  Info
} from 'lucide-react';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Prompt, Category } from './types';
import { promptService } from './services/promptService';
import { analyticsService } from './services/analyticsService';
import PromptCard from './components/PromptCard';
import PromptModal from './components/PromptModal';
import PublishModal from './components/PublishModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import AdminDashboard from './components/AdminDashboard';
import { AboutModal } from './components/AboutModal';

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
  const [view, setView] = useState<'Feed' | 'MyPrompts' | 'Favorites' | 'Admin'>('Feed');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptToEdit, setPromptToEdit] = useState<Prompt | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the about modal
    const hasSeenAbout = localStorage.getItem('prompt_registry_about_seen');
    if (!hasSeenAbout) {
      setIsAboutModalOpen(true);
      localStorage.setItem('prompt_registry_about_seen', 'true');
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && !user) {
        // Track sign in only when transitioning from logged out to logged in
        analyticsService.trackSignIn();
      }
      setUser(u);
    });
    
    // Track visit on initial mount
    analyticsService.trackVisit();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button') || target.closest('a');
      if (button) {
        // Priority: data-track > aria-label > title > textContent > id > 'unnamed_element'
        const label = button.getAttribute('data-track') || 
                      button.getAttribute('aria-label') || 
                      button.getAttribute('title') || 
                      button.textContent?.trim() || 
                      button.id || 
                      'unnamed_element';
                      
        // Clean up label: remove extra whitespace, symbols, and limit length
        const cleanLabel = label
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s-]/gi, '')
          .trim()
          .slice(0, 30);
          
        analyticsService.trackClick(cleanLabel || 'unnamed_element');
      }
    };

    window.addEventListener('click', handleClick);
    return () => {
      unsubscribe();
      window.removeEventListener('click', handleClick);
    };
  }, [user]);

  const fetchPrompts = async () => {
    setLoading(true);
    let data: Prompt[] = [];
    
    if (view === 'MyPrompts' && user) {
      data = await promptService.getUserPrompts(user.uid);
    } else if (view === 'Favorites' && user) {
      data = await promptService.getLikedPrompts(user.uid);
    } else {
      const cat = selectedCategory === 'All' ? undefined : selectedCategory;
      data = await promptService.getAllPrompts(cat, searchQuery);
    }
    
    setPrompts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrompts();
  }, [selectedCategory, view, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promptId = params.get('id');
    
    if (promptId && prompts.length > 0) {
      const p = prompts.find(p => p.id === promptId);
      if (p) {
        setSelectedPrompt(p);
        setIsPromptModalOpen(true);
        
        // Optional: clear the query param after opening to avoid re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [prompts]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchPrompts();
  };

  const handleLike = async (id: string) => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    // Optimistic Update
    setPrompts(prev => prev.map(p => {
      if (p.id === id) {
        const likes = p.likes || [];
        const isLiked = likes.includes(user.uid);
        return {
          ...p,
          likes: isLiked ? likes.filter(uid => uid !== user.uid) : [...likes, user.uid],
          likesCount: isLiked ? Math.max(0, (p.likesCount || 1) - 1) : (p.likesCount || 0) + 1
        };
      }
      return p;
    }));

    if (selectedPrompt?.id === id) {
      setSelectedPrompt(prev => {
        if (!prev) return null;
        const likes = prev.likes || [];
        const isLiked = likes.includes(user.uid);
        return {
          ...prev,
          likes: isLiked ? likes.filter(uid => uid !== user.uid) : [...likes, user.uid],
          likesCount: isLiked ? Math.max(0, (prev.likesCount || 1) - 1) : (prev.likesCount || 0) + 1
        };
      });
    }

    try {
      await promptService.toggleLike(id, user.uid);
      // We don't fetchPrompts() here to avoid the flicker and trust our optimistic update
      // But if we are in 'Favorites' view and just unliked, we might want to remove it eventually
      if (view === 'Favorites') {
        setTimeout(fetchPrompts, 1000); // Deferred refresh for Favorites view
      }
    } catch (error) {
      fetchPrompts();
    }
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
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">PromptRegistry</span>
          </div>
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
          <button 
            onClick={() => setIsAboutModalOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="About"
          >
            <Info className="w-5 h-5" />
          </button>
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

      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-40 w-72 md:w-64 bg-white md:bg-transparent border-r border-slate-200 p-6 shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out transform
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="space-y-8">
            <div>
              <div className="flex items-center justify-between md:block mb-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Categories</h3>
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-1">
                <li 
                  onClick={() => {
                    setView('Feed');
                    setSelectedCategory('All');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition-all ${
                    view === 'Feed' && selectedCategory === 'All' 
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
                    onClick={() => {
                      setView('Feed');
                      setSelectedCategory(cat.label);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                      view === 'Feed' && selectedCategory === cat.label 
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
                <li 
                  onClick={() => {
                    if (user) {
                      setView('Favorites');
                      setIsMobileMenuOpen(false);
                    } else {
                      signInWithGoogle();
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                    view === 'Favorites'
                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${view === 'Favorites' ? 'fill-current' : ''}`} />
                  <span>Favorites</span>
                </li>
                <li 
                  onClick={() => {
                    if (user) {
                      setView('MyPrompts');
                      setIsMobileMenuOpen(false);
                    } else {
                      signInWithGoogle();
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                    view === 'MyPrompts'
                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>My Published</span>
                </li>
                {user?.email === 'amitfinkel100@gmail.com' && (
                  <li 
                    onClick={() => {
                      setView('Admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                      view === 'Admin'
                      ? 'bg-rose-50 text-rose-700 font-bold shadow-sm' 
                      : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </li>
                )}
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        {view === 'Admin' ? (
          <AdminDashboard onBack={() => setView('Feed')} />
        ) : (
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                {view === 'MyPrompts' ? 'My Published' : view === 'Favorites' ? 'My Favorites' : 'Trending Prompts'}
              </h1>
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
                      userId={user?.uid}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          
          {!loading && prompts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                {view === 'Favorites' ? <Heart className="w-8 h-8 text-slate-300" /> : <PenTool className="w-8 h-8 text-slate-300" />}
              </div>
              <h3 className="text-lg font-semibold text-slate-800">
                {view === 'Favorites' ? 'No favorites yet' : 'No prompts published'}
              </h3>
              <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                {view === 'Favorites' 
                  ? 'Start exploring and heart your favorite prompts to see them here!' 
                  : 'Share your first professional prompt with the world!'}
              </p>
              {view === 'MyPrompts' && (
                <button 
                  onClick={() => setIsPublishModalOpen(true)}
                  className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Publish Your First Prompt
                </button>
              )}
            </div>
          )}
        </main>
      )}
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

      <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
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
