import { 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

const STATS_DOC = 'analytics/stats';

export const analyticsService = {
  async trackVisit() {
    try {
      const statsRef = doc(db, STATS_DOC);
      const isUnique = !localStorage.getItem('prompt_registry_visited');
      
      const updates: any = {
        totalVisits: increment(1)
      };

      if (isUnique) {
        updates.uniqueVisits = increment(1);
        localStorage.setItem('prompt_registry_visited', 'true');
      }

      await updateDoc(statsRef, updates).catch(async (err) => {
        // If doc doesn't exist, create it
        if (err.code === 'not-found' || err.message?.includes('not-found')) {
          await setDoc(statsRef, {
            totalVisits: 1,
            uniqueVisits: 1,
            totalShares: 0,
            totalSignIns: 0,
            totalLikes: 0,
            totalPrompts: 0
          });
          localStorage.setItem('prompt_registry_visited', 'true');
        }
      });
    } catch (error) {
      // Don't throw for background tracking, just log
      console.warn('Failed to track visit:', error);
    }
  },

  async trackShare() {
    try {
      const statsRef = doc(db, STATS_DOC);
      await updateDoc(statsRef, {
        totalShares: increment(1)
      }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(statsRef, {
            totalVisits: 0,
            totalShares: 1,
            totalSignIns: 0,
            totalLikes: 0,
            totalPrompts: 0
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track share:', error);
    }
  },

  async trackSignIn() {
    try {
      const statsRef = doc(db, STATS_DOC);
      await updateDoc(statsRef, {
        totalSignIns: increment(1)
      }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(statsRef, {
            totalVisits: 0,
            totalShares: 0,
            totalSignIns: 1,
            totalLikes: 0,
            totalPrompts: 0
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track sign in:', error);
    }
  },

  async trackLike(isIncrement: boolean = true) {
    try {
      const statsRef = doc(db, STATS_DOC);
      await updateDoc(statsRef, {
        totalLikes: increment(isIncrement ? 1 : -1)
      }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(statsRef, {
            totalVisits: 0,
            totalShares: 0,
            totalSignIns: 0,
            totalLikes: isIncrement ? 1 : 0,
            totalPrompts: 0
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track like:', error);
    }
  },

  async trackPromptCreated() {
    try {
      const statsRef = doc(db, STATS_DOC);
      await updateDoc(statsRef, {
        totalPrompts: increment(1)
      }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(statsRef, {
            totalVisits: 0,
            totalShares: 0,
            totalSignIns: 0,
            totalLikes: 0,
            totalPrompts: 1
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track prompt creation:', error);
    }
  },

  async getAdminStats() {
    if (auth.currentUser?.email !== 'amitfinkel100@gmail.com') {
      throw new Error('Unauthorized');
    }

    try {
      const statsDoc = await getDoc(doc(db, STATS_DOC));
      const statsData = statsDoc.data() || {
        totalVisits: 0,
        totalShares: 0,
        totalSignIns: 0,
        totalLikes: 0,
        totalPrompts: 0
      };

      // Also get user count
      const usersSnap = await getDocs(collection(db, 'users'));
      const promptsSnap = await getDocs(collection(db, 'prompts'));

      return {
        ...statsData,
        userCount: usersSnap.size,
        promptCount: promptsSnap.size,
        users: usersSnap.docs.map(d => d.data()),
        prompts: promptsSnap.docs.map(d => d.data())
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, STATS_DOC);
      throw error; // handleFirestoreError throws but for TS
    }
  }
};
