/**
 * app.js — Climate Capital Market | Promotor Onboarding Widget
 * ─────────────────────────────────────────────────────────────
 * 3-screen flow:
 *   1. Necessary information    — due diligence docs, finance type, readiness
 *   2. Promotor & project details — registration, company, project basics
 *   3. Requirements & sign-off  — certification, capital, declaration
 */

"use strict";

/* ─── APP STATE ─────────────────────────────────────────────── */
const AppState = {
  currentStep:            1,
  totalSteps:             3,
  dirty:                  false,
  submitting:             false,
  loginEmail:             "",   // Zoho portal login email (set on init)
  existingRegistrationId: null, // promotor_registration record ID (set on prefill)
  necessaryId:            null,
  registrationId:         null,
  projectId:              null,
  requirementsId:         null
};

/* ─── INIT ──────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  // When app.js is loaded by dashboard.html, pagesContainer doesn't exist yet — skip auto-init.
  // Dashboard calls initOnboardingForm(email) manually when user opens the form.
  if (!document.getElementById('pagesContainer')) return;

  // console.log("[CCM] Widget loaded. Zoho Creator JS API v2.");

  renderStepRail();
  renderAllPages();
  showPage(1);

  // Prefill today's date on sign-off
  var sigDate = document.getElementById("sig_date");
  if (sigDate) sigDate.value = new Date().toLocaleDateString("en-IN");

  saveStatus("saving", "Loading profile…");

  // If opened from dashboard iframe, email is passed via URL param — skip getInitParams
  var _urlEmail = (function () {
    try { return new URLSearchParams(window.location.search).get('prefill_email') || ''; }
    catch (e) { return ''; }
  })();

  if (_urlEmail) {
    // console.log("[CCM] Prefill email from URL param:", _urlEmail);
    AppState.loginEmail = _urlEmail;
    AppState.initParams = {};
    zohoReady(function () {
      setPage2Loading(true);
      prefillFromRegistration(_urlEmail);
    });
  } else {
    // Wait for Zoho SDK to be ready, then load init params
    zohoReady(function () {
      ZOHO.CREATOR.UTIL.getInitParams().then(function (params) {
        // console.log("[CCM] Init params:", params);
        AppState.initParams = params;
        // Override appName with live value from SDK so it's always correct
        if (params.appLinkName) {
          ZOHO_CONFIG.appName = params.appLinkName;
          // console.log("[CCM] appName set from initParams:", ZOHO_CONFIG.appName);
        }
        AppState.loginEmail = params.loginUser || params.login_id || params.loginuser || "";
        if (AppState.loginEmail) {
          setPage2Loading(true);
          prefillFromRegistration(AppState.loginEmail);
        } else {
          saveStatus("saved", "Ready");
        }
      }).catch(function (e) {
        // console.warn("[CCM] getInitParams failed:", e);
        AppState.initParams = {};
        saveStatus("saved", "Ready");
      });
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD EMBED — called by goToIndex() in dashboard.html
   Resets state and initialises the onboarding form inline.
═══════════════════════════════════════════════════════════════ */
function initOnboardingForm(email, opts) {
  var isNewProject = !!(opts && opts.newProject);
  // Reset AppState for a clean form session
  AppState.currentStep            = 1;
  AppState.dirty                  = false;
  AppState.submitting             = false;
  AppState.loginEmail             = email || '';
  AppState.existingRegistrationId = null;
  AppState.necessaryId            = null;
  AppState.registrationId         = null;
  AppState.projectId              = null;
  AppState.requirementsId         = null;

  // Sync appName from dashboard ZOHO_CFG if available (dashboard updates it from initParams)
  if (typeof ZOHO_CFG !== 'undefined' && ZOHO_CFG.appName) {
    ZOHO_CONFIG.appName = ZOHO_CFG.appName;
  }

  renderStepRail();
  renderAllPages();
  showPage(1);

  // Prefill today's date on sign-off field
  var sigDate = document.getElementById('sig_date');
  if (sigDate) sigDate.value = new Date().toLocaleDateString('en-IN');

  saveStatus('saving', 'Loading profile\u2026');

  // If dashboard already fetched the profile record, use it immediately — no extra API call
  if (typeof ProfileState !== 'undefined' && ProfileState.record) {
    // console.log('[CCM] initOnboardingForm — using cached ProfileState.record for prefill');
    // Sync existing IDs from dashboard state so saves do update not create
    if (ProfileState.recordId) AppState.existingRegistrationId = ProfileState.recordId;
    if (!isNewProject && typeof OnboardingState !== 'undefined') {
      if (OnboardingState.necessary    && OnboardingState.necessary.ID)    AppState.necessaryId    = OnboardingState.necessary.ID;
      if (OnboardingState.requirements && OnboardingState.requirements.ID) AppState.requirementsId = OnboardingState.requirements.ID;
    }
    setTimeout(function() {
      applyRegistrationData(ProfileState.record);
      showNavUser(ProfileState.record);
      if (!isNewProject) {
        prefillProjectFromStored();
        prefillStep1FromStored();
        prefillStep3FromStored();
      }
      saveStatus('saved', 'Profile loaded');
      showPrefillBanner('ok', '\u2713 Your profile has been pre-filled. Review your details and submit.');
    }, 100); // small delay so renderAllPages DOM is ready
  } else if (email) {
    zohoReady(function () {
      setPage2Loading(true);
      prefillFromRegistration(email);
    });
  } else {
    // No email yet — wait for ProfileState.loginEmail or ProfileState.record
    var waited = 0;
    var waitTimer = setInterval(function() {
      waited++;
      var rec = (typeof ProfileState !== 'undefined') ? ProfileState.record : null;
      var em  = (typeof ProfileState !== 'undefined') ? ProfileState.loginEmail : null;
      if (rec) {
        clearInterval(waitTimer);
        applyRegistrationData(rec);
        showNavUser(rec);
        saveStatus('saved', 'Profile loaded');
        showPrefillBanner('ok', '\u2713 Your profile has been pre-filled. Review your details and submit.');
        if (!isNewProject) prefillStep1FromStored();
      } else if (em) {
        clearInterval(waitTimer);
        AppState.loginEmail = em;
        zohoReady(function() {
          setPage2Loading(true);
          prefillFromRegistration(em);
        });
      } else if (waited > 40) {
        clearInterval(waitTimer);
        saveStatus('saved', 'Ready');
      }
    }, 200);
  }
}

/* Wait until ZOHO.CREATOR.DATA is available (max 8 s) */
function zohoReady(cb) {
  var attempts = 0;
  function check() {
    if (typeof ZOHO !== "undefined" &&
        ZOHO.CREATOR &&
        ZOHO.CREATOR.DATA &&
        ZOHO.CREATOR.UTIL) {
      cb();
    } else if (attempts++ < 80) {
      setTimeout(check, 100);
    } else {
      // console.warn("[CCM] Zoho SDK not available — running in offline/dev mode.");
      AppState.initParams = {};
      saveStatus("saved", "Ready");
    }
  }
  check();
}

/* ═══════════════════════════════════════════════════════════════
   PREFILL — fetch promotor_registration_Report by login email.
   First tries All_Registrations to get the linked record ID;
   if that is forbidden (403) or returns nothing, falls back to
   querying promotor_registration_Report directly by Company_email.
═══════════════════════════════════════════════════════════════ */
function prefillFromRegistration(email) {
  // console.log("[CCM] Prefill — login email:", email);
  // Direct single lookup — no double API call
  fetchPromoRegistrationByEmail(email);
}

/* Immediately fill key fields from All_Registrations record.
   Company_Name is read from the linked promotor_registration sub-object
   if Zoho exposes it, otherwise it is filled by the full fetch. */
function quickPrefillBasicFields(reg) {
  var nm       = reg.Name || {};
  var promoReg = reg.promotor_registration || {};

  function set(id, val) {
    var el = document.getElementById(id);
    if (el && val) el.value = val;
  }

  // Name from All_Registrations.Name object
  set("r_fname",   nm.first_name || promoReg["Promotor_Name.first_name"] || "");
  set("r_lname",   nm.last_name  || promoReg["Promotor_Name.last_name"]  || "");

  // Company Email & Mobile directly on All_Registrations record
  set("r_email",   reg.Company_Email || "");
  set("r_mobile",  (reg.Mobile || "").replace(/^\+91/, ""));

  // Company_Name — available on the linked promotor_registration object
  // (Zoho includes it when the lookup display field is set to Company_Name)
  // Zoho may return linked-record fields as flat dot-notation keys
  var companyName = promoReg.Company_Name
    || reg["promotor_registration.Company_Name"]
    || reg.Company_Name
    || "";
  // Handle case where Zoho returns an object instead of a plain string
  if (companyName && typeof companyName === "object") {
    companyName = companyName.display_value || companyName.value || "";
  }
  set("r_company", companyName);
  // console.log("[CCM] quickPrefill — reg keys:", Object.keys(reg));
  // console.log("[CCM] quickPrefill — Company_Name:", companyName, "| raw reg.Company_Name:", reg.Company_Name, "| promoReg.Company_Name:", promoReg.Company_Name, "| dot-notation:", reg["promotor_registration.Company_Name"]);
}

function fetchPromoRegistrationById(id) {
  return ZOHO.CREATOR.DATA.getRecords({
    app_name:    ZOHO_CONFIG.appName,
    report_name: "promotor_registration_Report",
    criteria:    'ID == "' + id + '"',
    page: 1, per_page: 200
  })
  .then(applyPrefillResult)
  .catch(function (err) {
    // console.warn("[CCM] promotor_registration_Report by ID failed:", err);
    setPage2Loading(false);
    saveStatus("saved", "Ready");
  });
}

function fetchPromoRegistrationByEmail(email) {
  // console.log("[CCM] fetchPromoRegistration — app:", ZOHO_CONFIG.appName, "email:", email);
  // No-criteria fetch: Zoho row permissions return only this user's own records
  return ZOHO.CREATOR.DATA.getRecords({
    app_name:    ZOHO_CONFIG.appName,
    report_name: "promotor_registration_Report",
    page: 1, per_page: 200
  })
  .then(function(res) {
    // console.log("[CCM] promotor_registration_Report fetch code:", res && res.code, "count:", res && res.data && res.data.length);
    if (!res || res.code !== 3000 || !Array.isArray(res.data) || !res.data.length) {
      // console.warn("[CCM] No registration records returned");
      return applyPrefillResult(res);
    }
    // If multiple records, pick by email match; otherwise use the only record
    if (res.data.length > 1 && email) {
      var em = email.toLowerCase();
      var match = res.data.filter(function(r) {
        return (r.Company_email || r['Company_Email'] || '').toLowerCase() === em;
      });
      if (match.length) {
        res.data = match;
      } else {
        res.data = [res.data[0]]; // fallback to first
      }
    }
    return applyPrefillResult(res);
  })
  .catch(function(err) {
    // console.warn("[CCM] promotor_registration_Report fetch failed:", err);
    setPage2Loading(false);
    saveStatus("saved", "Ready");
  });
}

