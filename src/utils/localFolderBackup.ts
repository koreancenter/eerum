import { StoredCard } from '../types/card';
import { getBiometricVaultSalt } from './cryptoVault';
import { isPinSet, getSessionLocked } from './pinLock';
import { getActiveSessionKey, getActiveSessionPin } from './vaultSession';
import {
  getAccountFolderHandleId,
  getAccountLastFolderBackupKey,
  resolveAccountId,
} from './accountStorage';
import {
  BACKUP_UPDATED_EVENT,
  createEncryptedBackupContent,
  createEncryptedBackupContentWithKey,
  createPlainBackupContent,
} from './vaultBackup';
import { getCurrentLocale } from '../hooks/useLocale';

const BACKUP_HANDLE_DB_NAME = 'eerum_local_backup_db';
const BACKUP_HANDLE_DB_VERSION = 1;
const BACKUP_HANDLE_STORE = 'eerum_backup_handles';
export const AUTO_BACKUP_FILENAME = 'eerum-auto-backup.eerum';

type FolderPermissionMode = 'read' | 'readwrite';
type FolderPermissionState = 'granted' | 'denied' | 'prompt';

interface DirectoryHandleWithPermissions extends FileSystemDirectoryHandle {
  queryPermission?: (descriptor?: { mode?: FolderPermissionMode }) => Promise<FolderPermissionState>;
  requestPermission?: (descriptor?: { mode?: FolderPermissionMode }) => Promise<FolderPermissionState>;
}

interface WindowWithDirectoryPicker extends Window {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: FolderPermissionMode;
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }) => Promise<DirectoryHandleWithPermissions>;
}

export function isLocalFolderBackupSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function getLastFolderBackupAt(accountId?: string | null): number | null {
  if (typeof window === 'undefined') return null;
  const key = getAccountLastFolderBackupKey(accountId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function recordFolderBackupTimestamp(timestampMs = Date.now(), accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = getAccountLastFolderBackupKey(accountId);
  if (!key) return;
  try {
    localStorage.setItem(key, String(timestampMs));
    window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

function openBackupHandlesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = window.indexedDB.open(BACKUP_HANDLE_DB_NAME, BACKUP_HANDLE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BACKUP_HANDLE_STORE)) {
        db.createObjectStore(BACKUP_HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

async function saveDirectoryHandle(
  handle: DirectoryHandleWithPermissions,
  accountId?: string | null
): Promise<void> {
  const handleKey = getAccountFolderHandleId(accountId);
  if (!handleKey) return;
  const db = await openBackupHandlesDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BACKUP_HANDLE_STORE, 'readwrite');
      const store = tx.objectStore(BACKUP_HANDLE_STORE);
      store.put(handle, handleKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to persist directory handle'));
    });
  } finally {
    db.close();
  }
}

async function loadDirectoryHandle(
  accountId?: string | null
): Promise<DirectoryHandleWithPermissions | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  const handleKey = getAccountFolderHandleId(accountId);
  if (!handleKey) return null;
  const db = await openBackupHandlesDb();
  try {
    return await new Promise<DirectoryHandleWithPermissions | null>((resolve, reject) => {
      const tx = db.transaction(BACKUP_HANDLE_STORE, 'readonly');
      const store = tx.objectStore(BACKUP_HANDLE_STORE);
      const req = store.get(handleKey);
      req.onsuccess = () => resolve((req.result as DirectoryHandleWithPermissions) || null);
      req.onerror = () => reject(req.error || new Error('Failed to load directory handle'));
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function removeDirectoryHandleForAccount(accountId?: string | null): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  const handleKey = getAccountFolderHandleId(accountId);
  if (!handleKey) return;
  const db = await openBackupHandlesDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BACKUP_HANDLE_STORE, 'readwrite');
      const store = tx.objectStore(BACKUP_HANDLE_STORE);
      store.delete(handleKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to remove directory handle'));
    });
  } finally {
    db.close();
  }
}

async function queryReadWritePermission(handle: DirectoryHandleWithPermissions): Promise<boolean> {
  if (typeof handle.queryPermission !== 'function') return true;
  try {
    const state = await handle.queryPermission({ mode: 'readwrite' });
    return state === 'granted';
  } catch {
    return false;
  }
}

export async function connectBackupDirectory(accountId?: string | null): Promise<{
  ok: boolean;
  folderName?: string;
  error?: string;
}> {
  const isEn = getCurrentLocale() === 'en';
  if (!resolveAccountId(accountId)) {
    return {
      ok: false,
      error: isEn
        ? 'Sign in to a local account to connect an auto-backup folder.'
        : '로컬 계정에 로그인한 후 자동 백업 폴더를 연결할 수 있습니다.',
    };
  }
  if (!isLocalFolderBackupSupported()) {
    return {
      ok: false,
      error: isEn
        ? 'This browser does not support local folder auto-backup (File System Access API).'
        : '이 브라우저는 로컬 폴더 자동 백업(File System Access API)을 지원하지 않습니다.',
    };
  }

  const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  if (typeof picker !== 'function') {
    return {
      ok: false,
      error: isEn ? 'Unable to open folder picker.' : '폴더 선택기를 실행할 수 없습니다.',
    };
  }

  try {
    const handle = await picker({
      id: 'eerum-auto-backup-folder',
      mode: 'readwrite',
    });

    let granted = await queryReadWritePermission(handle);
    if (!granted && typeof handle.requestPermission === 'function') {
      const reqState = await handle.requestPermission({ mode: 'readwrite' });
      granted = reqState === 'granted';
    }

    if (!granted) {
      return {
        ok: false,
        error: isEn
          ? 'Write permission was not granted for the selected folder.'
          : '선택한 폴더에 대한 쓰기 권한이 허용되지 않았습니다.',
      };
    }

    await saveDirectoryHandle(handle, accountId);
    window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
    return {
      ok: true,
      folderName: handle.name,
    };
  } catch (err) {
    const errName = (err as Error)?.name;
    if (errName === 'AbortError') {
      return { ok: false };
    }
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : isEn
            ? 'An error occurred while connecting the backup folder.'
            : '백업 폴더를 연결하는 중 오류가 발생했습니다.',
    };
  }
}

