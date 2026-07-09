import { useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { gateway } from '@/lib/gateway';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUIStore } from '@/stores/uiStore';
import { WSOp } from '@mercury/shared';
import { SpaceSidebar } from './SpaceSidebar';
import { ChannelSidebar } from './ChannelSidebar';

function SpaceLayout() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const setActiveSpace = useUIStore(s => s.setActiveSpace);
  useEffect(() => { if (spaceId) setActiveSpace(spaceId); }, [spaceId]);
  if (!spaceId) return null;
  return <ChannelSidebar spaceId={spaceId} />;
}

export function AppShell() {
  const user        = useAuthStore(s => s.user);
  const fetchSpaces = useSpaceStore(s => s.fetchSpaces);

  useEffect(() => {
    if (!user) return;
    gateway.connect();
    const offReady = gateway.on(WSOp.READY, () => { fetchSpaces(); });
    return () => { offReady(); gateway.disconnect(); };
  }, [user?.id]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <SpaceSidebar />

      <Routes>
        <Route path="channels/:spaceId/*" element={<SpaceLayout />} />
        <Route path="channels/@me" element={
          <aside style={{ width: 240, minWidth: 240, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Direct Messages
          </aside>
        } />
      </Routes>

      {/* Main content area — filled in M-038 */}
      <div style={{ flex: 1, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Select a channel
      </div>
    </div>
  );
}
