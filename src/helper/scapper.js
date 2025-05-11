export function goToSnapshot() {
  location.href = "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx";
}

export function submitQuery(number) {
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
}

export function getFieldValue(el, labelText) {
  const labelElem = [...el.querySelectorAll("th")].find((th) =>
    th.textContent.trim().toUpperCase().includes(labelText.toUpperCase().trim())
  );
  return (
    labelElem?.nextElementSibling?.textContent.trim().toUpperCase() || null
  );
}
