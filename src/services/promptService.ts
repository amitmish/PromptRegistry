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
  }
};
