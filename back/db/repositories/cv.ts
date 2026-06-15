import { getDb } from "../connection";
import type { CvRow, CvVariant } from "../types";

interface CvMetaEntry {
  fileName: string | null;
  mimeType: string | null;
  uploadedAt: string;
}

export async function sqlLoadCvMeta() {
  const rows = getDb()
    .prepare("SELECT variant, fileName, mimeType, uploadedAt FROM profile_cvs")
    .all() as unknown as CvRow[];
  const meta: Record<CvVariant, CvMetaEntry | null> = { backend: null, architect: null };
  for (const row of rows) {
    if (row.variant === "backend" || row.variant === "architect") {
      meta[row.variant] = { fileName: row.fileName, mimeType: row.mimeType, uploadedAt: row.uploadedAt };
    }
  }
  return meta;
}

export async function sqlLoadCv(variant: string) {
  const row = getDb()
    .prepare("SELECT variant, fileName, mimeType, data, uploadedAt FROM profile_cvs WHERE variant = ?")
    .get(variant) as unknown as CvRow | undefined;
  return row || null;
}

export async function sqlSaveCv(variant: string, fileName: string, mimeType: string, data: string) {
  getDb()
    .prepare(
      `
    INSERT OR REPLACE INTO profile_cvs (variant, fileName, mimeType, data, uploadedAt)
    VALUES (?, ?, ?, ?, ?)
  `
    )
    .run(variant, fileName, mimeType, data, new Date().toISOString());
}

export async function sqlDeleteCv(variant: string) {
  getDb().prepare("DELETE FROM profile_cvs WHERE variant = ?").run(variant);
}
