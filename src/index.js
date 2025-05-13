import { apiFetch } from "./api/customApi.js";
import { getFieldValue, goToSnapshot, submitQuery } from "./helper/scapper.js";
import {
  clearAllStorage,
  getCurrent,
  getRange,
  saveCurrent,
  STORAGE,
  validateSessionStorage,
} from "./helper/storage.js";
import {
  addFloatingToolbar,
  showRangeForm,
  showTokenRequestForm,
} from "./helper/ui.js";
import { validateActiveTable } from "./helper/validator.js";
import { requiredValues } from "./utils/constants.js";

import { downloadCSVFromServer } from "./utils/downloader.js";

addFloatingToolbar();

const shouldRun = localStorage.getItem(STORAGE.runFlag) === "true";
const rangeSet = localStorage.getItem(STORAGE.rangeSetFlag) === "true";
const isTokenValid = validateSessionStorage();

async function handleSnapshotPage() {
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
      submitQuery(current);
      // setTimeout(() => submitQuery(current), 800);
      // redirects the user to the query.asp page
    } else {
      await downloadCSVFromServer(
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
    // alert(`❌ MX ${current} is inactive.`);
    current++;
    saveCurrent(current);
    goToSnapshot();
    // setTimeout(() => goToSnapshot(), 400);
  } else if (text.includes("USDOT INFORMATION")) {
    const isValid = validateActiveTable(table);

    // alert(`is valid: ${isValid}`);
    if (isValid) {
      const record = {};
      requiredValues.forEach((key) => {
        record[key] = getFieldValue(table, key) || "NOT FOUND";
      });

      try {
        const response = await apiFetch(`/api/validate-record`, {
          method: "POST",
          body: JSON.stringify({ record }),
        });

        await response.json();
        // alert(`✅ Server response:, ${result.message}`);
      } catch (error) {
        console.error(`❌ Error sending record: ${error}`);
      }
    }

    current++;
    saveCurrent(current);
  }

  if (current <= end) {
    submitQuery(current);
    // setTimeout(() => , 400);
  } else {
    await downloadCSVFromServer(
      `Record of ${start}-${end} at ${new Date().toLocaleTimeString()}.csv`
    );
    clearAllStorage();
    alert("✅ Finished checking all numbers.");
    goToSnapshot();
    // setTimeout(() => goToSnapshot(), 1000);
  }
}

if (location.href.includes("CompanySnapshot.aspx")) {
  handleSnapshotPage();
} else if (location.href.includes("query.asp") && shouldRun && rangeSet) {
  handleQueryPage();
}
