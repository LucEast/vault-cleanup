import { TFile } from 'obsidian';

export type QueueType =
  | 'empty'
  | 'untagged'
  | 'unfiled'
  | 'unused'
  | 'orphan'
  | 'missingType'
  | 'missingTopic'
  | 'misfiled';

export interface QueueConfig {
  id: QueueType;
  title: string;
  icon: string;
  description: string;
  action: string;
  hasBatchDelete: boolean;
  editLabel: string;
  editCommand: string | null;
}

export interface QueueDetector {
  getFiles(): Promise<TFile[]>;
}
