// ==UserScript==
// @name         FMCSA Automation
// @description  Automate MC/MX number checks on FMCSA SAFER site with start range prompt and download it in csv file automatically
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.umd.min.js
// @match        https://safer.fmcsa.dot.gov/CompanySnapshot.aspx
// @match        https://safer.fmcsa.dot.gov/query.asp
// @namespace    Accuracare
// @version      2.0.1.4
// @author       Bilal Ahmad
// @updateURL    https://raw.githubusercontent.com/Profysr/fmcsa_client/main/build/fmcsa-Automation.user.js
// @downloadURL  https://raw.githubusercontent.com/Profysr/fmcsa_client/main/build/fmcsa-Automation.user.js
// ==/UserScript==

(()=>{"use strict";// ./src/helper/validator.js
const validationChecks={"Entity Type":"CARRIER","USDOT Status":"ACTIVE","Operating Authority Status":"AUTHORIZED FOR Property"};// ./src/utils/constants.js
const requiredValues=["Entity Type","USDOT Status","USDOT Number","MCS-150 Form Date","Operating Authority Status","MC/MX/FF Number(s)","Legal Name","Physical Address","Phone","Mailing Address"];const sessionKeys={token:"__fmcsa_verification_token",tokenExpiry:"__fmca_verification_token_expiry"};// ./src/utils/fingerprint.js
function loadFingerprintJS(){return new Promise(((resolve,reject)=>{if(window.FingerprintJS)return resolve(window.FingerprintJS);const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.umd.min.js";// UMD build
script.onload=()=>resolve(window.FingerprintJS);script.onerror=()=>reject("Failed to load FingerprintJS");document.head.appendChild(script)}))}async function getFingerprint(){const FingerprintJS=await loadFingerprintJS();const fp=await FingerprintJS.load();const result=await fp.get();return result.visitorId}// ./src/api/customApi.js
const API_URL="https://fmcsa-automation-dashboard.vercel.app"||0;async function apiFetch(url,options={}){const ott=sessionStorage.getItem(sessionKeys.token);const expiry=parseInt(sessionStorage.getItem(sessionKeys.tokenExpiry),10);
// Optional: clear expired token
if(expiry&&Date.now()>expiry){Object.keys(sessionKeys).forEach((key=>sessionStorage.removeItem(key)));throw new Error("🔒 Token has expired. Please re-authenticate.")}const fingerprint=await getFingerprint();const headers={"Content-Type":"application/json",...options.headers||{},...ott&&{Authorization:`Bearer ${ott}`},...fingerprint&&{"X-Client-ID":fingerprint}};const response=await fetch(`${API_URL}${url}`,{...options,headers});if(!response.ok){const errText=await response.text();throw new Error(`❌ API Error: ${response.status} ${errText}`)}return response}async function validateReq(records){try{const response=await apiFetch(`/api/validate-record`,{method:"POST",body:JSON.stringify({records,checks:validationChecks})});await response.json();localStorage.removeItem("validRecords")}catch(error){throw new Error(`❌ Error sending records: ${error}`)}}// ./src/helper/scapper.js
function goToSnapshot(){location.href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"}function submitQuery(number){const form=document.forms.QueryBox;if(!form)return;const input=form.querySelector('[name="query_string"]');const mcRadio=form.querySelector('[name="query_param"][value="MC_MX"]');const submit=form.querySelector('[value="Search"][type="SUBMIT"]');if(input&&mcRadio&&submit){mcRadio.checked=true;input.value=number;console.log(`🔁 Submitting MX number: ${number}`);submit.click()}}function getFieldValue(el,labelText){const labelElem=[...el.querySelectorAll("th")].find((th=>th.textContent.trim().toUpperCase().includes(labelText.toUpperCase().trim())));return labelElem?.nextElementSibling?.textContent.trim().toUpperCase()||null}const checkLeftOverRecords=async()=>{const leftover=JSON.parse(localStorage.getItem("validRecords")||"[]");leftover.length>0&&await validateReq(leftover)};// ./src/helper/storage.js
const STORAGE={currentKey:"fmcsa_current_mx_number",rangeKey:"fmcsa_range",runFlag:"fmcsa_should_run",rangeSetFlag:"fmcsa_range_set",currRange:"fmcsa_curr_range"};const getRange=()=>JSON.parse(localStorage.getItem(STORAGE.rangeKey)||"{}");const getCurrRange=()=>JSON.parse(localStorage.getItem(STORAGE.currRange)||"{}");const getCurrent=()=>parseInt(localStorage.getItem(STORAGE.currentKey));const saveCurrent=num=>localStorage.setItem(STORAGE.currentKey,num);const clearAllStorage=()=>Object.values(STORAGE).forEach((key=>localStorage.removeItem(key)));localStorage.getItem(STORAGE.runFlag);localStorage.getItem(STORAGE.rangeSetFlag);function validateSessionStorage(){const{token,tokenExpiry}=sessionKeys;const tokenValue=sessionStorage.getItem(token);const expiryValue=sessionStorage.getItem(tokenExpiry);if(!tokenValue||!expiryValue)return false;return Date.now()<parseInt(expiryValue,10)}// ./src/utils/downloader.js
async function downloadCSVFromServer(filename="data.csv"){try{await new Promise((resolve=>setTimeout(resolve,2e3)));const res=await apiFetch("/api/download-csv");console.log("res: ",res);if(!res.ok)throw new Error(res);const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a)}catch(err){alert(`CSV download failed:, ${err}`)}}// ./src/utils/getDeviceAndLocationInfo.js
async function getDeviceAndLocationInfo(){const info={deviceMemory:navigator.deviceMemory||"Unknown",hardwareConcurrency:navigator.hardwareConcurrency||"Unknown",platform:navigator.platform||"Unknown",productSub:navigator.productSub||"Unknown",userAgent:navigator.userAgent||"Unknown",gpu:"Unknown",latitude:null,longitude:null};
// Try to get GPU info using WebGL
try{const canvas=document.createElement("canvas");const gl=canvas.getContext("webgl")||canvas.getContext("experimental-webgl");if(gl){const debugInfo=gl.getExtension("WEBGL_debug_renderer_info");debugInfo&&(info.gpu=gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))}}catch(e){console.warn("GPU detection failed:",e)}
// Try to get geolocation
try{if("geolocation"in navigator){const position=await new Promise(((resolve,reject)=>{navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:1e4,maximumAge:0})}));info.latitude=position.coords.latitude;info.longitude=position.coords.longitude}else console.warn("Geolocation not supported.")}catch(err){console.warn("Geolocation error:",err.message)}return info}// ./src/utils/throttle.js
function throttle(func,delay){let lastCall=0;return function(...args){const now=Date.now();if(now-lastCall>=delay){lastCall=now;func.apply(this,args)}}}// ./src/helper/svgs.js
function whatsApp(button){button.innerHTML=`<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M16 31C23.732 31 30 24.732 30 17C30 9.26801 23.732 3 16 3C8.26801 3 2 9.26801 2 17C2 19.5109 2.661 21.8674 3.81847 23.905L2 31L9.31486 29.3038C11.3014 30.3854 13.5789 31 16 31ZM16 28.8462C22.5425 28.8462 27.8462 23.5425 27.8462 17C27.8462 10.4576 22.5425 5.15385 16 5.15385C9.45755 5.15385 4.15385 10.4576 4.15385 17C4.15385 19.5261 4.9445 21.8675 6.29184 23.7902L5.23077 27.7692L9.27993 26.7569C11.1894 28.0746 13.5046 28.8462 16 28.8462Z" fill="#BFC8D0"></path> <path d="M28 16C28 22.6274 22.6274 28 16 28C13.4722 28 11.1269 27.2184 9.19266 25.8837L5.09091 26.9091L6.16576 22.8784C4.80092 20.9307 4 18.5589 4 16C4 9.37258 9.37258 4 16 4C22.6274 4 28 9.37258 28 16Z" fill="url(#paint0_linear_87_7264)"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2C8.26801 2 2 8.26801 2 16C2 18.5109 2.661 20.8674 3.81847 22.905L2 30L9.31486 28.3038C11.3014 29.3854 13.5789 30 16 30ZM16 27.8462C22.5425 27.8462 27.8462 22.5425 27.8462 16C27.8462 9.45755 22.5425 4.15385 16 4.15385C9.45755 4.15385 4.15385 9.45755 4.15385 16C4.15385 18.5261 4.9445 20.8675 6.29184 22.7902L5.23077 26.7692L9.27993 25.7569C11.1894 27.0746 13.5046 27.8462 16 27.8462Z" fill="white"></path> <path d="M12.5 9.49989C12.1672 8.83131 11.6565 8.8905 11.1407 8.8905C10.2188 8.8905 8.78125 9.99478 8.78125 12.05C8.78125 13.7343 9.52345 15.578 12.0244 18.3361C14.438 20.9979 17.6094 22.3748 20.2422 22.3279C22.875 22.2811 23.4167 20.0154 23.4167 19.2503C23.4167 18.9112 23.2062 18.742 23.0613 18.696C22.1641 18.2654 20.5093 17.4631 20.1328 17.3124C19.7563 17.1617 19.5597 17.3656 19.4375 17.4765C19.0961 17.8018 18.4193 18.7608 18.1875 18.9765C17.9558 19.1922 17.6103 19.083 17.4665 19.0015C16.9374 18.7892 15.5029 18.1511 14.3595 17.0426C12.9453 15.6718 12.8623 15.2001 12.5959 14.7803C12.3828 14.4444 12.5392 14.2384 12.6172 14.1483C12.9219 13.7968 13.3426 13.254 13.5313 12.9843C13.7199 12.7145 13.5702 12.305 13.4803 12.05C13.0938 10.953 12.7663 10.0347 12.5 9.49989Z" fill="white"></path> <defs> <linearGradient id="paint0_linear_87_7264" x1="26.5" y1="7" x2="4" y2="28" gradientUnits="userSpaceOnUse"> <stop stop-color="#5BD066"></stop> <stop offset="1" stop-color="#27B43E"></stop> </linearGradient> </defs> </g></svg>`}function arrowIcon(arrow){arrow.innerHTML=`<svg width="40px" height="40px" viewBox="0 0 24.00 24.00" id="meteor-icon-kit__regular-long-arrow-down" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" stroke-width="0.00024000000000000003"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 20.5858L12.2929 16.2929C12.6834 15.9024 13.3166 15.9024 13.7071 16.2929C14.0976 16.6834 14.0976 17.3166 13.7071 17.7071L7.7071 23.7071C7.3166 24.0976 6.6834 24.0976 6.2929 23.7071L0.29289 17.7071C-0.09763 17.3166 -0.09763 16.6834 0.29289 16.2929C0.68342 15.9024 1.31658 15.9024 1.70711 16.2929L6 20.5858V1C6 0.447715 6.4477 0 7 0C7.5523 0 8 0.447715 8 1V20.5858z" fill="#303030"></path></g></svg>`}// ./src/helper/ui.js
async function addFloatingToolbar(){const toolbar=document.createElement("div");toolbar.style=`
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
        `;btn.addEventListener("mouseenter",(()=>{btn.style.transform="translateX(-5px)"}));btn.addEventListener("mouseleave",(()=>{btn.style.transform="translateX(0)"}));btn.onclick=onClick;return btn};const startBtn=createButton("🚛 Start Automation","#28a745",(()=>{localStorage.setItem(STORAGE.runFlag,"true");localStorage.removeItem(STORAGE.rangeSetFlag);goToSnapshot()}));const stopBtn=createButton("🛑 Stop Automation","#dc3545",(async()=>{alert("🛑 FMCSA Automation stopped.");const{start,end}=getCurrRange();await downloadCSVFromServer(`Record of ${start}-${end} at ${(new Date).toLocaleTimeString()}.csv`);Object.values(STORAGE).forEach((key=>localStorage.removeItem(key)))}));toolbar.appendChild(startBtn);toolbar.appendChild(stopBtn);document.body.appendChild(toolbar)}
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
const initialEnd=Math.min(start+500,end);localStorage.setItem(STORAGE.currRange,JSON.stringify({start,end:initialEnd}));saveCurrent(start);localStorage.setItem(STORAGE.rangeSetFlag,"true");location.reload()};startBtn.addEventListener("click",rangeFormAction)}async function showTokenRequestForm(){const overlay=document.createElement("div");overlay.style=`
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
  `;document.body.appendChild(box);const reqBtn=document.getElementById("requestToken");const throttledReqToken=throttle((async()=>{const email=document.getElementById("emailInput").value.trim();const fingerprint=await getFingerprint();const deviceInfo=await getDeviceAndLocationInfo();
// console.log("Device Info:", deviceInfo);
const res=await fetch(`${API_URL}/api/req-token`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,fingerprint,deviceInfo})});const data=await res.json();if(res.ok)if(data.token){const expiresAt=Date.now()+7*24*60*60*1e3;sessionStorage.setItem(sessionKeys.token,data.token);sessionStorage.setItem(sessionKeys.tokenExpiry,expiresAt.toString())}else alert("Waiting for approval");else alert(`❌ Failed: ${data.error||"Unknown error while req token"}`);document.body.removeChild(overlay);document.body.removeChild(box)}),1e4);reqBtn.addEventListener("click",throttledReqToken)}function addWhatsAppHelpButton(){
// Avoid adding multiple times
if(document.querySelector("#whatsapp-help-container"))return;
// Create container
const container=document.createElement("div");container.id="whatsapp-help-container";container.style.cssText=`
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    font-family: sans-serif;
  `;
// Create tooltip
const tooltip=document.createElement("div");tooltip.innerHTML=`Having a problem?`;tooltip.style.cssText=`
    background: #f1f1f1;
    color: #333;
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    font-size: 14px;
    animation: fadeInUp 1s ease forwards;
  `;
// Create arrow
const arrow=document.createElement("div");arrowIcon(arrow);arrow.style.cssText=`
    font-size: 20px;
    animation: bounce 1s infinite;
    margin-right: 5px;
  `;
// Create WhatsApp button
const button=document.createElement("a");button.href="https://wa.me/923037377597";// Replace with your number
button.target="_blank";button.style.cssText=`
  width: 60px;
  height: 60px;
  transition: transform 0.3s ease;
`;whatsApp(button);
// Add all to container
container.appendChild(tooltip);container.appendChild(arrow);container.appendChild(button);
// Add container to body
document.body.appendChild(container);
// Inject keyframe animations
const style=document.createElement("style");style.textContent=`
    @keyframes bounce {
      0%, 100% { transform: translateY(5px); }
      50% { transform: translateY(-2px); }
    }

    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;document.head.appendChild(style)}// ./src/index.js
const src_shouldRun=localStorage.getItem(STORAGE.runFlag)==="true";const src_rangeSet=localStorage.getItem(STORAGE.rangeSetFlag)==="true";const isTokenValid=validateSessionStorage();async function handleSnapshotPage(){await addFloatingToolbar();if(src_shouldRun&&!isTokenValid){showTokenRequestForm();return}if(src_shouldRun&&isTokenValid&&!src_rangeSet){showRangeForm();return}if(src_shouldRun&&isTokenValid&&src_rangeSet){const{start,end}=getCurrRange();const current=getCurrent();if(current<=end)submitQuery(current);else{await checkLeftOverRecords();await downloadCSVFromServer(`Record of ${start}-${end} at ${(new Date).toLocaleDateString()}.csv`);const fullRange=getRange();const nextStart=end+1;const nextEnd=Math.min(nextStart+500,fullRange.end);if(nextStart<=fullRange.end){localStorage.setItem(STORAGE.currRange,JSON.stringify({start:nextStart,end:nextEnd}));saveCurrent(nextStart);location.reload()}else{alert("✅ Completed entire MX/MC range.");clearAllStorage()}}}}async function handleQueryPage(){const{start,end}=getCurrRange();let current=getCurrent();const table=document.querySelector("table");if(!table)return;const text=table.innerText;if(text.includes("Record Inactive")||text.includes("Record Not Found")){current++;saveCurrent(current);goToSnapshot()}else if(text.includes("USDOT INFORMATION")){const record={};requiredValues.forEach((key=>{record[key]=getFieldValue(table,key)||"NOT FOUND"}));
// Save to localStorage
const uniqueKey=record["USDOT Number"];const existing=JSON.parse(localStorage.getItem("validRecords")||"[]");const alreadyExists=existing.some((item=>item["USDOT Number"]===uniqueKey));if(!alreadyExists){existing.push(record);localStorage.setItem("validRecords",JSON.stringify(existing));existing.length>25&&await validateReq(existing)}current++;saveCurrent(current)}if(current<=end)submitQuery(current);else{await checkLeftOverRecords();await downloadCSVFromServer(`Record of ${start}-${end} at ${(new Date).toLocaleTimeString()}.csv`);const fullRange=getRange();const nextStart=end+1;const nextEnd=Math.min(nextStart+500,fullRange.end);if(nextStart<=fullRange.end){localStorage.setItem(STORAGE.currRange,JSON.stringify({start:nextStart,end:nextEnd}));saveCurrent(nextStart);goToSnapshot()}else{alert("✅ Finished entire MX/MC range.");clearAllStorage();goToSnapshot()}}}if(location.href.includes("CompanySnapshot.aspx")){addWhatsAppHelpButton();handleSnapshotPage()}else location.href.includes("query.asp")&&src_shouldRun&&src_rangeSet&&handleQueryPage()})();