import { getDb } from "../connection";
import type { ProfileInput, ProfileRow } from "../types";

export async function sqlLoadProfile() {
  const p = getDb()
    .prepare("SELECT * FROM profile WHERE key = 'default'")
    .get() as unknown as ProfileRow | undefined;
  if (!p) return {};
  return p;
}

export async function sqlSaveProfile(p: ProfileInput) {
  getDb()
    .prepare(
      `
    INSERT OR REPLACE INTO profile (
      key, fullName, email, phone, country, city, province, portfolio, github, linkedin, resumeText, resumeText2,
      legallyAuthorized, requiresSponsorship, gender, race, veteranStatus, disabilityStatus, gemmaPrompt, updatedAt
    ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      p.fullName || "",
      p.email || "",
      p.phone || "",
      p.country || "Canada",
      p.city || "Vancouver",
      p.province || "BC",
      p.portfolio || "",
      p.github || "",
      p.linkedin || "",
      p.resumeText || "",
      p.resumeText2 || "",
      p.legallyAuthorized || "Yes",
      p.requiresSponsorship || "No",
      p.gender || "Decline to Self-Identify",
      p.race || "Decline to Self-Identify",
      p.veteranStatus || "No",
      p.disabilityStatus || "No, I don't have a disability",
      p.gemmaPrompt || "",
      new Date().toISOString()
    );
}
