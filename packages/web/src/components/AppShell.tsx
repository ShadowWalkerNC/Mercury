import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { gateway } from '@/lib/gateway';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { WSOp } from '@mercury/shared';
import { SpaceSidebar } from './SpaceSidebar';

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

      {/* Channel sidebar + main area — filled in M-037 onwards */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
        <Routes>
          <Route path="*" element={<span>Select a space or channel</span>} />
        </Routes>
      </div>
    </div>
  );
}
