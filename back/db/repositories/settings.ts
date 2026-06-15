import { getDb } from "../connection";

// Generic key/value access for the app_settings table. Callers own JSON
// (de)serialization — persistence stays string-typed.
export async function sqlLoadSetting(key: string): Promise<string | null> {
  const row = getDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as unknown as { value: string } | undefined;
  return row?.value ?? null;
}

export async function sqlSaveSetting(key: string, value: string) {
  getDb()
    .prepare(
      `
    INSERT OR REPLACE INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)
  `
    )
    .run(key, value, new Date().toISOString());
}
