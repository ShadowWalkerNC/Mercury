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
  if (modal === 'createChannel')  content = <CreateChannelModal  onClose={closeModal} spaceId={modalProps['spaceId'] as string} defaultType={(modalProps['type'] as 'text' | 'voice') ?? 'text'} />;
  if (modal === 'inviteMembers')  content = <InviteMembersModal  onClose={closeModal} spaceId={modalProps['spaceId'] as string} />;
  if (modal === 'userSettings')   content = <UserSettingsModal   onClose={closeModal} />;
  if (modal === 'twoFactorSetup') content = <TwoFactorSetupModal onClose={closeModal} />;
  if (modal === 'settings')       content = <SpaceSettingsModal  onClose={closeModal} spaceId={modalProps['spaceId'] as string} />;

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
