import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styled from "styled-components";
import { Camera, UploadCloud, ChevronRight, ChevronLeft } from "lucide-react";
import { FaCheckCircle, FaLink, FaEye, FaEyeSlash, FaSchool } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api, { buildApiUrl } from "../../services/api";

const REGISTER_URL = buildApiUrl("/student/register-request");
const NEXT_ROLL_NUMBER_URL = buildApiUrl("/manage/next-roll-number");
const CLASS_SECTION_URL = "/manage/classes-sections";

const getSchoolCode = () => localStorage.getItem("school_code") || localStorage.getItem("schoolCode") || "";
const getBranchId = () => localStorage.getItem("branch_id") || localStorage.getItem("branchId") || "";
const getAuthToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

function safeTrim(v) { return String(v ?? "").trim(); }
function isValidAadhaar(v) { const s = String(v || "").trim(); if (!s) return true; return /^\d{12}$/.test(s); }
function isValidMobile(v) { return /^\d{10}$/.test(String(v || "").trim()); }
function isValidPin(v) { return /^\d{6}$/.test(String(v || "").trim()); }
function isValidName(v){ const s=String(v||"").trim(); if(!s) return false; return /^[a-zA-Z\s]+$/.test(s); }
function isValidAlpha(v){ const s=String(v||"").trim(); if(!s) return false; return /^[a-zA-Z]+$/.test(s); }
function todayISO(){ return new Date().toISOString().split("T")[0]; }
function getMaxDOBDate(){ const today=new Date(); const max=new Date(today.getFullYear()-3,today.getMonth(),today.getDate()); return max.toISOString().split("T")[0]; }
function calcAgeFromDOB(dob){ if(!dob) return ""; const b=new Date(dob); if(isNaN(b.getTime())) return ""; const t=new Date(); let age=t.getFullYear()-b.getFullYear(); const m=t.getMonth()-b.getMonth(); if(m<0||(m===0&&t.getDate()<b.getDate())) age--; return age>=0&&age<120?String(age):""; }

const Colors = { primary: "#2563eb", primarySoft: "#dbeafe", cardBg: "#fff", bg: "#f0f2f7", textPrimary: "#0d1b2a", textTertiary: "#4a5568", border: "#e4e9f2", borderLight: "#f7f9fc", success: "#059669", danger: "#dc2626", gradientSuccess: "#059669", shadow: { sm: "0 1px 3px rgba(0,0,0,0.05)" } };

const STEPS = ["Basic Info","Academics","Parent & Address","Health & Transport","Photo","Preview"];

const INITIAL_FORM = {
  branch_id: "",
  first_name: "",
  last_name: "",
  student_full_name: "",
  gender: "",
  date_of_birth: "",
  age: "",
  mother_tongue: "",
  religion: "",
  aadhaar_number: "",
  class_grade: "",
  section: "",
  admission_number: "",
  roll_number: "",
  academic_year: "",
  date_of_admission: todayISO(),
  father_guardian_name: "",
  father_guardian_mobile: "",
  mother_guardian_name: "",
  mother_guardian_mobile: "",
  parent_guardian_email: "",
  house_no: "",
  street_locality: "",
  village_town_city: "",
  mandal_taluk: "",
  district: "",
  state: "",
  pin_code: "",
  allergies_details: "",
  medical_conditions: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  mode_of_transport: "",
  bus_route_vehicle_number: "",
  hostel_day_scholar: "",
  password: "",
  confirm_password: "",
};

/* minimal styled pieces used here (kept short) */
const Content = styled.div`padding:1.5rem 2rem; background:${Colors.bg}; min-height:100%; color:${Colors.textPrimary};`;
const FormCard = styled.div`background:${Colors.cardBg}; border-radius:12px; border:1px solid ${Colors.borderLight}; box-shadow:${Colors.shadow.sm};`;
const FormBody = styled.div`padding:1.5rem;`;
const FormFooter = styled.div`padding:1rem 1.5rem; border-top:1px solid ${Colors.border}; background:${Colors.borderLight}; display:flex; justify-content:space-between;`;
const FormInput = React.forwardRef((props,ref)=> <input ref={ref} {...props} />);

