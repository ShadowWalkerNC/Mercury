import { useEffect } from 'react';
import { gateway } from '@/lib/gateway';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { WSOp } from '@mercury/shared';

export function AppShell() {
  const user = useAuthStore(s => s.user);
  const fetchSpaces = useSpaceStore(s => s.fetchSpaces);

  useEffect(() => {
    if (!user) return;
    gateway.connect();
    const offReady = gateway.on(WSOp.READY, () => { fetchSpaces(); });
    return () => { offReady(); gateway.disconnect(); };
  }, [user?.id]);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-primary)' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading Mercury…
      </div>
    </div>
  );
}
