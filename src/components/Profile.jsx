import React, { useState, useEffect } from "react";

export default function Profile() {
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    portfolio: "",
    github: "",
    linkedin: "",
    resumeText: "",
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

  // Integration States
  const [calendarStatus, setCalendarStatus] = useState({ configured: false, hasLocalToken: false });
  const [authUrl, setAuthUrl] = useState("");
  const [authError, setAuthError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchCalendarStatus();
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

          <div className="profile-field" style={{ marginBottom: "12px" }}>
            <label className="profile-label" htmlFor="resumeText">Resume Plain-Text</label>
            <p className="profile-field-desc">
              Paste your plain text resume. The AI Copilot uses this to draft high-quality custom question answers.
            </p>
            <textarea
              id="resumeText"
              name="resumeText"
              className="profile-textarea"
              rows={6}
              value={profile.resumeText}
              onChange={handleChange}
              placeholder="Paste resume contents..."
            />
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
