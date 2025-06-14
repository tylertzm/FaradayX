export const runPrediction = async () => {
  try {
    const res = await fetch('/site_integration/template_list', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();

    // Check for custom error codes
    if (data.code === 403) {
      throw new Error(data.msg || "Permission denied");
    }

    return data;
  } catch (err) {
    console.error("Request failed:", err);
    throw err; // Re-throw for component-level handling
  }
};
