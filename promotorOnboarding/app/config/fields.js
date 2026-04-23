/**
 * fields.js — Climate Capital Market | Promoter Onboarding Widget
 * ─────────────────────────────────────────────────────────────────
 * 3-screen flow:
 *   Screen 1 — Necessary Information    (due diligence documents)
 *   Screen 2 — Promoter and Project Details (core listing)
 *   Screen 3 — Requirements and Sign-Off  (certification · capital · declaration)
 */

/* ─── BLOCKED EMAIL DOMAINS ─────────────────────────────────── */
const BLOCKED_EMAIL_DOMAINS = [
  "gmail.com","yahoo.com","hotmail.com","outlook.com",
  "rediffmail.com","live.com","icloud.com","aol.com",
  "ymail.com","protonmail.com","yahoo.in","yahoo.co.in"
];

/* ─── ZOHO APP / FORM NAMES ─────────────────────────────────── */
const ZOHO_CONFIG = {
  appName: "climate-capital-market",
  forms: {
    necessary:    "Necessary_information",
    registration: "promotor_registration",
    project:      "project_creation",
    requirements: "requirements_signoff"
  },
  reports: {
    necessary:    "All_Necessary_Information",
    registration: "promotor_registration_Report",
    project:      "project_creation_Report",
    requirements: "requirements_signoff_Report"
  }
};

/* ─── STEP RAIL LABELS ──────────────────────────────────────── */
const STEP_LABELS = [
  { n:1, label:"Necessary Information" },
  { n:2, label:"Promoter and Project Details" },
  { n:3, label:"Requirements and Sign-Off" }
];

