// ==UserScript==
// @name         FMCSA Automation
// @description  Automate MC/MX number checks on FMCSA SAFER site with start range prompt and download it in csv file automatically
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.umd.min.js
// @match        https://safer.fmcsa.dot.gov/CompanySnapshot.aspx
// @match        https://safer.fmcsa.dot.gov/query.asp
// @namespace    Accuracare
// @version      2.0.1.1
// @author       Bilal Ahmad
// @updateURL    https://raw.githubusercontent.com/Profysr/fmcsa_client/main/build/fmcsa-Automation.user.js
// @downloadURL  https://raw.githubusercontent.com/Profysr/fmcsa_client/main/build/fmcsa-Automation.user.js
// ==/UserScript==

(()=>{"use strict";// ./src/utils/constants.js
const requiredValues={"Entity Type":null,"USDOT Status":null,"USDOT Number":null,"MCS-150 Form Date":null,"Operating Authority Status":null,"MC/MX/FF Number(s)":null,"Legal Name":null,"Physical Address":null,Phone:null,"Mailing Address":null};const sessionKeys={token:"__fmcsa_verification_token",fingerprint:"__fmcsa_user_fingerprint",tokenExpiry:"__fmca_verification_token_expiry"};// ./src/api/customApi.js
const API_URL="https://2457-2402-e000-4ad-7573-81a5-7ffd-f3cd-bd76.ngrok-free.app"||0;async function apiFetch(url,options={}){const ott=sessionStorage.getItem(sessionKeys.token);const fingerprint=sessionStorage.getItem(sessionKeys.fingerprint);const expiry=parseInt(sessionStorage.getItem(sessionKeys.tokenExpiry),10);
// Optional: clear expired token
if(expiry&&Date.now()>expiry){Object.keys(sessionKeys).forEach((key=>sessionStorage.removeItem(key)));throw new Error("🔒 Token has expired. Please re-authenticate.")}const headers={"Content-Type":"application/json","ngrok-skip-browser-warning":"true",...options.headers||{},...ott&&{Authorization:`Bearer ${ott}`},...fingerprint&&{"X-Client-ID":fingerprint}};const response=await fetch(`${API_URL}${url}`,{...options,headers});if(!response.ok){const errText=await response.text();throw new Error(`❌ API Error: ${response.status} ${errText}`)}return response.json()}// ./src/helper/scapper.js
function goToSnapshot(){location.href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"}function submitQuery(number){const form=document.forms.QueryBox;if(!form)return;const input=form.querySelector('[name="query_string"]');const mcRadio=form.querySelector('[name="query_param"][value="MC_MX"]');const submit=form.querySelector('[value="Search"][type="SUBMIT"]');if(input&&mcRadio&&submit){mcRadio.checked=true;input.value=number;console.log(`🔁 Submitting MX number: ${number}`);submit.click()}}function getFieldValue(el,labelText){const labelElem=[...el.querySelectorAll("th")].find((th=>th.textContent.trim().toUpperCase().includes(labelText.toUpperCase().trim())));return labelElem?.nextElementSibling?.textContent.trim().toUpperCase()||null}// ./src/helper/storage.js
const STORAGE={currentKey:"fmcsa_current_mx_number",rangeKey:"fmcsa_range",runFlag:"fmcsa_should_run",rangeSetFlag:"fmcsa_range_set"};const getRange=()=>JSON.parse(localStorage.getItem(STORAGE.rangeKey)||"{}");const getCurrent=()=>parseInt(localStorage.getItem(STORAGE.currentKey));
// export const getfmcsaRecords = () =>
//   JSON.parse(localStorage.getItem("fmcsa_records") || "[]");
// export const removefmcsaRecords = () =>
//   localStorage.removeItem("fmcsa_records");
const saveCurrent=num=>localStorage.setItem(STORAGE.currentKey,num);const clearAllStorage=()=>Object.values(STORAGE).forEach((key=>localStorage.removeItem(key)));localStorage.getItem(STORAGE.runFlag);localStorage.getItem(STORAGE.rangeSetFlag);// ./src/utils/fingerprint.js
function loadFingerprintJS(){return new Promise(((resolve,reject)=>{if(window.FingerprintJS)return resolve(window.FingerprintJS);const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.umd.min.js";// UMD build
script.onload=()=>resolve(window.FingerprintJS);script.onerror=()=>reject("Failed to load FingerprintJS");document.head.appendChild(script)}))}async function getFingerprint(){const FingerprintJS=await loadFingerprintJS();const fp=await FingerprintJS.load();const result=await fp.get();return result.visitorId}// ./src/helper/ui.js
// import { getFingerprint } from "../utils/fingerprint.js";
function addFloatingToolbar(){const toolbar=document.createElement("div");toolbar.style=`
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 10000;
    `;const createButton=(text,color,onClick)=>{const btn=document.createElement("button");btn.textContent=text;btn.style=`
            background: ${color};
            color: white;
            padding: 10px 16px;
            border: none;
            border-radius: 6px 0 0 6px;
            cursor: pointer;
            font-size: 14px;
            font-family: 'Segoe UI', sans-serif;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            transition: transform 0.2s ease;
        `;btn.addEventListener("mouseenter",(()=>{btn.style.transform="translateX(-5px)"}));btn.addEventListener("mouseleave",(()=>{btn.style.transform="translateX(0)"}));btn.onclick=onClick;return btn};const startBtn=createButton("🚛 Start Automation","#28a745",(()=>{localStorage.setItem(STORAGE.runFlag,"true");localStorage.removeItem(STORAGE.rangeSetFlag);goToSnapshot()}));const stopBtn=createButton("🛑 Stop Automation","#dc3545",(()=>{Object.values(STORAGE).forEach((key=>localStorage.removeItem(key)));alert("🛑 FMCSA Automation stopped.")}));toolbar.appendChild(startBtn);toolbar.appendChild(stopBtn);document.body.appendChild(toolbar)}
// display when there is valid Token and shouldRun in true
function showRangeForm(){const overlay=document.createElement("div");overlay.style=`
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.5); z-index: 9998;
    `;document.body.appendChild(overlay);const box=document.createElement("div");box.style=`
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #fff; border-radius: 12px; padding: 24px 32px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 9999;
        font-family: 'Segoe UI', sans-serif; min-width: 300px;
    `;box.innerHTML=`
        <h2 style="margin-top: 0; font-size: 20px; margin-bottom: 16px;">FMCSA MX/MC Range</h2>
        <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 6px;">Start:</label>
            <input id="startNum" type="number" value="1680500" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px;">End:</label>
            <input id="endNum" type="number" value="1680505" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
        </div>
        <button id="startScan" style="padding: 10px 16px; border: none; border-radius: 6px;
                background-color: #007bff; color: white; font-size: 14px; cursor: pointer;">
            ▶ Start
        </button>
    `;document.body.appendChild(box);document.getElementById("startScan").addEventListener("click",(async()=>{const start=parseInt(document.getElementById("startNum").value);const end=parseInt(document.getElementById("endNum").value);if(isNaN(start)||isNaN(end)||start>end){alert("❌ Invalid range.");return}const count=end-start+1;count>500&&alert("Count must be less than 500");
//todo: send range to backend and check either the count is less than 500 or not
// const res = await apiFetch(`/post-range`, {
//   method: "POST",
//   headers: { "Content-Type": "application/json" },
//   body: JSON.stringify({ start, end }),
// });
// const json = await res.json();
// if (!json.allowed) {
//   alert(`❌ ${json.message}`);
//   return;
// }
localStorage.setItem(STORAGE.rangeKey,JSON.stringify({start,end}));saveCurrent(start);localStorage.setItem(STORAGE.rangeSetFlag,"true");location.reload()}))}
// export async function showTokenForm() {
//   const overlay = document.createElement("div");
//   overlay.style = `
//     position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
//     background: rgba(0, 0, 0, 0.5); z-index: 9998;
//   `;
//   document.body.appendChild(overlay);
//   const box = document.createElement("div");
//   box.style = `
//     position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
//     background: #fff; border-radius: 12px; padding: 24px 32px;
//     box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 9999;
//     font-family: 'Segoe UI', sans-serif; min-width: 300px;
//   `;
//   box.innerHTML = `
//     <h2 style="margin-top: 0; font-size: 20px; margin-bottom: 16px;">🔐 Enter Access Token</h2>
//     <div style="margin-bottom: 16px;">
//       <label style="display: block; margin-bottom: 6px;">Token:</label>
//       <input id="authToken" type="text" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
//     </div>
//     <button id="submitToken" style="padding: 10px 16px; border: none; border-radius: 6px;
//       background-color: #28a745; color: white; font-size: 14px; cursor: pointer;">
//       ✅ Save Token
//     </button>
//   `;
//   document.body.appendChild(box);
//   document.getElementById("submitToken").addEventListener("click", async () => {
//     const token = document.getElementById("authToken").value.trim();
//     if (!token) {
//       alert("⚠ Please enter a valid token.");
//       return;
//     }
//     const now = Date.now();
//     const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
//     sessionStorage.setItem("verificationToken", token);
//     sessionStorage.setItem("verificationTokenExpires", expiresAt.toString());
//     // ✅ Get and store fingerprint
//     if (!sessionStorage.getItem(sessionKeys.fingerprint)) {
//       const fp = await FingerprintJS.load();
//       const result = await fp.get();
//       const fingerprint = result.visitorId;
//       sessionStorage.setItem("clientFingerprint", fingerprint);
//     }
//     // alert("✅ Token saved successfully.");
//     document.body.removeChild(box);
//     document.body.removeChild(overlay);
//   });
// }
async function showTokenRequestForm(){const overlay=document.createElement("div");overlay.style=`
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.5); z-index: 9998;
  `;document.body.appendChild(overlay);const box=document.createElement("div");box.style=`
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: #fff; border-radius: 12px; padding: 24px 32px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 9999;
    font-family: 'Segoe UI', sans-serif; min-width: 300px;
  `;box.innerHTML=`
    <h2 style="margin-top: 0; font-size: 20px; margin-bottom: 16px;">Request Access Token</h2>
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 6px;">Email:</label>
      <input id="emailInput" type="email" placeholder="you@example.com"
        style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
    </div>
    <button id="requestToken" style="padding: 10px 16px; border: none; border-radius: 6px;
        background-color: #28a745; color: white; font-size: 14px; cursor: pointer;">
      🎟️ Request Token
    </button>
  `;document.body.appendChild(box);document.getElementById("requestToken").addEventListener("click",(async()=>{const email=document.getElementById("emailInput").value.trim();if(!email){alert("❌ Please enter a valid/registered email.");return}const fingerprint=await getFingerprint();
// const fingerprint = "someother fingerprint";
const res=await fetch(`${API_URL}/api/req-token`,{method:"POST",headers:{"Content-Type":"application/json","ngrok-skip-browser-warning":"true"},body:JSON.stringify({email,fingerprint})});const data=await res.json();if(res.ok&&data.token){const expiresAt=Date.now()+7*24*60*60*1e3;sessionStorage.setItem(sessionKeys.token,data.token);sessionStorage.setItem(sessionKeys.tokenExpiry,expiresAt.toString());sessionStorage.setItem(sessionKeys.fingerprint,fingerprint);document.body.removeChild(overlay);document.body.removeChild(box)}else alert(`❌ Failed: ${data.error||"Unknown error"}`)}))}// ./src/utils/downloader.js
async function downloadCSVFromServer(filename="data.csv"){try{const res=await apiFetch("/api/download-csv");if(!res.ok)throw new Error("Download failed.");const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a)}catch(err){console.error("CSV download failed:",err)}}// ./src/index.js
addFloatingToolbar();const src_shouldRun=localStorage.getItem(STORAGE.runFlag)==="true";const src_rangeSet=localStorage.getItem(STORAGE.rangeSetFlag)==="true";const isTokenValid=Object.keys(sessionKeys).every((key=>!!sessionStorage.getItem(key)));function handleSnapshotPage(){if(src_shouldRun&&!isTokenValid){showTokenRequestForm();return}if(src_shouldRun&&isTokenValid&&!src_rangeSet){showRangeForm();return}if(src_shouldRun&&isTokenValid&&src_rangeSet){const{start,end}=getRange();const current=getCurrent();if(current<=end)setTimeout((()=>submitQuery(current)),2e3);else{downloadCSVFromServer(`Record of ${start}-${end} at ${(new Date).toLocaleDateString()}.csv`);alert("✅ Completed MX/MC range.");clearAllStorage()}}}async function handleQueryPage(){const{start,end}=getRange();let current=getCurrent();const table=document.querySelector("table");if(!table)return;const text=table.innerText;if(text.includes("Record Inactive")||text.includes("Record Not Found")){console.log(`❌ MX ${current} is inactive.`);current++;saveCurrent(current);setTimeout((()=>goToSnapshot()),500)}else if(text.includes("USDOT INFORMATION")){Object.keys(requiredValues).forEach((key=>{requiredValues[key]=getFieldValue(table,key)||"NOT FOUND"}));try{const response=await apiFetch(`/api/validate-record`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({record:requiredValues})});const result=await response.json();console.log("✅ Server response:",result);current++;saveCurrent(current)}catch(error){console.error("❌ Error sending record:",error)}}if(current<=end)setTimeout((()=>submitQuery(current)),1500);else{downloadCSVFromServer(`Record of ${start}-${end} at ${(new Date).toLocaleTimeString()}.csv`);clearAllStorage();alert("✅ Finished checking all numbers.");setTimeout((()=>goToSnapshot()),500)}}location.href.includes("CompanySnapshot.aspx")?handleSnapshotPage():location.href.includes("query.asp")&&src_shouldRun&&src_rangeSet&&handleQueryPage()})();