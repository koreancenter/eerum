import React, { Suspense } from 'react';
import { StoredCard, PrintConfig } from '../types/card';
import { ModalManager } from '../hooks/useModalState';
import { loadUserCards } from '../utils/initialCards';
import { getCardShareUrl } from '../utils/domain';
import { lazyWithRetry, LazyErrorBoundary } from '../utils/lazyWithRetry';

const ShareModal = lazyWithRetry(() =>
  import('./ShareModal').then((m) => ({ default: m.ShareModal }))
);
const QrModal = lazyWithRetry(() =>
  import('./QrModal').then((m) => ({ default: m.QrModal }))
);
const PrintModal = lazyWithRetry(() =>
  import('./PrintModal').then((m) => ({ default: m.PrintModal }))
);
const ExportModal = lazyWithRetry(() =>
  import('./ExportModal').then((m) => ({ default: m.ExportModal }))
);
const PhotoArchiveModal = lazyWithRetry(() =>
  import('./PhotoArchiveModal').then((m) => ({ default: m.PhotoArchiveModal }))
);
const CardEditorModal = lazyWithRetry(() =>
  import('./CardEditorModal').then((m) => ({ default: m.CardEditorModal }))
);
const DeviceSyncModal = lazyWithRetry(() =>
  import('./DeviceSyncModal').then((m) => ({ default: m.DeviceSyncModal }))
);
const PinLockModal = lazyWithRetry(() =>
  import('./PinLockModal').then((m) => ({ default: m.PinLockModal }))
);
const BiometricsSettingModal = lazyWithRetry(() =>
  import('./BiometricsSettingModal').then((m) => ({ default: m.BiometricsSettingModal }))
);
const LazyPinSetupModal = lazyWithRetry(() =>
  import('./LazyPinSetupModal').then((m) => ({ default: m.LazyPinSetupModal }))
);
const LegalModal = lazyWithRetry(() =>
  import('./LegalModal').then((m) => ({ default: m.LegalModal }))
);
const ResetDataModal = lazyWithRetry(() =>
  import('./ResetDataModal').then((m) => ({ default: m.ResetDataModal }))
);

export interface AppModalsProps {
  modals: ModalManager;
  activeCard?: StoredCard;
  isOwner: boolean;
  printConfig: PrintConfig;
  setPrintConfig: React.Dispatch<React.SetStateAction<PrintConfig>>;
  onSaveCard: (card: StoredCard) => void;
  onConfirmReset: () => void;
  isLocked: boolean;
  isPinConfigured: boolean;
  unlockApp: () => void;
  refreshPinStatus: () => void;
  setCards: React.Dispatch<React.SetStateAction<StoredCard[]>>;
  showToast: (msg: string) => void;
  onBiometricUnlock: () => void;
}

/**
 * AppModals
 * Centralized declarative container for all application modals.
 * Loads only the active modal on demand with automatic retry, sub-modal return flow, and error boundary isolation.
 */
