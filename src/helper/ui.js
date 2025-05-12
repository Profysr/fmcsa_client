import { API_URL } from "../api/customApi.js";
import { sessionKeys } from "../utils/constants.js";
import { getFingerprint } from "../utils/fingerprint.js";
// import { getFingerprint } from "../utils/fingerprint.js";
import { goToSnapshot } from "./scapper.js";
import { saveCurrent, STORAGE } from "./storage.js";

export function addFloatingToolbar() {
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

  const stopBtn = createButton("🛑 Stop Automation", "#dc3545", () => {
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    alert("🛑 FMCSA Automation stopped.");
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

  document.getElementById("startScan").addEventListener("click", async () => {
    const start = parseInt(document.getElementById("startNum").value);
    const end = parseInt(document.getElementById("endNum").value);
    if (isNaN(start) || isNaN(end) || start > end) {
      alert("❌ Invalid range.");
      return;
    }

    const count = end - start + 1;
    if (count > 500) {
      alert("Count must be less than 500");
    }

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

    localStorage.setItem(STORAGE.rangeKey, JSON.stringify({ start, end }));
    saveCurrent(start);
    localStorage.setItem(STORAGE.rangeSetFlag, "true");
    location.reload();
  });
}

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

  document
    .getElementById("requestToken")
    .addEventListener("click", async () => {
      const email = document.getElementById("emailInput").value.trim();

      if (!email) {
        alert("❌ Please enter a valid/registered email.");
        return;
      }

      const fingerprint = await getFingerprint();
      // const fingerprint = "someother fingerprint";

      const res = await fetch(`${API_URL}/api/req-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, fingerprint }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        sessionStorage.setItem(sessionKeys.token, data.token);
        sessionStorage.setItem(sessionKeys.tokenExpiry, expiresAt.toString());
        sessionStorage.setItem(sessionKeys.fingerprint, fingerprint);
        document.body.removeChild(overlay);
        document.body.removeChild(box);
      } else {
        alert(`❌ Failed: ${data.error || "Unknown error"}`);
      }
    });
}
