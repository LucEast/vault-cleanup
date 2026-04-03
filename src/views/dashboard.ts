import { ItemView, WorkspaceLeaf, debounce, Notice, TFile } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QUEUE_CONFIGS } from '../queues/configs';
import { VIEW_TYPE_DASHBOARD, VIEW_TYPE_QUEUE } from './types';
import { QueueType, BatchActionType } from '../queues/types';

export class CleanupDashboardView extends ItemView {
  plugin: VaultCleanupPlugin;
  private debouncedRefresh: () => void;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.debouncedRefresh = debounce(() => this.render(), 500, true);
  }

  getViewType(): string { return VIEW_TYPE_DASHBOARD; }
  getDisplayText(): string { return 'Cleanup Dashboard'; }
  getIcon(): string { return 'trash-2'; }

  async onOpen() {
    this.contentEl.addClass('vault-cleanup-dashboard');
    this.registerEvent(this.app.metadataCache.on('changed', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('delete', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('create', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('rename', this.debouncedRefresh));
    await this.render();
  }

  async onClose() {
    this.contentEl.empty();
  }

  async render() {
    const container = this.contentEl;
    container.empty();
    container.style.cssText = 'padding: 16px;';

    container.createEl('h2', { text: '🧹 Cleanup Dashboard', attr: { style: 'margin: 0 0 16px 0;' } });

    const grid = container.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;' }
    });

    for (const [id, config] of Object.entries(QUEUE_CONFIGS)) {
      if (!this.plugin.settings.enabledQueues[id as QueueType]) continue;

      const files = await this.plugin.detectors.getFilesForQueue(id as QueueType);
      const count = files.length;

      const card = grid.createEl('div', {
        attr: {
          style: 'background: var(--background-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--background-modifier-border);'
        }
      });

      card.createEl('div', {
        text: `${config.icon} ${config.title}`,
        attr: { style: 'font-weight: 600; margin-bottom: 4px;' }
      });

      card.createEl('div', {
        text: config.description,
        attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin-bottom: 12px;' }
      });

      card.createEl('div', {
        text: `${count} file${count === 1 ? '' : 's'}`,
        attr: { style: 'font-size: 1.5em; font-weight: 600; margin-bottom: 12px;' }
      });

      const actions = card.createEl('div', { attr: { style: 'display: flex; gap: 8px; flex-wrap: wrap;' } });

      if (count > 0) {
        const startBtn = actions.createEl('button', { text: 'Start Queue' });
        startBtn.addEventListener('click', () => this.openQueue(id as QueueType));

        // Batch action button
        if (config.batchAction) {
          const batchBtn = actions.createEl('button', { text: config.batchAction.label });
          batchBtn.style.color = config.batchAction.type === 'delete' ? 'var(--text-error)' : '';
          batchBtn.addEventListener('click', () => this.executeBatchAction(id as QueueType, files));
        }
      } else {
        card.createEl('span', {
          text: '✓ All clear',
          attr: { style: 'color: var(--text-success);' }
        });
      }
    }
  }

  async openQueue(queueType: QueueType) {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({
      type: VIEW_TYPE_QUEUE,
      state: { queueType },
    });
  }

  async executeBatchAction(queueType: QueueType, files: TFile[]) {
    const config = QUEUE_CONFIGS[queueType];
    if (!config.batchAction) return;

    const count = files.length;
    const confirmMsg = config.batchAction.type === 'delete'
      ? `Delete ${count} file${count === 1 ? '' : 's'}? This will move them to trash.`
      : `Move ${count} file${count === 1 ? '' : 's'} to vault root?`;

    if (!confirm(confirmMsg)) return;

    switch (config.batchAction.type) {
      case 'delete':
        for (const file of files) {
          await this.app.vault.trash(file, true);
        }
        new Notice(`Deleted ${count} file${count === 1 ? '' : 's'}`);
        break;

      case 'moveToRoot':
        for (const file of files) {
          const newPath = file.name;
          // Check if file already exists at root
          if (this.app.vault.getAbstractFileByPath(newPath)) {
            new Notice(`Skipped ${file.name}: file already exists at root`);
            continue;
          }
          await this.app.vault.rename(file, newPath);
        }
        new Notice(`Moved ${count} file${count === 1 ? '' : 's'} to root`);
        break;
    }

    await this.render();
  }
}
