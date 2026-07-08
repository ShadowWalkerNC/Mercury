import type { User, Message, Member, Reaction, PresenceStatus } from './types.js';

// ─── WebSocket opcodes ────────────────────────────────────────────────────────

export const WSOp = {
  // Client → Server
  IDENTIFY:        'IDENTIFY',
  PING:            'PING',
  TYPING_START:    'TYPING_START',

  // Server → Client
  READY:           'READY',
  PONG:            'PONG',
  INVALID_SESSION: 'INVALID_SESSION',

  // Dispatch events (Server → Client)
  MESSAGE_CREATE:   'MESSAGE_CREATE',
  MESSAGE_UPDATE:   'MESSAGE_UPDATE',
  MESSAGE_DELETE:   'MESSAGE_DELETE',
  REACTION_ADD:     'REACTION_ADD',
  REACTION_REMOVE:  'REACTION_REMOVE',
  MEMBER_JOIN:      'MEMBER_JOIN',
  MEMBER_LEAVE:     'MEMBER_LEAVE',
  PRESENCE_UPDATE:  'PRESENCE_UPDATE',
  TYPING_INDICATOR: 'TYPING_INDICATOR',
  DM_MESSAGE_CREATE: 'DM_MESSAGE_CREATE',
} as const;

export type WSOpCode = (typeof WSOp)[keyof typeof WSOp];

// ─── Payload shapes ───────────────────────────────────────────────────────────

export interface WSPayload<T = unknown> {
  op: WSOpCode;
  d: T;
}

export interface IdentifyPayload {
  token: string;
}

export interface ReadyPayload {
  user: User;
  session_id: string;
}

export interface MessageCreatePayload {
  message: Message;
}

export interface MessageUpdatePayload {
  message: Message;
}

export interface MessageDeletePayload {
  message_id: string;
  channel_id: string;
}

export interface ReactionAddPayload {
  reaction: Reaction;
  channel_id: string;
}

export interface ReactionRemovePayload {
  message_id: string;
  user_id: string;
  emoji: string;
  channel_id: string;
}

export interface MemberJoinPayload {
  member: Member;
  space_id: string;
}

export interface MemberLeavePayload {
  user_id: string;
  space_id: string;
}

export interface PresenceUpdatePayload {
  user_id: string;
  status: PresenceStatus;
}

export interface TypingPayload {
  user_id: string;
  username: string;
  channel_id: string;
  timestamp: number;
  clear_after: number;
}

export interface DmMessageCreatePayload {
  message: Message;
}
