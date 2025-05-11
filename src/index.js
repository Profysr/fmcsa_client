import { apiFetch } from "./api/customApi.js";
import { getFieldValue, goToSnapshot, submitQuery } from "./helper/scapper.js";
import {
  clearAllStorage,
  getCurrent,
  getRange,
  saveCurrent,
  STORAGE,
} from "./helper/storage.js";
import {
  addFloatingToolbar,
  showRangeForm,
  showTokenRequestForm,
} from "./helper/ui.js";
import { requiredValues, sessionKeys } from "./utils/constants.js";
import { downloadCSVFromServer } from "./utils/downloader.js";

addFloatingToolbar();

const shouldRun = localStorage.getItem(STORAGE.runFlag) === "true";
const rangeSet = localStorage.getItem(STORAGE.rangeSetFlag) === "true";
const isTokenValid = Object.keys(sessionKeys).every(
  (key) => !!sessionStorage.getItem(key)
);

function handleSnapshotPage() {
  if (shouldRun && !isTokenValid) {
    showTokenRequestForm();
    return;
  }

  if (shouldRun && isTokenValid && !rangeSet) {
    showRangeForm();
    return;
  }

  if (shouldRun && isTokenValid && rangeSet) {
    const { start, end } = getRange();
    const current = getCurrent();

    if (current <= end) {
      setTimeout(() => submitQuery(current), 2000);
    } else {
      downloadCSVFromServer(
        `Record of ${start}-${end} at ${new Date().toLocaleDateString()}.csv`
      );
      alert("✅ Completed MX/MC range.");
      clearAllStorage();
    }
  }
}

async function handleQueryPage() {
  const { start, end } = getRange();
  let current = getCurrent();
  const table = document.querySelector("table");
  if (!table) return;

  const text = table.innerText;

  if (text.includes("Record Inactive") || text.includes("Record Not Found")) {
    console.log(`❌ MX ${current} is inactive.`);

    current++;
    saveCurrent(current);
    setTimeout(() => goToSnapshot(), 500);
  } else if (text.includes("USDOT INFORMATION")) {
    Object.keys(requiredValues).forEach((key) => {
      requiredValues[key] = getFieldValue(table, key) || "NOT FOUND";
    });

    try {
      const response = await apiFetch(`/api/validate-record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ record: requiredValues }),
      });

      const result = await response.json();
      console.log("✅ Server response:", result);

      current++;
      saveCurrent(current);
    } catch (error) {
      console.error("❌ Error sending record:", error);
    }
  }

  if (current <= end) {
    setTimeout(() => submitQuery(current), 1500);
  } else {
    downloadCSVFromServer(
      `Record of ${start}-${end} at ${new Date().toLocaleTimeString()}.csv`
    );
    clearAllStorage();
    alert("✅ Finished checking all numbers.");
    setTimeout(() => goToSnapshot(), 500);
  }
}

if (location.href.includes("CompanySnapshot.aspx")) {
  handleSnapshotPage();
} else if (location.href.includes("query.asp") && shouldRun && rangeSet) {
  handleQueryPage();
}
