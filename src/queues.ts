import { App, TFile } from 'obsidian';
import { QueueConfig, QueueType } from './types';

// ============ QUEUE CONFIGURATIONS ============
export const QUEUE_CONFIGS: Record<QueueType, QueueConfig> = {
  empty: {
    id: 'empty',
    title: 'Empty Files',
    icon: '📄',
    description: 'Notes, canvas, and base files with no content',
    hasBatchDelete: true,
    editAction: 'open',
  },
  untagged: {
    id: 'untagged',
    title: 'Untagged Files',
    icon: '🏷️',
    description: 'Notes without any tags',
    hasBatchDelete: false,
    editAction: 'open',
  },
  unfiled: {
    id: 'unfiled',
    title: 'Unfiled Files',
    icon: '📁',
    description: 'Notes in the vault root (no folder)',
    hasBatchDelete: false,
    editAction: 'move',  // Opens move dialog instead of edit
  },
  unused: {
    id: 'unused',
    title: 'Unused Attachments',
    icon: '🖼️',
    description: 'Images, videos, audio, and drawings not linked anywhere',
    hasBatchDelete: true,
    editAction: 'open',
  },
};

// ============ FILE DETECTION ============
export class QueueDetectors {
  constructor(private app: App) {}

  async getFilesForQueue(queueType: QueueType): Promise<TFile[]> {
    switch (queueType) {
      case 'empty': return this.getEmptyFiles();
      case 'untagged': return this.getUntaggedFiles();
      case 'unfiled': return this.getUnfiledFiles();
      case 'unused': return this.getUnusedAttachments();
    }
  }

  async getEmptyFiles(): Promise<TFile[]> {
    const result: TFile[] = [];
    const allFiles = this.app.vault.getFiles();

    for (const file of allFiles) {
      if (file.extension === 'md') {
        const content = await this.app.vault.cachedRead(file);
        if (content.trim().length === 0) {
          result.push(file);
        }
      } 
      else if (file.extension === 'canvas') {
        const content = await this.app.vault.cachedRead(file);
        try {
          const json = JSON.parse(content);
          if (!json.nodes || json.nodes.length === 0) {
            result.push(file);
          }
        } catch {
          result.push(file);
        }
      } 
      else if (file.extension === 'base') {
        const content = await this.app.vault.cachedRead(file);
        const trimmed = content.trim();
        const defaultBase = `views:\n  - type: table\n    name: Table`;
        if (trimmed.length === 0 || trimmed === '{}' || trimmed === defaultBase) {
          result.push(file);
        }
      }
    }
    return result;
  }

  getUntaggedFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles().filter(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      const hasTags = cache?.tags && cache.tags.length > 0;
      const hasFrontmatter = cache?.frontmatter?.tags &&
        (Array.isArray(cache.frontmatter.tags) ? cache.frontmatter.tags.length > 0 : true);
      return !hasTags && !hasFrontmatter;
    });
  }

  getUnfiledFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles().filter(file => !file.path.includes('/'));
  }

  async getUnusedAttachments(): Promise<TFile[]> {
    const attachmentExtensions = new Set([
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
      'mp4', 'webm', 'mov', 'avi', 'mkv',
      'mp3', 'wav', 'ogg', 'm4a', 'flac',
      'excalidraw',
    ]);

    // Collect all linked paths
    const linkedPaths = new Set<string>();
    const resolvedLinks = this.app.metadataCache.resolvedLinks;

    for (const sourcePath in resolvedLinks) {
      for (const destPath in resolvedLinks[sourcePath]) {
        linkedPaths.add(destPath);
      }
    }

    // Check canvas files
    const canvasFiles = this.app.vault.getFiles().filter(f => f.extension === 'canvas');
    for (const canvas of canvasFiles) {
      try {
        const content = await this.app.vault.cachedRead(canvas);
        const json = JSON.parse(content);
        if (json.nodes) {
          for (const node of json.nodes) {
            if (node.file) linkedPaths.add(node.file);
          }
        }
      } catch { /* skip */ }
    }

    // Check excalidraw.md files
    const excalidrawFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.endsWith('.excalidraw.md'));

    for (const file of excalidrawFiles) {
      try {
        const content = await this.app.vault.cachedRead(file);
        const linkRegex = /!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const linked = this.app.metadataCache.getFirstLinkpathDest(match[1], file.path);
          if (linked) linkedPaths.add(linked.path);
        }
      } catch { /* skip */ }
    }

    // Find unused
    return this.app.vault.getFiles().filter(file => {
      const ext = file.extension.toLowerCase();
      const isAttachment = attachmentExtensions.has(ext) || file.path.endsWith('.excalidraw.md');
      return isAttachment && !linkedPaths.has(file.path);
    });
  }
}
