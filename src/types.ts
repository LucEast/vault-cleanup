import { TFile } from 'obsidian';

export const VIEW_TYPE_DASHBOARD = 'vault-cleanup-dashboard';
export const VIEW_TYPE_QUEUE = 'vault-cleanup-queue';

export type QueueType = 'empty' | 'untagged' | 'unfiled' | 'unused';

export interface QueueConfig {
  id: QueueType;
  title: string;
  icon: string;
  description: string;
  hasBatchDelete: boolean;
  editAction: 'open' | 'move';  // 'move' opens the move file dialog
}

export interface VaultCleanupSettings {
  enabledQueues: Record<QueueType, boolean>;
}

export const DEFAULT_SETTINGS: VaultCleanupSettings = {
  enabledQueues: {
    empty: true,
    untagged: true,
    unfiled: true,
    unused: true,
  }
};

export interface QueueDetector {
  getFiles(): Promise<TFile[]>;
}
