// The candidate profile: defaults (including the default Gemma prompt) and the
// SQLite-backed load/save accessors.
import { sqlLoadProfile, sqlSaveProfile } from "../../database.mjs";
import { clean } from "../core/util.mjs";

const defaultGemmaPrompt = `My profile:
I am a Senior Backend / Platform Engineer based in Vancouver, Canada, Canadian PR. I am prioritizing US Remote / North America Remote roles from Canada, with Canada roles as backup if salary/scope is strong. Target compensation is around US$180k+ TC, or US$190k-240k for Staff/Architect-level scope.

My strongest fit:
- Senior Backend Engineer
- Backend Platform Engineer
- Staff Backend Engineer
- Staff Platform Engineer
- Principal Backend Engineer
- Platform Architect
- Application Architect

Selective fit:
- Cloud Architect if hands-on, AWS/serverless/API/platform-heavy
- Solution Architect only if hands-on, cloud/API/integration-heavy

Weak fit:
- DevRel / Developer Advocate unless it requires strong backend/platform engineering
- Enterprise Architect
- Pre-sales Solution Architect
- Pure DevOps / pure SRE / infrastructure-only roles
- Engineering Manager

My background:
7+ years in backend/platform engineering. Strong in Java/Spring Boot, Python, AWS serverless, APIs, CI/CD, PostgreSQL, platform engineering, WAF, production reliability, incident response, microservices, and cloud architecture ownership. I am still improving Terraform/IaC, Kubernetes, and advanced system-design interview skills.

Tell me:
1. Apply or skip?
2. Match score /100
3. Is it compatible with working remotely from Canada?
4. Is compensation likely to reach US$180k+ TC?
5. Which role category is it: backend/platform, staff/principal, architect-track, cloud architect, solution architect, DevRel, or poor fit?
6. Strong matches
7. Gaps/risks
8. What to emphasize from my CV
9. One short recruiter message
10. Final decision in 2 sentences`;

const defaultProfile = {
  about: "I am a Senior Backend / Platform Engineer based in Vancouver, Canada, Canadian PR. I am prioritizing remote roles I can do from Canada — US Remote and Canada Remote are both great. On-site roles outside Vancouver are a hard pass unless the comp/scope is exceptional. Target compensation is around US$180k+ TC, or US$190k–240k for Staff/Architect-level scope.",
  strongFit: "- Senior Backend Engineer\n- Backend Platform Engineer\n- Staff Backend Engineer\n- Staff Platform Engineer\n- Principal Backend Engineer\n- Platform Architect\n- Application Architect",
  productFit: "- Product Manager\n- Senior Product Manager\n- Technical Product Manager\n- Group Product Manager\n- Principal Product Manager\n- Platform / Developer-tools Product Manager\nTreat PM roles as a legitimate target, not as poor fit. Score them on remote-ability, comp, and seniority just like engineering roles.",
  selectiveFit: "- Cloud Architect if hands-on, AWS/serverless/API/platform-heavy\n- Solution Architect only if hands-on, cloud/API/integration-heavy",
  weakFit: "- DevRel / Developer Advocate unless it requires strong backend/platform engineering\n- Enterprise Architect\n- Pre-sales Solution Architect\n- Pure DevOps / pure SRE / infrastructure-only roles\n- Engineering Manager (people-management only, non-coding)",
  background: "7+ years in backend/platform engineering. Strong in Java/Spring Boot, Python, AWS serverless, APIs, CI/CD, PostgreSQL, platform engineering, WAF, production reliability, incident response, microservices, and cloud architecture ownership. I am still improving Terraform/IaC, Kubernetes, and advanced system-design interview skills. For PM roles, my technical depth maps to platform / developer-tools / API product work.",
  gemmaPrompt: defaultGemmaPrompt,
  fullName: "Alex Mercer",
  email: "alex.mercer@example.com",
  phone: "+1 (604) 555-0199",
  country: "Canada",
  city: "Vancouver",
  province: "BC",
  github: "https://github.com/alexmercer",
  linkedin: "https://linkedin.com/in/alexmercer",
  portfolio: "https://alexmercer.dev",
  resumeText: "ALEX MERCER\nVancouver, BC | alex.mercer@example.com | +1 (604) 555-0199\n\nPROFESSIONAL SUMMARY\nSenior Backend & Platform Engineer with 7+ years of experience building secure, scalable microservices and cloud infrastructure. Strong background in Java/Spring Boot, Python, PostgreSQL, and AWS Serverless. Passionate about platform engineering, reliability, and automated CI/CD pipelines.\n\nEXPERIENCE\nSenior Backend Engineer | TechCorp (2022 - Present)\n- Led migration of monolithic APIs to Spring Boot microservices on AWS, reducing latency by 40%.\n- Designed platform developer tools that saved engineers 8+ hours per week in provisioning pipeline infrastructure.\n\nPlatform Engineer | DevFlow (2019 - 2022)\n- Designed and scaled secure multi-tenant API Gateways handling 10M+ daily requests.\n- Built and maintained AWS serverless architectures using Lambda, API Gateway, and PostgreSQL.",
  resumeText2: "",
  // Voluntary Disclosures & Demographics
  gender: "Decline to Self-Identify",
  race: "Decline to Self-Identify",
  veteranStatus: "No",
  disabilityStatus: "No, I don't have a disability",
  requiresSponsorship: "No",
  legallyAuthorized: "Yes",
  // Quick Application Snippets
  desiredSalary: "US$180,000 - $210,000 base",
  noticePeriod: "2 weeks",
  introOneLiner: "Senior Backend & Platform Engineer with 7+ years of experience building secure, scalable Spring Boot/AWS systems.",
  whyCompany: "I want to leverage my backend platform expertise to build high-performance APIs and improve developer velocity at your scale."
};

async function loadProfile() {
  const p = await sqlLoadProfile();
  const profile = { ...defaultProfile, ...p };
  for (const key of ["country", "city", "province"]) {
    if (!clean(profile[key])) profile[key] = defaultProfile[key];
  }
  return profile;
}

async function saveProfile(profile) {
  return sqlSaveProfile(profile);
}

export {
  defaultGemmaPrompt,
  defaultProfile,
  loadProfile,
  saveProfile,
};
