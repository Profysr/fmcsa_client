import { apiFetch } from "./api/customApi.js";
import { getFieldValue, goToSnapshot, submitQuery } from "./helper/scapper.js";
import {
  clearAllStorage,
  getCurrent,
  getCurrRange,
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
  if (shouldRun && isTokenValid && rangeSet) {
    const { start, end } = getCurrRange();
    const current = getCurrent();

    if (current <= end) {
      submitQuery(current);
    } else {
      await downloadCSVFromServer(
        `Record of ${start}-${end} at ${new Date().toLocaleDateString()}.csv`
      );

      const fullRange = getRange();
      const nextStart = end + 1;
      const nextEnd = Math.min(nextStart + 499, fullRange.end);

      if (nextStart <= fullRange.end) {
        localStorage.setItem(
          STORAGE.currRange,
          JSON.stringify({ start: nextStart, end: nextEnd })
        );
        saveCurrent(nextStart);
        location.reload(); // continue with next lot
      } else {
        alert("✅ Completed entire MX/MC range.");
        clearAllStorage();
      }
    }
  }
}

async function handleQueryPage() {
  const { start, end } = getCurrRange();
  let current = getCurrent();
  const table = document.querySelector("table");
  if (!table) return;

  const text = table.innerText;

  if (text.includes("Record Inactive") || text.includes("Record Not Found")) {
    current++;
    saveCurrent(current);
    goToSnapshot();
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

  if (current <= end) {
    submitQuery(current);
  } else {
    await downloadCSVFromServer(
      `Record of ${start}-${end} at ${new Date().toLocaleTimeString()}.csv`
    );

    const fullRange = getRange();
    const nextStart = end + 1;
    const nextEnd = Math.min(nextStart + 499, fullRange.end);

    if (nextStart <= fullRange.end) {
      localStorage.setItem(
        STORAGE.currRange,
        JSON.stringify({ start: nextStart, end: nextEnd })
      );
      saveCurrent(nextStart);
      goToSnapshot(); // move to snapshot to restart loop
    } else {
      alert("✅ Finished entire MX/MC range.");
      clearAllStorage();
      goToSnapshot();
    }
  }
}

if (location.href.includes("CompanySnapshot.aspx")) {
  handleSnapshotPage();
} else if (location.href.includes("query.asp") && shouldRun && rangeSet) {
  handleQueryPage();
}