function getStepErrors(step, form){
  const errors = {};
  if(step===0){ if(!safeTrim(form.first_name)) errors.first_name="First name is required"; else if(!isValidName(form.first_name)) errors.first_name="Only letters and spaces allowed"; if(!safeTrim(form.last_name)) errors.last_name="Last name is required"; else if(!isValidName(form.last_name)) errors.last_name="Only letters and spaces allowed"; if(!form.gender) errors.gender="Gender is required"; if(!form.date_of_birth) errors.date_of_birth="Date of birth is required"; else { const d=new Date(form.date_of_birth); if(isNaN(d.getTime())) errors.date_of_birth="Invalid date"; else if(d>new Date(getMaxDOBDate())) errors.date_of_birth="Must be at least 3 years old"; } if(!safeTrim(form.mother_tongue)) errors.mother_tongue="Required"; else if(!isValidAlpha(form.mother_tongue)) errors.mother_tongue="Only letters allowed"; if(!safeTrim(form.religion)) errors.religion="Required"; else if(!isValidAlpha(form.religion)) errors.religion="Only letters allowed"; if(!safeTrim(form.aadhaar_number)) errors.aadhaar_number="Required"; else if(!isValidAadhaar(form.aadhaar_number)) errors.aadhaar_number="12 digits required"; }
  if(step===1){ if(!safeTrim(form.class_grade)) errors.class_grade="Class is required"; if(!safeTrim(form.section)) errors.section="Section is required"; if(!safeTrim(form.admission_number)) errors.admission_number="Admission number is required"; if(!safeTrim(form.academic_year)) errors.academic_year="Academic year is required"; else if(!(/^\d{4}-\d{2}$/.test(form.academic_year))) errors.academic_year="Format: YYYY-YY"; }
  if(step===2){ if(!safeTrim(form.father_guardian_name)) errors.father_guardian_name="Required"; else if(!isValidName(form.father_guardian_name)) errors.father_guardian_name="Only letters and spaces allowed"; if(!isValidMobile(form.father_guardian_mobile)) errors.father_guardian_mobile="10-digit number required"; if(!safeTrim(form.mother_guardian_name)) errors.mother_guardian_name="Required"; else if(!isValidName(form.mother_guardian_name)) errors.mother_guardian_name="Only letters and spaces allowed"; if(!isValidMobile(form.mother_guardian_mobile)) errors.mother_guardian_mobile="10-digit number required"; if(!safeTrim(form.parent_guardian_email)) errors.parent_guardian_email="Required"; }
  if(step===3){ if(!safeTrim(form.emergency_contact_name)) errors.emergency_contact_name="Required"; else if(!isValidName(form.emergency_contact_name)) errors.emergency_contact_name="Only letters and spaces allowed"; if(!isValidMobile(form.emergency_contact_number)) errors.emergency_contact_number="10-digit number required"; if(!safeTrim(form.mode_of_transport)) errors.mode_of_transport="Required"; if(!safeTrim(form.password)) errors.password="Password required"; else if(form.password.length<8) errors.password="Weak password"; if(!safeTrim(form.confirm_password)) errors.confirm_password="Retype password"; else if(form.password!==form.confirm_password) errors.confirm_password="Passwords do not match"; if(!isValidPin(form.pin_code)) errors.pin_code="6-digit PIN required"; }
  return errors;
}

