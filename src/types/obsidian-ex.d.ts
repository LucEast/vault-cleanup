import 'obsidian';

declare module 'obsidian' {
  interface App {
    commands: {
      executeCommandById(id: string): boolean;
    };
    internalPlugins: {
      getPluginById(id: string): {
        enabled: boolean;
        options?: Record<string, unknown>;
      } | null;
    };
  }
}
