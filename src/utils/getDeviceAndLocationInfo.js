export async function getDeviceAndLocationInfo() {
  const info = {
    deviceMemory: navigator.deviceMemory || "Unknown",
    hardwareConcurrency: navigator.hardwareConcurrency || "Unknown",
    platform: navigator.platform || "Unknown",
    productSub: navigator.productSub || "Unknown",
    userAgent: navigator.userAgent || "Unknown",
    gpu: "Unknown",
    latitude: null,
    longitude: null,
  };

  // Try to get GPU info using WebGL
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        info.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    console.warn("GPU detection failed:", e);
  }

  // Try to get geolocation
  try {
    if ("geolocation" in navigator) {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      info.latitude = position.coords.latitude;
      info.longitude = position.coords.longitude;
    } else {
      console.warn("Geolocation not supported.");
    }
  } catch (err) {
    console.warn("Geolocation error:", err.message);
  }

  return info;
}
