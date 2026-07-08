import { Router } from 'express';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import { db } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '../config.js';

export const livekitRouter = Router();
livekitRouter.use(requireAuth);

// ─── POST /api/v1/livekit/token ───────────────────────────────────────────────────
//
// Generates a short-lived LiveKit access token for joining a voice channel.
//
// Flow:
//   1. Client requests a token for a channel_id.
//   2. Server verifies the user is a member of the space that owns the channel.
//   3. Server verifies the channel type is 'voice'.
//   4. Server mints a LiveKit AccessToken with a VideoGrant scoped to the
//      room name (= channel_id). The token grants canPublish + canSubscribe.
//   5. Client passes the token + LIVEKIT_URL directly to the LiveKit JS SDK
//      to connect to the SFU. Mercury’s server is not in the media path.
//
// Room naming:
//   LiveKit room name = channel_id (ULID). ULIDs are globally unique and
//   URL-safe, so no transformation is needed.
//
// Token TTL:
//   4 hours. If a user stays in a voice channel longer than 4 hours they
//   will need to re-request a token (the client handles this transparently).
//
// If LiveKit is not configured (env vars missing), returns 503 so the rest
// of the app continues to function without voice.

const TOKEN_TTL_SECONDS = 4 * 60 * 60; // 4 hours

livekitRouter.post(
  '/token',
  validateBody({ channel_id: { type: 'string', min: 1, max: 26 } }),
  (req: AuthRequest, res) => {
    // Guard: LiveKit must be configured
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      res.status(503).json({ error: 'Voice channels are not configured on this server' });
      return;
    }

    const { channel_id } = req.body as { channel_id: string };

    // Verify the channel exists, is type='voice', and the user is a space member
    const channel = db.prepare(`
      SELECT c.id, c.type, c.space_id
      FROM channels c
      INNER JOIN members m ON m.space_id = c.space_id
      WHERE c.id = ? AND m.user_id = ?
    `).get(channel_id, req.userId) as
      { id: string; type: string; space_id: string } | undefined;

    if (!channel) {
      res.status(404).json({ error: 'Channel not found or not a member' });
      return;
    }

    if (channel.type !== 'voice') {
      res.status(400).json({ error: 'Channel is not a voice channel' });
      return;
    }

    // Fetch the username for the LiveKit participant identity
    const user = db.prepare(
      'SELECT username FROM users WHERE id = ?'
    ).get(req.userId) as { username: string };

    // Mint the LiveKit token
    // identity  = userId (stable, used for presence/participant tracking)
    // name      = username (display name shown in the LiveKit room)
    // VideoGrant scopes the token to this specific room only
    const grant: VideoGrant = {
      room:            channel_id,
      roomJoin:        true,
      canPublish:      true,
      canSubscribe:    true,
      canPublishData:  true,  // enables data channel messages (e.g. reactions in voice)
    };

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: req.userId!,
      name:     user.username,
      ttl:      TOKEN_TTL_SECONDS,
    });
    token.addGrant(grant);

    res.json({
      token: token.toJwt(),
      url:   LIVEKIT_URL,
    });
  }
);
