/**
 * User-related types
 */

export type AuthProvider = 'jwt' | 'supabase' | 'eventflow';

export interface User {
  id: string;
  email?: string;
  name?: string;
  authProvider: AuthProvider;
  authId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  eventPlans?: string[]; // Event plan IDs
  conversations?: string[]; // Conversation IDs
}

export interface UserSession {
  userId: string;
  token: string;
  expiresAt: Date;
}
