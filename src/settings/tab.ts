import { App, PluginSettingTab, Setting } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QueueType } from '../queues/types';
import { QUEUE_CONFIGS } from '../queues/configs';

export class VaultCleanupSettingTab extends PluginSettingTab {
  plugin: VaultCleanupPlugin;

  constructor(app: App, plugin: VaultCleanupPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // General settings (cleanup profiles) - no heading per guidelines
    for (const [id, config] of Object.entries(QUEUE_CONFIGS)) {
      new Setting(containerEl)
        .setName(`${config.icon} ${config.title}`)
        .setDesc(config.description)
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.enabledQueues[id as QueueType])
          .onChange(async (value) => {
            this.plugin.settings.enabledQueues[id as QueueType] = value;
            await this.plugin.saveSettings();
            this.display();
          })
        );

      // Nested setting for misfiled queue
      if (id === 'misfiled' && this.plugin.settings.enabledQueues.misfiled) {
        new Setting(containerEl)
          .setName('Allowed folders')
          .setDesc('Comma-separated folder names where notes are allowed')
          .addText(text => text
            .setPlaceholder('attachments, daily, templates, archived')
            .setValue(this.plugin.settings.allowedFolders.join(', '))
            .onChange(async (value) => {
              this.plugin.settings.allowedFolders = value
                .split(',')
                .map(f => f.trim().toLowerCase())
                .filter(f => f.length > 0);
              await this.plugin.saveSettings();
            })
          );
      }
    }

    // Hotkeys section
    new Setting(containerEl)
      .setName('Hotkeys')
      .setHeading();

    new Setting(containerEl)
      .setName('Enable keyboard shortcuts')
      .setDesc('Hotkeys only work when a queue view is focused')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableQueueHotkeys)
        .onChange(async (value) => {
          this.plugin.settings.enableQueueHotkeys = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.enableQueueHotkeys) {
      const hotkeySettings = [
        { key: 'hotkeyEdit', name: 'Edit / Move', desc: 'Key to edit or move the current file' },
        { key: 'hotkeyDelete', name: 'Delete', desc: 'Key to delete the current file' },
        { key: 'hotkeySkip', name: 'Skip', desc: 'Key to skip the current file' },
        { key: 'hotkeyExit', name: 'Exit', desc: 'Key to exit the queue' },
      ] as const;

      for (const { key, name, desc } of hotkeySettings) {
        new Setting(containerEl)
          .setName(name)
          .setDesc(desc)
          .addText(text => text
            .setValue(this.plugin.settings[key])
            .onChange(async (value) => {
              this.plugin.settings[key] = value || this.getDefaultHotkey(key);
              await this.plugin.saveSettings();
            })
          );
      }
    }
  }

  private getDefaultHotkey(key: string): string {
    const defaults: Record<string, string> = {
      hotkeyEdit: 'e',
      hotkeyDelete: 'd',
      hotkeySkip: 's',
      hotkeyExit: 'Escape',
    };
    return defaults[key] || '';
  }
}
