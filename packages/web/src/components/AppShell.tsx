import { useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { gateway } from '@/lib/gateway';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUIStore } from '@/stores/uiStore';
import { WSOp } from '@mercury/shared';
import { SpaceSidebar } from './SpaceSidebar';
import { ChannelSidebar } from './ChannelSidebar';
import { ChatArea } from './ChatArea';
import { ModalHost } from './modals/ModalHost';

function SpaceLayout() {
  const { spaceId, channelId } = useParams<{ spaceId: string; channelId: string }>();
  const setActiveSpace   = useUIStore(s => s.setActiveSpace);
  const setActiveChannel = useUIStore(s => s.setActiveChannel);

  useEffect(() => {
    if (spaceId)   setActiveSpace(spaceId);
    if (channelId) setActiveChannel(channelId);
  }, [spaceId, channelId]);

  if (!spaceId) return null;
  return (
    <>
      <ChannelSidebar spaceId={spaceId} />
      {channelId
        ? <ChatArea spaceId={spaceId} channelId={channelId} />
        : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Select a channel</div>
      }
    </>
  );
}

export function AppShell() {
  const user        = useAuthStore(s => s.user);
  const fetchSpaces = useSpaceStore(s => s.fetchSpaces);
  const subscribeWS = useSpaceStore(s => s.subscribeWS);

  useEffect(() => {
    if (!user) return;
    gateway.connect();

    const offReady = gateway.on(WSOp.READY, () => {
      fetchSpaces();
    });

    // Subscribe to live space/channel WS events
    const unsubWS = subscribeWS();

    return () => {
      offReady();
      unsubWS();
      gateway.disconnect();
    };
  }, [user?.id]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <ModalHost />
      <SpaceSidebar />
      <Routes>
        <Route path="channels/:spaceId/:channelId" element={<SpaceLayout />} />
        <Route path="channels/:spaceId"             element={<SpaceLayout />} />
        <Route path="channels/@me" element={
          <aside style={{ width: 240, minWidth: 240, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Direct Messages
          </aside>
        } />
        <Route path="*" element={
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Select a space
          </div>
        } />
      </Routes>
    </div>
  );
}