/* ═══ STEP 1 — NECESSARY INFORMATION ═════════════════════════ */
const STEP1_SECTIONS = [
  {
    id:"secA", badge:"A",
    title:"Promoter and Project Profiles",
    fields:[
      { id:"f_spv_broch", label:"Project (SPV) Brochure / Presentation",        type:"file-upload",     zohoKey:"Upload_project_SPV_brochure",                 required:true,  colSpan:2 },
      { id:"f_same_pres", label:"Same As / Included In Promoter Presentation",   type:"toggle-checkbox", zohoKey:"Same_as_included_in_promoter_presentation",   required:false, colSpan:2 },
      { id:"f_corp_pres", label:"Promoter / Corporate Presentation",             type:"file-upload",     zohoKey:"upload_corporate_presentation",               required:false, colSpan:2 }
    ]
  },
  {
    id:"secB", badge:"B",
    title:"Audited / Provisional Financials",
    fields:[
      /* ── Promoter Financials — dynamic FY upload ─────────────── */
      { id:"fin_prom_lbl",  label:"Promoter Financials",       type:"section-label", colSpan:2, note:"At least one financial year is required", required:true },
      { id:"fin_prom_fy",   label:"Financial Year", type:"fy-upload", zohoKey:"Promoter_Financials", required:true, colSpan:2,
        years:["FY 2020-21","FY 2021-22","FY 2022-23","FY 2023-24","FY 2024-25"],
        zohoKeys:{
          "FY 2020-21":"Financial_Year_2020_21",
          "FY 2021-22":"Financial_Year_2021_22",
          "FY 2022-23":"Financial_Year_2022_23",
          "FY 2023-24":"Financial_Year_2023_24",
          "FY 2024-25":"Financial_Year_2024_25"
        }
      },

      /* ── Project (SPV) Financials — dynamic FY upload ─────────── */
      { id:"fin_spv_lbl",   label:"Project (SPV) Financials",    type:"section-label", colSpan:2 },
      { id:"fin_spv_same",  label:"Same As Promoter Financials", type:"toggle-checkbox", zohoKey:"Same_as_included_in_promoter_presentation", required:false, colSpan:2,
        toggleHide:"fin_spv_fy" },
      { id:"fin_spv_fy",    label:"Financial Year", type:"fy-upload", zohoKey:"Project_SPV_Financials", required:false, colSpan:2,
        years:["FY 2020-21","FY 2021-22","FY 2022-23","FY 2023-24","FY 2024-25"],
        zohoKeys:{
          "FY 2020-21":"Project_SPV_Financial_Year_2020_21",
          "FY 2021-22":"Project_SPV_Financial_Year_2021_22",
          "FY 2022-23":"Project_SPV_Financial_Year_2022_23",
          "FY 2023-24":"Project_SPV_Financial_Year_2023_24",
          "FY 2024-25":"Project_SPV_Financial_Year_2024_25"
        }
      }
    ]
  },
  {
    id:"secC", badge:"C",
    title:"Present Equity and Debt Stack",
    fields:[
      { id:"eq_stack", label:"Present Equity Stack", type:"textarea", zohoKey:"Present_Equity_Stack", required:true, placeholder:"e.g. 40% promoter equity, describe structure…", maxlength:65535, colSpan:1 },
      { id:"dt_stack", label:"Present Debt Stack",   type:"textarea", zohoKey:"Present_Debt_Stack",   required:true, placeholder:"e.g. 60% bank debt, describe structure…",       maxlength:65535, colSpan:1 }
    ]
  },
  {
    id:"secD", badge:"D",
    title:"Note On Capital Raise Plan",
    fields:[
      { id:"cap_note", label:"", type:"textarea", zohoKey:"Note_on_CapitalRaise", required:true, placeholder:"Add your note here…", maxlength:1000, colSpan:2 }
    ]
  },
  {
    id:"secE", badge:"E",
    title:"Project Readiness Summary",
    fields:[
      { id:"readiness_notice", label:"", type:"info-box", colSpan:2,
        text:"Choose precisely as Project Readiness Ratings will be generated upon verification by CCM Expert" },
      {
        id:"readiness_grid", label:"", type:"readiness", required:true, colSpan:2,
        items:[
          { id:"DPR_Feasibility",       label:"DPR / Feasibility Study", zohoKey:"DPR_Feasibility_Study" },
          { id:"Land_Site",             label:"Land / Site",             zohoKey:"Land_Site" },
          { id:"Permits_Approvals",     label:"Permits and Approvals",   zohoKey:"Permits_Approvals" },
          { id:"Technoloy_Equipment",   label:"Technology and Equipment",zohoKey:"Technoloy_Equipment" },
          { id:"EPC_Construction_Team", label:"EPC / Construction Team", zohoKey:"EPC_Construction_Team" },
          { id:"Equity_Committed",      label:"Equity Committed",        zohoKey:"Equity_Committed" },
          { id:"Green_Certification",   label:"Green Certification",     zohoKey:"Green_Certification" },
          { id:"Impact_Assessment",     label:"Impact Assessment",       zohoKey:"Impact_Assessment" },
          { id:"Market_Demand",         label:"Market Demand",           zohoKey:"Market_Demand" }
        ]
      },
      {
        id:"Key_Gaps_Risks", label:"Key Gaps / Risks", type:"textarea", zohoKey:"Key_Gaps_Risks", required:true,
        helpText:"Mention critical gaps or risks that must be addressed before financing",
        placeholder:"Describe key gaps or risks…", maxlength:65535, colSpan:2
      }
    ],
  }
];

