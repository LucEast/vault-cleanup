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

    const config = QUEUE_CONFIGS[this.queueType];

    if (e.key.toLowerCase() === this.plugin.settings.hotkeyEdit.toLowerCase()) {
      e.preventDefault();
      if (config.editAction === 'move') {
        this.moveFile(file);
      } else {
        this.openFile(file);
      }
    } else if (e.key.toLowerCase() === this.plugin.settings.hotkeyDelete.toLowerCase()) {
      e.preventDefault();
      this.deleteFile(file);
    } else if (e.key.toLowerCase() === this.plugin.settings.hotkeySkip.toLowerCase()) {
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

    // Queue complete
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

    // Progress
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

    // File info
    header.createEl('div', {
      attr: { style: 'background: var(--background-secondary); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;' }
    }).innerHTML = `<strong>${file.basename}</strong> <span style="color: var(--text-muted); font-size: 0.85em;">${file.parent?.path || '/'}</span>`;

    // Action hint
    header.createEl('div', {
      text: `💡 ${config.action}`,
      attr: {
        style: 'background: var(--background-primary-alt); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.9em;'
      }
    });

    // Actions
    const actions = header.createEl('div', { attr: { style: 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;' } });

    const editKey = this.plugin.settings.hotkeyEdit.toUpperCase();
    const deleteKey = this.plugin.settings.hotkeyDelete.toUpperCase();
    const skipKey = this.plugin.settings.hotkeySkip.toUpperCase();

    if (config.editAction === 'move') {
      const moveBtn = actions.createEl('button', { text: `📁 Move (${editKey})` });
      moveBtn.addEventListener('click', () => this.moveFile(file));
    } else {
      const editBtn = actions.createEl('button', { text: `✏️ Edit (${editKey})` });
      editBtn.addEventListener('click', () => this.openFile(file));
    }

    const deleteBtn = actions.createEl('button', { text: `🗑️ Delete (${deleteKey})` });
    deleteBtn.style.color = 'var(--text-error)';
    deleteBtn.addEventListener('click', () => this.deleteFile(file));

    const skipBtn = actions.createEl('button', { text: `⏭️ Skip (${skipKey})` });
    skipBtn.addEventListener('click', () => this.next());

    const exitBtn = actions.createEl('button', { text: '✕ Exit' });
    exitBtn.style.cssText = 'margin-left: auto; opacity: 0.7;';
    exitBtn.addEventListener('click', () => this.leaf.detach());

    // Keyboard hint
    if (this.plugin.settings.enableQueueHotkeys) {
      header.createEl('small', {
        text: `Hotkeys enabled: ${editKey}=Edit, ${deleteKey}=Delete, ${skipKey}=Skip, Esc=Exit`,
        attr: { style: 'color: var(--text-faint);' }
      });
    } else {
      header.createEl('small', {
        text: 'Hotkeys disabled (enable in settings)',
        attr: { style: 'color: var(--text-faint);' }
      });
    }

    // Separator
    header.createEl('hr', {
      attr: { style: 'margin: 16px 0; border: none; border-top: 1px solid var(--background-modifier-border);' }
    });

    // Preview
    const preview = container.createEl('div', {
      attr: {
        style: 'flex: 1; overflow-y: auto; padding: 16px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 8px;'
      }
    });

    await this.renderer.render(file, preview);

    // Re-focus container for keyboard events
    this.contentEl.focus();
  }

  async openFile(file: TFile) {
    await this.app.workspace.openLinkText(file.path, '', true);
  }

  async moveFile(file: TFile) {
    await this.app.workspace.openLinkText(file.path, '', false);
    // @ts-ignore
    this.app.commands.executeCommandById('file-explorer:move-file');
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
