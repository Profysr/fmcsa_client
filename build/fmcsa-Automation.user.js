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
const requiredValues=["Entity Type","USDOT Status","USDOT Number","MCS-150 Form Date","Operating Authority Status","MC/MX/FF Number(s)","Legal Name","Physical Address","Phone","Mailing Address"];const sessionKeys={token:"__fmcsa_verification_token",fingerprint:"__fmcsa_user_fingerprint",tokenExpiry:"__fmca_verification_token_expiry"};// ./src/api/customApi.js
const API_URL="https://fmcsa-automation-dashboard.vercel.app"||0;async function apiFetch(url,options={}){const ott=sessionStorage.getItem(sessionKeys.token);const fingerprint=sessionStorage.getItem(sessionKeys.fingerprint);const expiry=parseInt(sessionStorage.getItem(sessionKeys.tokenExpiry),10);
// Optional: clear expired token
if(expiry&&Date.now()>expiry){Object.keys(sessionKeys).forEach((key=>sessionStorage.removeItem(key)));throw new Error("🔒 Token has expired. Please re-authenticate.")}const headers={"Content-Type":"application/json",...options.headers||{},...ott&&{Authorization:`Bearer ${ott}`},...fingerprint&&{"X-Client-ID":fingerprint}};const response=await fetch(`${API_URL}${url}`,{...options,headers});if(!response.ok){const errText=await response.text();throw new Error(`❌ API Error: ${response.status} ${errText}`)}return response}// ./src/helper/scapper.js
function goToSnapshot(){location.href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"}function submitQuery(number){const form=document.forms.QueryBox;if(!form)return;const input=form.querySelector('[name="query_string"]');const mcRadio=form.querySelector('[name="query_param"][value="MC_MX"]');const submit=form.querySelector('[value="Search"][type="SUBMIT"]');if(input&&mcRadio&&submit){mcRadio.checked=true;input.value=number;console.log(`🔁 Submitting MX number: ${number}`);submit.click()}}function getFieldValue(el,labelText){const labelElem=[...el.querySelectorAll("th")].find((th=>th.textContent.trim().toUpperCase().includes(labelText.toUpperCase().trim())));return labelElem?.nextElementSibling?.textContent.trim().toUpperCase()||null}// ./src/helper/storage.js
const STORAGE={currentKey:"fmcsa_current_mx_number",rangeKey:"fmcsa_range",runFlag:"fmcsa_should_run",rangeSetFlag:"fmcsa_range_set",currRange:"fmcsa_curr_range"};const getRange=()=>JSON.parse(localStorage.getItem(STORAGE.rangeKey)||"{}");const getCurrRange=()=>JSON.parse(localStorage.getItem(STORAGE.currRange)||"{}");const getCurrent=()=>parseInt(localStorage.getItem(STORAGE.currentKey));const saveCurrent=num=>localStorage.setItem(STORAGE.currentKey,num);const clearAllStorage=()=>Object.values(STORAGE).forEach((key=>localStorage.removeItem(key)));localStorage.getItem(STORAGE.runFlag);localStorage.getItem(STORAGE.rangeSetFlag);function validateSessionStorage(){const{token,tokenExpiry,fingerprint}=sessionKeys;const tokenValue=sessionStorage.getItem(token);const expiryValue=sessionStorage.getItem(tokenExpiry);const fingerprintValue=sessionStorage.getItem(fingerprint);if(!tokenValue||!expiryValue||!fingerprintValue)return false;return Date.now()<parseInt(expiryValue,10)}// ./src/utils/fingerprint.js
function loadFingerprintJS(){return new Promise(((resolve,reject)=>{if(window.FingerprintJS)return resolve(window.FingerprintJS);const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.umd.min.js";// UMD build
script.onload=()=>resolve(window.FingerprintJS);script.onerror=()=>reject("Failed to load FingerprintJS");document.head.appendChild(script)}))}async function getFingerprint(){const FingerprintJS=await loadFingerprintJS();const fp=await FingerprintJS.load();const result=await fp.get();return result.visitorId}// ./src/utils/throttle.js
function throttle(func,delay){let lastCall=0;return function(...args){const now=Date.now();if(now-lastCall>=delay){lastCall=now;func.apply(this,args)}}}// ./src/helper/ui.js
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
    `;document.body.appendChild(box);const startBtn=document.getElementById("startScan");const rangeFormAction=()=>{const start=parseInt(document.getElementById("startNum").value);const end=parseInt(document.getElementById("endNum").value);if(isNaN(start)||isNaN(end)||start>end){alert("❌ Invalid range.");return}
// const count = end - start + 1;
// if (count > 500) {
//   alert("Count must be less than 500");
// }
localStorage.setItem(STORAGE.rangeKey,JSON.stringify({start,end}));
// implementing the functionality of 500 lots
const initialEnd=Math.min(start+499,end);localStorage.setItem(STORAGE.currRange,JSON.stringify({start,end:initialEnd}));saveCurrent(start);localStorage.setItem(STORAGE.rangeSetFlag,"true");location.reload()};startBtn.addEventListener("click",rangeFormAction)}
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
  `;document.body.appendChild(box);const reqBtn=document.getElementById("requestToken");const throttledReqToken=throttle((async()=>{const email=document.getElementById("emailInput").value.trim();const fingerprint=await getFingerprint();const res=await fetch(`${API_URL}/api/req-token`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,fingerprint})});const data=await res.json();if(res.ok)if(data.token){const expiresAt=Date.now()+7*24*60*60*1e3;sessionStorage.setItem(sessionKeys.token,data.token);sessionStorage.setItem(sessionKeys.tokenExpiry,expiresAt.toString());sessionStorage.setItem(sessionKeys.fingerprint,fingerprint)}else alert("Waiting for approval");else alert(`❌ Failed: ${data.error||"Unknown error while req token"}`);document.body.removeChild(overlay);document.body.removeChild(box)}),1e4);reqBtn.addEventListener("click",throttledReqToken)}// ./src/helper/validator.js
