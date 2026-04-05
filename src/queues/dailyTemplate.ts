import { App, TFile } from 'obsidian';
import { 
  appHasDailyNotesPluginLoaded, 
  getDailyNoteSettings, 
  getAllDailyNotes 
} from 'obsidian-daily-notes-interface';

interface TemplateStructure {
  headers: string[];
  fixedLines: string[];
}

function parseStructure(content: string): TemplateStructure {
  const lines = content.split('\n');
  const headers: string[] = [];
  const fixedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Capture headers
    if (trimmed.startsWith('#')) {
      headers.push(trimmed);
    }
    // Capture fixed text (non-empty, non-header, non-placeholder)
    else if (
      trimmed.length > 0 && 
      !trimmed.includes('{{content}}') &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('>')
    ) {
      fixedLines.push(trimmed);
    }
  }

  return { headers, fixedLines };
}

function structureMatches(
  noteStructure: TemplateStructure, 
  templateStructure: TemplateStructure
): boolean {
  // Check all template headers exist in note (in order)
  let noteIndex = 0;
  for (const templateHeader of templateStructure.headers) {
    let found = false;
    while (noteIndex < noteStructure.headers.length) {
      if (noteStructure.headers[noteIndex] === templateHeader) {
        found = true;
        noteIndex++;
        break;
      }
      noteIndex++;
    }
    if (!found) return false;
  }

  // Check fixed lines exist
  for (const fixedLine of templateStructure.fixedLines) {
    if (!noteStructure.fixedLines.includes(fixedLine)) {
      return false;
    }
  }

  return true;
}

export async function getDailyTemplateMismatchFiles(app: App): Promise<TFile[]> {
  // Check if Daily Notes plugin is enabled
  if (!appHasDailyNotesPluginLoaded()) {
    return [];
  }

  const settings = getDailyNoteSettings();

  // No template configured
  if (!settings.template) {
    return [];
  }

  // Load template file
  const templateFile = app.vault.getAbstractFileByPath(settings.template + '.md') 
    || app.vault.getAbstractFileByPath(settings.template);

  if (!templateFile || !(templateFile instanceof TFile)) {
    return [];
  }

  const templateContent = await app.vault.cachedRead(templateFile);
  const templateStructure = parseStructure(templateContent);

  // Get all daily notes
  const dailyNotes = getAllDailyNotes();
  const result: TFile[] = [];

  for (const file of Object.values(dailyNotes)) {
    const content = await app.vault.cachedRead(file);
    const noteStructure = parseStructure(content);

    if (!structureMatches(noteStructure, templateStructure)) {
      result.push(file);
    }
  }

  return result;
}

export function isDailyNotesPluginEnabled(): boolean {
  return appHasDailyNotesPluginLoaded();
}
