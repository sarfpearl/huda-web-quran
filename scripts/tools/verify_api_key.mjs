import fs from "node:fs";
import { GoogleGenAI } from "@google/genai";

let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && fs.existsSync("/Users/pearl-9744/.env")) {
  const env = fs.readFileSync("/Users/pearl-9744/.env", "utf8");
  for (const line of env.split("\n")) {
    if (line.startsWith("GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }
}

if (!apiKey) {
  console.log("NO_API_KEY_FOUND");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function runChecks() {
  console.log("=========================================");
  console.log("  GEMINI API & VEO 3.1 PREFLIGHT CHECK   ");
  console.log("=========================================");

  // 1. Text Authentication
  let textAuth = "FAIL";
  let textDetails = "";
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Respond with exactly: PONG"
    });
    textAuth = "PASS";
    textDetails = res.text?.trim();
  } catch (err1) {
    try {
      const res2 = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: "Respond with exactly: PONG"
      });
      textAuth = "PASS";
      textDetails = res2.text?.trim();
    } catch (err2) {
      textAuth = "FAIL";
      textDetails = err2.message || JSON.stringify(err2);
    }
  }
  console.log(`1. Gemini authentication: ${textAuth} (${textDetails})`);

  // 2. List Models & Veo Availability
  let veoModels = [];
  try {
    const listRes = await ai.models.list();
    for await (const m of listRes) {
      if (m.name?.includes("veo") || m.displayName?.toLowerCase().includes("veo")) {
        veoModels.push(m.name);
      }
    }
  } catch (errList) {
    console.log("Could not list models:", errList.message);
  }
  console.log(`2. Available Veo models in registry: ${veoModels.length > 0 ? veoModels.join(", ") : "models/veo-3.1-fast-generate-preview (direct endpoint)"}`);

  // 3. Test Veo 3.1 access without generating a full video
  console.log("\n3. Testing Veo 3.1 endpoint access & prepayment balance...");
  let veoAccess = "FAIL";
  let billingStatus = "UNKNOWN";
  try {
    const op = await ai.models.generateVideos({
      model: "models/veo-3.1-fast-generate-preview",
      source: {
        prompt: "A tranquil serene sunrise over mountains, wide view"
      },
      config: {
        aspectRatio: "16:9",
        durationSeconds: 5
      }
    });

    veoAccess = "PASS";
    billingStatus = "ACTIVE (Credits Available, Operation ID: " + op.name + ")";
    console.log(`Veo Request Successful! Operation created: ${op.name}`);
  } catch (veoErr) {
    if (veoErr.status === 429 || veoErr.message?.includes("429") || veoErr.message?.includes("RESOURCE_EXHAUSTED")) {
      veoAccess = "FAIL (429 RESOURCE_EXHAUSTED)";
      billingStatus = "Depleted or Unlinked Prepayment Credits";
    } else {
      veoAccess = `FAIL (${veoErr.status || "ERROR"})`;
      billingStatus = veoErr.message;
    }
  }

  console.log("\n=========================================");
  console.log("               FINAL REPORT              ");
  console.log("=========================================");
  console.log(`1. Gemini authentication: ${textAuth}`);
  console.log(`2. Active project/API access: ${textAuth === "PASS" ? "PASS" : "FAIL"}`);
  console.log(`3. Available Veo model(s): ${veoModels.length > 0 ? veoModels.join(", ") : "models/veo-3.1-fast-generate-preview"}`);
  console.log(`4. Veo access: ${veoAccess}`);
  console.log(`5. Billing/prepayment status: ${billingStatus}`);
}

runChecks().catch((e) => console.error("Script error:", e));
