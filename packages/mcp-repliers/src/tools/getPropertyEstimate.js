import { z } from "zod";
import { createEstimate } from "../repliers/client.js";
import { ERROR_CODES, createError, toStructuredError } from "../repliers/errors.js";

export const getPropertyEstimateInputSchema = z.object({
  streetNumber: z.string().min(1),
  streetName: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  numBedrooms: z.number(),
  numBathrooms: z.number(),
  sqft: z.number(),
  propertyType: z.string(),
  style: z.string(),
  yearBuilt: z.number().optional(),
  overallQuality: z.string().optional(),
});

function normalizeEstimate(raw) {
  if (!raw || typeof raw !== "object") return null;

  const safeNum = (val) => {
    if (val === undefined || val === null) return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  };

  return {
    estimatedValue: safeNum(raw.estimatedValue) ?? safeNum(raw.estimate) ?? safeNum(raw.value),
    confidenceLow: safeNum(raw.confidenceLow) ?? safeNum(raw.low),
    confidenceHigh: safeNum(raw.confidenceHigh) ?? safeNum(raw.high),
    comparables: Array.isArray(raw.comparables)
      ? raw.comparables.map((c) => ({
          address: c.address || null,
          price: safeNum(c.price) ?? safeNum(c.soldPrice),
          sqft: safeNum(c.sqft),
          beds: safeNum(c.beds) ?? safeNum(c.numBedrooms),
          baths: safeNum(c.baths) ?? safeNum(c.numBathrooms),
        }))
      : [],
  };
}

export function registerGetPropertyEstimateTool(server) {
  server.registerTool(
    "get_property_estimate",
    {
      title: "Get Property Estimate",
      description:
        "Get an AI-powered property value estimate given address and property attributes like bedrooms, bathrooms, sqft, type, and style.",
      inputSchema: getPropertyEstimateInputSchema,
    },
    async (args) => {
      const parseResult = getPropertyEstimateInputSchema.safeParse(args || {});
      if (!parseResult.success) {
        throw createError(ERROR_CODES.VALIDATION_ERROR, "Invalid get_property_estimate arguments", {
          issues: parseResult.error.issues,
        });
      }

      try {
        const raw = await createEstimate(parseResult.data);
        const estimate = normalizeEstimate(raw);

        return {
          content: [{ type: "text", text: JSON.stringify(estimate) }],
          structuredContent: estimate,
        };
      } catch (err) {
        const structuredError = toStructuredError(err);
        return {
          content: [{ type: "text", text: JSON.stringify(structuredError) }],
          structuredContent: structuredError,
        };
      }
    }
  );
}
