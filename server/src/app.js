
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Live Results API is running",
  });
});

// Fetch results securely from the provider
app.get("/api/results", async (req, res) => {
  const apiUrl = process.env.RESULT_API_URL;
  const apiKey = process.env.RESULT_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.status(500).json({
      success: false,
      message: "Results API configuration is missing.",
    });
  }

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const payload = response.data;

    if (!Array.isArray(payload?.data)) {
      return res.status(502).json({
        success: false,
        message: "The results provider returned an unexpected response.",
      });
    }

    // Return only the fields needed by the results website.
    const results = payload.data.map((item) => ({
      name: item.market ?? item.name ?? "Unknown market",
      slug: item.slug ?? "",
      session: item.session ?? "",
      openTime: item.openTime ?? "",
      closeTime: item.closeTime ?? "",
      resultDate: item.resultDate ?? "",
      openPana: item.openPana ?? null,
      openAnk: item.openAnk ?? null,
      closePana: item.closePana ?? null,
      closeAnk: item.closeAnk ?? null,
      jodi: item.jodi ?? null,
      resultString: item.resultString ?? "",
      isComplete: Boolean(item.isComplete),
      status: item.status ?? "pending",
      verified: item.verified ?? false,
      publishedAt: item.publishedAt ?? null,
    }));

    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      total: results.length,
      results,
      date: payload.date ?? null,
      cachedAt: payload.cachedAt ?? null,
    });
  } catch (error) {
    const status = error.response?.status;

    console.error(
      "Results API request failed:",
      status ?? error.code ?? error.message
    );

    if (status === 401 || status === 403) {
      return res.status(status).json({
        success: false,
        message:
          status === 401
            ? "API authentication failed. Check the API key."
            : "API access denied. Check your plan and domain verification.",
      });
    }

    return res.status(status === 404 ? 502 : 502).json({
      success: false,
      message:
        "Unable to retrieve results right now. Please try again later.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
