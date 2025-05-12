function loadFingerprintJS() {
  return new Promise((resolve, reject) => {
    if (window.FingerprintJS) return resolve(window.FingerprintJS);

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.umd.min.js"; // UMD build
    script.onload = () => resolve(window.FingerprintJS);
    script.onerror = () => reject("Failed to load FingerprintJS");
    document.head.appendChild(script);
  });
}

export async function getFingerprint() {
  const FingerprintJS = await loadFingerprintJS();
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}
