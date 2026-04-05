import { TFile } from 'obsidian';

export type QueueType =
  | 'empty'
  | 'untagged'
  | 'unfiled'
  | 'unused'
  | 'orphan'
  | 'missingType'
  | 'missingTopic'
  | 'misfiled'
  | 'dailyTemplate';

export type BatchActionType = 'delete' | 'moveToRoot';

export interface BatchAction {
  label: string;
  type: BatchActionType;
}

export interface QueueConfig {
  id: QueueType;
  title: string;
  icon: string;
  description: string;
  action: string;
  editLabel: string;
  editCommand: string | null;
  batchAction: BatchAction | null;
}

export interface QueueDetector {
  getFiles(): Promise<TFile[]>;
}
