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
    const authors = [
      { name: "Julian Vance", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" },
      { name: "Sofia Chen", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
      { name: "Marcus Thorne", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
      { name: "Aria Montgomery", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
      { name: "David Sterling", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" }
    ];

    const techSubjects = [
      "Event-Driven Microservices Architecture with Apache Kafka",
      "Real-time Distributed Database Consistency in Global Clusters",
      "Sub-millisecond Latency Optimization for High-Frequency Trading Systems",
      "Zero-Knowledge Proof Implementation for Privacy-Preserving DeFi",
      "Kubernetes Multi-Cluster Traffic Management using Istio Service Mesh"
    ];

    const imageSubjects = [
      "Brutalist Architecture in a Desert Oasis at Golden Hour",
      "Macro Cinematography of an Antique Watch Internal Mechanism",
      "Cybernetic Street Market in a Neofuturistic Singapore District",
      "Minimalist Scandinavian Interior Design with Dynamic Light Shadows",
      "Hyper-detailed Portrait of a Nomad Explorer in a Solar Storm"
    ];

    const businessSubjects = [
      "Series B Fundraising Deck Strategy for a Sustainable Energy Startup",
      "Market Entry Analysis for a FinTech Disruption in Emerging Economies",
      "Corporate ESG Transition Roadmap for a Global Logistics Entity",
      "Product-Led Growth Engine Optimization for Enterprise SaaS",
      "Cross-Border M&A Integration Strategy for Tech Giants"
    ];

    const templates: any[] = [
      {
        category: "Coding",
        tags: ["architecture", "performance", "backend", "scalability"],
        model: "GPT-4o",
        titlePattern: ["{subject}: Implementation Blueprint", "Scalability Audit for {subject}"],
        contentPattern: [
          "Act as a Principal Software Architect. Develop a comprehensive technical specification for {subject}. \n\nThe documentation must include:\n1. System Design: Detailed component diagram description and inter-process communication protocols.\n2. Data Modeling: Schema definitions for high-throughput persistence layers, focusing on normalization vs. performance trade-offs.\n3. Security Infrastructure: Implementation of mTLS, JWT rotation, and RBAC at the edge.\n4. Scalability: Auto-scaling triggers, circuit breaker patterns, and multi-region failover strategies.\n\nCode Requirement: Provide a production-ready boilerplate in TypeScript/Go including robust middleware for observability (tracing/metrics).",
        ]
      },
      {
        category: "Images",
        tags: ["commercial", "editorial", "ultra-detailed", "visionary"],
        model: "Midjourney v6.1",
        titlePattern: ["Visual Narrative: {subject}", "Conceptual Study of {subject}"],
        contentPattern: [
          "Professional Art Director's Brief for {subject}.\n\nVisual Direction: The aesthetic must lean into high-contrast chiaroscuro lighting, emphasizing texture and material honesty. \n\nTechnical Specs: \n- Lighting: Triple-point lighting setup with a warm key light and blue-tinted fill. Volumetric lighting to define depth.\n- Composition: Golden ratio alignment with a strong focus on leading lines.\n- Color Grade: Desaturated shadows with vibrant highlights, inspired by 70mm IMAX cinematography.\n- Rendering: Ray-traced reflections, extreme close-up detail (4-8k), f/2.8 aperture for sharp depth falloff.",
        ],
        resultImagePrefix: "https://images.unsplash.com/photo-"
      },
      {
        category: "Business",
        tags: ["strategy", "leadership", "consulting", "growth"],
        model: "Claude 3.5 Sonnet",
        titlePattern: ["Strategic Executive Brief: {subject}", "Operational Roadmap for {subject}"],
        contentPattern: [
          "Act as a Senior Partner at a Tier-1 Management Consulting firm. Develop a 10-page strategic framework for {subject}. \n\nFramework Objectives:\n- Gap Analysis: Identify current market inefficiencies and competitive disadvantages.\n- Economic Value Add (EVA): Quantify the long-term fiscal impact of the proposed transition.\n- Stakeholder Mapping: Analyze influence-interest quadrants for key decision-makers.\n- Risk Mitigation: Detailed contingency planning for regulatory shifts and supply chain volatility.\n\nThe tone must be executive-level, data-driven, and focused on actionable ROI.",
        ]
      },
      {
        category: "Writing",
        tags: ["literary", "editorial", "long-form", "persuasive"],
        model: "Claude 3.5 Sonnet",
        titlePattern: ["The Philosophical Underpinnings of {subject}", "{subject}: A Contemporary Critique"],
        contentPattern: [
          "Write an 800-word long-form editorial for a prestigious intellectual magazine exploring {subject}.\n\nThe essay should weave together historical context, sociological impact, and future-forward speculation. Use a sophisticated vocabulary and complex sentence structures. Avoid hyperbole; instead, rely on nuanced arguments and evocative imagery. \n\nKey themes to explore: The intersection of human agency and technological deterministic forces, the erosion of traditional boundaries, and the synthesis of new cultural paradigms.",
        ]
      }
    ];

    const subjectsMap: Record<string, string[]> = {
      "Coding": techSubjects,
      "Images": imageSubjects,
      "Business": businessSubjects,
      "Writing": ["The Singularity", "Post-Capitalist Aesthetics", "Digital Dualism", "The Ethics of Artificial General Intelligence"]
    };

    const unsplashIds = ["1451187580459-43490279c0fa", "1518770660439-4636190af475", "1550751827-4bd374c3f58b", "1485827404703-89b55fcc595e", "1531297484001-80022131f5a1"];

    for (let i = 0; i < count; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const categorySubjects = subjectsMap[template.category] || techSubjects;
        const subject = categorySubjects[Math.floor(Math.random() * categorySubjects.length)];
        const author = authors[Math.floor(Math.random() * authors.length)];
        
        const title = template.titlePattern[Math.floor(Math.random() * template.titlePattern.length)].replace("{subject}", subject);
        const contentPatternLine = template.contentPattern[Math.floor(Math.random() * template.contentPattern.length)];
        const baseContent = contentPatternLine.replace(/{subject}/g, subject);
        
        // Generate "half a page" of content by adding detailed context and expansion
        const expandedContent = `
# ${title}
## Project Overview
The following prompt is designed for high-level ${template.category} applications. It addresses the complexities of ${subject} with a focus on professional standards and extreme technical accuracy.

## The Professional Prompt
${baseContent}

## Operational Context & Constraints
When executing this prompt, ensure that the AI model maintains a status-agnostic viewpoint while prioritizing the following parameters:
- Precision: All quantitative data must be cross-referenced with current ${template.category} benchmarks.
- Nuance: Avoid binary conclusions; explore the gradients of implementation.
- Scalability: The solution must be viable for Enterprise-level deployment.

## Technical Appendix
${"Additional detailed context for " + subject + " integration. ".repeat(15)}

## Performance Expectations
1. Response Time: Tier 1 priority.
2. Accuracy: Verified against current ${template.category} literature.
3. Creativity: High temperature (0.7-0.9) to encourage divergent thinking while maintaining structural integrity.

${baseContent.repeat(3)}
        `;

        const resultImage = template.resultImagePrefix ? `${template.resultImagePrefix}${unsplashIds[Math.floor(Math.random() * unsplashIds.length)]}?auto=format&fit=crop&q=80&w=1200` : undefined;

        try {
            await this.createPrompt({
                title,
                description: `Professional-grade ${template.category} framework focusing on the complexities of ${subject.toLowerCase()} and high-stakes implementation.`,
                content: expandedContent,
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
        // Small delay to prevent hitting Firestore limits too hard in one burst
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
