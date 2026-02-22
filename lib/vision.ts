// lib/vision.ts
import fetch from "node-fetch";

const TRUNCATE_LEN = 1500;
const VERBOSE = process.env.VERBOSE_LOGGING === "true" || process.env.VERBOSE_LOGGING === "1";

function truncate(str: string | undefined, n = TRUNCATE_LEN) {
  if (!str) return "";
  return str.length > n ? `${str.slice(0, n)}... [truncated ${str.length - n} chars]` : str;
}

function maskUrl(url: string) {
  return url.replace(/(key=)[^&]+/, "$1REDACTED");
}

export async function extractText(buffer: Buffer, isPdf: boolean, requestId?: string) {
  const start = Date.now();
  const base64File = buffer.toString("base64");

  const endpoint = isPdf
    ? "https://vision.googleapis.com/v1/files:annotate"
    : "https://vision.googleapis.com/v1/images:annotate";

  const body = isPdf
    ? {
        requests: [
          {
            inputConfig: {
              mimeType: "application/pdf",
              content: base64File,
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
              },
            ],
          },
        ],
      }
    : {
        requests: [
          {
            image: { content: base64File },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      };

  const url = `${endpoint}?key=${process.env.GOOGLE_VISION_API_KEY}`;
  try {
    console.log(`[${requestId}] [vision] => request: endpoint=${isPdf ? "files:annotate" : "images:annotate"}, payload.requests=${(body as any).requests.length}`);
    if (VERBOSE) {
      console.log(`[${requestId}] [vision] payload (truncated): ${truncate(JSON.stringify(body))}`);
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - start;
    let respText: string | undefined;
    let data: any;
    try {
      respText = await resp.text();
      // Try parse JSON safely
      try {
        data = JSON.parse(respText);
      } catch {
        data = null;
      }
    } catch (err) {
      console.error(`[${requestId}] [vision] failed to read response body`, err);
      throw err;
    }

    console.log(
      `[${requestId}] [vision] response: status=${resp.status} (${resp.statusText}), timeMs=${elapsed}, url=${maskUrl(url)}`
    );

    if (VERBOSE) {
      console.log(`[${requestId}] [vision] raw response (truncated): ${truncate(respText)}`);
    } else {
      // If not verbose, still show top-level error if present
      if (data?.error) {
        console.log(`[${requestId}] [vision] error: ${JSON.stringify(data.error)}`);
      }
    }

    // If API returned error object
    if (data?.error) {
      throw new Error(`Vision API error: ${JSON.stringify(data.error)}`);
    }

    // For files:annotate Google may return responses array or longrunningOperation — log both
    const maybeText =
      data?.responses?.[0]?.fullTextAnnotation?.text ||
      // If responses empty, try to examine outputConfig / async
      (data?.responses?.length === 0 ? "" : "");

    if (maybeText) {
      console.log(
        `[${requestId}] [vision] extractedText length=${maybeText.length}, sample: ${truncate(maybeText, 500)}`
      );
      return maybeText;
    }

    // If nothing in fullTextAnnotation, try alternative fields a bit (safety)
    // e.g., for image detection there might be textAnnotations[0].description
    const altText = data?.responses?.[0]?.textAnnotations?.[0]?.description;
    if (altText) {
      console.log(
        `[${requestId}] [vision] alt extractedText length=${altText.length}, sample: ${truncate(altText, 500)}`
      );
      return altText;
    }

    // No text found — return empty but log significant fields to help debugging
    console.log(`[${requestId}] [vision] no text found in response. responses keys: ${JSON.stringify(Object.keys(data || {}))}`);
    return "";
  } catch (err: any) {
    console.error(`[${requestId}] [vision] request failed:`, err?.message || err);
    throw err;
  }
}