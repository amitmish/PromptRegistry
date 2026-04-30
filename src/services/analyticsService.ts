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
const ADMIN_EMAIL = 'amitfinkel100@gmail.com';

const shouldExclude = () => {
  return auth.currentUser?.email === ADMIN_EMAIL;
};

export const analyticsService = {
  async trackVisit() {
    if (shouldExclude()) return;
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
            totalPrompts: 0,
            totalClicks: 0
          });
          localStorage.setItem('prompt_registry_visited', 'true');
        }
      });
    } catch (error) {
      // Don't throw for background tracking, just log
      console.warn('Failed to track visit:', error);
    }
  },

  async trackClick(label?: string) {
    if (shouldExclude()) return;
    try {
      const statsRef = doc(db, STATS_DOC);
      const updates: any = {
        totalClicks: increment(1)
      };

      if (label) {
        // We use a dot-notation mapping for nested field updates in Firestore
        // sanitized label to avoid issues with special characters
        const safeLabel = label.replace(/[$.[\]#/]/g, '_').slice(0, 50);
        updates[`clicksByButton.${safeLabel}`] = increment(1);
      }

      await updateDoc(statsRef, updates).catch(async (err) => {
        if (err.code === 'not-found') {
          const initialData: any = {
            totalVisits: 0,
            totalShares: 0,
            totalSignIns: 0,
            totalLikes: 0,
            totalPrompts: 0,
            totalClicks: 1
          };
          if (label) {
            const safeLabel = label.replace(/[$.[\]#/]/g, '_').slice(0, 50);
            initialData.clicksByButton = { [safeLabel]: 1 };
          }
          await setDoc(statsRef, initialData);
        }
      });
    } catch (error) {
      console.warn('Failed to track click:', error);
    }
  },

  async trackShare() {
    if (shouldExclude()) return;
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
            totalPrompts: 0,
            totalClicks: 0
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track share:', error);
    }
  },

  async trackSignIn() {
    if (shouldExclude()) return;
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
            totalPrompts: 0,
            totalClicks: 0
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track sign in:', error);
    }
  },

  async trackLike(isIncrement: boolean = true) {
    if (shouldExclude()) return;
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
            totalPrompts: 0,
            totalClicks: 0
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track like:', error);
    }
  },

  async trackPromptCreated() {
    if (shouldExclude()) return;
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
            totalPrompts: 1,
            totalClicks: 0
          });
        }
      });
    } catch (error) {
      console.warn('Failed to track prompt creation:', error);
    }
  },

  async getAdminStats() {
    if (auth.currentUser?.email !== ADMIN_EMAIL) {
      throw new Error('Unauthorized');
    }

    try {
      const statsDoc = await getDoc(doc(db, STATS_DOC));
      const statsData = statsDoc.data() || {
        totalVisits: 0,
        totalShares: 0,
        totalSignIns: 0,
        totalLikes: 0,
        totalPrompts: 0,
        totalClicks: 0
      };

      // Also get user count (limited for performance)
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      const promptsSnap = await getDocs(query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(100)));

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