/* ═══ STEP 2 — PROMOTER AND PROJECT DETAILS ════════════════════ */
const STEP2_SECTIONS = [
  {
    id:"secF", badge:"A",
    title:"Promoter Registration",
    fields:[
      /* ── Sub-header 1: Promoter Company Information ──────────── */
      { id:"div_promoter_co", label:"Promoter Company Information", type:"section-label", colSpan:2 },

      /* Individual */
      { id:"r_fname",    label:"First Name",       type:"text",  zohoKey:"first_name",    required:true,  placeholder:"First name",    maxlength:100, colSpan:1 },
      { id:"r_lname",    label:"Last Name",        type:"text",  zohoKey:"last_name",     required:true,  placeholder:"Last name",     maxlength:100, colSpan:1 },
      { id:"r_email",    label:"Company Email",    type:"email", zohoKey:"Company_email", required:true,  placeholder:"name@company.com", maxlength:255, colSpan:2, prefilled:true, note:"Auto-filled from your Zoho account" },
      { id:"r_mobile",   label:"Mobile",           type:"tel",   zohoKey:"Mobile_Number",   required:false, placeholder:"XXXXX XXXXX",                        maxlength:10,  prefix:"+91", validation:"mobile10", colSpan:1 },
      { id:"r_desig",    label:"Designation",      type:"text",  zohoKey:"Designation",     required:false, placeholder:"e.g. CEO, Director, Founder",         maxlength:255, colSpan:1 },
      { id:"r_linkedin", label:"LinkedIn Profile", type:"url",   zohoKey:"LinkedIn_profile",required:false, placeholder:"https://linkedin.com/in/yourprofile", maxlength:255, colSpan:2 },

      /* Company */
      { id:"r_company",  label:"Company Name",    type:"text",   zohoKey:"Company_Name",  required:true,  placeholder:"Legal registered company name",  maxlength:255, colSpan:2 },
      {
        id:"ctype", label:"Company Type", type:"select", zohoKey:"Company_Type", required:false, colSpan:1,
        options:[
          { value:"",              label:"Select" },
          { value:"Pvt Ltd",       label:"Pvt Ltd" },
          { value:"LLP",           label:"LLP" },
          { value:"Partnership",   label:"Partnership" },
          { value:"Proprietorship",label:"Proprietorship" },
          { value:"Public Ltd",    label:"Public Ltd" },
          { value:"Other",         label:"Other" }
        ]
      },
      { id:"r_website",  label:"Website",         type:"url",    zohoKey:"Website",       required:false, placeholder:"https://yourcompany.com",         maxlength:255, colSpan:1 },
      { id:"r_cin",      label:"CIN",             type:"text",   zohoKey:"CIN",           required:false, placeholder:"Corporate Identification Number", maxlength:255, colSpan:1 },
      { id:"r_gstin",    label:"GSTIN",           type:"text",   zohoKey:"GSTIN",         required:false, placeholder:"GST Identification Number",       maxlength:255, colSpan:1 },
      { id:"r_desc",     label:"Company Description", type:"textarea", zohoKey:"Description", required:false, placeholder:"Brief company description (500 chars max)", maxlength:500, colSpan:2 },

      /* ── Sub-header 2: Registered Address and Company Metrics ─── */
      { id:"div_addr_metrics", label:"Registered Address and Company Metrics", type:"section-label", colSpan:2 },

      /* Address */
      { id:"addr_line1",  label:"Address Line 1",  type:"text",   zohoKey:"address_line_1", required:false, placeholder:"Street / building",  maxlength:255, colSpan:2 },
      { id:"addr_city",   label:"City / District", type:"text",   zohoKey:"district_city",  required:true,  placeholder:"City",               maxlength:100, colSpan:1 },
      { id:"addr_state",  label:"State",           type:"text",   zohoKey:"state_province",  required:true,  placeholder:"State",              maxlength:100, colSpan:1 },
      { id:"addr_postal", label:"Postal Code",     type:"text",   zohoKey:"postal_Code",    required:false, placeholder:"PIN code",           maxlength:20,  colSpan:1 },
      { id:"addr_country",label:"Country",         type:"text",   zohoKey:"country",         required:false, placeholder:"India",              maxlength:100, colSpan:1 },

      /* Metrics */
      { id:"r_year",      label:"Year Established",          type:"number", zohoKey:"Year_Established",         required:false, placeholder:"e.g. 2010", min:1800, max:2099, colSpan:1 },
      { id:"r_employees", label:"No. Of Employees",          type:"number", zohoKey:"No_of_Employees",          required:false, placeholder:"0",          min:0,           colSpan:1 },
      { id:"r_projects",  label:"No. Of Projects Completed", type:"number", zohoKey:"No_of_Projects_Completed", required:false, placeholder:"0",          min:0,           colSpan:1 },
      { id:"r_turnover",  label:"Annual Revenue",  type:"number", zohoKey:"Annual_Turnover", required:false, placeholder:"0", min:0, colSpan:1, currencySuffix:true },
      {
        id:"Sector_Focus", label:"Sector Focus", type:"checkbox", zohoKey:"Sector_Focus", required:false, colSpan:2, inline:true,
        options:[
          { value:"GreenBuilding",           label:"Green Buildings",           enabled:true  },
          { value:"Renewables",             label:"Renewables",                enabled:false, soon:true },
          { value:"E-Mobility",             label:"E-Mobility",                enabled:false, soon:true },
          { value:"Industrial Decarb",      label:"Industrial Decarb",         enabled:false, soon:true },
          { value:"Sust. Agriculture",      label:"Sust. Agriculture",         enabled:false, soon:true },
          { value:"Food and Water Security",  label:"Food and Water Security",     enabled:false, soon:true }
        ]
      }
    ]
  },
  {
    id:"secG", badge:"B",
    title:"Project Details",
    fields:[
      /* ── Sub-header 1: Identification and Category ─────────────── */
      { id:"div_proj_id", label:"Identification and Category", type:"section-label", colSpan:2 },

      { id:"p_entity",  label:"Project (SPV) Entity",     type:"text",            zohoKey:"Project_Entity_SPV",        required:false, placeholder:"SPV company name", maxlength:255, colSpan:2 },
      { id:"p_same_co", label:"Same As Promoter Company", type:"toggle-checkbox", zohoKey:"Same_as_Promoter_Company",  required:false, colSpan:2 },
      { id:"p_name",    label:"Project Name",             type:"text",            zohoKey:"project_name",             required:true,  placeholder:"Internal project name", maxlength:255, colSpan:2 },
      { id:"Project_Description", label:"Project Description", type:"textarea", zohoKey:"Project_Description", required:false, placeholder:"Project description visible to investors (500 chars max)", maxlength:500, colSpan:2 },
      {
        id:"category", label:"Category", type:"select", zohoKey:"category", required:false, colSpan:1,
        options:[
          { value:"",            label:"Select" },
          { value:"Residential", label:"Residential" },
          { value:"Commercial",  label:"Commercial" },
          { value:"Industrial",  label:"Industrial" },
          { value:"Mixed",       label:"Mixed" }
        ]
      },
      {
        id:"Subtype", label:"Subtype", type:"select", zohoKey:"Subtype", required:false, colSpan:1,
        options:[
          { value:"",                  label:"Select" },
          { value:"Apartment",         label:"Apartment" },
          { value:"Affordable Housing",label:"Affordable Housing" },
          { value:"Villas",            label:"Villas" },
          { value:"Township",          label:"Township" },
          { value:"Office",            label:"Office" },
          { value:"Retail",            label:"Retail" },
          { value:"Resort",            label:"Resort" },
          { value:"Hotel",             label:"Hotel" },
          { value:"Hospital",          label:"Hospital" },
          { value:"Education",         label:"Education" },
          { value:"Factory",           label:"Factory" },
          { value:"Warehouse",         label:"Warehouse" },
          { value:"Datacentre",        label:"Datacentre" }
        ]
      },
      {
        id:"Project_Stage", label:"Project Stage", type:"select", zohoKey:"Project_Stage", required:false, colSpan:1,
        options:[
          { value:"",             label:"Select" },
          { value:"Design",       label:"Design" },
          { value:"Construction", label:"Construction" },
          { value:"Operation",    label:"Operation" }
        ]
      },
      {
        id:"Priority_Level", label:"Priority Level", type:"select", zohoKey:"Priority_Level", required:false, colSpan:1,
        options:[
          { value:"",                    label:"Select" },
          { value:"High(Immediate)",     label:"High (Immediate)" },
          { value:"Medium (6 -12 Month)",label:"Medium (6–12 Mo)" },
          { value:"Low(12-24)",          label:"Low (12–24 Mo)" }
        ]
      },
      { id:"USPs", label:"USPs", type:"textarea", zohoKey:"USPs", required:false, placeholder:"Unique selling points…", maxlength:65535, colSpan:2 },
      { id:"div_timeline", label:"Project Timeline", type:"section-label", colSpan:2 },
      { id:"Design_Completion_Date",   label:"Design Completion",   type:"date", zohoKey:"Design_Completion_Date",   required:false, rowGroup:"timeline", note:"Design sign-off" },
      { id:"Construction_Start_Date",  label:"Construction Start",  type:"date", zohoKey:"Construction_Start_Date",  required:false, rowGroup:"timeline", note:"Construction begins" },
      { id:"Construction_End_Date",    label:"Construction End",    type:"date", zohoKey:"Construction_End_Date",    required:false, rowGroup:"timeline", note:"Project completion" },

      /* ── Sub-header 2: Location and Site Details ───────────────── */
      { id:"div_site", label:"Location and Site Details", type:"section-label", colSpan:2 },

      { id:"p_addr_line1",  label:"Site Address",    type:"text", zohoKey:"address_line_1", required:false, placeholder:"Street / plot",  maxlength:255, colSpan:2 },
      { id:"p_addr_city",   label:"City / District", type:"text", zohoKey:"district_city",  required:true,  placeholder:"City",           maxlength:100, colSpan:1 },
      { id:"p_addr_state",  label:"State",           type:"text", zohoKey:"state_province",  required:true,  placeholder:"State",          maxlength:100, colSpan:1 },
      { id:"p_addr_postal", label:"Postal Code",     type:"text", zohoKey:"postal_Code",    required:false, placeholder:"PIN code",       maxlength:20,  colSpan:1 },
      { id:"p_addr_country",label:"Country",         type:"text", zohoKey:"country",         required:false, placeholder:"India",          maxlength:100, colSpan:1 },
      { id:"Total_Land_Area", label:"Land Area (Sq M)", type:"number", zohoKey:"Total_Land_Area", required:false, placeholder:"0", min:0, colSpan:1 },
      {
        id:"Land_Ownership", label:"Land Ownership", type:"radio", zohoKey:"Land_Ownership", required:false, colSpan:1,
        options:[
          { value:"Own",    label:"Own" },
          { value:"Lease",  label:"Lease" },
          { value:"JV/JDA", label:"JV / JDA" }
        ]
      },
      { id:"Total_Super_Built_Up_Area", label:"Total Super Built-Up Area (Sq M)", type:"number", zohoKey:"Total_Super_Built_Up_Area", required:false, placeholder:"0", min:0, colSpan:1 },
      { id:"Built_up_Area_sq_ft",       label:"Total Built-Up Area (Sq M)",       type:"number", zohoKey:"Built_up_Area_sq_ft",       required:false, placeholder:"0", min:0, colSpan:1 },
      { id:"Carpet_Area",               label:"Carpet Area (Sq M)",               type:"number", zohoKey:"Carpet_Area",               required:false, placeholder:"0", min:0, colSpan:1 },
      { id:"Parking_Area",              label:"Parking Area (Sq M)",              type:"number", zohoKey:"Parking_Area",              required:false, placeholder:"0", min:0, colSpan:1 },
      { id:"No_of_Buildings",           label:"No. of Buildings",                 type:"number", zohoKey:"No_of_Buildings",           required:false, placeholder:"0", min:0, colSpan:1 },
      { id:"No_of_Floors",              label:"Total No. Of Floors",              type:"number", zohoKey:"No_of_Floors",              required:false, placeholder:"0", min:0, colSpan:1 },
      { id:"No_of_Units",               label:"Total No. Of Units",               type:"number", zohoKey:"No_of_Units",               required:false, placeholder:"0", min:0, colSpan:1 }
    ],
  },

  /* ── SECTION C: Certification Status ───────────────────────── */
  {
    id:"secG_cert", badge:"C",
    title:"Certification Status",
    fields:[
      {
        id:"Is_Project_Certified", label:"Is Project Certified?", type:"radio", zohoKey:"Is_Project_Certified", required:false, colSpan:1,
        options:[
          { value:"Yes",       label:"Yes" },
          { value:"No",        label:"No" },
          { value:"In Progess",label:"In Progress" }
        ]
      },
      {
        id:"Present_Certification", label:"Present Certification(s)", type:"checkbox", zohoKey:"Present_Certification", required:false, colSpan:1, inline:true,
        options:[
          { value:"IGBC", label:"IGBC", enabled:true },
          { value:"EDGE", label:"EDGE", enabled:true },
          { value:"USGBC", label:"USGBC", enabled:true },
          { value:"CBI",  label:"CBI",  enabled:true },
          { value:"GNFZ", label:"GNFZ", enabled:true }
        ]
      },
      { id:"Existing_Certifications", label:"Upload Present Certification(s)", type:"file-upload", zohoKey:"Upload_Present_Certification_s", required:false, colSpan:1, multiple:true, filelist:true }
    ]
  },

  /* ── SECTION D: Upload Remaining Documents ──────────────────── */
  {
    id:"secG_docs", badge:"D",
    title:"Upload Remaining Documents",
    fields:[
      { id:"doc_thumb",     label:"Project Cover Image",                         type:"file-upload", zohoKey:"Project_Cover_Image",  required:false, colSpan:1, accept:"image/*" },
      { id:"doc_photos",    label:"Project Gallery",                             type:"file-upload", zohoKey:"Project_Gallery",       required:false, colSpan:1, accept:"image/*", multiple:true, preview:true },

      /* ── Promoter KYC / KYB ──────────────────────────────────── */
      { id:"kyc_prom_lbl",  label:"Promoter KYC / KYB",          type:"section-label", colSpan:2 },
      { id:"kyc_prom_ic",   label:"Incorporation Certificate",    type:"file-upload", zohoKey:"Incorporation_Certificate",   required:false, colSpan:1 },
      { id:"kyc_prom_moa",  label:"MOA",                          type:"file-upload", zohoKey:"MOA",                         required:false, colSpan:1 },
      { id:"kyc_prom_aoa",  label:"AOA",                          type:"file-upload", zohoKey:"AOA",                         required:false, colSpan:1 },
      { id:"kyc_prom_gst",  label:"GST Registration",             type:"file-upload", zohoKey:"GST_Registration",            required:false, colSpan:1 },

      /* ── Project (SPV) KYC / KYB ─────────────────────────────── */
      { id:"kyc_spv_lbl",   label:"Project (SPV) KYC / KYB",     type:"section-label", colSpan:2 },
      { id:"kyc_spv_ic",    label:"Incorporation Certificate",    type:"file-upload", zohoKey:"Incorporation_Certificate_spv", required:false, colSpan:1 },
      { id:"kyc_spv_moa",   label:"MOA",                          type:"file-upload", zohoKey:"MOA_spv",                       required:false, colSpan:1 },
      { id:"kyc_spv_aoa",   label:"AOA",                          type:"file-upload", zohoKey:"AOA_spv",                       required:false, colSpan:1 },
      { id:"kyc_spv_gst",   label:"GST Registration",             type:"file-upload", zohoKey:"GST_Registration_spv",          required:false, colSpan:1 },

      { id:"doc_dpr",       label:"Detailed Project (Feasibility Study) Report", type:"file-upload", zohoKey:"Detail_Project_Feasibility_Study_Report_Upload", required:false, colSpan:1 },
      { id:"doc_legal",     label:"Legal Opinion",                               type:"file-upload", zohoKey:"Legal_Opinion",                                   required:false, colSpan:1 },
      { id:"doc_land",      label:"Land Agreement",                              type:"file-upload", zohoKey:"Land_Agreement",                                  required:false, colSpan:1 },
      { id:"doc_reg",       label:"Regulatory Approval",                         type:"file-upload", zohoKey:"Regulatory_Approval",                             required:false, colSpan:1 },
      { id:"doc_marketing", label:"Marketing Agreement",                         type:"file-upload", zohoKey:"Marketing_Agreement",                             required:false, colSpan:1 },
      /* ── Custom "other" document ─── name it + upload it (same row) */
      { id:"custom_doc_name", label:"Other Document — Name It", type:"text",        zohoKey:"Other_Document_Name_It", required:false, placeholder:"e.g. Environmental Impact Report", maxlength:255, colSpan:1, noLabel:false },
      { id:"doc_custom",      label:"Other Document — Upload",  type:"file-upload", zohoKey:"Other_Document",        required:false, colSpan:1 }
    ],
  }
];

