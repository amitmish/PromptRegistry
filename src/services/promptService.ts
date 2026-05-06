import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  increment,
  getDoc,
  setDoc,
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Prompt, Category } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { analyticsService } from './analyticsService';

const PROMPTS_COLLECTION = 'prompts';

export const promptService = {
  async getAllPrompts(category?: Category, searchQuery?: string) {
    try {
      let q = query(collection(db, PROMPTS_COLLECTION), orderBy('createdAt', 'desc'), limit(50));
      
      if (category) {
        q = query(q, where('category', '==', category));
      }

      const snapshot = await getDocs(q);
      let prompts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));

      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        prompts = prompts.filter(p => 
          p.title.toLowerCase().includes(lowerQuery) || 
          p.content.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery) ||
          p.tags.some(t => t.toLowerCase().includes(lowerQuery))
        );
      }

      return prompts;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PROMPTS_COLLECTION);
      return [];
    }
  },

  async getPromptById(id: string) {
    try {
      const docRef = doc(db, PROMPTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Prompt;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${PROMPTS_COLLECTION}/${id}`);
      return null;
    }
  },

  async createPrompt(prompt: Partial<Prompt>) {
    if (!auth.currentUser) throw new Error('Must be logged in to create a prompt');
    
    const data: any = {
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || 'Anonymous',
      authorPhotoURL: auth.currentUser.photoURL || null,
      createdAt: serverTimestamp(),
      likesCount: Math.floor(Math.random() * 50),
      likes: [],
      usageCount: Math.floor(Math.random() * 200),
      ...prompt,
    };

    // Remove undefined values which Firestore doesn't support
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    try {
      const docRef = await addDoc(collection(db, PROMPTS_COLLECTION), data);
      await analyticsService.trackPromptCreated();
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, PROMPTS_COLLECTION);
      return null;
    }
  },

  async updatePrompt(id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'authorId'>>) {
    if (!auth.currentUser) throw new Error('Must be logged in to update a prompt');
    
    try {
      const docRef = doc(db, PROMPTS_COLLECTION, id);
      const finalUpdates: any = {
        ...updates,
        authorPhotoURL: auth.currentUser.photoURL || null
      };

      // Remove undefined values
      Object.keys(finalUpdates).forEach(key => {
        if (finalUpdates[key] === undefined) {
          delete finalUpdates[key];
        }
      });

      await updateDoc(docRef, finalUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${PROMPTS_COLLECTION}/${id}`);
    }
  },

  async toggleLike(promptId: string, userId: string) {
    const promptRef = doc(db, PROMPTS_COLLECTION, promptId);

    try {
      const promptDoc = await getDoc(promptRef);
      if (!promptDoc.exists()) return;
      
      const data = promptDoc.data() as Prompt;
      const isLiked = data.likes?.includes(userId);

      if (isLiked) {
        // Unlike
        await updateDoc(promptRef, {
          likes: arrayRemove(userId),
          likesCount: increment(-1)
        });
        await analyticsService.trackLike(false);
      } else {
        // Like
        await updateDoc(promptRef, {
          likes: arrayUnion(userId),
          likesCount: increment(1)
        });
        await analyticsService.trackLike(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${PROMPTS_COLLECTION}/${promptId}/likes`);
    }
  },

  async getUserPrompts(uid: string) {
    try {
      const q = query(
        collection(db, PROMPTS_COLLECTION),
        where('authorId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PROMPTS_COLLECTION);
      return [];
    }
  },

  async getLikedPrompts(uid: string) {
    try {
      const q = query(
        collection(db, PROMPTS_COLLECTION),
        where('likes', 'array-contains', uid),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const prompts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
      
      // Sort in JS instead of Firestore to avoid missing index errors
      return prompts.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toMillis?.() || 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toMillis?.() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PROMPTS_COLLECTION);
      return [];
    }
  },

  async deletePrompt(id: string) {
    if (!auth.currentUser) throw new Error('Must be logged in to delete a prompt');
    
    try {
      const docRef = doc(db, PROMPTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${PROMPTS_COLLECTION}/${id}`);
    }
  },

  async seedSamplePrompts(count: number = 20, onProgress?: (current: number, total: number) => void) {
    if (!auth.currentUser) {
      console.error("Seeding failed: No authenticated user.");
      return;
    }
    const templates: any[] = [
      {
        category: "Coding",
        tags: ["engineering", "architecture", "expert-level"],
        model: "Groq Llama 3",
        subjects: [
          { role: "Database Architect", topic: "Distributed Query Optimization" },
          { role: "Cloud Infrastructure Expert", topic: "Multi-Region Kubernetes Federation" },
          { role: "Frontend Performance Guru", topic: "Web Assembly (Wasm) Integration" },
          { role: "Real-time Systems Engineer", topic: "WebSocket Concurrency Scaling" },
          { role: "Security Principal", topic: "Zero-Trust Mesh Authentication" }
        ],
        prompts: [
          "Act as a professional {role}. Your core expertise is {topic}. Guide the user through complex technical challenges, provide accurate architectural advice, and maintain a highly technical yet helpful conversation style.",
          "You are a {role} specialized in {topic}. When chatting with the user, prioritize security, scalability, and performance. Answer questions directly but always keep the underlying best practices of {topic} in mind.",
          "As a {role}, your mission is to assist the user with {topic}. Use your deep domain knowledge to provide nuanced answers. Don't just provide code; explain the 'why' behind the solutions while keeping the talk professional."
        ]
      },
      {
        category: "Images",
        tags: ["cinematic", "visionary", "expert-design"],
        model: "Midjourney v6.1",
        subjects: [
          { role: "VFX Supervisor", topic: "Photorealistic Liquid Simulation in Zero Gravity" },
          { role: "Cinematography Master", topic: "Modern Noir Lighting in a Cyber-Alley" },
          { role: "Architectural Designer", topic: "Biophilic Skyscraper Interior at Dusk" },
          { role: "Concept Artist", topic: "Post-Human Civilization Ruins" },
          { role: "Product Photographer", topic: "Macro Study of Ethereal Jewelry" }
        ],
        prompts: [
          "Act as an expert {role}. Define a precise visual prompt for a {topic}. Specify lighting temperature, focal depth (f/1.8), camera lens (80mm), and atmospheric density. The goal is absolute realism and high-art aesthetic.",
          "As a {role}, describe a {topic} with a focus on 'Material Honesty' and texture lighting. Use highly specific technical terminology for light-bouncing and volumetric rendering.",
          "Direct a digital masterpiece of {topic} from the perspective of a {role}. Incorporate advanced composition rules like the golden ratio and leading lines to create a multi-layered narrative."
        ],
        resultImagePrefix: "https://images.unsplash.com/photo-"
      },
      {
        category: "Business",
        tags: ["strategy", "executive", "high-stakes"],
        model: "GPT-4o",
        subjects: [
          { role: "VC Strategist", topic: "Series B Growth Unit Economics" },
          { role: "Market Entry Consultant", topic: "Entering Emerging Tech Hubs" },
          { role: "SaaS Growth Director", topic: "PLG (Product-Led Growth) Retention Loops" },
          { role: "Fintech Innovation Lead", topic: "Cross-Border Settlement Protocols" },
          { role: "ESG Policy Advisor", topic: "Corporate Carbon Neutrality Frameworks" }
        ],
        prompts: [
          "Act as a {role}. Draft a comprehensive strategic framework for {topic}. Include a SWOT analysis, a 3-year roadmap, and specific KPIs for immediate execution. The tone should be executive-level and data-driven.",
          "You are a {role}. Conduct a high-level review of {topic}. Identify three key market signals that indicate a paradigm shift and provide a tactical response plan for a Fortune 500 company.",
          "As a {role}, prepare a brief for a CEO regarding {topic}. Focus on Risk Assessment, ROI projections, and stakeholder alignment strategies. Use compelling, non-hyperbolic language."
        ]
      },
      {
        category: "Writing",
        tags: ["editorial", "intellectual", "narrative"],
        model: "Claude 3.5 Sonnet",
        subjects: [
          { role: "Philosophical Essayist", topic: "The Ethics of Digital Identity" },
          { role: "Technical Storyteller", topic: "The Evolution of Silicon to Quantum" },
          { role: "Conversational Copywriter", topic: "B2B Storytelling for Hardware" },
          { role: "Narrative Designer", topic: "Procedural Storytelling in Metaverses" },
          { role: "Political Analyst", topic: "Universal Basic Income in the AI Era" }
        ],
        prompts: [
          "Act as a {role}. Write a sophisticated, 800-word piece on {topic}. Use complex sentence structures, nuanced vocabulary, and avoid clichés. The target audience is the intellectual elite.",
          "As a {role}, craft a compelling narrative exploring {topic}. Focus on human-centric impact and emotional resonance, while maintaining a high level of factual accuracy and foresight.",
          "You are a {role}. Develop a manifesto for {topic}. It must be persuasive, visionary, and grounded in current sociological trends. Use a voice that is both authoritative and inspiring."
        ]
      }
    ];

    const authors = [
      { name: "Julian Vance", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" },
      { name: "Sofia Chen", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
      { name: "Marcus Thorne", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
      { name: "Aria Montgomery", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
      { name: "David Sterling", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" }
    ];

    const unsplashIds = ["1451187580459-43490279c0fa", "1518770660439-4636190af475", "1550751827-4bd374c3f58b", "1485827404703-89b55fcc595e", "1531297484001-80022131f5a1"];

    for (let i = 0; i < count; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const subject = template.subjects[Math.floor(Math.random() * template.subjects.length)];
        const author = authors[Math.floor(Math.random() * authors.length)];
        const basePrompt = template.prompts[Math.floor(Math.random() * template.prompts.length)];
        
        const title = `${subject.topic}: Expert ${subject.role}`;
        const content = basePrompt
          .replace(/{role}/g, subject.role)
          .replace(/{topic}/g, subject.topic);
        
        const resultImage = template.resultImagePrefix ? `${template.resultImagePrefix}${unsplashIds[Math.floor(Math.random() * unsplashIds.length)]}?auto=format&fit=crop&q=80&w=1200` : undefined;

        try {
            await this.createPrompt({
                title,
                description: `A highly accurate and useful blueprint for ${subject.topic.toLowerCase()} authored by a professional ${subject.role.toLowerCase()}.`,
                content: content,
                category: template.category,
                tags: template.tags.map(t => t.toLowerCase()),
                aiModel: template.model,
                authorName: author.name,
                authorPhotoURL: author.photo,
                resultImage
            });
        } catch (err) {
            console.error(`Failed to create prompt ${i}:`, err);
        }

        if (onProgress) onProgress(i + 1, count);
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 100));
    }

  },

  async purgeAllPrompts() {
    if (!auth.currentUser) return 0;
    
    try {
      // Use a limited query to avoid memory issues if there are many prompts
      const q = query(collection(db, PROMPTS_COLLECTION), limit(100));
      const snapshot = await getDocs(q);
      
      let deletedCount = 0;
      // Delete in smaller chunks if needed, but for now we'll do the 100
      const deletePromises = snapshot.docs.map(document => {
        deletedCount++;
        return deleteDoc(doc(db, PROMPTS_COLLECTION, document.id));
      });
      
      await Promise.all(deletePromises);
      
      // Reset prompt count in analytics if we actually deleted something
      if (deletedCount > 0) {
        const statsRef = doc(db, 'analytics/stats');
        await updateDoc(statsRef, {
          totalPrompts: increment(-deletedCount)
        }).catch(() => {});
      }
      
      return deletedCount;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, PROMPTS_COLLECTION);
      return 0;
    }
  },

  async cleanupDuplicates() {
    if (!auth.currentUser) return;
    
    try {
      const all = await this.getAllPrompts();
      const seen = new Set<string>();
      const toDelete: string[] = [];

      for (const p of all) {
        // Create a unique key based on content and title
        const key = `${p.title.trim().toLowerCase()}|${p.content.trim().toLowerCase()}`;
        if (seen.has(key)) {
          toDelete.push(p.id);
        } else {
          seen.add(key);
        }
      }

      for (const id of toDelete) {
        await this.deletePrompt(id);
      }
      
      return toDelete.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, PROMPTS_COLLECTION);
      return 0;
    }
  }
};
