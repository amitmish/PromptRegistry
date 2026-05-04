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
        tags: ["programming", "architecture", "dev-ops"],
        model: "Gemini 1.5 Pro",
        subjects: [
          "Microservices Resilience with Circuit Breakers",
          "Optimizing React Component Performance",
          "Rust Memory Safety Patterns",
          "Kubernetes Horizontal Pod Autoscaling",
          "Secure JWT Authentication Flow"
        ],
        prompts: [
          "Act as a Senior Software Engineer. Explain the implementation of {subject} in a production environment. Provide a clear architectural overview, potential pitfalls to avoid, and a concise code example that demonstrates best practices. Focusing on readability and maintainability is key.",
          "Develop a step-by-step guide for implementing {subject}. Include considerations for testing, monitoring, and scaling. The target audience is intermediate developers looking for a deep dive into functional patterns.",
          "Review the standard approach to {subject}. Identify three common anti-patterns and propose optimized alternatives. Explain the performance implications of each change in detail."
        ]
      },
      {
        category: "Images",
        tags: ["art", "design", "cinematography"],
        model: "Midjourney v6.1",
        subjects: [
          "Cyberpunk Tokyo Street in Rain",
          "Minimalist Japanese Tea House",
          "Surrealist Underwater Library",
          "Brutalist Concrete Cathedral",
          "Steam-punk Alchemy Lab"
        ],
        prompts: [
          "Cinematic shot of {subject}. Lighting: split lighting with neon accents. Camera: Hasselblad, 80mm lens, f/2.8. Color palette: deep teals and vibrant oranges. Atmosphere: moody, volumetric fog, hyper-realistic textures, 8k resolution.",
          "A stunning {subject} designed in a minimalist style. Focus on architectural symmetry and the play of natural light and shadow. Use a neutral color palette with wood and stone textures. Highly detailed, clean lines, editorial photography style.",
          "Digital art piece portraying {subject}. Style: ethereal surrealism. Soft lighting, pastel gradients, dream-like quality. Intricate details on every surface. 16k, high contrast, trending on ArtStation."
        ],
        resultImagePrefix: "https://images.unsplash.com/photo-"
      },
      {
        category: "Business",
        tags: ["marketing", "strategy", "finance"],
        model: "GPT-4o",
        subjects: [
          "SaaS Go-To-Market Strategy",
          "Product-Led Growth Framework",
          "Series A Pitch Deck Checklist",
          "Retention Analysis for E-commerce",
          "Corporate ESG Reporting"
        ],
        prompts: [
          "Act as a Management Consultant. Draft a comprehensive {subject}. Break it down into executive summary, core objectives, market analysis, and key performance indicators. The tone should be professional, data-driven, and actionable.",
          "Analyze the effectiveness of current {subject} models. Identify emerging trends and provide a roadmap for integration into a mid-sized enterprise. Focus on high ROI and long-term sustainability.",
          "Create a presentation outline for {subject}. Each slide should have a clear purpose and supporting data points. The goal is to persuade stakeholders of a strategic shift in direction."
        ]
      },
      {
        category: "Writing",
        tags: ["copywriting", "creative", "fiction"],
        model: "Claude 3.5 Sonnet",
        subjects: [
          "The Future of Urban Migration",
          "Ethics of Neural Link Interfaces",
          "A Short Story about Time-Dilation",
          "Persuasive Essay on Renewable Energy",
          "Blog Post about Mindful Productivity"
        ],
        prompts: [
          "Write a compelling {subject}. Use a tone that is engaging, thought-provoking, and slightly provocative. Weave in historical references and future predictions to build a rich narrative. The goal is to spark conversation among high-level readers.",
          "Develop a detailed character study for a protagonist experiencing {subject}. Focus on internal monologue, sensory details, and the emotional arc of their journey. The writing should be lyrical and evocative.",
          "Draft a long-form article exploring the intersection of technology and {subject}. Provide balanced viewpoints, expert quotes (invented), and a concluding call to action that inspires change."
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
        
        const title = `${subject}: Professional Blueprint`;
        const content = basePrompt.replace(/{subject}/g, subject);
        
        const resultImage = template.resultImagePrefix ? `${template.resultImagePrefix}${unsplashIds[Math.floor(Math.random() * unsplashIds.length)]}?auto=format&fit=crop&q=80&w=1200` : undefined;

        try {
            await this.createPrompt({
                title,
                description: `A highly accurate and useful ${template.category} instruction focusing on the nuances of ${subject.toLowerCase()}.`,
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
