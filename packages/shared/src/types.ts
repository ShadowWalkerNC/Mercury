// ─── Core entity types ────────────────────────────────────────────────────────
// These mirror the database schema exactly. All IDs are ULIDs.

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  status: PresenceStatus;
  created_at: string;
}

export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface Space {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  created_at: string;
}

export type ChannelType = 'text' | 'announcement' | 'voice';

export interface Channel {
  id: string;
  space_id: string;
  name: string;
  type: ChannelType;
  position: number;
  created_at: string;
}

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface Member {
  id: string;
  space_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  // Joined from users table
  username?: string;
  avatar?: string | null;
  status?: PresenceStatus;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  edited_at: string | null;
  created_at: string;
  // Joined from users table
  author_username?: string;
  author_avatar?: string | null;
}

export interface Invite {
  code: string;
  space_id: string;
  creator_id: string;
  uses: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