function applyPrefillResult(res) {
  setPage2Loading(false);

  if (!res || res.code !== 3000 || !res.data || res.data.length === 0) {
    // console.log("[CCM] No promotor registration record found — res:", JSON.stringify(res && {code: res.code, dataLen: res.data && res.data.length}));
    saveStatus("saved", "Ready");
    showPrefillBanner("inf", "No existing profile found. Please fill in your details.");
    return;
  }

  var d = res.data[0];
  // console.log("[CCM] promotor_registration_Report record keys:", Object.keys(d));
  // console.log("[CCM] record sample — Company_email:", d.Company_email, "| Promotor_Name:", JSON.stringify(d.Promotor_Name), "| Company_Name:", d.Company_Name);

  if (!AppState.existingRegistrationId) {
    AppState.existingRegistrationId = d.ID;
  }

  applyRegistrationData(d);
  showNavUser(d);
  saveStatus("saved", "Profile loaded");
  showPrefillBanner("ok", "\u2713 Your profile has been pre-filled. Review your details and submit.");

  // Prefill project (Step 2), Step 1 and Step 3 for returning users
  prefillProjectFromStored();
  prefillStep1FromStored();
  prefillStep3FromStored();
}

/* Show an inline notification banner at the top of the form */
function showPrefillBanner(type, msg) {
  var pagesContainer = document.getElementById("pagesContainer");
  if (!pagesContainer) return;
  var existing = document.getElementById("prefillBanner");
  if (existing) existing.remove();

  var colors = {
    ok:  { bg: "#f0fdf4", border: "#86efac", color: "#166534" },
    err: { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b" },
    inf: { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af" }
  };
  var c = colors[type] || colors.inf;

  var banner = document.createElement("div");
  banner.id = "prefillBanner";
  banner.style.cssText = [
    "background:" + c.bg,
    "border:1px solid " + c.border,
    "color:" + c.color,
    "border-radius:8px",
    "padding:10px 14px",
    "font-size:13px",
    "font-weight:500",
    "margin-bottom:12px",
    "display:flex",
    "align-items:center",
    "gap:8px"
  ].join(";");
  banner.textContent = msg;
  pagesContainer.insertBefore(banner, pagesContainer.firstChild);

  // Auto-dismiss after 6 seconds
  setTimeout(function() {
    if (banner.parentNode) {
      banner.style.transition = "opacity 0.4s";
      banner.style.opacity = "0";
      setTimeout(function() { if (banner.parentNode) banner.remove(); }, 400);
    }
  }, 6000);
}

/* Prefill Step 2 project fields from ProjectState.projects (already fetched by dashboard) or Zoho fetch */
function prefillProjectFromStored() {
  // Priority 1: use already-fetched ProjectState
  if (typeof ProjectState !== 'undefined' && Array.isArray(ProjectState.projects) && ProjectState.projects.length > 0) {
    var proj = ProjectState.projects[0];
    // Store raw Zoho record id — prefer _raw if available, else use mapped id
    var pid = (proj._raw && proj._raw.ID) || proj.id || '';
    if (pid) AppState.projectId = pid;
    // Use raw Zoho record if available, else use the mapped project object
    var raw = proj._raw || proj;
    applyProjectData(raw);
    // console.log('[CCM] Project prefilled from ProjectState:', pid);
    return;
  }

  // Priority 2: fetch from Zoho (no-criteria — row permissions return own records)
  if (typeof ZOHO === 'undefined' || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) return;
  var app = (typeof ZOHO_CFG !== 'undefined' ? ZOHO_CFG.appName : null) || ZOHO_CONFIG.appName;
  ZOHO.CREATOR.DATA.getRecords({
    app_name:    app,
    report_name: ZOHO_CONFIG.reports.project,
    page: 1, per_page: 200
  }).then(function(res) {
    if (res.code !== 3000 || !res.data || !res.data.length) return;
    var d = res.data[0];
    AppState.projectId = d.ID;
    applyProjectData(d);
    // console.log('[CCM] Project prefilled from Zoho fetch:', d.ID);
  }).catch(function(e) {
    // console.warn('[CCM] Project prefill failed (non-fatal):', e);
  });
}

/* Prefill Step 1 fields from OnboardingState.necessary (already fetched by dashboard) or Zoho fetch */
function prefillStep1FromStored() {
  // Priority 1: use already-fetched OnboardingState record
  if (typeof OnboardingState !== 'undefined' && OnboardingState.necessary) {
    var rec = OnboardingState.necessary;
    if (rec.ID) AppState.necessaryId = rec.ID;
    applyStep1Data(rec);
    // console.log('[CCM] Step 1 prefilled from OnboardingState:', rec.ID);
    return;
  }

  // Priority 2: fetch from Zoho (no-criteria — row permissions return own record)
  if (typeof ZOHO === 'undefined' || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) return;
  var app = (typeof ZOHO_CFG !== 'undefined' ? ZOHO_CFG.appName : null) || ZOHO_CONFIG.appName;
  ZOHO.CREATOR.DATA.getRecords({
    app_name:    app,
    report_name: ZOHO_CONFIG.reports.necessary,
    page: 1, per_page: 200
  }).then(function(res) {
    if (res.code !== 3000 || !res.data || !res.data.length) return;
    var d = res.data[0];
    AppState.necessaryId = d.ID;
    applyStep1Data(d);
    // console.log('[CCM] Step 1 prefilled from Zoho fetch:', d.ID);
  }).catch(function(e) {
    // console.warn('[CCM] Step 1 prefill failed (non-fatal):', e);
  });
}

/* Prefill Step 3 fields from OnboardingState.requirements (already fetched by dashboard) */
function prefillStep3FromStored() {
  // Priority 1: use already-fetched OnboardingState record
  if (typeof OnboardingState !== 'undefined' && OnboardingState.requirements) {
    var rec = OnboardingState.requirements;
    if (rec.ID) AppState.requirementsId = rec.ID;
    applyStep3Data(rec);
    // console.log('[CCM] Step 3 prefilled from OnboardingState:', rec.ID);
    return;
  }

  // Priority 2: fetch from Zoho (no-criteria)
  if (typeof ZOHO === 'undefined' || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) return;
  var app = (typeof ZOHO_CFG !== 'undefined' ? ZOHO_CFG.appName : null) || ZOHO_CONFIG.appName;
  ZOHO.CREATOR.DATA.getRecords({
    app_name:    app,
    report_name: ZOHO_CONFIG.reports.requirements,
    page: 1, per_page: 200
  }).then(function(res) {
    if (res.code !== 3000 || !res.data || !res.data.length) return;
    var d = res.data[0];
    AppState.requirementsId = d.ID;
    applyStep3Data(d);
    // console.log('[CCM] Step 3 prefilled from Zoho fetch:', d.ID);
  }).catch(function(e) {
    // console.warn('[CCM] Step 3 prefill failed (non-fatal):', e);
  });
}

/* Map requirements_signoff record back onto Step 3 form fields */
function applyStep3Data(d) {
  function setTxt(id, val) {
    var el = document.getElementById(id);
    if (el && val) el.value = val;
  }
  function setNum(id, val) {
    var el = document.getElementById(id);
    if (el && (val || val === 0)) {
      var n = parseFloat(val);
      if (el.dataset.currency && !isNaN(n)) {
        /* Convert from INR base to selected display currency before showing */
        if (typeof convertFromINRBase === 'function') n = convertFromINRBase(n);
        el.value = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        el.value = val;
      }
    }
  }

  // console.log('[CCM] applyStep3Data — all keys:', Object.keys(d));

  // Keyword-based dynamic scanning — handles any Zoho field naming convention
  var totalCapital = '', grantSubsidy = '', equityReq = '', debtReq = '', promotorEq = '';
  var currencyType = d.Funding_Currency_Type || d.Currency || d.Funding_Currency || '';
  var capitalType  = d.Capital_Type || '';
  Object.keys(d).forEach(function(k) {
    var kl  = k.toLowerCase().replace(/_/g, '');
    var val = d[k];
    if (val === null || val === undefined || val === '') return;
    if      (kl.includes('totalcapital') || kl.includes('totalproject')) totalCapital = val;
    else if (kl.includes('grantsubsidy') || kl.includes('subsidy'))      grantSubsidy = val;
    else if (kl.includes('equityrequired'))                               equityReq    = val;
    else if (kl.includes('debtrequired'))                                 debtReq      = val;
    else if (kl.includes('promotorequity'))                               promotorEq   = val;
    else if (kl.includes('fundingcurrency') || kl.includes('currencytype')) currencyType = val;
    else if (kl === 'capitaltype')                                        capitalType  = val;
  });

  // Services
  setCheckboxes('Services_Needed_from_CCM', d.Services_Needed_from_CCM);

  // Capital requirements
  setNum('cap_total',           totalCapital);
  setNum('cap_grant',           grantSubsidy);
  setNum('cap_equity',          equityReq);
  setNum('cap_debt',            debtReq);
  setNum('cap_promotor_equity', promotorEq);

  // Currency & capital type checkboxes
  setCheckboxes('Funding_Currency_Type', currencyType);
  setCheckboxes('cap_type', capitalType);
  setRadio('exp_timeline', arrVal(d.Expected_Timeline));

  // Certification
  setRadio('cert_req',         arrVal(d.Certification_Required));
  setCheckboxes('cert_pref',   d.Preferred_Certification);
  setRadio('cert_grade',       arrVal(d.Target_Grade));

  // Authorized person — detect if same as promotor by checking if name matches registration
  var nm = d.Name || {};
  var regFname = document.getElementById('r_fname') ? document.getElementById('r_fname').value : '';
  var regLname = document.getElementById('r_lname') ? document.getElementById('r_lname').value : '';
  var authIsSame = nm.first_name && nm.first_name === regFname && nm.last_name === regLname;
  var authSameEl = document.getElementById('auth_same');
  if (authSameEl) {
    authSameEl.checked = authIsSame;
    // Sync visibility of auth fields
    toggleHideTargets('auth_fname,auth_lname,auth_mobile,auth_linkedin', authIsSame);
  }
  setTxt('auth_fname',   nm.first_name || '');
  setTxt('auth_lname',   nm.last_name  || '');
  setTxt('auth_mobile',  (d.Mobile_Number || '').replace(/^\+91/, ''));
  if (d.LinkedIn_Profile) {
    var lv = typeof d.LinkedIn_Profile === 'object' ? (d.LinkedIn_Profile.url || '') : String(d.LinkedIn_Profile);
    setTxt('auth_linkedin', lv);
  }

  // Declaration checkbox — restore if previously confirmed
  var declEl = document.getElementById('decl_agree');
  if (declEl && d.I_confirm_that_the_information_provided_above_is_accurate_to_the_best_of_my_knowledge === true) {
    declEl.checked = true;
  }
}

/* Map a Necessary_information record back onto Step 1 form fields */
function applyStep1Data(d) {
  function setTxt(id, val) {
    var el = document.getElementById(id);
    if (el && val) el.value = val;
  }

  // Toggle checkboxes — must also call toggleHideTargets to sync visible/hidden state
  var sameVal = (d.Same_as_included_in_promotor_presentation === "true" || d.Same_as_included_in_promotor_presentation === true);
  var sameEl = document.getElementById("f_same_pres");
  if (sameEl) sameEl.checked = sameVal;
  var sameSpvEl = document.getElementById("fin_spv_same");
  if (sameSpvEl) {
    sameSpvEl.checked = sameVal;
    // Hide SPV financial year fields when "same as promotor" is checked
    toggleHideTargets(sameSpvEl.dataset.toggleHide || "fin_spv_26,fin_spv_25,fin_spv_24,fin_spv_23", sameVal);
  }

  // Textareas
  setTxt("eq_stack",       d.Present_Equity_Stack || "");
  setTxt("dt_stack",       d.Present_Debt_Stack   || "");
  setTxt("Key_Gaps_Risks", d.Key_Gaps_Risks        || "");
  setTxt("cap_note",       d.Note_on_CapitalRaise  || "");

  // Finance type radio
  setRadio("fin_type", arrVal(d.Finance_type));

  // Project readiness radios — field IDs match item ids in fields.js readiness grid
  setRadio("DPR_Feasibility",      arrVal(d.DPR_Feasibility_Study));
  setRadio("Land_Site",            arrVal(d.Land_Site));
  setRadio("Permits_Approvals",    arrVal(d.Permits_Approvals));
  setRadio("Technoloy_Equipment",  arrVal(d.Technoloy_Equipment));
  setRadio("EPC_Construction_Team",arrVal(d.EPC_Construction_Team));
  setRadio("Equity_Committed",     arrVal(d.Equity_Committed));
  setRadio("Green_Certification",  arrVal(d.Green_Certification));
  setRadio("Impact_Assessment",    arrVal(d.Impact_Assessment));
  setRadio("Market_Demand",        arrVal(d.Market_Demand));

  // Show uploaded file indicators for Step 1 documents
  showFileUploaded("f_corp_pres", d.upload_corporate_presentation);
  showFileUploaded("f_spv_broch", d.Upload_project_SPV_brochure);
  showFileUploaded("fin_prom_26", d.Financial_Year_2025_26);
  showFileUploaded("fin_prom_25", d.Financial_Year_2024_25);
  showFileUploaded("fin_prom_24", d.Financial_Year_2023_24);
  showFileUploaded("fin_prom_23", d.Financial_Year_2022_23);
  showFileUploaded("fin_spv_26",  d.Project_SPV_Financial_Year_2025_26);
  showFileUploaded("fin_spv_25",  d.Project_SPV_Financial_Year_2024_25);
  showFileUploaded("fin_spv_24",  d.Project_SPV_Financial_Year_2023_24);
  showFileUploaded("fin_spv_23",  d.Project_SPV_Financial_Year_2022_23);
}

/* Extract { fileName, fileUrl } from a Zoho file field value (string, object, or array) */
function parseZohoFile(val) {
  if (!val) return null;
  if (Array.isArray(val)) {
    // Multiple files — return array of parsed items
    var items = val.map(parseZohoFile).filter(Boolean);
    return items.length ? items : null;
  }
  if (typeof val === 'object') {
    var fn = val.file_name || val.name || val.title || '';
    var fu = val.url || val.download_url || val.href || '';
    if (!fn && !fu) return null;
    return { fileName: fn, fileUrl: fu };
  }
  if (typeof val === 'string' && val.trim()) {
    return { fileName: val.split('/').pop().split('?')[0] || 'file', fileUrl: val };
  }
  return null;
}

/* Show "already uploaded" indicator for a file input when Zoho has an existing file */
function showFileUploaded(inputId, zohoFileVal) {
  if (!zohoFileVal) return;
  var parsed = parseZohoFile(zohoFileVal);
  if (!parsed) return;

  // Normalise to array for uniform handling
  var files = Array.isArray(parsed) ? parsed : [parsed];

  // Update the fname_ span with file names
  var span = document.getElementById('fname_' + inputId);
  if (span && !span.dataset.prefilled) {
    span.dataset.prefilled = '1';
    var names = files.map(function(f) { return f.fileName; }).filter(Boolean);
    var label = names.length
      ? (names.length === 1 ? names[0] : names.length + ' files uploaded')
      : 'File already uploaded';
    span.innerHTML = '<span style="color:#166534;font-size:11px">&#10003; ' + label
      + ' <em style="color:#6b7280;font-style:normal">(upload new to replace)</em></span>';
  }

  // For image preview grids (gallery, cover) — show thumbnails if URL available
  var previewGrid = document.getElementById('preview_' + inputId);
  if (previewGrid && !previewGrid.dataset.prefilled) {
    var imgFiles = files.filter(function(f) { return f.fileUrl; });
    if (imgFiles.length) {
      previewGrid.dataset.prefilled = '1';
      previewGrid.innerHTML = imgFiles.map(function(f) {
        return '<img src="' + f.fileUrl + '" class="img-preview-thumb"'
          + ' style="width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb"'
          + ' onerror="this.style.display=\'none\'" title="' + (f.fileName || '') + '">';
      }).join('');
    }
  }

  // For file list divs (e.g. Existing_Certifications)
  var fileListEl = document.getElementById('filelist_' + inputId);
  if (fileListEl && !fileListEl.dataset.prefilled && files.length) {
    fileListEl.dataset.prefilled = '1';
    fileListEl.innerHTML = files.map(function(f) {
      return '<div class="file-list-item" style="color:#166534">&#10003; ' + (f.fileName || 'uploaded file') + '</div>';
    }).join('');
  }
}

/* Map project_creation record onto Step 2 project fields */
/* Format a Zoho date string (DD-Mon-YYYY or ISO) to YYYY-MM-DD for <input type="date"> */
function fmtDateInput(val) {
  if (!val) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  try {
    var d = new Date(val);
    if (isNaN(d)) return '';
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
  } catch(e) { return ''; }
}

function applyProjectData(d) {
  function set(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined && val !== null && val !== '') el.value = val;
  }
  function setSelect(id, val) {
    var el = document.getElementById(id);
    if (!el || !val) return;
    for (var i = 0; i < el.options.length; i++) {
      if (el.options[i].value === val) { el.selectedIndex = i; break; }
    }
  }

  // Identification & Category
  var sameCoVal = (d.Same_as_Promotor_Company === 'true' || d.Same_as_Promotor_Company === true);
  var sameCo = document.getElementById("p_same_co");
  if (sameCo) {
    sameCo.checked = sameCoVal;
    // If same as promotor company, auto-fill entity from company name
    if (sameCoVal) {
      var entityEl = document.getElementById("p_entity");
      if (entityEl && !entityEl.value) entityEl.value = document.getElementById("r_company") ? document.getElementById("r_company").value : '';
    }
  }
  var projLockEl = document.getElementById("project_lock");
  if (projLockEl) projLockEl.checked = !!(d.Lock === true || d.Lock === 'true' || d.Lock === 1 || d.Lock === '1');

  set("p_entity", d.Project_Entity_SPV || '');
  set("p_name",              d.project_name || '');
  set("Project_Description", d.description  || d.Project_Description || '');
  setSelect("category",      arrVal(d.category));
  setSelect("Subtype",       arrVal(d.Subtype));
  setSelect("Project_Stage", arrVal(d.Project_Stage));
  setSelect("Priority_Level",arrVal(d.Priority_Level));
  set("USPs",                d.USPs || '');
  set("Design_Completion_Date",  fmtDateInput(d.Design_Completion_Date));
  set("Construction_Start_Date", fmtDateInput(d.Construction_Start_Date));
  set("Construction_End_Date",   fmtDateInput(d.Construction_End_Date));

  // Site address
  var addr = d.Address || {};
  set("p_addr_line1",  addr.address_line_1 || addr.Address_Line_1 || '');
  set("p_addr_city",   addr.district_city  || addr.District_City  || '');
  set("p_addr_state",  addr.state_province || addr.State_Province  || '');
  set("p_addr_postal", addr.postal_code    || addr.postal_Code     || '');
  set("p_addr_country",addr.country        || addr.Country         || '');

  // Site metrics — use != null so 0 values are not skipped
  function setNum(id, val) {
    if (val == null || val === '') return;
    var el = document.getElementById(id);
    if (!el) return;
    var n = parseFloat(val);
    el.value = (el.dataset.currency && !isNaN(n))
      ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : val;
  }
  setNum("Total_Land_Area",    d.Total_Land_Area);
  setRadio("Land_Ownership",   arrVal(d.Land_Ownership));
  setNum("Built_up_Area_sq_ft",       d.Built_up_Area_sq_ft);
  setNum("Total_Super_Built_Up_Area", d.Total_Super_Built_Up_Area);
  setNum("Carpet_Area",               d.Carpet_Area);
  setNum("No_of_Floors",       d.No_of_Floors);
  setNum("Leasable_Area",      d.Leasable_Area);
  setNum("Lease_Tenure_years", d.Lease_Tenure_years);
  setNum("No_of_Units",        d.No_of_Units);
  setNum("No_of_Buildings",    d.No_of_Buildings);
  setNum("Parking_Area",       d.Parking_Area);

  // Certification status
  setRadio("Is_Project_Certified", arrVal(d.Is_Project_Certified));
  setCheckboxes("Present_Certification", d.Present_Certification);
  set("custom_doc_name", d.Other_Document_Name_It || '');

  // File upload indicators — show badge when Zoho has a file stored
  showFileUploaded("doc_thumb",             d.Project_Cover_Image);
  showFileUploaded("doc_photos",            d.Project_Gallery);
  showFileUploaded("doc_kyc",               d.KYC_KYB || d.KYC_Documents);
  showFileUploaded("doc_dpr",               d.Detail_Project_Feasibility_Study_Report_Upload);
  showFileUploaded("doc_legal",             d.Legal_Opinion);
  showFileUploaded("doc_land",              d.Land_Agreement);
  showFileUploaded("doc_reg",               d.Regulatory_Approval);
  showFileUploaded("doc_marketing",         d.Marketing_Agreement);
  showFileUploaded("doc_custom",            d.Other_Document);
  showFileUploaded("Existing_Certifications", d.Upload_Present_Certification_s);
}

/* Show/hide loading shimmer over page 2 while prefill fetch is in progress */
function setPage2Loading(on) {
  var pg = document.getElementById("page2");
  if (!pg) return;
  var existing = document.getElementById("page2LoadingOverlay");

  if (on && !existing) {
    var overlay = document.createElement("div");
    overlay.id = "page2LoadingOverlay";
    overlay.style.cssText = [
      "position:absolute", "inset:0", "z-index:50",
      "background:rgba(255,255,255,0.75)",
      "display:flex", "align-items:center", "justify-content:center",
      "border-radius:12px", "gap:10px",
      "font-size:13px", "color:#6b7280", "font-family:'DM Sans',sans-serif"
    ].join(";");
    overlay.innerHTML = '<span class="spinner"></span> Loading your profile…';
    pg.style.position = "relative";
    pg.appendChild(overlay);
  } else if (!on && existing) {
    existing.remove();
  }
}

/* Show user name / company / email / mobile in the nav bar */
function showNavUser(d) {
  var nm      = d.Promotor_Name || {};
  var fname   = nm.first_name || "";
  var lname   = nm.last_name  || "";
  var fullName= (fname + " " + lname).trim() || d.Company_Name || "User";
  var company = d.Company_Name || "";
  var email   = d.Company_email || "";
  var mobile  = (d.Mobile_Number || "").replace(/^\+91/, "+91 ");

  var avatar  = document.getElementById("navAvatar");
  var navName = document.getElementById("navName");
  var navMeta = document.getElementById("navMeta");
  var navUser = document.getElementById("navUser");

  if (avatar)  avatar.textContent  = (fname[0] || company[0] || "U").toUpperCase();
  if (navName) navName.textContent = fullName + (company ? " · " + company : "");
  if (navMeta) navMeta.textContent = [email, mobile].filter(Boolean).join("  |  ");
  if (navUser) navUser.style.display = "flex";
  var navDiv1 = document.getElementById("navDivider1");
  if (navDiv1) navDiv1.style.display = "block";
  var navDiv2 = document.getElementById("navDivider2");
  if (navDiv2) navDiv2.style.display = "block";
}

/* Map promotor_registration_Report record fields → widget form fields */
function applyRegistrationData(d) {
  // Store currency from registration record for form suffix display
  var regCurrency = d.Currency || d.Funding_Currency_Type || d.Funding_Currency || '';
  if (typeof regCurrency === 'object') regCurrency = regCurrency.display_value || regCurrency.value || '';
  if (regCurrency) {
    AppState._currency = String(regCurrency).trim().toUpperCase().split(/[,;]/)[0].trim();
    refreshCurrencySuffixes();
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (!el || val === undefined || val === null || val === "") return;
    /* Currency inputs: convert from INR base to selected display currency */
    if (el.dataset.currency) {
      var n = parseFloat(String(val).replace(/,/g, ""));
      if (!isNaN(n)) {
        if (typeof convertFromINRBase === 'function') n = convertFromINRBase(n);
        el.value = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return;
      }
    }
    el.value = val;
  }

  function setSelect(id, val) {
    var el = document.getElementById(id);
    if (!el || !val) return;
    for (var i = 0; i < el.options.length; i++) {
      if (el.options[i].value === val) { el.selectedIndex = i; break; }
    }
  }
  function setCheckboxes(name, values) {
    if (!values) return;
    // Accept array or comma-separated string
    var list = Array.isArray(values) ? values : values.split(",");
    list.forEach(function (v) {
      var el = document.querySelector('input[name="' + name + '"][value="' + v.trim() + '"]');
      if (el) el.checked = true;
    });
  }
  // Zoho URL fields return {url:"...", title:"..."} or {value:"..."} — extract the URL string
  function urlVal(field) {
    if (!field) return "";
    if (typeof field === "object") return field.url || field.value || field.title || field.display_value || "";
    return String(field);
  }
  // Zoho picklist returns array ["Value"] or plain string — always get first/only value
  function pickVal(field) {
    if (!field) return "";
    if (Array.isArray(field)) return field[0] || "";
    if (typeof field === "object") return field.display_value || field.value || "";
    return String(field);
  }
  // Extract plain string from any Zoho field type
  function strVal(field) {
    if (!field && field !== 0) return "";
    if (Array.isArray(field)) return field[0] != null ? String(field[0]) : "";
    if (typeof field === "object") return field.display_value || field.value || field.url || "";
    return String(field);
  }

  // ── Lock identity ─────────────────────────────────────────
  var lockEl = document.getElementById("promotor_lock");
  if (lockEl) lockEl.checked = !!(d.Lock === true || d.Lock === 'true' || d.Lock === 1 || d.Lock === '1');

  // ── Individual details (secF) ──────────────────────────────
  var nm = d.Promotor_Name || {};
  set("r_fname",    strVal(nm.first_name || d.first_name));
  set("r_lname",    strVal(nm.last_name  || d.last_name));
  set("r_email",    strVal(d.Company_email));
  set("r_mobile",   strVal(d.Mobile_Number).replace(/^\+91/, ""));
  set("r_desig",    strVal(d.Designation));
  set("r_linkedin", urlVal(d.LinkedIn_profile));

  // ── Company information ────────────────────────────────────
  set("r_company",  strVal(d.Company_Name));
  setSelect("ctype", pickVal(d.Company_Type));
  set("r_website",  urlVal(d.Website));
  set("r_cin",      strVal(d.CIN));
  set("r_gstin",    strVal(d.GSTIN));
  set("r_desc",     strVal(d.Description));

  // ── Address ────────────────────────────────────────────────
  var addr = d.Address || {};
  set("addr_line1",  strVal(addr.address_line_1  || addr.Address_Line_1));
  set("addr_city",   strVal(addr.district_city   || addr.District_City));
  set("addr_state",  strVal(addr.state_province  || addr.State_Province));
  set("addr_postal", strVal(addr.postal_code));
  set("addr_country",strVal(addr.country         || addr.Country));

  // ── Company metrics ────────────────────────────────────────
  set("r_year",      strVal(d.Year_Established));
  set("r_employees", strVal(d.No_of_Employees));
  set("r_projects",  strVal(d.No_of_Projects_Completed));
  set("r_turnover",  strVal(d.Annual_Turnover));
  setCheckboxes("Sector_Focus", d.Sector_Focus || "");

  // console.log("[CCM] applyRegistrationData complete — website:", urlVal(d.Website), "| linkedin:", urlVal(d.LinkedIn_profile), "| email:", strVal(d.Company_email));
}

/* ═══════════════════════════════════════════════════════════════
   STEP RAIL
═══════════════════════════════════════════════════════════════ */
function renderStepRail() {
  const container = document.getElementById("stepsContainer");
  if (!container) return;

  let html = "";
  STEP_LABELS.forEach(function (s) {
    html += `
      <div class="step-item">
        <div class="s-circle" id="sc${s.n}">${s.n}</div>
        <div class="s-label"  id="sl${s.n}">${s.label}</div>
        ${s.sub ? `<div class="s-sub" id="ss${s.n}">${s.sub}</div>` : ""}
      </div>`;
  });
  container.innerHTML = html;
}

function updateStepRail() {
  STEP_LABELS.forEach(function (s) {
    const circle = document.getElementById("sc" + s.n);
    const label  = document.getElementById("sl" + s.n);
    if (!circle || !label) return;

    circle.className = "s-circle";
    label.className  = "s-label";

    if (s.n < AppState.currentStep) {
      circle.classList.add("done");
      circle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>`;
      label.classList.add("done");
    } else if (s.n === AppState.currentStep) {
      circle.classList.add("active");
      circle.textContent = s.n;
      label.classList.add("active");
    } else {
      circle.textContent = s.n;
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   DYNAMIC FIELD RENDERER
═══════════════════════════════════════════════════════════════ */
function renderAllPages() {
  const container = document.getElementById("pagesContainer");
  if (!container) return;

  let html = "";

  for (let step = 1; step <= AppState.totalSteps; step++) {
    const sections   = ALL_STEPS[step] || [];
    const pageTitle  = getPageTitle(step);

    html += `<div class="page" id="page${step}">`;
    html += `<div class="ptitle"><h1>${pageTitle}</h1></div>`;

    sections.forEach(function (sec) {
      if (sec.hidden) return;
      html += renderSection(sec);
    });

    html += renderFormNav(step);
    html += `</div>`;
  }

  html += renderSuccessScreen();
  container.innerHTML = html;

  wireOtherRadios();
  wireConditionalFields();
  wireToggleCheckboxes();
}

/* ── One collapsible card section ───────────────────────────── */
function renderSection(sec) {
  const freezeBadge = sec.freezable
    ? `<div class="badge-freeze">⚠ Freezable</div>`
    : "";
  const warningBox = sec.warningBox
    ? `<div class="ibox amber" style="margin-top:12px"><strong>⚠</strong> ${sec.warningBox}</div>`
    : "";
  const sectionNote = sec.note
    ? `<div class="section-note">${sec.note}</div>`
    : "";

  return `
  <div class="card" id="${sec.id}">
    <div class="card-hdr" onclick="toggleCard('${sec.id}')">
      <div class="sbadge">${sec.badge}</div>
      <div style="flex:1">
        <div class="card-title">${sec.title}</div>
        ${sec.sub ? `<div class="card-sub">${sec.sub}</div>` : ""}
      </div>
      ${freezeBadge}
      <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <div class="card-body">
      ${renderFieldGrid(sec.fields)}
      ${sec.infoBox ? renderInfoBox(sec.infoBox) : ""}
      ${warningBox}
      ${sectionNote}
    </div>
  </div>`;
}

/* ── 2-col grid of fields ───────────────────────────────────── */
function renderFieldGrid(fields) {
  if (!fields || !fields.length) return "";

  // Group consecutive fields that share the same rowGroup value
  var groups = [];
  fields.forEach(function (f) {
    if (f.rowGroup) {
      var last = groups[groups.length - 1];
      if (last && last.rowGroup === f.rowGroup) {
        last.fields.push(f);
        return;
      }
      groups.push({ rowGroup: f.rowGroup, fields: [f] });
    } else {
      groups.push({ rowGroup: null, fields: [f] });
    }
  });

  let html = `<div class="g2">`;
  groups.forEach(function (g) {
    if (g.rowGroup) {
      // Render grouped fields in an equal-column sub-grid spanning full width
      var cols = g.fields.length;
      html += `<div class="g-full"><div class="g${cols}" style="gap:14px">`;
      g.fields.forEach(function (f) {
        html += `<div id="cell_${f.id}">${renderField(f)}</div>`;
      });
      html += `</div></div>`;
    } else {
      var f = g.fields[0];
      const spanClass = (f.colSpan === 2) ? "g-full" : "";
      const classAttr = spanClass ? ` class="${spanClass}"` : "";
      if (f.conditionalShow) {
        html += `<div id="cond_${f.id}"${classAttr} style="display:none">${renderField(f)}</div>`;
      } else {
        html += `<div id="cell_${f.id}"${classAttr}>${renderField(f)}</div>`;
      }
    }
  });
  html += `</div>`;
  return html;
}

/* ── Dispatch to field type renderer ───────────────────────── */
function renderField(f) {
  switch (f.type) {
    case "text":
    case "email":
    case "url":
    case "tel":
    case "number":
    case "date":
      return renderInputField(f);
    case "textarea":
      return renderTextareaField(f);
    case "select":
      return renderSelectField(f);
    case "radio":
      return renderRadioField(f);
    case "checkbox":
      return renderCheckboxField(f);
    case "readonly":
      return renderReadonlyField(f);
    case "file-upload":
      return renderFileUploadField(f);
    case "toggle-checkbox":
      return renderToggleCheckboxField(f);
    case "section-label":
      return renderSectionLabelField(f);
    case "readiness":
      return renderReadinessField(f);
    case "signature-area":
      return "";
    case "info-text":
      return renderInfoTextField(f);
    default:
      return renderInputField(f);
  }
}

/* ── Info / declaration text ────────────────────────────────── */
function renderInfoTextField(f) {
  return `<div class="decl-text">${f.text || ""}</div>`;
}

/* ── Active currency for form suffixes ───────────────────────── */
function getFormCurrency() {
  // Read from checked Funding_Currency_Type checkboxes first (live selection)
  var checked = [];
  document.querySelectorAll('input[name="Funding_Currency_Type"]:checked').forEach(function(el) {
    if (el.value) checked.push(el.value);
  });
  if (checked.length > 0) return checked[0];
  // Fall back to registration record currency stored in AppState
  if (AppState._currency) return AppState._currency;
  // Fall back to localStorage settings
  try {
    var s = JSON.parse(localStorage.getItem('ccm_settings_v2') || '{}');
    if (s.currency) return s.currency;
  } catch(e) {}
  return 'INR';
}

/* Update all currency suffix badges when selection changes */
function refreshCurrencySuffixes() {
  var cur = getFormCurrency();
  document.querySelectorAll('.cur-suffix').forEach(function(el) {
    el.textContent = cur;
  });
}

/* ── Label helper ───────────────────────────────────────────── */
function fieldLabel(f) {
  if (!f.label) return "";
  const req    = f.required ? `<span class="req">*</span> ` : "";
  const suffix = f.labelSuffix ? ` <span class="opt">${f.labelSuffix}</span>` : "";
  return `<label class="fl" for="${f.id}">${req}${f.label}${suffix}</label>`;
}

/* ── text / email / number / url / tel ──────────────────────── */
function renderInputField(f) {
  const maxl     = f.maxlength ? ` maxlength="${f.maxlength}"` : "";
  const minv     = (f.min !== undefined) ? ` min="${f.min}"` : "";
  const maxv     = (f.max !== undefined) ? ` max="${f.max}"` : "";
  const ph       = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
  const readOnly = f.prefilled ? ` readonly class="prefilled-input"` : "";
  const change   = f.prefilled ? "" : ` oninput="onFieldInput(this)"`;
  const note     = f.note ? `<div class="fn">${f.note}</div>` : "";
  const badge    = f.prefilled ? `<span class="prefilled-badge">Auto-filled</span>` : "";
  const errMsg   = `<div class="field-err-msg" id="err_${f.id}"></div>`;

  // Currency fields — use text input with live formatting
  let inputHtml;
  if (f.currencySuffix) {
    inputHtml = `<input type="text" inputmode="decimal" id="${f.id}" data-currency="true"${ph}${readOnly}` +
      ` oninput="onFieldInput(this)"` +
      ` onfocus="currencyFocusStrip(this)"` +
      ` onblur="currencyBlurFormat(this)"` +
      `/>`;
  } else {
    inputHtml = `<input type="${f.type}" id="${f.id}"${ph}${maxl}${minv}${maxv}${readOnly}${change}/>`;
  }

  // Date fields — wrap with calendar icon
  if (f.type === "date") {
    const calIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    inputHtml = `<div class="date-wrap">${inputHtml}<span class="date-icon">${calIcon}</span></div>`;
  }

  // currencySuffix flag — renders a live-updating currency code badge
  const effectiveSuffix = f.currencySuffix ? `<span class="pfx R cur-suffix">${getFormCurrency()}</span>` : (f.suffix ? `<div class="pfx R">${f.suffix}</div>` : "");
  const effectivePrefix = f.prefix ? `<div class="pfx L">${f.prefix}</div>` : "";

  if (f.prefix || f.suffix || f.currencySuffix) {
    let wrapClass = "prow";
    if (f.prefix)                      wrapClass += " has-prefix";
    if (f.suffix || f.currencySuffix)  wrapClass += " has-suffix";
    inputHtml = `<div class="${wrapClass}">${effectivePrefix}${inputHtml}${effectiveSuffix}</div>`;
  }

  return `
  <div class="f">
    <div style="display:flex;align-items:center;gap:6px">${fieldLabel(f)}${badge}</div>
    ${inputHtml}
    ${note}
    ${errMsg}
  </div>`;
}

/* ── textarea ───────────────────────────────────────────────── */
function renderTextareaField(f) {
  const maxl     = f.maxlength ? ` maxlength="${f.maxlength}"` : "";
  const ph       = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
  const helpText = f.helpText ? `<div class="field-help">${f.helpText}</div>` : "";
  return `
  <div class="f">
    ${fieldLabel(f)}
    ${helpText}
    <textarea id="${f.id}"${maxl}${ph} oninput="onFieldInput(this)"></textarea>
    <div class="field-err-msg" id="err_${f.id}"></div>
  </div>`;
}

/* ── select ─────────────────────────────────────────────────── */
function renderSelectField(f) {
  const opts = (f.options || []).map(function (o) {
    return `<option value="${o.value}">${o.label}</option>`;
  }).join("");
  return `
  <div class="f">
    ${fieldLabel(f)}
    <select id="${f.id}" onchange="onFieldInput(this)">${opts}</select>
    <div class="field-err-msg" id="err_${f.id}"></div>
  </div>`;
}

/* ── radio ──────────────────────────────────────────────────── */
function renderRadioField(f) {
  const items = (f.options || []).map(function (o) {
    return `<label class="ch">
      <input type="radio" name="${f.id}" value="${o.value}" onchange="onRadioChange('${f.id}', this)"/>
      ${o.label}
    </label>`;
  }).join("");

  return `
  <div class="f">
    ${fieldLabel(f)}
    <div class="ri" id="rg_${f.id}" style="margin-top:4px">${items}</div>
    <div class="field-err-msg" id="err_${f.id}"></div>
  </div>`;
}

/* ── checkbox ───────────────────────────────────────────────── */
function renderCheckboxField(f) {
  const items = (f.options || []).map(function (o) {
    const disabled = (!o.enabled) ? " disabled" : "";
    const soon     = (o.soon)     ? " soon" : "";
    const id       = `cb_${f.id}_${o.value.replace(/[^a-z0-9]/gi, "_")}`;
    const onChange = f.noCallback ? "" : ` onchange="onFieldInput(this)"`;
    return `<label class="ch${soon}">
      <input type="checkbox" id="${id}" name="${f.id}" value="${o.value}"${disabled}${onChange}/>
      ${o.label}
    </label>`;
  }).join("");

  return `
  <div class="f">
    ${fieldLabel(f)}
    <div class="cg${f.inline ? " cg-row" : ""}" style="margin-top:4px">${items}</div>
    <div class="field-err-msg" id="err_${f.id}"></div>
  </div>`;
}

/* ── readonly ───────────────────────────────────────────────── */
function renderReadonlyField(f) {
  const note = f.note ? `<div class="fn">${f.note}</div>` : "";
  return `
  <div class="f">
    ${fieldLabel(f)}
    <input type="text" id="${f.id}" value="${f.defaultValue || ""}" readonly/>
    ${note}
  </div>`;
}

/* ── file upload ────────────────────────────────────────────── */
function renderFileUploadField(f) {
  const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" style="flex-shrink:0"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
  const acceptAttr   = f.accept   ? ` accept="${f.accept}"` : "";
  const multipleAttr = f.multiple ? ` multiple` : "";
  const previewGrid  = f.preview  ? `<div class="img-preview-grid" id="preview_${f.id}"></div>` : "";
  const fileList     = f.filelist ? `<div class="file-list" id="filelist_${f.id}"></div>` : "";
  return `
  <div class="f">
    ${fieldLabel(f)}
    <input type="file" id="${f.id}" class="file-input-hidden"${acceptAttr}${multipleAttr} onchange="onFileSelected('${f.id}', ${!!f.preview}, ${!!f.filelist})"/>
    <label for="${f.id}" class="file-upload-btn">
      ${icon}
      Browse
    </label>
    <span class="file-selected" id="fname_${f.id}"></span>
    ${previewGrid}
    ${fileList}
  </div>`;
}

/* ── toggle checkbox (single) ───────────────────────────────── */
function renderToggleCheckboxField(f) {
  const toggleAttr = f.toggleHide ? ` data-toggle-hide="${f.toggleHide}"` : "";
  return `
  <div class="f" style="justify-content:center">
    <label class="ch" style="padding:4px 0">
      <input type="checkbox" id="${f.id}"${toggleAttr} onchange="onToggleCheckbox(this)"/>
      ${f.label}
    </label>
  </div>`;
}

/* ── section sub-label (non-field divider) ──────────────────── */
function renderSectionLabelField(f) {
  return `<div class="section-sublabel">${f.label}</div>`;
}

/* ── readiness grid ─────────────────────────────────────────── */
function renderReadinessField(f) {
  const items = (f.items || []).map(function (item) {
    return `
    <div class="rg-item">
      <div class="rg-label">${item.label}</div>
      <label class="ch"><input type="radio" name="${item.id}" value="Ready"     onchange="onFieldInput(this)"/> Ready</label>
      <label class="ch"><input type="radio" name="${item.id}" value="Partial"   onchange="onFieldInput(this)"/> Partial</label>
      <label class="ch"><input type="radio" name="${item.id}" value="Not Ready" onchange="onFieldInput(this)"/> Not Ready</label>
    </div>`;
  }).join("");
  return `<div class="readiness-grid">${items}</div>`;
}

/* ── signature area ─────────────────────────────────────────── */

/* ── info box ───────────────────────────────────────────────── */
function renderInfoBox(box) {
  return `<div class="ibox ${box.type}">${box.html}</div>`;
}

/* ── form nav row ───────────────────────────────────────────── */
function renderFormNav(step) {
  const backBtn = step > 1
    ? `<button class="btn btn-s" onclick="goBack()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>`
    : `<div></div>`;

  const isLast = (step === AppState.totalSteps);
  const nextBtn = isLast
    ? `<button class="btn btn-p" id="submitBtn" onclick="submitRegistration()">
        Initiate Mandate
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`
    : `<button class="btn btn-p" onclick="goNext()">
        Continue
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>`;

  // Step 2 has "Remind Later" — skips validation and advances
  const skipBtn = (step === 2)
    ? `<button class="btn-g" onclick="skipStep()">Remind Later</button>` : "";

  return `
  <div class="fnav">
    ${backBtn}
    <div class="fnav-right">
      ${skipBtn}
      ${nextBtn}
    </div>
  </div>`;
}

/* ── success screen ─────────────────────────────────────────── */
function renderSuccessScreen() {
  return `
  <div class="success" id="successScreen">
    <div class="s-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h2>Registration Submitted Successfully</h2>
    <p>Your application has been submitted for Expert review. You will be notified within 24–48 hours.</p>
    <div class="ibox green" style="max-width:460px;margin:0 auto 24px;text-align:left">
      <strong>What happens next?</strong><br/>
      1. Our experts review your submission within 24–48 hours<br/>
      2. Identity remains confidential until mutual agreement<br/>
      3. Project data freezes upon Expert approval<br/>
      4. You'll receive updates via your company email
    </div>
    <button class="btn btn-p" style="margin:0 auto" onclick="addAnotherProject()">
      Register Another Project
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE NAVIGATION
═══════════════════════════════════════════════════════════════ */
function showPage(n) {
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });
  const pg = document.getElementById("page" + n);
  if (pg) pg.classList.add("active");

  const ss = document.getElementById("successScreen");
  if (ss) ss.classList.remove("active");

  AppState.currentStep = n;
  updateStepRail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goNext() {
  if (!validateCurrentStep()) return;

  // Step 1 Continue — advance immediately, save in background
  if (AppState.currentStep === 1) {
    showPage(2);
    saveNecessaryInfo().catch(function(e){ console.warn("[CCM] Step1 bg save failed:", e); });
    return;
  }

  // Step 2 Continue — advance immediately, save in background
  if (AppState.currentStep === 2) {
    showPage(3);
    saveStep2().catch(function(e){ console.warn("[CCM] Step2 bg save failed:", e); });
    return;
  }

  if (AppState.currentStep < AppState.totalSteps) {
    showPage(AppState.currentStep + 1);
  }
}


/* Save Necessary_information form when user clicks Continue on Step 1 */
function saveNecessaryInfo() {
  if (typeof ZOHO === "undefined" || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) {
    // Offline / dev mode — just advance
    return Promise.resolve();
  }

  saveStatus("saving", "Saving…");

  // Build payload — only include fields that have an actual value.
  // Zoho rejects empty string with code 3001 "Invalid column value".
  var capNote = v("cap_note");
  var sameAsPres = document.getElementById("f_same_pres") && document.getElementById("f_same_pres").checked;
  var allFields = {
    promotor_registration: AppState.existingRegistrationId || "",
    Present_Equity_Stack:  v("eq_stack"),
    Present_Debt_Stack:    v("dt_stack"),
    Note_on_CapitalRaise: capNote,
    Key_Gaps_Risks:        v("Key_Gaps_Risks"),
    Finance_type:          getRadioValue("fin_type"),
    DPR_Feasibility_Study: getRadioValue("DPR_Feasibility"),
    Land_Site:             getRadioValue("Land_Site"),
    Permits_Approvals:     getRadioValue("Permits_Approvals"),
    Technoloy_Equipment:   getRadioValue("Technoloy_Equipment"),
    EPC_Construction_Team: getRadioValue("EPC_Construction_Team"),
    Equity_Committed:      getRadioValue("Equity_Committed"),
    Green_Certification:   getRadioValue("Green_Certification"),
    Impact_Assessment:     getRadioValue("Impact_Assessment"),
    Market_Demand:         getRadioValue("Market_Demand")
    // Services_Needed_from_CCM is in requirements_signoff form, NOT here
  };

  // Strip every key whose value is empty/null/undefined
  var data = {};
  Object.keys(allFields).forEach(function (k) {
    var val = allFields[k];
    if (val !== "" && val !== null && val !== undefined) data[k] = val;
  });

  // type 16 boolean — only include when checked; omit when false to avoid Zoho type mismatch
  if (sameAsPres) {
    data.Same_as_included_in_promotor_presentation = true;
  }

  // console.log("[CCM] saveNecessaryInfo payload data:", JSON.stringify(data, null, 2));
  var payload = { data: data };

  var savePromise;
  if (AppState.necessaryId) {
    // console.log('[CCM] Step1 → Updating Necessary_information (ID:', AppState.necessaryId, ')…');
    savePromise = ZOHO.CREATOR.DATA.updateRecordById({
      app_name:    ZOHO_CONFIG.appName,
      report_name: ZOHO_CONFIG.reports.necessary,
      id:          AppState.necessaryId,
      payload:     payload
    });
  } else {
    // console.log('[CCM] Step1 → Creating new Necessary_information…');
    savePromise = ZOHO.CREATOR.DATA.addRecords({
      app_name:  ZOHO_CONFIG.appName,
      form_name: ZOHO_CONFIG.forms.necessary,
      payload:   payload
    });
  }

  return savePromise
  .then(function (res) {
    // console.log("[CCM] ✓ Necessary_information saved (code " + res.code + "):", res);
    if (res.code !== 3000) {
      // console.warn("[CCM] Necessary_information save failed:", res);
      saveStatus("error", "Save failed");
      return;
    }
    if (!AppState.necessaryId) {
      AppState.necessaryId = res.data
        ? (res.data.ID || (Array.isArray(res.data) && res.data[0] && res.data[0].ID))
        : null;
    }
    // console.log("[CCM]   necessaryId:", AppState.necessaryId);

    // Upload file attachments for this record (non-blocking)
    uploadFilesForRecord(ZOHO_CONFIG.reports.necessary, AppState.necessaryId, [
      { fieldId: "f_corp_pres", fieldName: "upload_corporate_presentation" },
      { fieldId: "f_spv_broch", fieldName: "Upload_project_SPV_brochure" },
      { fieldId: "fin_prom_26", fieldName: "Financial_Year_2025_26" },
      { fieldId: "fin_prom_25", fieldName: "Financial_Year_2024_25" },
      { fieldId: "fin_prom_24", fieldName: "Financial_Year_2023_24" },
      { fieldId: "fin_prom_23", fieldName: "Financial_Year_2022_23" },
      { fieldId: "fin_spv_26",  fieldName: "Project_SPV_Financial_Year_2025_26" },
      { fieldId: "fin_spv_25",  fieldName: "Project_SPV_Financial_Year_2024_25" },
      { fieldId: "fin_spv_24",  fieldName: "Project_SPV_Financial_Year_2023_24" },
      { fieldId: "fin_spv_23",  fieldName: "Project_SPV_Financial_Year_2022_23" }
    ]).catch(function (e) { console.warn("[CCM] File upload error (non-fatal):", e); });

    saveStatus("saved", "Step 1 saved");
  })
  .catch(function (err) {
    // console.warn("[CCM] Necessary_information save error (non-fatal):", err);
    saveStatus("error", "Save failed");
  });
}

/* Save Step 2 — update promotor registration then add project record */
function saveStep2() {
  if (typeof ZOHO === "undefined" || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) {
    return Promise.resolve();
  }

  saveStatus("saving", "Saving…");

  var regData = {
    Promotor_Name:    { first_name: v("r_fname"), last_name: v("r_lname") },
    Company_email:    v("r_email"),
    Mobile_Number:    v("r_mobile") ? "+91" + v("r_mobile") : "",
    Designation:      v("r_desig"),
    LinkedIn_profile: v("r_linkedin").startsWith("http") ? { url: v("r_linkedin"), title: v("r_linkedin") } : "",
    Lock:             document.getElementById("promotor_lock") && document.getElementById("promotor_lock").checked ? true : false,
    Company_Name:     v("r_company"),
    Company_Type:     v("ctype"),
    Website:          v("r_website").startsWith("http") ? { url: v("r_website"), title: v("r_website") } : "",
    CIN:              v("r_cin"),
    GSTIN:            v("r_gstin"),
    Address: {
      address_line_1: v("addr_line1"),
      district_city:  v("addr_city"),
      state_province: v("addr_state"),
      postal_Code:    v("addr_postal"),
      country:        v("addr_country") || "India"
    },
    Year_Established:         v("r_year")      ? parseInt(v("r_year"))      : "",
    No_of_Employees:          v("r_employees") ? parseInt(v("r_employees")) : "",
    No_of_Projects_Completed: v("r_projects")  ? parseInt(v("r_projects"))  : "",
    Annual_Turnover:      v("r_turnover")  ? parseFloat(v("r_turnover")): "",
    Sector_Focus:             getCheckboxValues("Sector_Focus"),
    Description:              v("r_desc")
  };
  // Strip empty/null top-level keys — Zoho rejects empty strings for URL/text fields
  Object.keys(regData).forEach(function (k) {
    if (regData[k] === "" || regData[k] === null || regData[k] === undefined) delete regData[k];
  });
  const registrationPayload = { data: regData };

  return Promise.resolve()
  .then(function () {
    if (AppState.existingRegistrationId) {
      // console.log("[CCM] Step2 → Updating promotor_registration (ID:", AppState.existingRegistrationId, ")…");
      return ZOHO.CREATOR.DATA.updateRecordById({
        app_name:    ZOHO_CONFIG.appName,
        report_name: ZOHO_CONFIG.reports.registration,
        id:          AppState.existingRegistrationId,
        payload:     registrationPayload
      });
    } else {
      // console.log("[CCM] Step2 → Adding new promotor_registration…");
      return ZOHO.CREATOR.DATA.addRecords({
        app_name:  ZOHO_CONFIG.appName,
        form_name: ZOHO_CONFIG.forms.registration,
        payload:   registrationPayload
      });
    }
  })
  .then(function (res) {
    // console.log("[CCM] ✓ promotor_registration (code " + res.code + "):", res);
    if (res.code !== 3000) throw new Error("promotor_registration failed: " + JSON.stringify(res));
    var rid = res.data
      ? (res.data.ID || (Array.isArray(res.data) && res.data[0] && res.data[0].ID) || null)
      : null;
    AppState.registrationId = rid || AppState.existingRegistrationId;
    // console.log("[CCM]   registrationId:", AppState.registrationId);

    const projectPayload = {
      data: {
        Lock:                 document.getElementById("project_lock") && document.getElementById("project_lock").checked ? true : false,
        Project_Entity_SPV:   v("p_entity"),
        Same_as_Promotor_Company:
          document.getElementById("p_same_co") && document.getElementById("p_same_co").checked ? "true" : "false",
        project_name:         v("p_name"),
        description:          v("Project_Description"),
        category:             v("category"),
        Subtype:              v("Subtype"),
        Project_Stage:        v("Project_Stage"),
        Priority_Level:       v("Priority_Level"),
        USPs:                       v("USPs"),
        Design_Completion_Date:     v("Design_Completion_Date")  || "",
        Construction_Start_Date:    v("Construction_Start_Date") || "",
        Construction_End_Date:      v("Construction_End_Date")   || "",
        Address: {
          address_line_1: v("p_addr_line1"),
          district_city:  v("p_addr_city"),
          state_province: v("p_addr_state"),
          postal_Code:    v("p_addr_postal"),
          country:        v("p_addr_country") || "India"
        },
        Total_Land_Area:      v("Total_Land_Area")     ? parseFloat(v("Total_Land_Area"))     : "",
        Land_Ownership:       getRadioValue("Land_Ownership"),
        Built_up_Area_sq_ft:      v("Built_up_Area_sq_ft")       ? parseFloat(v("Built_up_Area_sq_ft"))       : "",
        Total_Super_Built_Up_Area: v("Total_Super_Built_Up_Area") ? parseFloat(v("Total_Super_Built_Up_Area")) : "",
        Carpet_Area:              v("Carpet_Area")               ? parseFloat(v("Carpet_Area"))               : "",
        No_of_Floors:         v("No_of_Floors")         ? parseInt(v("No_of_Floors"))           : "",
        Leasable_Area:        v("Leasable_Area")        ? parseFloat(v("Leasable_Area"))        : "",
        Lease_Tenure_years:   v("Lease_Tenure_years")   ? parseInt(v("Lease_Tenure_years"))     : "",
        No_of_Units:          v("No_of_Units")          ? parseInt(v("No_of_Units"))            : "",
        No_of_Buildings:      v("No_of_Buildings")      ? parseInt(v("No_of_Buildings"))        : "",
        Parking_Area:         v("Parking_Area")         ? parseFloat(v("Parking_Area"))         : "",
        Is_Project_Certified:    getRadioValue("Is_Project_Certified"),
        Present_Certification:   getCheckboxArray("Present_Certification"),
        Other_Document_Name_It:  v("custom_doc_name") || undefined
      }
    };

    if (AppState.projectId) {
      // console.log("[CCM] Step2 → Updating project_creation (ID:", AppState.projectId, ")…");
      return ZOHO.CREATOR.DATA.updateRecordById({
        app_name:    ZOHO_CONFIG.appName,
        report_name: ZOHO_CONFIG.reports.project,
        id:          AppState.projectId,
        payload:     projectPayload
      });
    } else {
      // console.log("[CCM] Step2 → Creating new project_creation…");
      return ZOHO.CREATOR.DATA.addRecords({
        app_name:  ZOHO_CONFIG.appName,
        form_name: ZOHO_CONFIG.forms.project,
        payload:   projectPayload
      });
    }
  })
  .then(function (res) {
    // console.log("[CCM] ✓ project_creation (code " + res.code + "):", res);
    if (res.code !== 3000) throw new Error("project_creation failed: " + JSON.stringify(res));
    if (!AppState.projectId) {
      AppState.projectId = res.data
        ? (res.data.ID || (Array.isArray(res.data) && res.data[0] && res.data[0].ID))
        : null;
    }
    // console.log("[CCM]   projectId:", AppState.projectId);

    /* ── Upload all project files — non-blocking, don't delay page advance ── */
    uploadFilesForRecord(ZOHO_CONFIG.reports.project, AppState.projectId, [
      { fieldId: "doc_thumb",              fieldName: "Project_Cover_Image" },
      { fieldId: "doc_photos",             fieldName: "Project_Gallery" },
      { fieldId: "doc_kyc",                fieldName: "KYC_KYB" },
      { fieldId: "doc_dpr",                fieldName: "Detail_Project_Feasibility_Study_Report_Upload" },
      { fieldId: "doc_legal",              fieldName: "Legal_Opinion" },
      { fieldId: "doc_land",               fieldName: "Land_Agreement" },
      { fieldId: "doc_reg",                fieldName: "Regulatory_Approval" },
      { fieldId: "doc_marketing",          fieldName: "Marketing_Agreement" },
      { fieldId: "doc_custom",             fieldName: "Other_Document" },
      { fieldId: "Existing_Certifications",fieldName: "Upload_Present_Certification_s" }
    ]).catch(function(e){ console.warn("[CCM] File upload error (non-fatal):", e); });

    // Resolve immediately — don't wait for file uploads
  })
  .then(function () {
    saveStatus("saved", "Saved");
  })
  .catch(function (err) {
    // console.error("[CCM] Step2 save error:", err);
    saveStatus("error", "Save failed");
    throw err;
  });
}

function goBack() {
  if (AppState.currentStep > 1) {
    showPage(AppState.currentStep - 1);
  }
}

/* skipStep — advances without any validation (Remind Later on step 2) */
function skipStep() {
  if (AppState.currentStep < AppState.totalSteps) {
    showPage(AppState.currentStep + 1);
  }
}

/* ═══════════════════════════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════════════════════════ */
function validateCurrentStep() {
  const sections = ALL_STEPS[AppState.currentStep] || [];
  let valid = true;

  sections.forEach(function (sec) {
    (sec.fields || []).forEach(function (f) {
      if (!validateField(f)) valid = false;
    });
  });

  if (!valid) {
    toast("err", "Please fill in all required fields correctly.");
  }
  return valid;
}

function validateField(f) {
  // Required toggle-checkbox (e.g. declaration) — must be checked
  if (f.type === "toggle-checkbox" && f.required) {
    const el = document.getElementById(f.id);
    if (!el || !el.checked) {
      showFieldError(f.id, "Please confirm the declaration to proceed");
      return false;
    }
    return true;
  }
  // Non-validatable types
  const skip = ["file-upload","toggle-checkbox","section-label","readiness","signature-area","readonly"];
  if (skip.includes(f.type)) return true;

  // Skip hidden conditional fields
  const condCell = document.getElementById("cond_" + f.id);
  if (condCell && condCell.style.display === "none") return true;

  if (!f.required && !f.validation) return true;

  const val = getFieldValue(f);

  if (f.required) {
    if (!val || (typeof val === "string" && val.trim() === "")) {
      setFieldError(f.id, (f.label || "This field") + " is required.");
      return false;
    }
    if (Array.isArray(val) && val.length === 0) {
      setFieldError(f.id, "Please select at least one option.");
      return false;
    }
  }

  if (f.validation === "email_company" && val) {
    if (!validateCompanyEmail(val)) {
      setFieldError(f.id, "Please use a company email address (not Gmail/Yahoo/etc.).");
      return false;
    }
  }

  if (f.validation === "mobile10" && val) {
    if (!/^\d{10}$/.test(val)) {
      setFieldError(f.id, "Enter a valid 10-digit mobile number.");
      return false;
    }
  }

  clearFieldError(f.id);
  return true;
}

function validateCompanyEmail(email) {
  const domain = email.split("@")[1];
  if (!domain) return false;
  return !BLOCKED_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

function setFieldError(id, msg) {
  const el  = document.getElementById(id);
  const err = document.getElementById("err_" + id);
  if (el)  el.classList.add("field-error");
  if (err) { err.textContent = msg; err.classList.add("show"); }
}

function clearFieldError(id) {
  const el  = document.getElementById(id);
  const err = document.getElementById("err_" + id);
  if (el)  el.classList.remove("field-error");
  if (err) { err.textContent = ""; err.classList.remove("show"); }
}

/* ═══════════════════════════════════════════════════════════════
   VALUE HELPERS
═══════════════════════════════════════════════════════════════ */
function getFieldValue(f) {
  if (f.type === "radio") {
    const checked = document.querySelector(`input[name="${f.id}"]:checked`);
    return checked ? checked.value : "";
  }
  if (f.type === "checkbox") {
    const checked = document.querySelectorAll(`input[name="${f.id}"]:checked`);
    return Array.from(checked).map(function (c) { return c.value; });
  }
  const el = document.getElementById(f.id);
  if (!el) return "";
  return el.value ? el.value.trim() : "";
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function getCheckboxValues(name) {
  const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checked).map(function (c) { return c.value; }).join(";");
}

function getCheckboxArray(name) {
  const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checked).map(function (c) { return c.value; });
}

function v(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  var val = el.value.trim().replace(/,/g, "");
  /* Currency fields: convert displayed value back to INR before saving to Zoho */
  if (el.dataset.currency && val !== "") {
    var n = parseFloat(val);
    if (!isNaN(n) && typeof convertToINRBase === 'function') {
      return String(parseFloat(convertToINRBase(n).toFixed(2)));
    }
  }
  return val;
}

/* ── Currency field formatting ─────────────────────────────── */
function currencyBlurFormat(el) {
  var raw = el.value.replace(/,/g, "").trim();
  if (raw === "" || isNaN(parseFloat(raw))) return;
  var n = parseFloat(raw);
  el.value = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currencyFocusStrip(el) {
  var raw = el.value.replace(/,/g, "").trim();
  // Strip to plain number for editing
  if (raw !== "" && !isNaN(parseFloat(raw))) {
    el.value = parseFloat(raw).toString();
  }
}

/* Extract plain string from Zoho field that may return as array or string.
   e.g. Finance_type: ["Corporate"] → "Corporate"
        Land: ["Ready"]             → "Ready"
        Present_Equity_Stack: "xyz" → "xyz"                              */
function arrVal(field) {
  if (!field) return "";
  if (Array.isArray(field)) return field[0] || "";
  if (typeof field === "object") return field.display_value || field.value || "";
  return String(field);
}

/* Set a radio button group to the given value */
function setRadio(name, val) {
  if (!val) return;
  var el = document.querySelector('input[name="' + name + '"][value="' + val + '"]');
  if (el) el.checked = true;
}

/* Set checkboxes (semicolon-separated or array) */
function setCheckboxes(name, val) {
  if (!val) return;
  var values = Array.isArray(val) ? val : String(val).split(";");
  values.forEach(function(v) {
    var el = document.querySelector('input[name="' + name + '"][value="' + v.trim() + '"]');
    if (el) el.checked = true;
  });
}

/* ═══════════════════════════════════════════════════════════════
   ZOHO CREATOR SUBMISSION
═══════════════════════════════════════════════════════════════ */
function submitRegistration() {
  if (AppState.submitting) return;
  if (!validateCurrentStep()) return;

  // Guard: ensure SDK is available
  if (typeof ZOHO === "undefined" || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) {
    toast("err", "Zoho SDK not ready. Please reload the widget.");
    // console.error("[CCM] ZOHO.CREATOR.DATA is undefined — SDK not loaded.");
    return;
  }

  AppState.submitting = true;
  setSubmitLoading(true);
  saveStatus("saving", "Submitting…");

  // Note: Step 1 (Necessary_information) saved on Step 1 Continue.
  // Note: Step 2 (promotor_registration + project_creation) saved on Step 2 Continue.
  // Submit only handles requirements_signoff + all file uploads.

  /* ── Payload: Requirements & Sign-off (Step 3) ──────────────── */
  var reqData = {
    Project:  AppState.projectId      || "",
    Promotor: AppState.registrationId || "",
    // Services Required From CCM (Step 3 secA_srv)
    Services_Needed_from_CCM: getCheckboxArray("Services_Needed_from_CCM"),
    // Capital Requirement (Step 3 secI)
    Total_Project_Cost:       v("cap_total")           ? parseFloat(v("cap_total"))           : "",
    Grant_Subsidy_Sought_In:  v("cap_grant")           ? parseFloat(v("cap_grant"))           : "",
    Equity_Required_In:       v("cap_equity")          ? parseFloat(v("cap_equity"))          : "",
    Debt_Required_In:         v("cap_debt")            ? parseFloat(v("cap_debt"))            : "",
    Promotor_Equity_In:       v("cap_promotor_equity") ? parseFloat(v("cap_promotor_equity")) : "",
    Funding_Currency_Type:    getCheckboxArray("Funding_Currency_Type"),
    Capital_Type:             getCheckboxArray("cap_type"),
    Expected_Timeline:        getRadioValue("exp_timeline"),
    Investors_Lenders_Approached: v("investors_lenders") || "",
    CCM_can_approach_these_Investors_Lenders: getRadioValue("ccm_approach") === "CCM can approach these Investors/Lenders" ? "Yes" : "",
    CCM_shall_leave_these_Investors_Lenders:  getRadioValue("ccm_approach") === "CCM shall leave these Investors/Lenders"  ? "Yes" : "",
    // Certification Requirement (Step 3 secH)
    Certification_Required:   getRadioValue("cert_req"),
    Preferred_Certification:  getCheckboxArray("cert_pref"),
    Target_Grade:             getRadioValue("cert_grade"),
    // Authorized person for correspondence
    Name:                     { first_name: v("auth_fname"), last_name: v("auth_lname") },
    Mobile_Number:            v("auth_mobile") ? "+91" + v("auth_mobile") : "",
    LinkedIn_Profile:         v("auth_linkedin").startsWith("http") ? { url: v("auth_linkedin"), title: v("auth_linkedin") } : "",
    I_confirm_that_the_information_provided_above_is_accurate_to_the_best_of_my_knowledge: document.getElementById("decl_agree") && document.getElementById("decl_agree").checked ? true : ""
  };
  // Strip empty/null/undefined scalar values — Zoho rejects empty strings for radio/URL fields
  Object.keys(reqData).forEach(function (k) {
    var val = reqData[k];
    if (val === "" || val === null || val === undefined) delete reqData[k];
  });
  const requirementsPayload = { data: reqData };

  // console.group("[CCM] Submission started");
  // console.log("App name  :", ZOHO_CONFIG.appName);
  // console.log("Form 4    :", ZOHO_CONFIG.forms.requirements, requirementsPayload);
  // console.groupEnd();

  /* ── Requirements & Sign-off ────────────────────────────────── */
  Promise.resolve()
  .then(function () {
    if (AppState.requirementsId) {
      // console.log('[CCM] → Updating requirements_signoff (ID:', AppState.requirementsId, ')…');
      return ZOHO.CREATOR.DATA.updateRecordById({
        app_name:    ZOHO_CONFIG.appName,
        report_name: ZOHO_CONFIG.reports.requirements,
        id:          AppState.requirementsId,
        payload:     requirementsPayload
      });
    } else {
      // console.log('[CCM] → Creating new requirements_signoff…');
      return ZOHO.CREATOR.DATA.addRecords({
        app_name:  ZOHO_CONFIG.appName,
        form_name: ZOHO_CONFIG.forms.requirements,
        payload:   requirementsPayload
      });
    }
  })
  .then(function (res) {
    // console.log("[CCM] ✓ requirements_signoff (code " + res.code + "):", res);
    if (res.code !== 3000) throw new Error("requirements_signoff failed: " + JSON.stringify(res));
    if (!AppState.requirementsId) {
      AppState.requirementsId = res.data ? (res.data.ID || (Array.isArray(res.data) && res.data[0] && res.data[0].ID)) : null;
    }
    // console.log("[CCM]   requirementsId:", AppState.requirementsId);

    // console.log("[CCM] ✓ All submissions complete.");
    onSubmitSuccess();
  })
  .catch(function (err) {
    // console.error("[CCM] ✗ Submission error:", err);
    // console.error("[CCM]   Error detail:", err && err.message ? err.message : JSON.stringify(err));
    onSubmitError(err);
  });
}

/* ── Submit UI states ───────────────────────────────────────── */
function setSubmitLoading(loading) {
  const btn = document.getElementById("submitBtn");
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = `<span class="spinner"></span> Submitting…`;
  } else {
    btn.innerHTML = `Initiate Mandate <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>`;
  }
}

/* ── Upload all file inputs for a record (sequential, non-fatal) */
function uploadFilesForRecord(reportName, recordId, fields) {
  if (!recordId) {
    // console.warn("[CCM] uploadFilesForRecord: no recordId for", reportName);
    return Promise.resolve();
  }

  // Run uploads one after another so we don't flood the API
  return fields.reduce(function (chain, f) {
    return chain.then(function () {
      var input = document.getElementById(f.fieldId);
      if (!input || !input.files || input.files.length === 0) return Promise.resolve();
      // Support multiple files — upload each sequentially
      var files = Array.from(input.files);
      return files.reduce(function (fileChain, file) {
        return fileChain.then(function () {
          // console.log("[CCM] → Uploading", f.fieldName, "(" + file.name + ") to", reportName, recordId);
          return ZOHO.CREATOR.FILE.uploadFile({
            app_name:    ZOHO_CONFIG.appName,
            report_name: reportName,
            id:          recordId,
            field_name:  f.fieldName,
            file:        file
          }).then(function (res) {
            // console.log("[CCM] ✓ Uploaded", f.fieldName, ":", res);
          }).catch(function (err) {
            // console.warn("[CCM] ✗ Upload failed for", f.fieldName, "(non-fatal):", err);
          });
        });
      }, Promise.resolve());
    });
  }, Promise.resolve());
}


function onSubmitSuccess() {
  AppState.submitting = false;
  setSubmitLoading(false);
  saveStatus("saved", "Submitted");
  toast("ok", "Registration submitted successfully!");

  document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
  const ss = document.getElementById("successScreen");
  if (ss) ss.classList.add("active");

  STEP_LABELS.forEach(function (s) {
    const c = document.getElementById("sc" + s.n);
    const l = document.getElementById("sl" + s.n);
    if (c) { c.className = "s-circle done"; c.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>`; }
    if (l) { l.className = "s-label done"; }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onSubmitError(err) {
  AppState.submitting = false;
  setSubmitLoading(false);
  saveStatus("error", "Failed");
  const msg = err && err.message ? err.message : JSON.stringify(err);
  toast("err", "Submission failed: " + msg);
}

/* ── Register another project ───────────────────────────────── */
function addAnotherProject() {
  const clearIds = [
    "p_entity","p_name","Project_Description","USPs","p_brief",
    "p_addr_line1","p_addr_city","p_addr_state","p_addr_postal","p_addr_country",
    "Total_Land_Area","Built_up_Area_sq_ft","Total_Super_Built_Up_Area","Carpet_Area","Leasable_Area",
    "No_of_Units","No_of_Floors","Lease_Tenure_years","No_of_Buildings","Parking_Area",
    "Total_Project_Cost","Total_Capital_Required","Grant_Subsidy_Sought",
    "Equity_Required","Debt_Required","Promotor_Equity",
    "cap_note","eq_stack","dt_stack","cap_total","cap_equity","cap_debt","Key_Gaps_Risks",
    "custom_doc_name"
  ];
  clearIds.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  document.querySelectorAll(
    "input[name=fin_type],input[name=cert_req],input[name=cert_grade]," +
    "input[name=Land],input[name=Construction_Team],input[name=Permits_Approvals]," +
    "input[name=Design_Drawings],input[name=Equity_Committed],input[name=Green_Certifier]," +
    "input[name=Certification_Status],input[name=Market_Demand],input[name=Services_Needed_from_CCM]," +
    "input[name=Land_Ownership],input[name=Certification_Required1],input[name=Is_Project_Certified]," +
    "input[name=Funding_Currency_Type]"
  ).forEach(function (el) { el.checked = false; });

  // Reset project selects
  ["category","Subtype","Project_Stage","Priority_Level",
   "Preferred_Certification","Target_Grade","Capital_Type","Expected_Timeline"
  ].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  // Reset project checkboxes
  document.querySelectorAll("input[name=Present_Certification]")
    .forEach(function (el) { el.checked = false; });

  // Reset file name labels
  ["doc_dpr","doc_land","doc_marketing","doc_kyc","doc_legal",
   "doc_reg","doc_thumb","doc_photos","Existing_Certifications","doc_custom"
  ].forEach(function (id) {
    var fn = document.getElementById("fname_" + id);
    if (fn) fn.textContent = "";
  });

  // Reset conditional cert_pref visibility
  const certPrefCell = document.getElementById("cond_cert_pref");
  if (certPrefCell) certPrefCell.style.display = "none";

  const ss = document.getElementById("successScreen");
  if (ss) ss.classList.remove("active");

  showPage(2);
  toast("inf", "Add a new project for the same company.");
}

/* ═══════════════════════════════════════════════════════════════
   UI WIRING & HELPERS
═══════════════════════════════════════════════════════════════ */

/* Wire "Other" radio text inputs (after DOM render) */
function wireOtherRadios() {
  document.querySelectorAll("input[type=radio]").forEach(function (r) {
    r.addEventListener("change", function () {
      onRadioChange(r.name, r);
    });
  });
}

/* Wire conditional fields (cert_req → show/hide cert_pref) */
function wireConditionalFields() {
  function updateCertPref() {
    const certPrefCell = document.getElementById("cond_cert_pref");
    if (!certPrefCell) return;
    certPrefCell.style.display = (getRadioValue("cert_req") === "Yes") ? "" : "none";
  }

  document.querySelectorAll("input[name='cert_req']").forEach(function (r) {
    r.addEventListener("change", updateCertPref);
  });
  updateCertPref();
}

/* Wire toggle checkboxes that hide/show other fields.
   data-toggle-hide accepts a single id or comma-separated list of ids. */
function wireToggleCheckboxes() {
  document.querySelectorAll("input[type=checkbox][data-toggle-hide]").forEach(function (cb) {
    function updateToggle() {
      toggleHideTargets(cb.dataset.toggleHide, cb.checked);
    }
    cb.addEventListener("change", updateToggle);
    updateToggle();
  });
}

function toggleHideTargets(targetAttr, hide) {
  if (!targetAttr) return;
  targetAttr.split(",").forEach(function (id) {
    var cell = document.getElementById("cell_" + id.trim());
    if (cell) cell.style.display = hide ? "none" : "";
  });
}

function toggleCard(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("collapsed");
}

function onFieldInput(el) {
  AppState.dirty = true;
  saveStatus("saving", "Unsaved changes");
  clearFieldError(el.id || el.name);
  // Refresh currency suffix badges when currency selection changes
  if ((el.name === 'Funding_Currency_Type' || el.id === 'Funding_Currency_Type')) {
    refreshCurrencySuffixes();
  }
}

function onRadioChange(groupId, el) {
  onFieldInput(el);
  clearFieldError(groupId);
}

function onFileSelected(id, showPreview, showFilelist) {
  const input     = document.getElementById(id);
  const nameEl    = document.getElementById("fname_"    + id);
  const previewEl = document.getElementById("preview_"  + id);
  const filelistEl= document.getElementById("filelist_" + id);
  if (!input) return;

  if (input.files.length > 0 && nameEl) {
    nameEl.textContent = input.files.length === 1
      ? input.files[0].name
      : input.files.length + " files selected";
  }

  if (showPreview && previewEl) {
    previewEl.innerHTML = "";
    Array.from(input.files).forEach(function (file) {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.className = "img-preview-thumb";
        previewEl.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  if (showFilelist && filelistEl) {
    filelistEl.innerHTML = "";
    Array.from(input.files).forEach(function (file) {
      const row = document.createElement("div");
      row.className = "file-list-item";
      row.textContent = file.name;
      filelistEl.appendChild(row);
    });
  }

  AppState.dirty = true;
  saveStatus("saving", "Unsaved changes");
}

function onToggleCheckbox(el) {
  onFieldInput(el);
  toggleHideTargets(el.dataset.toggleHide, el.checked);

  // "Same As Promotor Company" → auto-fill Project (SPV) Entity from Company Name
  if (el.id === "p_same_co") {
    var entityEl = document.getElementById("p_entity");
    if (entityEl) {
      entityEl.value = el.checked ? v("r_company") : "";
    }
  }
}

/* ─── Save pill status ──────────────────────────────────────── */
function saveStatus(state, label) {
  const dot = document.getElementById("sdot");
  const lbl = document.getElementById("slbl");
  if (dot) dot.className = "sdot" + (state ? " " + state : "");
  if (lbl) lbl.textContent = label;
}

/* ─── Toast ─────────────────────────────────────────────────── */
const TOAST_ICONS = {
  ok:  `<polyline points="20 6 9 17 4 12"/>`,
  err: `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`,
  inf: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`
};
let toastTimer;

function toast(type, msg) {
  const t    = document.getElementById("toast");
  const icon = document.getElementById("ticon");
  const text = document.getElementById("tmsg");
  if (!t) return;
  if (icon) icon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.inf;
  if (text) text.textContent = msg;
  t.className = "toast " + type;
  clearTimeout(toastTimer);
  requestAnimationFrame(function () {
    t.classList.add("show");
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 4200);
  });
}

/* ─── Page title / desc ─────────────────────────────────────── */
function getPageTitle(step) {
  return {
    1: "Necessary Information",
    2: "Promotor & Project Details",
    3: "Requirements & Sign-Off"
  }[step] || "Step " + step;
}

