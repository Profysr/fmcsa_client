import { getFieldValue } from "./scapper.js";

export const validationChecks = {
  "Entity Type": "CARRIER",
  "USDOT Status": "ACTIVE",
  "Operating Authority Status": "AUTHORIZED FOR Property",
};

// export const validateActiveTableRecord = (record) => {
//   console.log("record: ", record);

//   for (const [key, value] of Object.entries(validationChecks)) {
//     const actual = record[key].toUpperCase();
//     if (actual !== value.toUpperCase()) {
//       return false;
//     }
//   }

//   const phone = record["Phone"];
//   return phone && phone.trim().length >= 2;
// };

export function validateActiveTable(el) {
  for (const [key, value] of Object.entries(validationChecks)) {
    const actual = getFieldValue(el, key);
    if (!actual || !actual.trim().includes(value.toUpperCase())) {
      return false;
    }
  }

  const phone = getFieldValue(el, "Phone");
  if (!phone || phone.trim().length < 2) {
    return false;
  }

  return true;
}
