import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  User, 
  Tag, 
  Cpu, 
  Eye, 
  Terminal, 
  Sparkles, 
  Zap, 
  Globe, 
  RefreshCw,
  PenTool,
  Palette,
  Image as ImageIcon,
  Briefcase,
  Layers,
  Send,
  MessageSquare,
  Play,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Prompt } from '../types';
import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface PromptModalProps {
  prompt: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptModal({ prompt, isOpen, onClose }: PromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'blueprint' | 'simulation'>('blueprint');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'simulation' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (prompt?.id) {
      setMessages([
        { role: 'assistant', content: `[SYSTEM_INITIALIZED]: Environment for "${prompt.title}" ready. Instruction set loaded for execution.` }
      ]);
    }
  }, [prompt?.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (prompt) {
      const foundVars = prompt.content.match(/\{\{([^}]+)\}\}/g) || [];
      const initialVars: Record<string, string> = {};
      foundVars.forEach(v => {
        const key = v.replace(/[{}]/g, '');
        initialVars[key] = '';
      });
      setVariables(initialVars);
    }
  }, [prompt]);

  if (!prompt) return null;

  const handleDeploy = async () => {
    if (isDeploying) return;
    
    setIsDeploying(true);
    
    // Compile content
    let finalContent = prompt.content;
    Object.entries(variables).forEach(([key, val]) => {
      if (val) {
        finalContent = finalContent.split(`{{${key}}}`).join(val as string);
      }
    });

    // Simulate compilation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    navigator.clipboard.writeText(finalContent);
    setIsDeploying(false);
    setCopied(true);
    
    // Switch to simulation
    setActiveTab('simulation');
    setMessages([
      { role: 'assistant', content: `[SYSTEM_INITIALIZED]: Deployment successful. The instruction set "${prompt.title}" has been loaded into the execution layer. How would you like to verify the output?` }
    ]);

    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const apiKey = (process.env as any).GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key missing");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let promptContent = prompt.content;
      Object.entries(variables).forEach(([key, val]) => {
        if (val) {
          promptContent = promptContent.split(`{{${key}}}`).join(val as string);
        }
      });

      // User's strict requirement: "<the specific prompt> \n\n\n <user message>"
      // We apply this to the current message and all historical user messages for maximum context consistency
      const formattedInput = `${promptContent}\n\n\n${userMsg}`;

      // Map chat history while maintaining the strict formatting internally
      // Note: We filter out the initialization message from the AI history
      const history = messages
        .filter(m => !m.content.startsWith('[SYSTEM_INITIALIZED]'))
        .map(m => {
          if (m.role === 'user') {
            return {
              role: 'user',
              parts: [{ text: `${promptContent}\n\n\n${m.content}` }]
            };
          }
          return {
            role: 'model',
            parts: [{ text: m.content }]
          };
        });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: formattedInput }] }
        ],
        config: {
          // Additional safety: Set system instruction as well to ensure AI understands its core identity
          systemInstruction: `CORE_PROTOCOL: Follow these instructions strictly: ${promptContent}`
        }
      });

      const text = response.text || "No response generated.";

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error("Simulation error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "[SYSTEM_ERROR]: Failed to connect to the execution layer. Ensure your API key is configured in settings." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Coding': return 'bg-blue-600 text-white';
      case 'Writing': return 'bg-emerald-600 text-white';
      case 'Images': return 'bg-purple-600 text-white';
      case 'Business': return 'bg-amber-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const renderIcon = (category: string) => {
    const className = "w-6 h-6";
    switch (category) {
      case 'Coding': return <Terminal className={className} />;
      case 'Writing': return <PenTool className={className} />;
      case 'Images': return <ImageIcon className={className} />;
      case 'Business': return <Briefcase className={className} />;
      default: return <Sparkles className={className} />;
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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] border border-white/20"
          >
            {/* Left Sidebar: Blueprint Details */}
            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
               <div className="p-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 ${getCategoryStyles(prompt.category)}`}>
                    {renderIcon(prompt.category)}
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-[1.1] mb-2">{prompt.title}</h2>
                  <div className="flex items-center gap-2 mb-8">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{prompt.aiModel}</span>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Functional Specs</h3>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{prompt.description}"</p>
                    </div>

                    {Object.keys(variables).length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Input Parameters</h3>
                        <div className="space-y-4">
                          {Object.keys(variables).map(key => (
                            <div key={key}>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">{key}</label>
                              <input 
                                type="text"
                                value={variables[key]}
                                onChange={(e) => setVariables(v => ({ ...v, [key]: e.target.value }))}
                                placeholder={`Enter ${key}...`}
                                className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
               </div>

               <div className="mt-auto p-8 border-t border-slate-200 bg-white/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                      {prompt.authorPhotoURL ? <img src={prompt.authorPhotoURL} alt="" /> : <User className="w-4 h-4 text-slate-400"/>}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Architect</p>
                      <p className="text-sm font-bold text-slate-800 leading-none">{prompt.authorName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={activeTab === 'blueprint' ? handleDeploy : () => setActiveTab('blueprint')}
                    disabled={isDeploying}
                    className={`w-full py-4 shadow-xl text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all group relative overflow-hidden ${
                      isDeploying ? 'bg-blue-600 scale-[0.98]' : 
                      activeTab === 'simulation' ? 'bg-slate-800 border border-white/10' :
                      copied ? 'bg-emerald-600' : 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                  >
                    {isDeploying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Initializing...</span>
                        <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-[progress_1s_ease-in-out]" style={{ width: '100%' }} />
                      </>
                    ) : activeTab === 'simulation' ? (
                      <>
                        <ArrowLeft className="w-4 h-4" />
                        <span>Source Code</span>
                      </>
                    ) : copied ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Ready</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span>Run Simulator</span>
                      </>
                    )}
                  </button>
               </div>
            </div>

            {/* Main Area: Execution Engine */}
            <div className="flex-1 flex flex-col bg-slate-100/30 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between relative z-30">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-xl">
                       <button 
                         onClick={() => setActiveTab('blueprint')}
                         className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'blueprint' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Blueprint
                       </button>
                       <button 
                         onClick={() => setActiveTab('simulation')}
                         className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'simulation' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Simulator
                       </button>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${activeTab === 'simulation' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {activeTab === 'simulation' ? 'Simulator Active' : 'System Ready'}
                       </span>
                    </div>
                 </div>
                 <button 
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  {activeTab === 'blueprint' ? (
                    <motion.div 
                      key="blueprint"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute inset-0 overflow-y-auto p-6 md:p-12"
                    >
                      <div className="max-w-3xl mx-auto space-y-12 pb-12">
                          <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                               <div className="flex items-center gap-2">
                                 <Terminal className="w-4 h-4 text-blue-600" />
                                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Source Code</h3>
                               </div>
                               <div className="flex items-center gap-2">
                                  <div className="px-2 py-0.5 bg-slate-900 text-[9px] font-mono text-emerald-400 rounded">UTF-8</div>
                                  <div className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-400 rounded uppercase">Read-Only</div>
                               </div>
                            </div>
                            <div className="bg-white border-2 border-slate-200/50 rounded-3xl p-10 shadow-sm relative group overflow-hidden">
                               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                  <Layers className="w-20 h-20" />
                               </div>
                               <div className="font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed relative z-10">
                                  {prompt.content.split('\n').map((line, i) => (
                                    <div key={i} className="flex gap-6 group/line hover:bg-blue-50/30 rounded px-2 transition-colors">
                                      <span className="w-6 text-slate-300 select-none text-[10px] text-right pt-1 opacity-50">{String(i + 1).padStart(2, '0')}</span>
                                      <p className="flex-1 py-0.5">
                                         {line.split(/(\{\{[^}]+\}\})/).map((part, pi) => {
                                           if (part.startsWith('{{') && part.endsWith('}}')) {
                                             const key = part.replace(/[{}]/g, '');
                                             const val = variables[key];
                                             return (
                                               <span key={pi} className={`px-2 py-0.5 rounded-md font-black transition-all ${val ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 text-slate-400 italic font-medium'}`}>
                                                 {val || part}
                                               </span>
                                             );
                                           }
                                           return part;
                                         })}
                                      </p>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          </div>

                          {prompt.resultImage && (
                            <div className="space-y-6">
                               <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                 <div className="flex items-center gap-2">
                                   <ImageIcon className="w-4 h-4 text-purple-600" />
                                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Visual Reference</h3>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4K Render • Alpha 0.8</span>
                               </div>
                               <div className="group relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white cursor-zoom-in">
                                 <img src={prompt.resultImage} alt="" className="w-full h-auto grayscale-[20%] group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000" referrerPolicy="no-referrer" />
                                 <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors pointer-events-none" />
                               </div>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="simulation"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="absolute inset-0 flex flex-col p-6"
                    >
                       <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-inner flex flex-col overflow-hidden">
                          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Environment Simulator</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                   <span className="text-[9px] font-black text-slate-400 uppercase">Live Output</span>
                                </div>
                                <button 
                                  onClick={() => setMessages([{ role: 'assistant', content: `[SYSTEM_INITIALIZED]: Session reset. Instruction set "${prompt.title}" re-loaded.` }])}
                                  className="p-1 px-2 border border-slate-200 rounded text-[9px] font-bold text-slate-500 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
                                >
                                  Reset Console
                                </button>
                             </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                             {messages.map((m, i) => (
                               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed transition-all ${
                                    m.role === 'user' 
                                      ? 'bg-slate-900 text-white rounded-tr-none ml-auto shadow-md' 
                                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-medium mr-auto shadow-sm'
                                  }`}>
                                     {m.content.startsWith('[SYSTEM_INITIALIZED]') ? (
                                       <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest py-1">
                                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                          {m.content.replace('[SYSTEM_INITIALIZED]: ', '')}
                                       </div>
                                     ) : (
                                       m.content
                                     )}
                                  </div>
                               </div>
                             ))}
                             {isTyping && (
                               <div className="flex justify-start">
                                  <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none">
                                     <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                  </div>
                               </div>
                             )}
                             <div ref={chatEndRef} />
                          </div>

                          <div className="p-4 bg-white border-t border-slate-100">
                             <div className="relative">
                                <input 
                                  ref={inputRef}
                                  value={input}
                                  onChange={(e) => setInput(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                  placeholder="Type a query to test your prompt..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 pr-16 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 transition-all"
                                />
                                <button 
                                  onClick={sendMessage}
                                  disabled={!input.trim() || isTyping}
                                  className="absolute right-2 top-2 bottom-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-black transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                   <Send className="w-4 h-4" />
                                </button>
                             </div>
                             <p className="text-[9px] text-slate-400 text-center mt-3 font-black uppercase tracking-widest italic flex items-center justify-center gap-2">
                                <Zap className="w-3 h-3 text-blue-500" />
                                Model: Gemini 3 Flash Preview • Multi-Turn Execution Enabled
                             </p>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Bar */}
              <div className="h-10 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] relative z-20">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                       <span>Engine: Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Globe className="w-3 h-3 text-blue-500" />
                       <span>Access: Public Ops</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Cpu className="w-3 h-3 text-purple-500" />
                       <span>Memory: 1.2GB/4GB</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <span>Protocol: HTTPS/TLS 1.3</span>
                    <span className="text-white opacity-50">LN 01-44 • COL 00</span>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
