export default {
  "name": "FMCSA Automation",
  "namespace": "Accuracare",
  "version": "2.0.1.4",
  "description": "Automate MC/MX number checks on FMCSA SAFER site with start range prompt and download it in csv file automatically",
  "author": "Bilal Ahmad",
  "match": [
    "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
    "https://safer.fmcsa.dot.gov/query.asp"
  ],
  "require": [
    "https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.umd.min.js"
  ],
  "grant": [
    "none"
  ],
  "updateURL": "https://raw.githubusercontent.com/Profysr/fmcsa_client/main/build/fmcsa-Automation.user.js",
  "downloadURL": "https://raw.githubusercontent.com/Profysr/fmcsa_client/main/build/fmcsa-Automation.user.js"
};
