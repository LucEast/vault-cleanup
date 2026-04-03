import { App, Component, MarkdownRenderer, TFile } from 'obsidian';

export class FilePreviewRenderer {
  private component: Component | null = null;

  constructor(private app: App) {}

  cleanup() {
    if (this.component) {
      this.component.unload();
      this.component = null;
    }
  }

  async render(file: TFile, container: HTMLElement): Promise<void> {
    const ext = file.extension.toLowerCase();

    // Images
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
    if (imageExts.includes(ext)) {
      container.createEl('img', {
        attr: {
          src: this.app.vault.getResourcePath(file),
          style: 'max-width: 100%; max-height: 500px; object-fit: contain;'
        }
      });
      return;
    }

    // Videos
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    if (videoExts.includes(ext)) {
      container.createEl('video', {
        attr: {
          src: this.app.vault.getResourcePath(file),
          controls: 'true',
          style: 'max-width: 100%; max-height: 500px;'
        }
      });
      return;
    }

    // Audio
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    if (audioExts.includes(ext)) {
      container.createEl('audio', {
        attr: {
          src: this.app.vault.getResourcePath(file),
          controls: 'true',
          style: 'width: 100%;'
        }
      });
      return;
    }

    // Excalidraw raw
    if (ext === 'excalidraw') {
      container.createEl('p', {
        text: '🎨 Excalidraw drawing (open to preview)',
        attr: { style: 'color: var(--text-muted); font-style: italic;' }
      });
      return;
    }

    // Markdown / text
    const content = await this.app.vault.cachedRead(file);

    if (content.trim().length === 0) {
      container.createEl('p', {
        text: '(Empty file)',
        attr: { style: 'color: var(--text-muted); font-style: italic;' }
      });
      return;
    }

    this.component = new Component();
    this.component.load();

    await MarkdownRenderer.render(
      this.app,
      content,
      container,
      file.path,
      this.component
    );
  }
}