const validationChecks={"Entity Type":"CARRIER","USDOT Status":"ACTIVE","Operating Authority Status":"AUTHORIZED FOR Property"};
// export const validateActiveTableRecord = (record) => {
//   console.log("record: ", record);
//   for (const [key, value] of Object.entries(validationChecks)) {
//     const actual = record[key].toUpperCase();
//     if (actual !== value.toUpperCase()) {
//       return false;
//     }
//   }
//   const phone = record["Phone"];
//   return phone && phone.trim().length >= 2;
// };
function validateActiveTable(el){for(const[key,value]of Object.entries(validationChecks)){const actual=getFieldValue(el,key);if(!actual||!actual.trim().includes(value.toUpperCase()))return false}const phone=getFieldValue(el,"Phone");if(!phone||phone.trim().length<2)return false;return true}// ./src/utils/downloader.js
async function downloadCSVFromServer(filename="data.csv"){try{await new Promise((resolve=>setTimeout(resolve,2e3)));const res=await apiFetch("/api/download-csv");console.log("res: ",res);if(!res.ok)throw new Error(res);const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a)}catch(err){alert(`CSV download failed:, ${err}`)}}// ./src/index.js
addFloatingToolbar();const src_shouldRun=localStorage.getItem(STORAGE.runFlag)==="true";const src_rangeSet=localStorage.getItem(STORAGE.rangeSetFlag)==="true";const isTokenValid=validateSessionStorage();async function handleSnapshotPage(){if(src_shouldRun&&!isTokenValid){showTokenRequestForm();return}if(src_shouldRun&&isTokenValid&&!src_rangeSet){showRangeForm();return}
// if (shouldRun && isTokenValid && rangeSet) {
//   const { start, end } = getRange();
//   const current = getCurrent();
//   if (current <= end) {
//     submitQuery(current);
//     // redirects the user to the query.asp page
//   } else {
//     await downloadCSVFromServer(
//       `Record of ${start}-${end} at ${new Date().toLocaleDateString()}.csv`
//     );
//     alert("✅ Completed MX/MC range.");
//     clearAllStorage();
//   }
// }
if(src_shouldRun&&isTokenValid&&src_rangeSet){const{start,end}=getCurrRange();const current=getCurrent();if(current<=end)submitQuery(current);else{await downloadCSVFromServer(`Record of ${start}-${end} at ${(new Date).toLocaleDateString()}.csv`);const fullRange=getRange();const nextStart=end+1;const nextEnd=Math.min(nextStart+499,fullRange.end);if(nextStart<=fullRange.end){localStorage.setItem(STORAGE.currRange,JSON.stringify({start:nextStart,end:nextEnd}));saveCurrent(nextStart);location.reload()}else{alert("✅ Completed entire MX/MC range.");clearAllStorage()}}}}async function handleQueryPage(){const{start,end}=getCurrRange();let current=getCurrent();const table=document.querySelector("table");if(!table)return;const text=table.innerText;if(text.includes("Record Inactive")||text.includes("Record Not Found")){current++;saveCurrent(current);goToSnapshot()}else if(text.includes("USDOT INFORMATION")){const isValid=validateActiveTable(table);
// alert(`is valid: ${isValid}`);
if(isValid){const record={};requiredValues.forEach((key=>{record[key]=getFieldValue(table,key)||"NOT FOUND"}));try{const response=await apiFetch(`/api/validate-record`,{method:"POST",body:JSON.stringify({record})});await response.json()}catch(error){console.error(`❌ Error sending record: ${error}`)}}current++;saveCurrent(current)}
// if (current <= end) {
//   submitQuery(current);
//   // setTimeout(() => , 400);
// } else {
//   await downloadCSVFromServer(
//     `Record of ${start}-${end} at ${new Date().toLocaleTimeString()}.csv`
//   );
//   clearAllStorage();
//   alert("✅ Finished checking all numbers.");
//   goToSnapshot();
//  // setTimeout(() => goToSnapshot(), 1000);
// }
if(current<=end)submitQuery(current);else{await downloadCSVFromServer(`Record of ${start}-${end} at ${(new Date).toLocaleTimeString()}.csv`);const fullRange=getRange();const nextStart=end+1;const nextEnd=Math.min(nextStart+499,fullRange.end);if(nextStart<=fullRange.end){localStorage.setItem(STORAGE.currRange,JSON.stringify({start:nextStart,end:nextEnd}));saveCurrent(nextStart);goToSnapshot()}else{alert("✅ Finished entire MX/MC range.");clearAllStorage();goToSnapshot()}}}location.href.includes("CompanySnapshot.aspx")?handleSnapshotPage():location.href.includes("query.asp")&&src_shouldRun&&src_rangeSet&&handleQueryPage()})();