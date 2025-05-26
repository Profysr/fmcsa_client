import { validateReq } from "./api/customApi.js";
import {
  checkLeftOverRecords,
  getFieldValue,
  goToSnapshot,
  submitQuery,
} from "./helper/scapper.js";
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
  addWhatsAppHelpButton,
  showRangeForm,
  showTokenRequestForm,
} from "./helper/ui.js";
import { requiredValues } from "./utils/constants.js";
import { downloadCSVFromServer } from "./utils/downloader.js";

const shouldRun = localStorage.getItem(STORAGE.runFlag) === "true";
const rangeSet = localStorage.getItem(STORAGE.rangeSetFlag) === "true";
const isTokenValid = validateSessionStorage();

async function handleSnapshotPage() {
  await addFloatingToolbar();
  if (shouldRun && !isTokenValid) {
    showTokenRequestForm();
    return;
  }

  if (shouldRun && isTokenValid && !rangeSet) {
    showRangeForm();
    return;
  }

  if (shouldRun && isTokenValid && rangeSet) {
    const { start, end } = getCurrRange();
    const current = getCurrent();

    if (current <= end) {
      submitQuery(current);
    } else {
      await checkLeftOverRecords();
      await downloadCSVFromServer(
        `Record of ${start}-${end} at ${new Date().toLocaleDateString()}.csv`
      );

      const fullRange = getRange();
      const nextStart = end + 1;
      const nextEnd = Math.min(nextStart + 500, fullRange.end);

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
    const record = {};
    requiredValues.forEach((key) => {
      record[key] = getFieldValue(table, key) || "NOT FOUND";
    });

    // Save to localStorage
    const uniqueKey = record["USDOT Number"];
    const existing = JSON.parse(localStorage.getItem("validRecords") || "[]");

    const alreadyExists = existing.some(
      (item) => item["USDOT Number"] === uniqueKey
    );

    if (!alreadyExists) {
      existing.push(record);
      localStorage.setItem("validRecords", JSON.stringify(existing));

      if (existing.length > 25) {
        await validateReq(existing);
      }
    }
    current++;
    saveCurrent(current);
  }

  if (current <= end) {
    submitQuery(current);
  } else {
    await checkLeftOverRecords();
    await downloadCSVFromServer(
      `Record of ${start}-${end} at ${new Date().toLocaleTimeString()}.csv`
    );

    const fullRange = getRange();
    const nextStart = end + 1;
    const nextEnd = Math.min(nextStart + 500, fullRange.end);

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
  addWhatsAppHelpButton();
  handleSnapshotPage();
} else if (location.href.includes("query.asp") && shouldRun && rangeSet) {
  handleQueryPage();
}
