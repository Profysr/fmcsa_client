function loadFingerprintJS() {
  return new Promise((resolve, reject) => {
    if (window.FingerprintJS) return resolve(window.FingerprintJS);

    const script = document.createElement("script");
    script.src = "https://openfpcdn.io/fingerprintjs/v3";
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