/* ═══ STEP 3 — REQUIREMENTS & SIGN-OFF ══════════════════════ */
const STEP3_SECTIONS = [
  /* ── SECTION A: Services Required From CCM ─────────────────── */
  {
    id:"secA_srv", badge:"A",
    title:"Services Required From CCM",
    fields:[
      {
        id:"Services_Needed_from_CCM", label:"Select Services", type:"checkbox", zohoKey:"Services_Needed_from_CCM", required:false, colSpan:2,
        options:[
          { value:"Certification Assistance", label:"Certification Assistance", enabled:true  },
          { value:"Capital Raise",            label:"Capital Raise",            enabled:true  },
          { value:"Grant/Subsidy Aid",        label:"Grant / Subsidy Aid",      enabled:false, soon:true },
          { value:"Project Consultancy",      label:"Project Consultancy",      enabled:false, soon:true },
          { value:"NetZero Plan",             label:"NetZero Planning",         enabled:false, soon:true },
          { value:"Carbon Credits Claim",     label:"Carbon Credits Support",   enabled:false, soon:true }
        ]
      }
    ]
  },

  /* ── SECTION B: Certification Requirement ──────────────────── */
  {
    id:"secH", badge:"B",
    title:"Certification Requirement",
    fields:[
      {
        id:"cert_req", label:"Certification Required?", type:"radio", zohoKey:"Certification_Required", required:true, colSpan:1, rowGroup:"cert-row",
        options:[
          { value:"Yes",      label:"Yes" },
          { value:"No",       label:"No" },
          { value:"Later",label:"Later" }
        ]
      },
      {
        id:"cert_pref", label:"Preferred Certification", type:"checkbox", zohoKey:"Preferred_Certification", required:false, colSpan:1, inline:true, rowGroup:"cert-row",
        options:[
          { value:"IGBC", label:"IGBC", enabled:true },
          { value:"EDGE", label:"EDGE", enabled:true },
          { value:"USGBC", label:"USGBC", enabled:true },
          { value:"CBI",  label:"CBI",  enabled:true },
          { value:"GNFZ", label:"GNFZ", enabled:true }
        ]
      },
      {
        id:"cert_grade", label:"Target Certification Grade", type:"radio", zohoKey:"Target_Grade", required:false, colSpan:2,
        options:[
          { value:"Certified/Basic",   label:"Certified / Basic" },
          { value:"Silver/Level 1",    label:"Silver / Level 1" },
          { value:"Gold/Level 2",      label:"Gold / Level 2" },
          { value:"Platinum/Level 3",  label:"Platinum / Level 3" },
          { value:"Net Zero/Highest",  label:"Net Zero / Highest" }
        ]
      }
    ]
  },

  /* ── SECTION C: Capital Requirement ────────────────────────── */
  {
    id:"secI", badge:"C",
    title:"Capital Requirement",
    freezable:true,
    fields:[
      { id:"cap_budget",          label:"Total Project Budget",   type:"number", zohoKey:"Total_Project_Budget",     required:false, placeholder:"0", min:0, colSpan:1, currencySuffix:true },
      { id:"cap_total",           label:"Total Capital Required", type:"number", zohoKey:"Total_Project_Cost_USD",   required:true,  placeholder:"0", min:0, colSpan:1, currencySuffix:true },
      { id:"cap_promoter_equity", label:"Promoter Equity",        type:"number", zohoKey:"Promoter_Equity",          required:false, placeholder:"0", min:0, colSpan:1, currencySuffix:true },
      { id:"cap_grant",           label:"Grant / Subsidy Sought", type:"number", zohoKey:"Grant_Subsidy_Sought_USD", required:false, placeholder:"0", min:0, colSpan:1, currencySuffix:true },
      { id:"cap_equity",          label:"Equity Required",        type:"number", zohoKey:"Equity_Required_USD",      required:true,  placeholder:"0", min:0, colSpan:1, currencySuffix:true },
      { id:"cap_debt",            label:"Debt Required",          type:"number", zohoKey:"Debt_Required_USD",        required:true,  placeholder:"0", min:0, colSpan:1, currencySuffix:true },
      {
        id:"Funding_Currency_Type", label:"Currency (Preferences)", type:"checkbox", zohoKey:"Funding_Currency_Type", required:false, colSpan:2, inline:true, noCallback:true,
        options:[
          { value:"INR", label:"INR — Indian Rupee",          enabled:true },
          { value:"USD", label:"USD — US Dollar",             enabled:true },
          { value:"EUR", label:"EUR — Euro",                  enabled:true },
          { value:"GBP", label:"GBP — British Pound",         enabled:true },
          { value:"AED", label:"AED — UAE Dirham",            enabled:true },
          { value:"SGD", label:"SGD — Singapore Dollar",      enabled:true },
          { value:"JPY", label:"JPY — Japanese Yen",          enabled:true },
          { value:"CNY", label:"CNY — Chinese Yuan",          enabled:true },
          { value:"AUD", label:"AUD — Australian Dollar",     enabled:true },
          { value:"CAD", label:"CAD — Canadian Dollar",       enabled:true },
          { value:"CHF", label:"CHF — Swiss Franc",           enabled:true },
          { value:"HKD", label:"HKD — Hong Kong Dollar",      enabled:true },
          { value:"RUB", label:"RUB — Russian Rouble",        enabled:true },
          { value:"SEK", label:"SEK — Swedish Krona",         enabled:true },
          { value:"NOK", label:"NOK — Norwegian Krone",       enabled:true },
          { value:"NZD", label:"NZD — New Zealand Dollar",    enabled:true },
          { value:"DKK", label:"DKK — Danish Krone",          enabled:true }
        ]
      },
      {
        id:"exp_timeline", label:"Expected Timeline", type:"radio", zohoKey:"Expected_Timeline", required:false, colSpan:2,
        options:[
          { value:"Immediate (Less Than 3 Months)", label:"Immediate (Less Than 3 Months)" },
          { value:"Short (3-6 Months)",             label:"Short (3-6 Months)" },
          { value:"Medium (6-12 Months)",           label:"Medium (6-12 Months)" },
          { value:"Long (More Than 12 Months)",     label:"Long (More Than 12 Months)" }
        ]
      },
      {
        id:"open_for", label:"Open For", type:"multiselect", zohoKey:"Open_For_Type", required:false, colSpan:2,
        options:[
          { value:"Capital Syndication", label:"Capital Syndication" },
          { value:"Corporate Finance",   label:"Corporate Finance" },
          { value:"Refinance",           label:"Refinance" },
          { value:"Blended Finance",     label:"Blended Finance" },
          { value:"M and A",             label:"M and A" }
        ]
      },
      {
        id:"investors_lenders", label:"List of Investors/Lenders and Grantors/Subsidizers Approached",
        type:"textarea", zohoKey:"Investors_Lenders_Approached", required:false, colSpan:2,
        placeholder:"List the investors, lenders, grantors or subsidizers you have already approached…"
      },
      {
        id:"ccm_approach", label:"", type:"radio", zohoKey:"CCM_Approach_Preference", required:false, colSpan:2,
        options:[
          { value:"CCM can approach this list too",          label:"CCM can approach this list too" },
          { value:"CCM shall leave this list till notified", label:"CCM shall leave this list till notified" }
        ]
      }
    ],
    warningBox:"All fields in sections B-C freeze once Expert approves project listing"
  },

  /* ── SECTION D: Authorized Person For Correspondence ────────── */
  {
    id:"secJ", badge:"D", hidden:true,
    title:"Authorized Person For Correspondence",
    fields:[
      { id:"auth_same", label:"Same As Individual Information", type:"toggle-checkbox", zohoKey:null, required:false, colSpan:2,
        toggleHide:"auth_fname,auth_lname,auth_mobile,auth_linkedin" },
      /* zohoKey subfields of Name (type 29) → sent as Name.first_name / Name.last_name */
      { id:"auth_fname",    label:"First Name",       type:"text", zohoKey:"first_name",      required:false, placeholder:"First name",                         maxlength:100, colSpan:1 },
      { id:"auth_lname",    label:"Last Name",        type:"text", zohoKey:"last_name",       required:false, placeholder:"Last name",                          maxlength:100, colSpan:1 },
      /* Mobile_Number (type 27) */
      { id:"auth_mobile",   label:"Mobile Number",    type:"tel",  zohoKey:"Mobile_Number",   required:false, placeholder:"XXXXX XXXXX", maxlength:10, prefix:"+91", validation:"mobile10", colSpan:1 },
      { id:"auth_linkedin", label:"LinkedIn Profile", type:"url",  zohoKey:"LinkedIn_Profile",required:false, placeholder:"https://linkedin.com/in/yourprofile", maxlength:255, colSpan:1 }
    ]
  },

  /* ── SECTION D: Declaration and Sign-Off ─────────────────────── */
  {
    id:"secK", badge:"D",
    title:"Declaration and Sign-Off",
    fields:[
      {
        id:"decl_agree", label:"I confirm that the information provided above is accurate to the best of my knowledge. As a signing authority on behalf of our company, I authorise 'Climate Capital Market' to use this information for providing us the opted service(s).",
        type:"toggle-checkbox", zohoKey:"I_confirm_that_the_information_provided_above_is_accurate_to_the_best_of_my_knowledge", required:true, colSpan:2
      }
    ]
  }
];

/* ─── MAP STEP NUMBER → SECTIONS ────────────────────────────── */
const ALL_STEPS = {
  1: STEP1_SECTIONS,
  2: STEP2_SECTIONS,
  3: STEP3_SECTIONS
};
