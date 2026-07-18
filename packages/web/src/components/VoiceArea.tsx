/**
 * VoiceArea — rendered instead of ChatArea when channel.type === 'voice'.
 *
 * Flow:
 *   1. On mount: GET /api/v1/channels/:id/voice-token  → { token, url }
 *   2. Connect LiveKit Room with that token
 *   3. Render participant tiles (camera track or avatar fallback)
 *   4. Bottom bar: mute mic, deafen (disable remote audio), leave
 *
 * LiveKit hooks used:
 *   useRoom, useTracks, useParticipants, useLocalParticipant
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
  type Participant,
} from 'livekit-client';
import { useSpaceStore } from '@/stores/spaceStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface VoiceToken { token: string; url: string; }
interface Props { spaceId: string; channelId: string; }

export function VoiceArea({ spaceId, channelId }: Props) {
  const channels  = useSpaceStore(s => s.channels[spaceId] ?? []);
  const channel   = channels.find(c => c.id === channelId);

  const [room, setRoom]           = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted]         = useState(false);
  const [deafened, setDeafened]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);

  // ── connect on mount, disconnect on unmount / channel change
  useEffect(() => {
    let active = true;
    const r = new Room({ adaptiveStream: true, dynacast: true });

    function syncParticipants() {
      if (!active) return;
      setParticipants([r.localParticipant, ...Array.from(r.remoteParticipants.values())]);
    }

    r.on(RoomEvent.ParticipantConnected,    syncParticipants);
    r.on(RoomEvent.ParticipantDisconnected, syncParticipants);
    r.on(RoomEvent.TrackSubscribed,         syncParticipants);
    r.on(RoomEvent.TrackUnsubscribed,       syncParticipants);
    r.on(RoomEvent.LocalTrackPublished,     syncParticipants);
    r.on(RoomEvent.LocalTrackUnpublished,   syncParticipants);
    r.on(RoomEvent.Disconnected, () => { if (active) setParticipants([]); });

    async function connect() {
      try {
        const { token, url } = await api.get<VoiceToken>(`/api/v1/channels/${channelId}/voice-token`);
        await r.connect(url, token, { autoSubscribe: true });
        await r.localParticipant.setMicrophoneEnabled(true);
        if (active) {
          setRoom(r);
          setConnecting(false);
          syncParticipants();
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Failed to connect to voice');
          setConnecting(false);
        }
      }
    }

    void connect();

    return () => {
      active = false;
      void r.disconnect();
    };
  }, [channelId]);

  const toggleMute = useCallback(() => {
    if (!room) return;
    const next = !muted;
    void room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }, [room, muted]);

  const toggleDeafen = useCallback(() => {
    if (!room) return;
    const next = !deafened;
    // mute all remote audio tracks
    room.remoteParticipants.forEach(p => {
      p.audioTrackPublications.forEach(pub => {
        if (pub.track) pub.track.mediaStreamTrack.enabled = !next;
      });
    });
    setDeafened(next);
    // auto-mute mic when deafening
    if (next && !muted) {
      void room.localParticipant.setMicrophoneEnabled(false);
      setMuted(true);
    }
  }, [room, deafened, muted]);

  const leave = useCallback(() => {
    void room?.disconnect();
    setRoom(null);
    setParticipants([]);
  }, [room]);

  return (
    <div style={css.area}>
      {/* Header */}
      <header style={css.header}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        <span style={{ fontWeight: 700 }}>{channel?.name ?? '…'}</span>
        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          {participants.length} connected
        </span>
      </header>

      {/* Content */}
      <div style={css.content}>
        {connecting && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting to voice…</p>
        )}
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>
        )}
        {!connecting && !error && (
          <div style={css.grid}>
            {participants.map(p => (
              <ParticipantTile key={p.identity} participant={p} />
            ))}
            {participants.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No one else is here yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {room && (
        <div style={css.controls}>
          <VoiceBtn
            label={muted ? 'Unmute' : 'Mute'}
            active={muted}
            onClick={toggleMute}
          >
            {muted ? <MicOffIcon /> : <MicIcon />}
          </VoiceBtn>
          <VoiceBtn
            label={deafened ? 'Undeafen' : 'Deafen'}
            active={deafened}
            onClick={toggleDeafen}
          >
            {deafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
          </VoiceBtn>
          <VoiceBtn label="Disconnect" danger onClick={leave}>
            <PhoneOffIcon />
          </VoiceBtn>
        </div>
      )}
    </div>
  );
}

// ─── ParticipantTile ───

function ParticipantTile({ participant }: { participant: Participant }) {
  const user = useAuthStore(s => s.user);
  const isLocal = participant instanceof LocalParticipant;
  const isSpeaking = participant.isSpeaking;
  const isMuted = !participant.isMicrophoneEnabled;

  const publications = isLocal
    ? Array.from((participant as LocalParticipant).videoTrackPublications.values())
    : Array.from((participant as RemoteParticipant).videoTrackPublications.values());
  const videoTrack = publications.find(pub => pub.source === Track.Source.Camera && pub.isSubscribed && pub.track);

  const displayName = isLocal ? (user?.username ?? 'You') : participant.identity;
  const initial = displayName[0]?.toUpperCase() ?? '?';

  return (
    <div style={{
      ...css.tile,
      boxShadow: isSpeaking ? '0 0 0 2px var(--success)' : '0 0 0 2px transparent',
    }}>
      {videoTrack?.track
        ? <VideoEl track={videoTrack.track} />
        : (
          <div style={css.tileAvatar}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{initial}</span>
          </div>
        )
      }
      <div style={css.tileFooter}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}{isLocal ? ' (you)' : ''}
        </span>
        {isMuted && <span title="Muted" style={{ opacity: 0.6 }}><SmallMicOffIcon /></span>}
      </div>
    </div>
  );
}

function VideoEl({ track }: { track: Track }) {
  return (
    <video
      ref={el => { if (el) track.attach(el); }}
      autoPlay
      playsInline
      muted={track.source === Track.Source.Camera}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
    />
  );
}

// ─── VoiceBtn ───

function VoiceBtn({ children, label, active, danger, onClick }: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        ...css.ctrlBtn,
        background: danger ? 'var(--danger)' : active ? 'var(--bg-hover)' : 'var(--bg-tertiary)',
        color: danger ? '#fff' : active ? 'var(--danger)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}

// ─── SVG icons ───

function MicIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2Zm-7 9a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V23h-2v-2.06A9 9 0 0 1 3 12h2Z"/>
  </svg>;
}
function MicOffIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.41 2L2 3.41l4.58 4.58A6.97 6.97 0 0 0 5 12H3a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 20.54 17L22 18.46 23.41 17 3.41 2ZM12 1a4 4 0 0 1 4 4v3.17l-8-8A4 4 0 0 1 12 1Zm4 10.83V12a4 4 0 0 1-6.58 3.05L8 13.62A2 2 0 0 0 10 14a2 2 0 0 0 2-2v-.17l4 4Z"/>
  </svg>;
}
function HeadphonesIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1C6.477 1 2 5.477 2 11v6a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H4v-1a8 8 0 1 1 16 0v1h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a3 3 0 0 0 3-3v-6C22 5.477 17.523 1 12 1Z"/>
  </svg>;
}
function HeadphonesOffIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 3.41 3.41 2l18.58 18.58L20.58 22l-2-2H18a1 1 0 0 1-1-1v-4.59l-2-2V18H14v-6.59l-8-8A9.956 9.956 0 0 0 2 11v6a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H4v-1c0-1.2.21-2.35.6-3.41L2 3.41ZM12 1c2.55 0 4.89.96 6.66 2.54L17.24 5A8.015 8.015 0 0 0 4.93 9.48L3.46 7.99A9.988 9.988 0 0 1 12 1Zm4 10h2v1h-2v-1Zm2-1a8 8 0 0 0-1.6-4.8l1.43-1.43A9.96 9.96 0 0 1 20 11h-2Z"/>
  </svg>;
}
function PhoneOffIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.5 4.5a2 2 0 0 1 2-2h2.56a2 2 0 0 1 1.94 1.515l.605 2.42a2 2 0 0 1-.547 1.934l-.655.655c.112.331.254.66.428.984a9.9 9.9 0 0 0 3.66 3.66c.325.174.654.317.985.428l.655-.655a2 2 0 0 1 1.934-.547l2.42.605A2 2 0 0 1 21.5 15.44V18a2 2 0 0 1-2.096 1.998C10.5 19.5 4.5 13.5 4.502 5.596A2 2 0 0 1 1.5 4.5Z"/>
  </svg>;
}
function SmallMicOffIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.41 2L2 3.41l4.58 4.58A6.97 6.97 0 0 0 5 12H3a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 20.54 17L22 18.46 23.41 17 3.41 2ZM12 1a4 4 0 0 1 4 4v3.17l-8-8A4 4 0 0 1 12 1Z"/>
  </svg>;
}

// ─── Styles ───

const css = {
  area:     { flex: 1, display: 'flex', flexDirection: 'column' as const, height: '100%', minWidth: 0, background: 'var(--bg-primary)' },
  header:   { height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, fontSize: 16, color: 'var(--text-primary)', gap: 4 },
  content:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' },
  grid:     { display: 'flex', flexWrap: 'wrap' as const, gap: 12, justifyContent: 'center', alignContent: 'flex-start', width: '100%', maxHeight: '100%', overflowY: 'auto' as const },
  tile:     { width: 180, height: 180, borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', transition: 'box-shadow 0.15s' },
  tileAvatar: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)' },
  tileFooter: { height: 32, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 },
  controls: { height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderTop: '1px solid var(--border)', flexShrink: 0 },
  ctrlBtn:  { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, color 0.15s', cursor: 'pointer' },
} satisfies Record<string, React.CSSProperties>;
