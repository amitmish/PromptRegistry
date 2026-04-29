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

  async createPrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'likesCount' | 'usageCount' | 'authorId' | 'authorName'>) {
    if (!auth.currentUser) throw new Error('Must be logged in to create a prompt');
    
    const newPrompt = {
      ...prompt,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || 'Anonymous',
      authorPhotoURL: auth.currentUser.photoURL || undefined,
      createdAt: serverTimestamp(),
      likesCount: 0,
      likes: [],
      usageCount: 0,
    };

    try {
      const docRef = await addDoc(collection(db, PROMPTS_COLLECTION), newPrompt);
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
      const finalUpdates = {
        ...updates,
        authorPhotoURL: auth.currentUser.photoURL || undefined
      };
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
      } else {
        // Like
        await updateDoc(promptRef, {
          likes: arrayUnion(userId),
          likesCount: increment(1)
        });
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

  async seedSamplePrompts() {
    if (!auth.currentUser) return;

    const samples: Omit<Prompt, 'id' | 'createdAt' | 'likesCount' | 'usageCount' | 'authorId' | 'authorName' | 'likes'>[] = [
      {
        title: "Tailwind Bento Grid Architect",
        description: "Generates modern, responsive bento-style layouts using Tailwind CSS.",
        content: "Act as a Senior Frontend Engineer. Create a responsive bento grid layout using Tailwind CSS. Requirements: 1. Use the 'grid-cols' and 'grid-rows' pattern. 2. Include varied card spans (row-span-2, col-span-2). 3. Add glassmorphism effects to cards. 4. Ensure perfect mobile responsiveness.",
        category: "Coding",
        tags: ["react", "tailwind", "ui", "ux"],
        aiModel: "GPT-4o",
      },
      {
        title: "Cyberpunk Illustration Master",
        description: "Detailed prompt for DALL-E 3 or Midjourney to create neon-drenched cityscapes.",
        content: "A hyper-realistic cinematic shot of a Tokyo-inspired cyberpunk alleyway during blue hour. Neon signs in vibrant pink and cyan reflecting on wet asphalt. A mysterious figure wearing a high-tech techwear jacket walking away. Volumetric lighting, 8k resolution, Unreal Engine 5 render style.",
        category: "Images",
        tags: ["art", "neon", "cyberpunk", "stylized"],
        aiModel: "Midjourney v6",
        resultImage: "https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=1200"
      },
      {
        title: "SEO Blog Content Strategist",
        description: "Creates comprehensive, highly-structured blog post outlines that rank well.",
        content: "Create a blog post outline on [TOPIC]. Include: 1. A catchy H1 title. 2. Engaging meta description. 3. Sectional headers (H2, H3) following semantic SEO. 4. Internal and external linking suggestions. 5. A 200-word introduction that uses the PAS (Problem-Agitation-Solution) framework.",
        category: "Writing",
        tags: ["seo", "marketing", "content"],
        aiModel: "Claude 3.5 Sonnet",
      },
      {
        title: "Modern Minimalist Logo Kit",
        description: "Generates vector-ready minimalist logos for tech startups.",
        content: "Vector illustration of a minimalist logo for a tech startup named [NAME]. The logo should represent [THEME]. Use clean lines, geometric shapes, and a limited color palette of [COLORS]. White background, high contrast, professional, scalable vector style.",
        category: "Creative",
        tags: ["branding", "logo", "design"],
        aiModel: "DALL-E 3",
        resultImage: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&q=80&w=1200"
      },
      {
        title: "React Query Optimized Hook",
        description: "Standardized pattern for fetching data with automatic caching and retry logic.",
        content: "Generate a custom React hook using TanStack Query (React Query) for fetching [ENTITY]. Include: 1. Type-safe response interface. 2. Error handling with toast notifications. 3. Stale-time and cache-time configurations. 4. A mutation example for updating the same entity.",
        category: "Coding",
        tags: ["typescript", "react-query", "hooks"],
        aiModel: "GPT-4o",
      },
      {
        title: "B2B SaaS Email Sequence",
        description: "Professional multi-step cold outreach sequence for SaaS products.",
        content: "Write a 4-part email sequence for a B2B SaaS product targeting [PERSONA]. Email 1: Low-friction value add. Email 2: Social proof and case study. Email 3: Handling objections. Email 4: 'Break up' email. Keep it punchy, professional, and benefit-driven.",
        category: "Business",
        tags: ["copywriting", "sales", "email"],
        aiModel: "Claude 3.5 Opus",
      },
      {
        title: "Dreamy Watercolor Landscape",
        description: "Soft, ethereal watercolor prompt for artistic generation.",
        content: "An ethereal watercolor painting of a misty pine forest in the early morning. Soft pastels, bleeding edges, high quality paper texture, delicate brush strokes, tranquil atmosphere, cinematic lighting, masterpiece.",
        category: "Images",
        tags: ["art", "watercolor", "nature"],
        aiModel: "Stable Diffusion XL",
        resultImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200"
      }
    ];

    for (const sample of samples) {
      await this.createPrompt(sample);
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
