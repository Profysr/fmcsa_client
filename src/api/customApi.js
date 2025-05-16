import { validationChecks } from "../helper/validator.js";
import { sessionKeys } from "../utils/constants.js";
import { getFingerprint } from "../utils/fingerprint.js";

export const API_URL =
  "https://fmcsa-automation-dashboard.vercel.app" || "http://localhost:3000";

export async function apiFetch(url, options = {}) {
  const ott = sessionStorage.getItem(sessionKeys.token);
  const expiry = parseInt(sessionStorage.getItem(sessionKeys.tokenExpiry), 10);
  // Optional: clear expired token
  if (expiry && Date.now() > expiry) {
    Object.keys(sessionKeys).forEach((key) => sessionStorage.removeItem(key));
    throw new Error("🔒 Token has expired. Please re-authenticate.");
  }

  const fingerprint = await getFingerprint();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(ott && { Authorization: `Bearer ${ott}` }),
    ...(fingerprint && { "X-Client-ID": fingerprint }),
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`❌ API Error: ${response.status} ${errText}`);
  }

  return response;
}

export async function validateReq(records) {
  try {
    const response = await apiFetch(`/api/validate-record`, {
      method: "POST",
      body: JSON.stringify({ records, checks: validationChecks }),
    });

    await response.json();
    localStorage.removeItem("validRecords");
    // console.log(result);
    alert("record send");
  } catch (error) {
    throw new Error(`❌ Error sending records: ${error}`);
  }
}
