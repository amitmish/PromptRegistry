import { Timestamp } from 'firebase/firestore';

export type Category = 'Coding' | 'Writing' | 'Creative' | 'Business' | 'Images' | 'Other';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  createdAt: Timestamp | Date;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string;
  category: Category;
  tags: string[];
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Timestamp | Date;
  likesCount: number;
  likes: string[];
  usageCount: number;
  aiModel?: string;
  resultImage?: string;
}
