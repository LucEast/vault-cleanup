import { QueueType } from '../queues/types';

export type VaultOrganization = 'root' | 'folders';

export interface VaultCleanupSettings {
  enabledQueues: Record<QueueType, boolean>;
  vaultOrganization: VaultOrganization;
  allowedFolders: string[];
  enableQueueHotkeys: boolean;
  hotkeyEdit: string;
  hotkeyDelete: string;
  hotkeyKeep: string;
  hotkeyExit: string;
}

export const DEFAULT_SETTINGS: VaultCleanupSettings = {
  enabledQueues: {
    empty: true,
    untagged: true,
    unfiled: true,
    unused: true,
    orphan: true,
    missingType: true,
    missingTopic: true,
    misfiled: true,
  },
  vaultOrganization: 'root',
  allowedFolders: ['attachments', 'daily', 'templates', 'archived'],
  enableQueueHotkeys: false,
  hotkeyEdit: 'e',
  hotkeyDelete: 'd',
  hotkeyKeep: 'k',
  hotkeyExit: 'Escape',
};
