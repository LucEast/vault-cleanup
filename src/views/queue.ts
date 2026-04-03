import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QUEUE_CONFIGS } from '../queues/configs';
import { FilePreviewRenderer } from '../renderer';
import { VIEW_TYPE_QUEUE } from './types';
import { QueueType } from '../queues/types';

export class CleanupQueueView extends ItemView {
  plugin: VaultCleanupPlugin;
  queueType: QueueType = 'untagged';
  queue: TFile[] = [];
  currentIndex: number = 0;
  renderer: FilePreviewRenderer;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.renderer = new FilePreviewRenderer(this.app);
    this.keyHandler = this.handleKeydown.bind(this);
  }

  getViewType(): string { return VIEW_TYPE_QUEUE; }
  getDisplayText(): string { return QUEUE_CONFIGS[this.queueType]?.title || 'Cleanup Queue'; }
  getIcon(): string { return 'layers'; }

  async setState(state: { queueType?: QueueType }, result: any) {
    if (state.queueType) {
      this.queueType = state.queueType;
      this.leaf.updateHeader();
      await this.loadQueue();
    }
    return super.setState(state, result);
  }

  getState() { return { queueType: this.queueType }; }

  async onOpen() {
    this.contentEl.addClass('vault-cleanup-queue');
    this.contentEl.addEventListener('keydown', this.keyHandler);
    this.contentEl.setAttribute('tabindex', '0');
    await this.loadQueue();
    this.contentEl.focus();
  }

  async onClose() {
    this.contentEl.removeEventListener('keydown', this.keyHandler);
    this.renderer.cleanup();
    this.contentEl.empty();
  }

  handleKeydown(e: KeyboardEvent) {
    if (!this.plugin.settings.enableQueueHotkeys) return;

    const file = this.queue[this.currentIndex];
    if (!file && e.key !== this.plugin.settings.hotkeyExit) return;

    if (e.key.toLowerCase() === this.plugin.settings.hotkeyEdit.toLowerCase()) {
      e.preventDefault();
      this.editFile(file);
    } else if (e.key.toLowerCase() === this.plugin.settings.hotkeyDelete.toLowerCase()) {
      e.preventDefault();
      this.deleteFile(file);
    } else if (e.key.toLowerCase() === this.plugin.settings.hotkeyKeep.toLowerCase()) {
      e.preventDefault();
      this.next();
    } else if (e.key === this.plugin.settings.hotkeyExit) {
      e.preventDefault();
      this.leaf.detach();
    }
  }

  async loadQueue() {
    this.queue = await this.plugin.detectors.getFilesForQueue(this.queueType);
    this.currentIndex = 0;
    await this.render();
  }

  async render() {
    this.renderer.cleanup();
    const container = this.contentEl;
    container.empty();
    container.style.cssText = 'display: flex; flex-direction: column; height: 100%; padding: 16px; outline: none;';

    const config = QUEUE_CONFIGS[this.queueType];
    const header = container.createEl('div', { attr: { style: 'flex-shrink: 0;' } });

    header.createEl('h2', { text: `${config.icon} ${config.title}`, attr: { style: 'margin: 0 0 12px 0;' } });

    if (this.currentIndex >= this.queue.length) {
      header.createEl('p', {
        text: '✅ Queue complete! All files processed.',
        attr: { style: 'color: var(--text-success);' }
      });
      const closeBtn = header.createEl('button', { text: 'Close' });
      closeBtn.addEventListener('click', () => this.leaf.detach());
      return;
    }

    const file = this.queue[this.currentIndex];

    const progressPct = ((this.currentIndex / this.queue.length) * 100).toFixed(0);
    const progressRow = header.createEl('div', { attr: { style: 'margin-bottom: 12px;' } });
    progressRow.createEl('div', {
      attr: { style: 'background: var(--background-modifier-border); border-radius: 4px; height: 6px; margin-bottom: 4px;' }
    }).createEl('div', {
      attr: { style: `background: var(--interactive-accent); height: 100%; width: ${progressPct}%; border-radius: 4px;` }
    });
    progressRow.createEl('small', {
      text: `${this.currentIndex + 1} / ${this.queue.length}`,
      attr: { style: 'color: var(--text-muted);' }
    });

    header.createEl('div', {
      attr: { style: 'background: var(--background-secondary); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;' }
    }).innerHTML = `<strong>${file.basename}</strong> <span style="color: var(--text-muted); font-size: 0.85em;">${file.parent?.path || '/'}</span>`;

    header.createEl('div', {
      text: `💡 ${config.action}`,
      attr: {
        style: 'background: var(--background-primary-alt); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.9em;'
      }
    });

    const actions = header.createEl('div', { attr: { style: 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;' } });

    const editKey = this.plugin.settings.hotkeyEdit.toUpperCase();
    const deleteKey = this.plugin.settings.hotkeyDelete.toUpperCase();
    const keepKey = this.plugin.settings.hotkeyKeep.toUpperCase();

    const editBtn = actions.createEl('button', { text: `✏️ ${config.editLabel} (${editKey})` });
    editBtn.addEventListener('click', () => this.editFile(file));

    const deleteBtn = actions.createEl('button', { text: `🗑️ Delete (${deleteKey})` });
    deleteBtn.style.color = 'var(--text-error)';
    deleteBtn.addEventListener('click', () => this.deleteFile(file));

    const keepBtn = actions.createEl('button', { text: `⏭️ Keep (${keepKey})` });
    keepBtn.addEventListener('click', () => this.next());

    const exitBtn = actions.createEl('button', { text: '✕ Exit' });
    exitBtn.style.cssText = 'margin-left: auto; opacity: 0.7;';
    exitBtn.addEventListener('click', () => this.leaf.detach());

    if (this.plugin.settings.enableQueueHotkeys) {
      header.createEl('small', {
        text: `Hotkeys: ${editKey}=${config.editLabel}, ${deleteKey}=Delete, ${keepKey}=Keep, Esc=Exit`,
        attr: { style: 'color: var(--text-faint);' }
      });
    } else {
      header.createEl('small', {
        text: 'Hotkeys disabled (enable in settings)',
        attr: { style: 'color: var(--text-faint);' }
      });
    }

    header.createEl('hr', {
      attr: { style: 'margin: 16px 0; border: none; border-top: 1px solid var(--background-modifier-border);' }
    });

    const preview = container.createEl('div', {
      attr: {
        style: 'flex: 1; overflow-y: auto; padding: 16px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 8px;'
      }
    });

    await this.renderer.render(file, preview);
    this.contentEl.focus();
  }

  async editFile(file: TFile) {
    const config = QUEUE_CONFIGS[this.queueType];

    await this.app.workspace.openLinkText(file.path, '', false);

    if (config.editCommand) {
      // Small delay to ensure file is focused before command
      setTimeout(() => {
        this.app.commands.executeCommandById(config.editCommand!);
      }, 100);
    }

    // Auto-advance to next file
    this.next();
  }

  async deleteFile(file: TFile) {
    await this.app.vault.trash(file, true);
    new Notice(`Deleted: ${file.basename}`);
    this.queue.splice(this.currentIndex, 1);
    await this.render();
  }

  next() {
    this.currentIndex++;
    this.render();
  }
}
