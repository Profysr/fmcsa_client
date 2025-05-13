import { sessionKeys } from "../utils/constants.js";

export const STORAGE = {
  currentKey: "fmcsa_current_mx_number",
  rangeKey: "fmcsa_range",
  runFlag: "fmcsa_should_run",
  rangeSetFlag: "fmcsa_range_set",
};

export const getRange = () =>
  JSON.parse(localStorage.getItem(STORAGE.rangeKey) || "{}");

export const getCurrent = () =>
  parseInt(localStorage.getItem(STORAGE.currentKey));

export const saveCurrent = (num) =>
  localStorage.setItem(STORAGE.currentKey, num);

export const clearAllStorage = () =>
  Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));

export const shouldRun = localStorage.getItem(STORAGE.runFlag) === "true";

export const rangeSet = localStorage.getItem(STORAGE.rangeSetFlag) === "true";

export function validateSessionStorage() {
  const { token, tokenExpiry, fingerprint } = sessionKeys;

  const tokenValue = sessionStorage.getItem(token);
  const expiryValue = sessionStorage.getItem(tokenExpiry);
  const fingerprintValue = sessionStorage.getItem(fingerprint);

  if (!tokenValue || !expiryValue || !fingerprintValue) return false;

  return Date.now() < parseInt(expiryValue, 10);
}