export async function requestBackupDirectoryPermission(accountId?: string | null): Promise<{
  ok: boolean;
  folderName?: string;
  error?: string;
}> {
  const isEn = getCurrentLocale() === 'en';
  if (!isLocalFolderBackupSupported()) {
    return {
      ok: false,
      error: isEn
        ? 'This browser does not support local folder auto-backup.'
        : '이 브라우저는 로컬 폴더 자동 백업을 지원하지 않습니다.',
    };
  }

  const handle = await loadDirectoryHandle(accountId);
  if (!handle) {
    return {
      ok: false,
      error: isEn ? 'No backup folder connected.' : '연결된 백업 폴더가 없습니다.',
    };
  }

  try {
    let granted = await queryReadWritePermission(handle);
    if (!granted && typeof handle.requestPermission === 'function') {
      const state = await handle.requestPermission({ mode: 'readwrite' });
      granted = state === 'granted';
    }

    if (!granted) {
      return {
        ok: false,
        folderName: handle.name,
        error: isEn ? 'Folder write permission was denied.' : '폴더 쓰기 권한이 거부되었습니다.',
      };
    }

    window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
    return {
      ok: true,
      folderName: handle.name,
    };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return { ok: false, folderName: handle.name };
    }
    return {
      ok: false,
      folderName: handle.name,
      error:
        err instanceof Error
          ? err.message
          : isEn
            ? 'Could not verify folder permissions.'
            : '폴더 권한을 확인하지 못했습니다.',
    };
  }
}

export async function disconnectBackupDirectory(accountId?: string | null): Promise<void> {
  try {
    await removeDirectoryHandleForAccount(accountId);
  } catch {
    // Ignore IndexedDB cleanup errors
  }
  const key = getAccountLastFolderBackupKey(accountId);
  if (typeof window !== 'undefined' && key) {
    try {
      localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
    } catch {
      // Ignore storage cleanup errors
    }
  }
}

export async function getConnectedDirectoryInfo(accountId?: string | null): Promise<{
  folderName: string;
  hasPermission: boolean;
} | null> {
  if (!isLocalFolderBackupSupported() || !resolveAccountId(accountId)) return null;
  const handle = await loadDirectoryHandle(accountId);
  if (!handle) return null;
  const hasPermission = await queryReadWritePermission(handle);
  return {
    folderName: handle.name,
    hasPermission,
  };
}

async function serializeAutoBackupContent(
  cards: StoredCard[],
  categories: string[],
  accountId?: string | null
): Promise<string | null> {
  if (isPinSet(accountId)) {
    if (getSessionLocked(accountId)) return null;
    const activePin = getActiveSessionPin();
    if (activePin && activePin.trim().length >= 4) {
      return createEncryptedBackupContent(cards, categories, activePin, true);
    }
    const activeKey = getActiveSessionKey();
    const bioSalt = getBiometricVaultSalt(accountId);
    if (activeKey && bioSalt) {
      return createEncryptedBackupContentWithKey(cards, categories, activeKey, bioSalt, true);
    }
    return null;
  }

  return createPlainBackupContent(cards, categories);
}

export async function writeAutoBackupToDirectory(
  cards: StoredCard[],
  categories: string[],
  accountId?: string | null
): Promise<boolean> {
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return false;
  if (!isLocalFolderBackupSupported()) return false;
  if (!Array.isArray(cards) || cards.length === 0) return false;

  const handle = await loadDirectoryHandle(resolvedId);
  if (!handle) return false;

  const hasPermission = await queryReadWritePermission(handle);
  if (!hasPermission) return false;

  const content = await serializeAutoBackupContent(cards, categories, resolvedId);
  if (!content) return false;

  try {
    const fileHandle = await handle.getFileHandle(AUTO_BACKUP_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    recordFolderBackupTimestamp(Date.now(), resolvedId);
    return true;
  } catch (err) {
    console.warn('Local folder auto-backup write notice:', err);
    return false;
  }
}
