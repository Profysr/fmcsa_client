import { apiFetch } from "../api/customApi.js";

export async function downloadCSVFromServer(filename = "data.csv") {
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const res = await apiFetch("/api/download-csv");
    console.log("res: ", res);
    if (!res.ok) throw new Error(res);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    alert(`CSV download failed:, ${err}`);
  }
}