export const AppModals: React.FC<AppModalsProps> = ({
  modals,
  activeCard,
  isOwner,
  printConfig,
  setPrintConfig,
  onSaveCard,
  onConfirmReset,
  isLocked,
  isPinConfigured,
  unlockApp,
  refreshPinStatus,
  setCards,
  showToast,
  onBiometricUnlock,
}) => {
  const isLockScreenActive = isLocked && isPinConfigured;

  return (
    <LazyErrorBoundary
      variant="modal"
      onDismiss={isLockScreenActive ? undefined : modals.closeAll}
    >
      <Suspense fallback={null}>
        {/* Modals (Owner Mode Only) */}
        {isOwner && activeCard && modals.isShareOpen && (
          <ShareModal
            isOpen={modals.isShareOpen}
            onClose={modals.closeShare}
            data={activeCard.data}
            cardUrl={getCardShareUrl(activeCard)}
            onOpenPrint={() => modals.openPrint(true)}
            onOpenExport={() => modals.openExport(true)}
          />
        )}

        {isOwner && activeCard && modals.isQrOpen && (
          <QrModal
            isOpen={modals.isQrOpen}
            onClose={modals.closeQr}
            data={activeCard.data}
          />
        )}

        {isOwner && activeCard && modals.isPrintOpen && (
          <PrintModal
            isOpen={modals.isPrintOpen}
            onClose={modals.closePrint}
            data={activeCard.data}
            config={printConfig}
            onConfigChange={setPrintConfig}
            isSubModal={modals.isFromShare}
          />
        )}

        {isOwner && activeCard && modals.isExportOpen && (
          <ExportModal
            isOpen={modals.isExportOpen}
            onClose={modals.closeExport}
            card={activeCard.data}
            theme={activeCard.theme}
            slug={activeCard.slug}
            isSubModal={modals.isFromShare}
          />
        )}

        {/* Photo Archiving & Card Scan Modal */}
        {modals.isScanOpen && (
          <PhotoArchiveModal
            isOpen={modals.isScanOpen}
            onClose={modals.closeScan}
            onSaveCard={onSaveCard}
          />
        )}

        {/* Device Cross-Sync Modal */}
        {modals.isSyncOpen && (
          <DeviceSyncModal
            isOpen={modals.isSyncOpen}
            onClose={modals.closeSync}
          />
        )}

        {/* Fullscreen Lock Screen Overlay when app is locked */}
        {isLockScreenActive && (
          <PinLockModal
            isOpen={true}
            mode="unlock"
            allowCancel={false}
            onUnlock={() => {
              unlockApp();
              const decrypted = loadUserCards();
              if (decrypted && decrypted.length > 0) {
                setCards(decrypted);
              }
              showToast('보안 잠금이 해제되었습니다.');
            }}
            onBiometricUnlock={onBiometricUnlock}
          />
        )}

        {/* PIN Configuration Modal (Setup / Change / Disable) */}
        {modals.isPinConfigOpen && (
          <PinLockModal
            isOpen={modals.isPinConfigOpen}
            mode={modals.pinModalMode}
            allowCancel={true}
            onClose={modals.closePinConfig}
            onSuccess={() => {
              refreshPinStatus();
              const decrypted = loadUserCards();
              if (decrypted && decrypted.length > 0) {
                setCards(decrypted);
              }
              showToast(
                modals.pinModalMode === 'setup'
                  ? '4자리 PIN 잠금이 설정되었습니다.'
                  : 'PIN 번호가 성공적으로 변경되었습니다.'
              );
            }}
          />
        )}

        {/* Dedicated Register Biometrics UI Setting Modal */}
        {modals.isBiometricsOpen && (
          <BiometricsSettingModal
            isOpen={modals.isBiometricsOpen}
            onClose={modals.closeBiometrics}
            onOpenPinSetup={() => {
              modals.openPinConfig(isPinConfigured ? 'change' : 'setup');
            }}
            onStatusChange={() => {
              refreshPinStatus();
            }}
          />
        )}

        {/* Lazy PIN Setup Modal (triggers only after user creates and saves first card) */}
        {modals.isLazyPinOpen && (
          <LazyPinSetupModal
            isOpen={modals.isLazyPinOpen}
            onClose={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('lazy_pin_dismissed', 'true');
              }
              modals.closeLazyPin();
              showToast('설정 메뉴에서 언제든 4자리 PIN을 설정할 수 있습니다.');
            }}
            onProceedSetup={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('lazy_pin_dismissed', 'true');
              }
              modals.closeLazyPin();
              modals.openPinConfig('setup');
            }}
          />
        )}

        {/* Legal Disclosures Modal (Privacy Policy & Terms of Service) */}
        {modals.isLegalOpen && (
          <LegalModal
            isOpen={modals.isLegalOpen}
            initialDoc={modals.legalDocType}
            onClose={modals.closeLegal}
          />
        )}

        {/* Local Data Reset Confirmation Modal */}
        {modals.isResetOpen && (
          <ResetDataModal
            isOpen={modals.isResetOpen}
            onClose={modals.closeReset}
            onConfirmReset={onConfirmReset}
          />
        )}

        {/* Multi-mode Card Editor Modal */}
        {modals.editingCard && modals.isEditorOpen && (
          <CardEditorModal
            isOpen={modals.isEditorOpen}
            onClose={modals.closeEditor}
            card={modals.editingCard}
            onSave={onSaveCard}
            isMyCardMode={modals.editingCard.isMyCard || modals.isCreatingCard}
            isCreating={modals.isCreatingCard}
          />
        )}
      </Suspense>
    </LazyErrorBoundary>
  );
};
