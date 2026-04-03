import { App, TFile } from 'obsidian';

export function getMisfiledFiles(app: App, allowedFolders: string[]): TFile[] {
  const allowedSet = new Set(allowedFolders.map(f => f.toLowerCase()));

  return app.vault.getMarkdownFiles().filter(file => {
    const path = file.path;

    // Root files are allowed (no "/" in path)
    if (!path.includes('/')) {
      return false;
    }

    // Get top-level folder
    const topFolder = path.split('/')[0].toLowerCase();

    // Misfiled if not in allowed folders
    return !allowedSet.has(topFolder);
  });
}
