
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

// Configure allowed origins in server/.env or Render Environment.
const allowedOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local tools and server-to-server requests without an Origin.
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);

app.use(express.json());

// In-memory results cache, separated by requested date.
const resultsCache = new Map();
const CACHE_TTL_MS = 30_000;

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Live Results API is running",
  });
});

app.get("/api/results", async (req, res) => {
  const apiUrl = process.env.RESULT_API_URL;
  const apiKey = process.env.RESULT_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.status(500).json({
      success: false,
      message: "Results API configuration is missing.",
    });
  }

  // Validate the optional date parameter.
  const requestedDate =
    typeof req.query.date === "string" ? req.query.date : undefined;

  if (requestedDate) {
    const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);
    const parsedDate = new Date(`${requestedDate}T00:00:00Z`);

    if (
      !validFormat ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== requestedDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD.",
      });
    }
  }

  const cacheKey = requestedDate || "latest";
  const cached = resultsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return res.json({
      ...cached.data,
      cached: true,
    });
  }

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      params: requestedDate ? { date: requestedDate } : {},
      timeout: 15_000,
    });

    const payload = response.data;

    if (!Array.isArray(payload?.data)) {
      return res.status(502).json({
        success: false,
        message: "The results provider returned an unexpected response.",
      });
    }

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

    const responseBody = {
      success: true,
      total: results.length,
      results,
      date: payload.date ?? requestedDate ?? null,
      cachedAt: payload.cachedAt ?? null,
    };

    resultsCache.set(cacheKey, {
      data: responseBody,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // Prevent intermediary/browser caching; caching is handled by this server.
    res.set("Cache-Control", "no-store");

    return res.json({
      ...responseBody,
      cached: false,
    });
  } catch (error) {
    const status = error.response?.status;

    // Log provider diagnostics, but never log the API key.
    console.error("Results API request failed:", {
      status,
      code: error.code,
      message: error.message,
      providerResponse: error.response?.data,
    });

    if (status === 401 || status === 403) {
      return res.status(status).json({
        success: false,
        message:
          status === 401
            ? "API authentication failed. Check the API key."
            : "API access denied. Check the paid plan and domain verification.",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        success: false,
        message: "The results API rate limit was reached. Try again later.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "Unable to retrieve results right now. Please try again.",
    });
  }
});

// Handle CORS and other unexpected errors.
app.use((error, req, res, next) => {
  if (error.message?.startsWith("CORS blocked origin:")) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Server error:", error.message);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
