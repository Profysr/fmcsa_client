import { API_URL } from "../api/customApi.js";
import { sessionKeys } from "../utils/constants.js";
import { downloadCSVFromServer } from "../utils/downloader.js";
import { getFingerprint } from "../utils/fingerprint.js";
import { getDeviceAndLocationInfo } from "../utils/getDeviceAndLocationInfo.js";
import { throttle } from "../utils/throttle.js";
import { goToSnapshot } from "./scapper.js";
import { getCurrRange, saveCurrent, STORAGE } from "./storage.js";
import { arrowIcon, whatsApp } from "./svgs.js";

export async function addFloatingToolbar() {
  const toolbar = document.createElement("div");
  toolbar.style = `
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 10000;
    `;

  const createButton = (text, color, onClick) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style = `
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
        `;
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateX(-5px)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateX(0)";
    });
    btn.onclick = onClick;
    return btn;
  };

  const startBtn = createButton("🚛 Start Automation", "#28a745", () => {
    localStorage.setItem(STORAGE.runFlag, "true");
    localStorage.removeItem(STORAGE.rangeSetFlag);
    goToSnapshot();
  });

  const stopBtn = createButton("🛑 Stop Automation", "#dc3545", async () => {
    alert("🛑 FMCSA Automation stopped.");
    const { start, end } = getCurrRange();

    await downloadCSVFromServer(
      `Record of ${start}-${end} at ${new Date().toLocaleTimeString()}.csv`
    );
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
  });

  toolbar.appendChild(startBtn);
  toolbar.appendChild(stopBtn);
  document.body.appendChild(toolbar);
}

// display when there is valid Token and shouldRun in true
export function showRangeForm() {
  const overlay = document.createElement("div");
  overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.5); z-index: 9998;
    `;
  document.body.appendChild(overlay);

  const box = document.createElement("div");
  box.style = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #fff; border-radius: 12px; padding: 24px 32px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 9999;
        font-family: 'Segoe UI', sans-serif; min-width: 300px;
    `;

  box.innerHTML = `
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
    `;

  document.body.appendChild(box);
  const startBtn = document.getElementById("startScan");

  const rangeFormAction = () => {
    const start = parseInt(document.getElementById("startNum").value);
    const end = parseInt(document.getElementById("endNum").value);
    if (isNaN(start) || isNaN(end) || start > end) {
      alert("❌ Invalid range.");
      return;
    }

    // const count = end - start + 1;
    // if (count > 500) {
    //   alert("Count must be less than 500");
    // }

    localStorage.setItem(STORAGE.rangeKey, JSON.stringify({ start, end }));
    // implementing the functionality of 500 lots
    const initialEnd = Math.min(start + 500, end);
    localStorage.setItem(
      STORAGE.currRange,
      JSON.stringify({ start, end: initialEnd })
    );

    saveCurrent(start);
    localStorage.setItem(STORAGE.rangeSetFlag, "true");
    location.reload();
  };

  startBtn.addEventListener("click", rangeFormAction);
}

export async function showTokenRequestForm() {
  const overlay = document.createElement("div");
  overlay.style = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.5); z-index: 9998;
  `;
  document.body.appendChild(overlay);

  const box = document.createElement("div");
  box.style = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: #fff; border-radius: 12px; padding: 24px 32px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 9999;
    font-family: 'Segoe UI', sans-serif; min-width: 300px;
  `;

  box.innerHTML = `
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
  `;

  document.body.appendChild(box);
  const reqBtn = document.getElementById("requestToken");

  const throttledReqToken = throttle(async () => {
    const email = document.getElementById("emailInput").value.trim();
    const fingerprint = await getFingerprint();
    const deviceInfo = await getDeviceAndLocationInfo();

    // console.log("Device Info:", deviceInfo);

    const res = await fetch(`${API_URL}/api/req-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, fingerprint, deviceInfo }),
    });

    const data = await res.json();
    if (res.ok) {
      if (!data.token) {
        alert("Waiting for approval");
      } else {
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        sessionStorage.setItem(sessionKeys.token, data.token);
        sessionStorage.setItem(sessionKeys.tokenExpiry, expiresAt.toString());
      }
    } else {
      alert(`❌ Failed: ${data.error || "Unknown error while req token"}`);
    }
    document.body.removeChild(overlay);
    document.body.removeChild(box);
  }, 10000);

  reqBtn.addEventListener("click", throttledReqToken);
}

export function addWhatsAppHelpButton() {
  // Avoid adding multiple times
  if (document.querySelector("#whatsapp-help-container")) return;

  // Create container
  const container = document.createElement("div");
  container.id = "whatsapp-help-container";
  container.style.cssText = `
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
  const tooltip = document.createElement("div");
  tooltip.innerHTML = `Having a problem?`;
  tooltip.style.cssText = `
    background: #f1f1f1;
    color: #333;
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    font-size: 14px;
    animation: fadeInUp 1s ease forwards;
  `;

  // Create arrow
  const arrow = document.createElement("div");
  arrowIcon(arrow);
  arrow.style.cssText = `
    font-size: 20px;
    animation: bounce 1s infinite;
    margin-right: 5px;
  `;

  // Create WhatsApp button
  const button = document.createElement("a");
  button.href = "https://wa.me/923037377597"; // Replace with your number
  button.target = "_blank";
  button.style.cssText = `
  width: 60px;
  height: 60px;
  transition: transform 0.3s ease;
`;

  whatsApp(button);

  // Add all to container
  container.appendChild(tooltip);
  container.appendChild(arrow);
  container.appendChild(button);

  // Add container to body
  document.body.appendChild(container);

  // Inject keyframe animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes bounce {
      0%, 100% { transform: translateY(5px); }
      50% { transform: translateY(-2px); }
    }

    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}
