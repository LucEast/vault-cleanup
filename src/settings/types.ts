import { QueueType } from '../queues/types';

export interface VaultCleanupSettings {
  enabledQueues: Record<QueueType, boolean>;
  allowedFolders: string[];
  enableQueueHotkeys: boolean;
  hotkeyEdit: string;
  hotkeyDelete: string;
  hotkeySkip: string;
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
  allowedFolders: ['attachments', 'daily', 'templates', 'archived'],
  enableQueueHotkeys: false,
  hotkeyEdit: 'e',
  hotkeyDelete: 'd',
  hotkeySkip: 's',
  hotkeyExit: 'Escape',
};
