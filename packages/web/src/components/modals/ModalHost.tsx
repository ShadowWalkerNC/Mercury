import { useUIStore } from '@/stores/uiStore';
import { CreateSpaceModal } from './CreateSpaceModal';
import { CreateChannelModal } from './CreateChannelModal';
import { InviteMembersModal } from './InviteMembersModal';
import { UserSettingsModal } from './UserSettingsModal';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { SpaceSettingsModal } from './SpaceSettingsModal';

export function ModalHost() {
  const { modal, modalProps, closeModal } = useUIStore();
  if (!modal) return null;

  let content: React.ReactNode = null;
  if (modal === 'createSpace')    content = <CreateSpaceModal    onClose={closeModal} />;
  if (modal === 'createChannel') {
    const props = modalProps as { spaceId: string; type?: 'text' | 'voice' };
    content = <CreateChannelModal  onClose={closeModal} spaceId={props.spaceId} defaultType={props.type ?? 'text'} />;
  }
  if (modal === 'inviteMembers') {
    const props = modalProps as { spaceId: string };
    content = <InviteMembersModal  onClose={closeModal} spaceId={props.spaceId} />;
  }
  if (modal === 'userSettings')   content = <UserSettingsModal   onClose={closeModal} />;
  if (modal === 'twoFactorSetup') content = <TwoFactorSetupModal onClose={closeModal} />;
  if (modal === 'settings') {
    const props = modalProps as { spaceId: string };
    content = <SpaceSettingsModal  onClose={closeModal} spaceId={props.spaceId} />;
  }

  if (!content) return null;
  return (
    <div style={css.backdrop} onClick={closeModal}>
      <div style={css.panel} onClick={e => e.stopPropagation()}>{content}</div>
    </div>
  );
}

const css = {
  backdrop: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  panel:    { background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 24, width: 480, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
} satisfies Record<string, React.CSSProperties>;
