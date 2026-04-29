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
  limit
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
      createdAt: serverTimestamp(),
      likesCount: 0,
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
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${PROMPTS_COLLECTION}/${id}`);
    }
  },

  async likePrompt(promptId: string) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const likeRef = doc(db, PROMPTS_COLLECTION, promptId, 'likes', userId);
    const promptRef = doc(db, PROMPTS_COLLECTION, promptId);

    try {
      const likeDoc = await getDoc(likeRef);
      if (likeDoc.exists()) {
        // Unlike
        await deleteDoc(likeRef);
        await updateDoc(promptRef, {
          likesCount: increment(-1)
        });
      } else {
        // Like
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await updateDoc(promptRef, {
          likesCount: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${PROMPTS_COLLECTION}/${promptId}/likes/${userId}`);
    }
  }
};
