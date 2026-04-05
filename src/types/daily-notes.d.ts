declare module 'obsidian-daily-notes-interface' {
  import { TFile } from 'obsidian';

  export function appHasDailyNotesPluginLoaded(): boolean;

  export function getDailyNoteSettings(): {
    format: string;
    folder: string;
    template: string;
  };

  export function getAllDailyNotes(): Record<string, TFile>;
}
