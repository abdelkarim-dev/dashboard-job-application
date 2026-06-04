import React, { useState, useEffect, useRef } from "react";

export default function Profile() {
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    portfolio: "",
    github: "",
    linkedin: "",
    resumeText: "",
    resumeText2: "",
    legallyAuthorized: "Yes",
    requiresSponsorship: "No",
    gender: "Decline to Self-Identify",
    race: "Decline to Self-Identify",
    veteranStatus: "No",
    disabilityStatus: "No, I don't have a disability",
    gemmaPrompt: "",
  });

  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  // CV upload state
  const [cvMeta, setCvMeta] = useState({ backend: null, architect: null });
  const [cvUploading, setCvUploading] = useState({ backend: false, architect: false });
  const [cvFeedback, setCvFeedback] = useState({ backend: "", architect: "" });
  const [cvDragOver, setCvDragOver] = useState({ backend: false, architect: false });
  const cvInputBackend = useRef(null);
  const cvInputArchitect = useRef(null);

  // Integration States
  const [calendarStatus, setCalendarStatus] = useState({ configured: false, hasLocalToken: false });
  const [authUrl, setAuthUrl] = useState("");
  const [authError, setAuthError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchCalendarStatus();
    fetchCvMeta();
  }, []);

  const fetchCalendarStatus = async () => {
    try {
      const res = await fetch("/api/calendar/status");
      if (res.ok) {
        const data = await res.json();
        setCalendarStatus(data);
        if (data.configured && !data.hasLocalToken) {
          fetchAuthUrl();
        }
      }
    } catch (err) {
      console.error("Failed to load calendar status", err);
    }
  };

  const fetchAuthUrl = async () => {
    try {
      const res = await fetch("/api/calendar/auth-url");
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.url) {
          setAuthUrl(data.url);
        } else {
          setAuthError(data.error || "Credentials missing.");
        }
      }
    } catch (err) {
      console.error("Failed to load OAuth URL", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCvMeta = async () => {
    try {
      const res = await fetch("/api/profile/cv");
      if (res.ok) setCvMeta(await res.json());
    } catch {}
  };

  const uploadCv = async (variant, file) => {
    if (!file) return;
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      setCvFeedback((prev) => ({ ...prev, [variant]: "Only PDF, DOC, DOCX, or TXT files are accepted." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvFeedback((prev) => ({ ...prev, [variant]: "File must be under 5 MB." }));
      return;
    }
    setCvUploading((prev) => ({ ...prev, [variant]: true }));
    setCvFeedback((prev) => ({ ...prev, [variant]: "" }));
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/profile/cv/${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", data }),
      });
      if (res.ok) {
        setCvFeedback((prev) => ({ ...prev, [variant]: `Uploaded: ${file.name}` }));
        await fetchCvMeta();
        setTimeout(() => setCvFeedback((prev) => ({ ...prev, [variant]: "" })), 4000);
      } else {
        setCvFeedback((prev) => ({ ...prev, [variant]: "Upload failed." }));
      }
    } catch {
      setCvFeedback((prev) => ({ ...prev, [variant]: "Error uploading file." }));
    } finally {
      setCvUploading((prev) => ({ ...prev, [variant]: false }));
    }
  };

  const removeCv = async (variant) => {
    try {
      await fetch(`/api/profile/cv/${variant}`, { method: "DELETE" });
      setCvMeta((prev) => ({ ...prev, [variant]: null }));
    } catch {}
  };

  const handleCvDrop = (variant, e) => {
    e.preventDefault();
    setCvDragOver((prev) => ({ ...prev, [variant]: false }));
    const file = e.dataTransfer.files[0];
    if (file) uploadCv(variant, file);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback("Saving...");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setFeedback("Profile saved successfully! ✨");
        setTimeout(() => setFeedback(""), 3000);
      } else {
        setFeedback("Failed to save profile.");
      }
    } catch (err) {
      setFeedback("Error saving profile.");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="learning-empty"><strong>Loading Profile...</strong></div>;
  }

  return (
    <div className="tab-content-container active" id="profileView">
      <div className="profile-layout">
        <div className="profile-card">
        <div className="profile-card-header">
          <h3>👤 Target Profile Copilot</h3>
          <p className="profile-card-desc">
            Gemma uses this profile to evaluate how well job listings match your experience, career goals, target compensation, and remote preferences.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-section-title">⚡ Personal Autofill Profile</div>
          <p className="profile-section-desc">
            These standard details are used by the Chrome Extension to pre-fill application forms on sites like Greenhouse, Lever, and Workday.
          </p>

          <div className="profile-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
            <div className="profile-field">
              <label className="profile-label" htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className="profile-input"
                value={profile.fullName}
                onChange={handleChange}
                placeholder="e.g. Alex Mercer"
                required
              />
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="profile-input"
                value={profile.email}
                onChange={handleChange}
                placeholder="e.g. alex.mercer@example.com"
                required
              />
            </div>
          </div>

          <div className="profile-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
            <div className="profile-field">
              <label className="profile-label" htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="profile-input"
                value={profile.phone}
                onChange={handleChange}
                placeholder="e.g. +1 (604) 555-0199"
                required
              />
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="portfolio">Portfolio / Website URL <span className="profile-label-optional">Optional</span></label>
              <input
                type="url"
                id="portfolio"
                name="portfolio"
                className="profile-input"
                value={profile.portfolio}
                onChange={handleChange}
                placeholder="e.g. https://alexmercer.dev"
              />
            </div>
          </div>

          <div className="profile-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
            <div className="profile-field">
              <label className="profile-label" htmlFor="github">GitHub Profile URL <span className="profile-label-optional">Optional</span></label>
              <input
                type="url"
                id="github"
                name="github"
                className="profile-input"
                value={profile.github}
                onChange={handleChange}
                placeholder="e.g. https://github.com/alexmercer"
              />
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="linkedin">LinkedIn Profile URL</label>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                className="profile-input"
                value={profile.linkedin}
                onChange={handleChange}
                placeholder="e.g. https://linkedin.com/in/alexmercer"
              />
            </div>
          </div>

          {/* CV 1 — Backend */}
          <div className="profile-field cv-upload-field" style={{ marginBottom: "16px" }}>
            <label className="profile-label">CV 1 — Backend / Platform <span className="cv-badge cv-badge--primary">Primary</span></label>
            <p className="profile-field-desc">
              Default CV. The extension uses this by default and auto-selects it for backend/platform roles.
            </p>

            <div
              className={`cv-dropzone ${cvDragOver.backend ? "cv-dropzone--active" : ""} ${cvMeta.backend ? "cv-dropzone--uploaded" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setCvDragOver((p) => ({ ...p, backend: true })); }}
              onDragLeave={() => setCvDragOver((p) => ({ ...p, backend: false }))}
              onDrop={(e) => handleCvDrop("backend", e)}
              onClick={() => !cvMeta.backend && cvInputBackend.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && !cvMeta.backend && cvInputBackend.current?.click()}
              aria-label="Upload backend CV"
            >
              {cvMeta.backend ? (
                <div className="cv-uploaded-state">
                  <span className="cv-file-icon">📄</span>
                  <div className="cv-file-info">
                    <strong>{cvMeta.backend.fileName}</strong>
                    <small>Uploaded {cvMeta.backend.uploadedAt ? new Date(cvMeta.backend.uploadedAt).toLocaleDateString() : ""}</small>
                  </div>
                  <div className="cv-uploaded-actions">
                    <button className="btn-ghost cv-replace-btn" type="button" onClick={(e) => { e.stopPropagation(); cvInputBackend.current?.click(); }}>Replace</button>
                    <button className="cv-remove-btn" type="button" onClick={(e) => { e.stopPropagation(); removeCv("backend"); }} aria-label="Remove CV">✕</button>
                  </div>
                </div>
              ) : (
                <div className="cv-empty-state">
                  <span className="cv-upload-icon">⬆</span>
                  <span className="cv-upload-label">{cvUploading.backend ? "Uploading…" : "Drop PDF / DOCX here, or click to browse"}</span>
                  <small>PDF · DOCX · DOC · TXT · max 5 MB</small>
                </div>
              )}
            </div>

            <input
              ref={cvInputBackend}
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={(e) => uploadCv("backend", e.target.files[0])}
            />

            {cvFeedback.backend && (
              <p className={`cv-feedback ${cvFeedback.backend.startsWith("Uploaded") ? "cv-feedback--ok" : "cv-feedback--err"}`}>
                {cvFeedback.backend}
              </p>
            )}

            <details className="cv-paste-fallback">
              <summary>Or paste CV text instead</summary>
              <textarea
                id="resumeText"
                name="resumeText"
                className="profile-textarea"
                rows={5}
                value={profile.resumeText}
                onChange={handleChange}
                placeholder="Paste resume text as fallback for Gemma evaluation…"
                style={{ marginTop: "8px" }}
              />
            </details>
          </div>

          {/* CV 2 — Architect */}
          <div className="profile-field cv-upload-field" style={{ marginBottom: "12px" }}>
            <label className="profile-label">CV 2 — Architect / Principal <span className="cv-badge cv-badge--secondary">Optional</span></label>
            <p className="profile-field-desc">
              Gemma auto-picks this for architect/principal/staff roles. Force it via the "📄 CV" button in the extension toolbar.
            </p>

            <div
              className={`cv-dropzone ${cvDragOver.architect ? "cv-dropzone--active" : ""} ${cvMeta.architect ? "cv-dropzone--uploaded" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setCvDragOver((p) => ({ ...p, architect: true })); }}
              onDragLeave={() => setCvDragOver((p) => ({ ...p, architect: false }))}
              onDrop={(e) => handleCvDrop("architect", e)}
              onClick={() => !cvMeta.architect && cvInputArchitect.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && !cvMeta.architect && cvInputArchitect.current?.click()}
              aria-label="Upload architect CV"
            >
              {cvMeta.architect ? (
                <div className="cv-uploaded-state">
                  <span className="cv-file-icon">📄</span>
                  <div className="cv-file-info">
                    <strong>{cvMeta.architect.fileName}</strong>
                    <small>Uploaded {cvMeta.architect.uploadedAt ? new Date(cvMeta.architect.uploadedAt).toLocaleDateString() : ""}</small>
                  </div>
                  <div className="cv-uploaded-actions">
                    <button className="btn-ghost cv-replace-btn" type="button" onClick={(e) => { e.stopPropagation(); cvInputArchitect.current?.click(); }}>Replace</button>
                    <button className="cv-remove-btn" type="button" onClick={(e) => { e.stopPropagation(); removeCv("architect"); }} aria-label="Remove CV">✕</button>
                  </div>
                </div>
              ) : (
                <div className="cv-empty-state">
                  <span className="cv-upload-icon">⬆</span>
                  <span className="cv-upload-label">{cvUploading.architect ? "Uploading…" : "Drop PDF / DOCX here, or click to browse"}</span>
                  <small>PDF · DOCX · DOC · TXT · max 5 MB</small>
                </div>
              )}
            </div>

            <input
              ref={cvInputArchitect}
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={(e) => uploadCv("architect", e.target.files[0])}
            />

            {cvFeedback.architect && (
              <p className={`cv-feedback ${cvFeedback.architect.startsWith("Uploaded") ? "cv-feedback--ok" : "cv-feedback--err"}`}>
                {cvFeedback.architect}
              </p>
            )}

            <details className="cv-paste-fallback">
              <summary>Or paste CV text instead</summary>
              <textarea
                id="resumeText2"
                name="resumeText2"
                className="profile-textarea"
                rows={5}
                value={profile.resumeText2 || ""}
                onChange={handleChange}
                placeholder="Paste architect/principal resume text as fallback…"
                style={{ marginTop: "8px" }}
              />
            </details>
          </div>

          <hr className="profile-separator" style={{ border: 0, borderTop: "1px solid var(--md-outline-variant)", margin: "24px 0" }} />

          <div className="profile-section-title">📊 Voluntary Disclosures & Work Authorization</div>
          <p className="profile-section-desc">
            Demographics and sponsorship settings. The extension uses these to auto-select dropdown values in application forms.
          </p>

          <div className="profile-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
            <div className="profile-field">
              <label className="profile-label" htmlFor="legallyAuthorized">Legally Authorized to Work?</label>
              <select
                id="legallyAuthorized"
                name="legallyAuthorized"
                className="profile-input"
                value={profile.legallyAuthorized}
                onChange={handleChange}
                style={{ width: "100%", height: "40px", backgroundColor: "var(--md-surface-1)", color: "var(--md-on-surface)" }}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="requiresSponsorship">Requires Sponsorship?</label>
              <select
                id="requiresSponsorship"
                name="requiresSponsorship"
                className="profile-input"
                value={profile.requiresSponsorship}
                onChange={handleChange}
                style={{ width: "100%", height: "40px", backgroundColor: "var(--md-surface-1)", color: "var(--md-on-surface)" }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
          </div>

          <div className="profile-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
            <div className="profile-field">
              <label className="profile-label" htmlFor="gender">Gender Identity</label>
              <select
                id="gender"
                name="gender"
                className="profile-input"
                value={profile.gender}
                onChange={handleChange}
                style={{ width: "100%", height: "40px", backgroundColor: "var(--md-surface-1)", color: "var(--md-on-surface)" }}
              >
                <option>Decline to Self-Identify</option>
                <option>Male</option>
                <option>Female</option>
                <option>Non-binary</option>
              </select>
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="race">Race / Ethnicity</label>
              <select
                id="race"
                name="race"
                className="profile-input"
                value={profile.race}
                onChange={handleChange}
                style={{ width: "100%", height: "40px", backgroundColor: "var(--md-surface-1)", color: "var(--md-on-surface)" }}
              >
                <option>Decline to Self-Identify</option>
                <option>White</option>
                <option>Asian</option>
                <option>Black or African American</option>
                <option>Hispanic or Latino</option>
              </select>
            </div>
          </div>

          <div className="profile-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
            <div className="profile-field">
              <label className="profile-label" htmlFor="veteranStatus">Veteran Status</label>
              <select
                id="veteranStatus"
                name="veteranStatus"
                className="profile-input"
                value={profile.veteranStatus}
                onChange={handleChange}
                style={{ width: "100%", height: "40px", backgroundColor: "var(--md-surface-1)", color: "var(--md-on-surface)" }}
              >
                <option>No</option>
                <option>Yes</option>
                <option>Decline to Self-Identify</option>
              </select>
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="disabilityStatus">Disability Status</label>
              <select
                id="disabilityStatus"
                name="disabilityStatus"
                className="profile-input"
                value={profile.disabilityStatus}
                onChange={handleChange}
                style={{ width: "100%", height: "40px", backgroundColor: "var(--md-surface-1)", color: "var(--md-on-surface)" }}
              >
                <option>No, I don't have a disability</option>
                <option>Yes</option>
                <option>Decline to Self-Identify</option>
              </select>
            </div>
          </div>

          <hr className="profile-separator" style={{ border: 0, borderTop: "1px solid var(--md-outline-variant)", margin: "24px 0" }} />

          <div className="profile-section-title">🤖 Gemma Copilot Preferences</div>
          <p className="profile-section-desc">
            Gemma uses this prompt to evaluate match score, remote eligibility, compensation, and role fit.
          </p>

          <div className="profile-field">
            <label className="profile-label" htmlFor="gemmaPrompt">Evaluation Prompt</label>
            <p className="profile-field-desc">
              Keep your profile, target roles, weak-fit roles, compensation bar, and scoring preferences here.
            </p>
            <textarea
              id="gemmaPrompt"
              name="gemmaPrompt"
              className="profile-textarea profile-textarea-large"
              rows={16}
              value={profile.gemmaPrompt}
              onChange={handleChange}
              required
            />
          </div>

          <div className="profile-actions">
            <button type="submit" className="btn-primary" id="saveProfileBtn">Save Profile</button>
            {feedback && <span className="profile-feedback" style={{ display: "inline-block", marginLeft: "12px", color: "var(--md-primary)" }}>{feedback}</span>}
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