export default function StudentRegisterInternal(){
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loggedSchoolCode,setLoggedSchoolCode]=useState("");
  const [defaultBranchId,setDefaultBranchId]=useState("");
  const [classOptions,setClassOptions]=useState([]);
  const [sectionOptions,setSectionOptions]=useState([]);
  const [step,setStep]=useState(0);
  const [photoFile,setPhotoFile]=useState(null);
  const [photoPreview,setPhotoPreview]=useState(null);
  const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({...INITIAL_FORM});
  const [fieldErrors,setFieldErrors]=useState({});
  const [serverError,setServerError]=useState("");
  const [serverSuccess,setServerSuccess]=useState("");
  const [requestCount,setRequestCount]=useState(0);

  useEffect(()=>{
    const sc=safeTrim(getSchoolCode()); const br=safeTrim(getBranchId());
    if(!sc||!br){ setServerError("Session expired. Please login again."); return; }
    setLoggedSchoolCode(sc); setDefaultBranchId(br); setForm(p=>({...p, branch_id: br}));
  },[]);

  useEffect(()=>{ if(!form.branch_id || !loggedSchoolCode) return; const loadClasses=async()=>{ try{ const res=await api.get(CLASS_SECTION_URL,{ params:{ branch_id: form.branch_id, school_code: loggedSchoolCode }, headers:{ 'X-School-Code': loggedSchoolCode, 'X-Branch-Id': form.branch_id } }); const items=Array.isArray(res.data?.items)?res.data.items:[]; setClassOptions(items); if(items.length>0 && safeTrim(form.class_grade)){ const cur=items.find(c=>safeTrim(String(c.class_name)).toUpperCase()===safeTrim(form.class_grade).toUpperCase()); setSectionOptions(Array.isArray(cur?.sections)?cur.sections:[]); } else setSectionOptions([]); }catch(err){ console.error(err); setClassOptions([]); setSectionOptions([]); setServerError("Unable to load class/section options."); } }; loadClasses(); },[form.branch_id, loggedSchoolCode]);

  // Auto-generate next roll number when class & section selected
  useEffect(()=>{
    const cls = safeTrim(form.class_grade);
    const sec = safeTrim(form.section);
    const sc = safeTrim(loggedSchoolCode || getSchoolCode());
    const br = safeTrim(form.branch_id || defaultBranchId || getBranchId());
    if(!cls || !sec || !sc || !br) return;
    let cancelled = false;
    (async ()=>{
      try{
        const res = await api.get(NEXT_ROLL_NUMBER_URL, { params: { school_code: sc, branch_id: br, class_grade: cls, section: sec }, headers: { 'X-School-Code': sc, 'X-Branch-Id': br } });
        const next = res.data?.next_roll || res.data?.roll_number || "";
        if(!cancelled && next) setForm(p=>({...p, roll_number: String(next)}));
      }catch(err){ console.warn('next roll fetch failed', err); }
    })();
    return ()=>{ cancelled = true; };
  },[form.class_grade, form.section, loggedSchoolCode, form.branch_id, defaultBranchId]);

  const handleChange = e => {
    const { name, value } = e.target;
    setServerError(""); setServerSuccess("");
    if(fieldErrors[name]) setFieldErrors(p=>{ const n={...p}; delete n[name]; return n; });
    setForm(p=>{ const updated={...p, [name]: value}; if(name==='first_name' || name==='last_name'){ const first = name==='first_name'?value:p.first_name; const last = name==='last_name'?value:p.last_name; updated.student_full_name = `${first} ${last}`.trim(); } return updated; });
  };

  const handleClassChange = e => { const val = safeTrim(e.target.value); const cur = classOptions.find(c=>safeTrim(String(c.class_name)).toUpperCase()===val.toUpperCase()); setSectionOptions(cur && Array.isArray(cur.sections)?cur.sections:[]); setForm(p=>({...p, class_grade: cur?safeTrim(String(cur.class_name)).toUpperCase():val.toUpperCase(), section: '', roll_number: ''})); };
  const handleSectionChange = e => { const sec = safeTrim(e.target.value).toUpperCase(); setForm(p=>({...p, section: sec, roll_number: ''})); };

  const fileToBase64 = file => new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>{ const r=String(reader.result||""); resolve(r.includes(',')?r.split(',')[1]:r); }; reader.onerror=reject; reader.readAsDataURL(file); });

  const validateStep = () => { const errs = getStepErrors(step, form); if(step===4 && !photoFile) errs.photo = 'Photo required'; setFieldErrors(errs); return Object.keys(errs).length===0; };

  const nextStep = ()=>{ if(!validateStep()) return; setFieldErrors({}); setStep(s=>Math.min(s+1, STEPS.length-1)); };
  const prevStep = ()=>{ setFieldErrors({}); setStep(s=>Math.max(s-1,0)); };

  function findFirstErrorStepFromFields(keys){
    const mapping = {
      0: ['first_name','last_name','gender','date_of_birth','mother_tongue','religion','aadhaar_number'],
      1: ['class_grade','section','admission_number','academic_year','date_of_admission'],
      2: ['father_guardian_name','father_guardian_mobile','mother_guardian_name','mother_guardian_mobile','parent_guardian_email','house_no','street_locality','village_town_city','mandal_taluk','district','state','pin_code'],
      3: ['emergency_contact_name','emergency_contact_number','mode_of_transport','password','confirm_password','pin_code'],
      4: ['photo']
    };
    for(let i=0;i<=4;i++){ for(const k of keys){ if(mapping[i].includes(k)) return i; } }
    return 0;
  }

  const submit = async ()=>{
    const sc = safeTrim(getSchoolCode()); const br = safeTrim(getBranchId());
    if(!sc || !br) return setServerError('Session expired. Please login again.');

    // validate all steps 0-4
    let firstErrorStep = -1; let firstErrors = {};
    for(let i=0;i<=4;i++){ const errs = getStepErrors(i, form); if(i===4 && !photoFile) errs.photo='Photo required'; if(Object.keys(errs).length>0){ firstErrorStep=i; firstErrors=errs; break; } }
    if(firstErrorStep!==-1){ setFieldErrors(firstErrors); setStep(firstErrorStep); setServerError('Please fill required fields.'); return; }

    setLoading(true); setServerError(''); setServerSuccess('');
    try{
      const studentPhotoBase64 = await fileToBase64(photoFile);
      const fd = new FormData();
      fd.append('school_code', sc);
      fd.append('branch_id', br);
      fd.append('student_photograph', studentPhotoBase64);
      const skip = new Set(['branch_id','confirm_password','first_name','last_name']);
      Object.entries(form).forEach(([k,v])=>{ if(skip.has(k)) return; if(k==='date_of_admission' && !safeTrim(v)) return; fd.append(k, v ?? ''); });

      const res = await fetch(REGISTER_URL, { method: 'POST', body: fd, headers: { 'X-School-Code': sc, 'X-Branch-Id': br, ...(getAuthToken()?{ Authorization: `Bearer ${getAuthToken()}` }:{}) } });
      const data = await res.json().catch(()=>({}));
      if(!res.ok){
        // map field errors if present
        if(data && data.detail){
          if(typeof data.detail === 'object' && !Array.isArray(data.detail)){
            setFieldErrors(prev=>({...prev,...data.detail}));
            const stepIdx = findFirstErrorStepFromFields(Object.keys(data.detail));
            setStep(stepIdx);
            throw new Error(Object.keys(data.detail).map(k=>`${k}: ${data.detail[k]}`).join('\n'));
          } else if(Array.isArray(data.detail)){
            // array of errors -- try to map
            data.detail.forEach(e=>{ const field=(e.loc||[]).slice(1).join('.')||e.loc; if(field) setFieldErrors(prev=>({...prev,[field]: e.msg})); });
            const stepIdx = findFirstErrorStepFromFields(Object.values(data.detail).flatMap(d=>d.loc?[(d.loc||[]).slice(1).join('.')]:[]));
            setStep(stepIdx>=0?stepIdx:0);
            throw new Error(data.detail.map(e=>e.msg).join('\n'));
          } else {
            throw new Error(String(data.detail));
          }
        }
        throw new Error('Registration failed.');
      }

      setServerSuccess('Registration request submitted. Waiting for approval');
      setTimeout(()=>{ setStep(0); setPhotoFile(null); setPhotoPreview(null); setForm({...INITIAL_FORM, branch_id: br}); }, 1800);
    }catch(err){ setServerError(`Submission Error: ${err.message}`); }
    finally{ setLoading(false); }
  };

  const handleFileUpload = e => { const file = e.target.files?.[0]; if(!file) return; setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); };

  return (
    <Content>
      <h2>Student Registration (Internal)</h2>
      {serverError && <div style={{background:'#fee2e2',padding:12,borderRadius:8,color:Colors.danger,marginBottom:12}}>{serverError}</div>}
      {serverSuccess && <div style={{background:'#d1fae5',padding:12,borderRadius:8,color:Colors.success,marginBottom:12}}>{serverSuccess}</div>}
      <FormCard>
        <FormBody>
          {/* keep things concise: implement only core fields in this demo file for clarity */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            <div>
              <label>First Name *</label>
              <FormInput name="first_name" placeholder="First" value={form.first_name} onChange={(e)=>{ const filtered = e.target.value.replace(/[^a-zA-Z\s]/g,''); handleChange({target:{name:'first_name',value:filtered}}); }} />
              {fieldErrors.first_name && <div style={{color:Colors.danger}}>{fieldErrors.first_name}</div>}
            </div>
            <div>
              <label>Last Name *</label>
              <FormInput name="last_name" placeholder="Last" value={form.last_name} onChange={(e)=>{ const filtered = e.target.value.replace(/[^a-zA-Z\s]/g,''); handleChange({target:{name:'last_name',value:filtered}}); }} />
              {fieldErrors.last_name && <div style={{color:Colors.danger}}>{fieldErrors.last_name}</div>}
            </div>
            <div>
              <label>Class *</label>
              <select name="class_grade" value={form.class_grade} onChange={handleClassChange}>
                <option value="">Select Class</option>
                {classOptions.map(c=> <option key={c.class_name} value={String(c.class_name).toUpperCase()}>Class {String(c.class_name).toUpperCase()}</option>)}
              </select>
              {fieldErrors.class_grade && <div style={{color:Colors.danger}}>{fieldErrors.class_grade}</div>}
            </div>
            <div>
              <label>Section *</label>
              <select name="section" value={form.section} onChange={handleSectionChange}>
                <option value="">Select Section</option>
                {sectionOptions.map((s,i)=> <option key={`${s}-${i}`} value={String(s).toUpperCase()}>Section {String(s).toUpperCase()}</option>)}
              </select>
              {fieldErrors.section && <div style={{color:Colors.danger}}>{fieldErrors.section}</div>}
            </div>
            <div>
              <label>Roll Number</label>
              <FormInput name="roll_number" placeholder="Auto-generated" value={form.roll_number} onChange={handleChange} />
            </div>
            <div>
              <label>Photo *</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button type="button" onClick={()=>fileInputRef.current?.click()}>Upload</button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}} />
                {photoPreview && <img src={photoPreview} style={{width:72,height:72,borderRadius:8}} alt="preview"/>}
              </div>
              {fieldErrors.photo && <div style={{color:Colors.danger}}>{fieldErrors.photo}</div>}
            </div>
          </div>
        </FormBody>
        <FormFooter>
          <div />
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>prevStep()} disabled={loading}>Back</button>
            <button onClick={()=>nextStep()} disabled={loading}>Next</button>
            <button onClick={()=>submit()} disabled={loading}>{loading? 'Registering...' : 'Confirm & Register'}</button>
          </div>
        </FormFooter>
      </FormCard>
    </Content>
  );
}
