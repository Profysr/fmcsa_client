// ==UserScript==
// @name         FMCSA Automation
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Automate MC/MX number checks on FMCSA SAFER site with start range prompt
// @match        https://safer.fmcsa.dot.gov/CompanySnapshot.aspx
// @match        https://safer.fmcsa.dot.gov/query.asp
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE = {
    currentKey: "fmcsa_current_mx_number",
    rangeKey: "fmcsa_range",
    runFlag: "fmcsa_should_run",
    rangeSetFlag: "fmcsa_range_set",
  };

  const validationChecks = {
    "Entity Type": "CARRIER",
    "USDOT Status": "ACTIVE",
    "Operating Authority Status": "AUTHORIZED FOR Property",
  };

  const requiredValues = [
    "Entity Type",
    "USDOT Status",
    "USDOT Number",
    "MCS-150 Form Date",
    "Operating Authority Status",
    "MC/MX/FF Number(s)",
    "Legal Name",
    "Physical Address",
    "Phone",
    "Mailing Address",
  ];

  // === MENU ACTION ===
  //     GM_registerMenuCommand("🚛 Start FMCSA Automation", () => {
  //         localStorage.setItem(STORAGE.runFlag, 'true');
  //         localStorage.removeItem(STORAGE.rangeSetFlag);
  //         location.href = "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx";
  //     });

  //     GM_registerMenuCommand("🛑 Stop FMCSA Automation", () => {
  //         Object.values(STORAGE).forEach(key => localStorage.removeItem(key));
  //     });

  const addFloatingToolbar = () => {
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
      location.href = "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx";
    });

    const stopBtn = createButton("🛑 Stop Automation", "#dc3545", () => {
      Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
      alert("🛑 FMCSA Automation stopped.");
    });

    toolbar.appendChild(startBtn);
    toolbar.appendChild(stopBtn);
    document.body.appendChild(toolbar);
  };

  addFloatingToolbar();

  const shouldRun = localStorage.getItem(STORAGE.runFlag) === "true";
  const rangeSet = localStorage.getItem(STORAGE.rangeSetFlag) === "true";

  const getRange = () =>
    JSON.parse(localStorage.getItem(STORAGE.rangeKey) || "{}");
  const getCurrent = () => parseInt(localStorage.getItem(STORAGE.currentKey));
  const getfmcsaRecords = () =>
    JSON.parse(localStorage.getItem("fmcsa_records") || "[]");
  const removefmcsaRecords = () => localStorage.removeItem("fmcsa_records");

  const saveCurrent = (num) => localStorage.setItem(STORAGE.currentKey, num);

  const goToSnapshot = () =>
    (location.href = "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx");

  const getFieldValue = (el, labelText) => {
    const labelElem = [...el.querySelectorAll("th")].find((th) =>
      th.textContent
        .trim()
        .toUpperCase()
        .includes(labelText.toUpperCase().trim())
    );
    return (
      labelElem?.nextElementSibling?.textContent.trim().toUpperCase() || null
    );
  };

  function downloadJSONAsCSV(jsonArray, filename = `data.csv`) {
    if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
      console.warn("Invalid or empty JSON data.");
      return;
    }

    const headers = Object.keys(jsonArray[0]);
    const csvRows = [headers.join(",")];

    for (const row of jsonArray) {
      const values = headers.map((header) => {
        let val = row[header] || "";

        // Sanitize value:
        val = val
          .toString()
          .replace(/"/g, '""') // Escape quotes for CSV
          .replace(/\n/g, " ") // Replace newlines with space
          .replace(/\u00A0/g, " ") // Replace non-breaking spaces
          .replace(/\s+/g, " ") // Collapse multiple spaces
          .trim(); // Trim leading/trailing spaces

        return `"${val}"`;
      });

      csvRows.push(values.join(","));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    removefmcsaRecords();
  }

  function validateActiveTable(el) {
    for (const [key, value] of Object.entries(validationChecks)) {
      const actual = getFieldValue(el, key);
      if (!actual || !actual.trim().includes(value.toUpperCase())) {
        // alert(`Actual: , ${actual}, key-value: ,${value}`)
        return false;
      }
    }
    const phone = getFieldValue(el, "Phone");
    if (!phone || phone.trim().length < 2) {
      return false;
    }

    return true;
  }

  const submitQuery = (number) => {
    const form = document.forms["QueryBox"];
    if (!form) return;

    const input = form.querySelector('[name="query_string"]');
    const mcRadio = form.querySelector('[name="query_param"][value="MC_MX"]');
    const submit = form.querySelector('[value="Search"][type="SUBMIT"]');

    if (input && mcRadio && submit) {
      mcRadio.checked = true;
      input.value = number;
      console.log(`🔁 Submitting MX number: ${number}`);
      submit.click();
    }
  };

  const showRangeForm = () => {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.5); z-index: 9998;
    `;
    document.body.appendChild(overlay);

    // Create form container
    const box = document.createElement("div");
    box.style = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #fff; border-radius: 12px; padding: 24px 32px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 9999;
        font-family: 'Segoe UI', sans-serif; min-width: 300px;
    `;

    // Inner HTML with improved spacing
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

    document.getElementById("startScan").addEventListener("click", () => {
      const start = parseInt(document.getElementById("startNum").value);
      const end = parseInt(document.getElementById("endNum").value);
      if (isNaN(start) || isNaN(end) || start > end) {
        alert("❌ Invalid range.");
        return;
      }
      localStorage.setItem(STORAGE.rangeKey, JSON.stringify({ start, end }));
      saveCurrent(start);
      localStorage.setItem(STORAGE.rangeSetFlag, "true");
      location.reload();
    });
  };

  const handleSnapshotPage = () => {
    if (shouldRun && !rangeSet) {
      showRangeForm();
      return;
    }

    if (shouldRun && rangeSet) {
      const { end } = getRange();
      const current = getCurrent();

      if (current <= end) {
        setTimeout(() => submitQuery(current), 2000);
      } else {
        alert("✅ Completed MX/MC range.");
        Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
      }
    }
  };

  const handleQueryPage = () => {
    const { end } = getRange();
    let current = getCurrent();
    // alert(`🔢 Current MX/MC Number: ${current}`);

    const table = document.querySelector("table");
    if (!table) return;

    const text = table.innerText;

    if (text.includes("Record Inactive") || text.includes("Record Not Found")) {
      console.log(`❌ MX ${current} is inactive.`);
      current++;
      saveCurrent(current);
      setTimeout(() => {
        goToSnapshot();
      }, 2000); // Go back to submit from CompanySnapshot
    } else if (text.includes("USDOT INFORMATION")) {
      console.log(`✅ Active record found for MX ${current}`);

      const isValid = validateActiveTable(table);
      if (isValid) {
        // alert(`validationChecks passed: ${isValid}`)
        const data = {};
        requiredValues.forEach((key) => {
          data[key] = getFieldValue(table, key) || "NOT FOUND";
        });

        const allData = getfmcsaRecords();
        // Check for duplicates based on USDOT Number
        const isDuplicate = allData.some(
          (item) => item["USDOT Number"] === data["USDOT Number"]
        );
        if (!isDuplicate) {
          allData.push(data);
          localStorage.setItem("fmcsa_records", JSON.stringify(allData));
        }
      }

      current++;
      saveCurrent(current);
    }

    if (current <= end) {
      setTimeout(() => submitQuery(current), 1500); // Resubmit directly
    } else {
      const { start, end } = getRange();
      downloadJSONAsCSV(
        getfmcsaRecords(),
        `Record of ${start}-${end} at ${new Date().toLocaleDateString()}.csv`
      );
      alert("✅ Finished checking all numbers.");

      Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
      setTimeout(() => {
        goToSnapshot();
      }, 2000); // Go back to submit from CompanySnapshot
    }
  };

  // Main Route Logic
  if (location.href.includes("CompanySnapshot.aspx")) {
    handleSnapshotPage();
  } else if (location.href.includes("query.asp") && shouldRun && rangeSet) {
    handleQueryPage();
  }
})();
