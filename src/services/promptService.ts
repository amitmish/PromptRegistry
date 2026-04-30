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
    
    const newPrompt = {
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || 'Anonymous',
      authorPhotoURL: auth.currentUser.photoURL || undefined,
      createdAt: serverTimestamp(),
      likesCount: Math.floor(Math.random() * 50),
      likes: [],
      usageCount: Math.floor(Math.random() * 200),
      ...prompt,
    };

    try {
      const docRef = await addDoc(collection(db, PROMPTS_COLLECTION), newPrompt);
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

  async seedSamplePrompts() {
    if (!auth.currentUser) return;

    const samples: Partial<Prompt>[] = [
      {
        title: "Advanced Tailwind Component Architect",
        description: "Generates production-ready, highly accessible Tailwind CSS components with a focus on modern aesthetic and clean code.",
        content: "Act as a Senior Design Technologist. Create a [COMPONENT_NAME] using Tailwind CSS and React. Requirements: 1. Use semantic HTML for maximum accessibility (ARIA labels, roles). 2. Implement a responsive design that works seamlessly from mobile to desktop. 3. Include hover, active, and focus states. 4. Use a modern color palette (provide specific hex codes or Tailwind classes). 5. The code should be modular and easy to integrate.",
        category: "Coding",
        tags: ["react", "tailwind", "accessibility", "ui-design"],
        aiModel: "GPT-4o",
        authorName: "Jordan Code",
        authorPhotoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
      },
      {
        title: "Cyberpunk Street Photography Master",
        description: "A highly detailed prompt for generating hyper-realistic cyberpunk street shots with cinematic lighting.",
        content: "A hyper-realistic, wide-angle cinematic shot of a rainy street in Neo-Tokyo. Neon signs in electric blue, magenta, and amber reflecting on wet asphalt. A futuristic vending machine glowing in the foreground with steam rising. Shallow depth of field, 8k resolution, shot on 35mm lens, f/1.8, ISO 200, highly detailed textures, volumetric fog, Kodak Portra 400 aesthetic.",
        category: "Images",
        tags: ["cyberpunk", "photography", "dalle-3", "cinematic"],
        aiModel: "Midjourney v6",
        authorName: "Alex Riverside",
        authorPhotoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        resultImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200"
      },
      {
        title: "Emotional Narrative Storyteller",
        description: "Creates deeply engaging short stories or blog intros using advanced narrative structures.",
        content: "Write a short story opening (approx 300 words) centered around [THEME]. Use the 'Show, Don't Tell' technique. Focus on sensory details: the smell of the air, the weight of the silence, the flickering light. Avoid clichés. Establish a clear mood of [MOOD] within the first three sentences. Use varied sentence lengths to create a rhythmic, compelling prose.",
        category: "Writing",
        tags: ["storytelling", "narrative", "creative-writing"],
        aiModel: "Claude 3.5 Sonnet",
        authorName: "Sarah Writes",
        authorPhotoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
      },
      {
        title: "Minimalist SaaS Branding Identity",
        description: "Generates comprehensive visual branding guidelines for minimalist tech startups.",
        content: "Create a visual identity concept for a new SaaS startup called [NAME]. The company provides [SERVICE]. The aesthetic should be 'Premium Minimalist'. Include: 1. A primary logo concept using geometric shapes. 2. A typography pairing (one serif, one sans-serif). 3. A sophisticated color palette (4 colors). 4. A brief description of the brand's 'voice' and 'feel'. Use flat colors and clean lines.",
        category: "Creative",
        tags: ["branding", "startup", "design-system"],
        aiModel: "DALL-E 3",
        authorName: "Elena Design",
        authorPhotoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        resultImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=1200"
      },
      {
        title: "Growth Marketing Strategy Planner",
        description: "Develops a 30-day growth strategy for B2B or B2C products with clear KPIs.",
        content: "Outline a 30-day growth marketing strategy for [PRODUCT]. Target audience: [AUDIENCE]. The primary goal is [GOAL]. Break it down by week: Week 1: Foundation & Tracking. Week 2: Content & Organic. Week 3: Paid Acquisition & Experiments. Week 4: Viral Loop & Retention. For each week, provide 3 specific actionable tasks and the primary KPI to monitor.",
        category: "Business",
        tags: ["marketing", "growth", "strategy", "startup"],
        aiModel: "Claude 3.5 opus",
        authorName: "BusinessPro",
        authorPhotoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
      },
      {
        title: "Python Data Science Wizard",
        description: "Generates clean, optimized Python code for data cleaning and visualization using Pandas and Seaborn.",
        content: "Write a Python script to clean and visualize a CSV dataset. The dataset contains [COLUMNS]. Requirements: 1. Handle missing values using [STRATEGY]. 2. Perform feature engineering for [TARGET]. 3. Create a multi-plot visualization using Seaborn showing correlations. 4. Add clear comments explaining each step. Use vectorized operations where possible for performance.",
        category: "Coding",
        tags: ["python", "data-science", "pandas", "visualization"],
        aiModel: "GPT-4o",
        authorName: "Jordan Code",
        authorPhotoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
      },
      {
        title: "Ethereal Dreamscape Generator",
        description: "Creates surreal, floating-island style landscapes for digital art inspiration.",
        content: "Digital painting of a floating island covered in bioluminescent flora. A massive waterfall pouring into the void below. Distant nebulae in the sky with two moons. Ethereal, dreamy, soft glowing particles, high fantasy style, intricate details, 8k, concept art by Makoto Shinkai and Rossdraws.",
        category: "Images",
        tags: ["fantasy", "landscape", "concept-art"],
        aiModel: "Stable Diffusion XL",
        authorName: "Alex Riverside",
        authorPhotoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        resultImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200"
      },
      {
        title: "Viral Twitter Thread Architect",
        description: "Structures high-performing Twitter threads that explain complex topics simply.",
        content: "Convert the following topic into a 7-tweet viral Twitter thread: [TOPIC]. Tweet 1: The Hook (problem/counter-intuitive fact). Tweet 2: The Stakes. Tweet 3-5: The Breakdown (using bullet points). Tweet 6: The Key Takeaway. Tweet 7: The Call to Action. Use punchy, conversational language and high readability (max 2 sentences per paragraph).",
        category: "Writing",
        tags: ["social-media", "twitter", "content-creation"],
        aiModel: "Claude 3.5 Sonnet",
        authorName: "Sarah Writes",
        authorPhotoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
      },
      {
        title: "Futuristic UI Dashboards",
        description: "Creates detailed design prompts for FUI (Futuristic User Interface) elements.",
        content: "A detailed FUI dashboard for a deep-space exploration vessel. Includes circular scanning elements, real-time data feeds, star maps, and propulsion status. Aesthetic: clean, blue and white on black background, thin lines, high contrast, minimalist but dense with information. 8k, symmetrical, professional graphic design style.",
        category: "Creative",
        tags: ["fui", "dashboard", "ui", "scifi"],
        aiModel: "Midjourney v6",
        authorName: "Elena Design",
        authorPhotoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        resultImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200"
      },
      {
        title: "Cold Email Outreach Specialist",
        description: "Writes highly personalized cold emails that get responses from high-ticket prospects.",
        content: "Write a personalized cold email to [PROSPECT_NAME], who is the [ROLE] at [COMPANY]. The goal is to [GOAL]. Include: 1. A compliment about their recent achievement in [ACHIEVEMENT]. 2. A clear, low-friction value proposition centered on [PAIN_POINT]. 3. A single, specific call to action (CTA). Keep it under 100 words. No buzzwords.",
        category: "Business",
        tags: ["sales", "outreach", "networking"],
        aiModel: "Claude 3.5 Opus",
        authorName: "BusinessPro",
        authorPhotoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
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
