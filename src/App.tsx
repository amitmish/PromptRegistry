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
  Info,
  Terminal
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
    <div className="flex h-screen bg-white overflow-hidden text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Architecture */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 border-r border-slate-200 transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => { setView('Feed'); setSelectedCategory('All'); setIsMobileMenuOpen(false); }}>
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tighter leading-none text-slate-800">REGISTRY</h1>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">v1.0.4 • Alpha</p>
              </div>
            </div>

            <nav className="space-y-1">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 ml-3">System Archives</div>
              <button 
                onClick={() => { setView('Feed'); setSelectedCategory('All'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                  view === 'Feed' && selectedCategory === 'All' ? 'bg-white shadow-xl shadow-blue-500/5 border border-slate-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Main Registry</span>
                </div>
                {view === 'Feed' && selectedCategory === 'All' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-lg shadow-blue-500" />}
              </button>

              {CATEGORIES.map(({ label, icon: Icon }) => (
                <button 
                  key={label}
                  onClick={() => { setView('Feed'); setSelectedCategory(label); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                    view === 'Feed' && selectedCategory === label ? 'bg-white shadow-xl shadow-blue-500/5 border border-slate-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{label}</span>
                  </div>
                  {view === 'Feed' && selectedCategory === label && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-lg shadow-blue-500" />}
                </button>
              ))}
            </nav>

            <div className="mt-12">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 ml-3">Personal Core</div>
              <div className="space-y-1">
                <button 
                  onClick={() => { if (user) setView('Favorites'); else signInWithGoogle(); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                    view === 'Favorites' ? 'bg-white shadow-sm border border-slate-100 text-rose-500' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${view === 'Favorites' ? 'fill-current' : ''}`} />
                  <span className="text-xs font-black uppercase tracking-widest">Bookmarks</span>
                </button>
                <button 
                  onClick={() => { if (user) setView('MyPrompts'); else signInWithGoogle(); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                    view === 'MyPrompts' ? 'bg-white shadow-sm border border-slate-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">My Blueprints</span>
                </button>
                
                {user?.email === 'amitfinkel100@gmail.com' && (
                  <div className="pt-4 mt-4 border-t border-slate-200/60">
                    <button 
                      onClick={() => { setView('Admin'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all group overflow-hidden relative ${
                        view === 'Admin' ? 'bg-slate-900 text-white shadow-2xl' : 'bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div className="relative z-10 flex items-center gap-3">
                        <ShieldCheck className={`w-4 h-4 ${view === 'Admin' ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Command Console</span>
                      </div>
                      <div className="relative z-10 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${view === 'Admin' ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-emerald-500'}`} />
                      </div>
                      {view === 'Admin' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto p-6 border-t border-slate-100 bg-white/50">
            {user ? (
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100">
                <div className="relative">
                  <img src={user.photoURL!} className="w-10 h-10 rounded-xl shadow-sm border border-slate-200" alt="" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 truncate leading-none mb-1">{user.displayName?.split(' ')[0]}</p>
                  <button 
                    onClick={() => signOut(auth)} 
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
              >
                Sync Device
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Execution Hub */}
      <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        {/* Universal Header */}
        <header className="h-20 border-b border-slate-100 flex items-center px-6 md:px-12 gap-8 bg-white/80 backdrop-blur-xl z-30 sticky top-0">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="relative flex-1 group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <form onSubmit={handleSearch}>
              <input 
                type="text"
                placeholder="Query specialized architecture archives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-transparent text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 placeholder:uppercase placeholder:tracking-widest"
              />
            </form>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsAboutModalOpen(true)}
               className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
             >
               <Info className="w-5 h-5" />
             </button>
             {user && (
               <button 
                 onClick={() => setIsPublishModalOpen(true)}
                 className="hidden md:flex px-8 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 items-center gap-2"
               >
                 <Plus className="w-4 h-4" />
                 Register Blueprint
               </button>
             )}
          </div>
        </header>

        {/* Scrollable View Layer */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-slate-100/30">
          <div className="max-w-7xl mx-auto space-y-16">
            
            {view === 'Admin' ? (
              <AdminDashboard onBack={() => setView('Feed')} />
            ) : (
              <>
                {/* Bento Hero (Featured) */}
                {prompts.length > 0 && searchQuery === '' && selectedCategory === 'All' && view === 'Feed' && !loading && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                     <div 
                      className="md:col-span-8 group relative aspect-[21/9] md:aspect-auto md:h-[400px] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center p-8 md:p-16 border border-white/10 cursor-pointer" 
                      onClick={() => handlePromptClick(prompts[0])}
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/50 via-slate-900 to-slate-900" />
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent" />
                        
                        <div className="relative z-10 max-w-lg">
                           <div className="flex items-center gap-2 mb-6">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                              <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg backdrop-blur-md">Featured Architecture</span>
                           </div>
                           <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4 leading-[0.95]">{prompts[0].title}</h2>
                           <p className="text-slate-400 text-base md:text-lg mb-10 line-clamp-2 italic font-medium opacity-80">"{prompts[0].description}"</p>
                           <div className="flex items-center gap-4">
                              <button className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-xl shadow-blue-500/30">
                                 Open Blueprint <ChevronRight className="w-4 h-4" />
                              </button>
                           </div>
                        </div>

                        {prompts[0].resultImage && (
                          <div className="hidden lg:block absolute right-[-5%] top-[-5%] bottom-[-5%] w-1/2 overflow-hidden opacity-30 group-hover:opacity-50 transition-all duration-1000 rotate-3 group-hover:rotate-0">
                             <img src={prompts[0].resultImage} className="h-full w-full object-cover scale-110 group-hover:scale-100 transition-transform duration-[2000ms]" alt="" referrerPolicy="no-referrer" />
                          </div>
                        )}
                     </div>

                     <div className="md:col-span-4 bg-white rounded-[2.5rem] p-10 flex flex-col justify-center border-2 border-blue-50 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 p-8 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                           <Sparkles className="w-48 h-48 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tighter leading-none text-slate-800 mb-6">Engineering Status</h3>
                        <div className="space-y-6 mb-10">
                           <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Records</span>
                              <span className="text-sm font-black text-blue-600">{prompts.length} UNITS</span>
                           </div>
                           <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Load</span>
                              <span className="text-sm font-black text-emerald-500">STABLE</span>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deployments</span>
                              <span className="text-sm font-black text-slate-800">12.4K</span>
                           </div>
                        </div>
                        <button 
                          onClick={() => setIsAboutModalOpen(true)}
                          className="w-full py-4 bg-slate-50 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
                        >
                          Protocol Overview
                        </button>
                     </div>
                  </div>
                )}

                {/* Grid Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-blue-600 rounded-full" />
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
                        {view === 'MyPrompts' ? 'AUTHOR ARCHIVES' : view === 'Favorites' ? 'SAVED BLUEPRINTS' : 'GLOBAL REGISTRY'}
                      </h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                        {loading ? 'Initializing Interface...' : `Buffer Status: ${prompts.length} Clusters Loaded`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid Area */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-8 h-72 animate-pulse" />
                    ))}
                  </div>
                ) : prompts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    <AnimatePresence mode="popLayout">
                      {prompts.map((prompt) => (
                        <motion.div
                          key={prompt.id}
                          layout
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
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
                ) : (
                  <div className="py-40 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                      {view === 'Favorites' ? <Heart className="w-8 h-8 text-slate-200" /> : <Terminal className="w-8 h-8 text-slate-200" />}
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">No matching records detected</h3>
                    <p className="text-slate-400 text-base max-w-sm mx-auto mb-10 font-medium italic opacity-70">"The current query space is empty. Try refining your selection parameters or synchronize new data."</p>
                    {(view !== 'Feed' || selectedCategory !== 'All' || searchQuery !== '') && (
                      <button 
                        onClick={() => { setView('Feed'); setSelectedCategory('All'); setSearchQuery(''); }}
                        className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                      >
                        Reset System View
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Action Button */}
        {user && (
          <button 
            onClick={() => setIsPublishModalOpen(true)}
            className="md:hidden fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-all border-4 border-white"
          >
            <Plus className="w-8 h-8" />
          </button>
        )}
      </main>

      <PromptModal 
        prompt={selectedPrompt} 
        isOpen={isPromptModalOpen} 
        onClose={() => setIsPromptModalOpen(false)} 
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
    </div>
  );
}
