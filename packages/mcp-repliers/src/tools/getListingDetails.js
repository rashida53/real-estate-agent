import { z } from "zod";
import { getListingByMls } from "../repliers/client.js";
import { ERROR_CODES, createError, toStructuredError } from "../repliers/errors.js";

export const getListingDetailsInputSchema = z.object({
  mlsNumber: z.string().min(1, "mlsNumber is required"),
});

function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function safeNum(val) {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "string" && val.includes("-")) {
    const lower = Number(val.split("-")[0]);
    return Number.isNaN(lower) ? null : lower;
  }
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function normalizeListingDetails(raw) {
  if (!raw || typeof raw !== "object") return null;

  const det = raw.details || {};
  const addr = raw.address || {};
  const streetParts = [addr.streetNumber, addr.streetName].filter(Boolean).join(" ").trim();
  let address = streetParts;
  if (addr.city) address = address ? `${address}, ${addr.city}` : addr.city;
  const state = addr.state || addr.stateOrProvince;
  if (state) address = address ? `${address}, ${state}` : state;
  if (addr.zip) address = address ? `${address} ${addr.zip}` : addr.zip;

  const rooms = Array.isArray(raw.rooms)
    ? raw.rooms.map((r) => ({
        name: r.name || r.description || "Unknown",
        level: r.level || null,
        dimensions: r.dimensions || r.size || null,
      }))
    : [];

  const images = Array.isArray(raw.images)
    ? raw.images.slice(0, 3).map((img) => {
        let url = typeof img === "string" ? img : img?.url || img?.src || null;
        if (url && !url.startsWith("http")) url = `https://cdn.repliers.io/${url}`;
        return url;
      }).filter(Boolean)
    : [];

  const rawType = firstDefined(raw.type, det.type);

  return {
    mlsNumber: raw.mlsNumber ? String(raw.mlsNumber) : null,
    address,
    price: safeNum(raw.listPrice),
    beds: safeNum(firstDefined(det.numBedroomsTotal, raw.numBedroomsTotal, det.numBedrooms, raw.numBedrooms)) ?? 0,
    baths: safeNum(firstDefined(det.numBathrooms, raw.numBathrooms)) ?? 0,
    sqft: safeNum(firstDefined(det.sqft, raw.sqft, det.livingArea, raw.livingArea)),
    description: firstDefined(raw.description, raw.remarks, det.description),
    rooms,
    lotSize: firstDefined(raw.lot?.size, raw.lotSize, det.lotSize),
    taxes: safeNum(firstDefined(raw.taxes?.annualAmount, raw.taxes)),
    yearBuilt: safeNum(firstDefined(det.yearBuilt, raw.yearBuilt)),
    images,
    daysOnMarket: safeNum(firstDefined(raw.daysOnMarket, det.daysOnMarket)),
    type: typeof rawType === "string" ? rawType.toLowerCase() : null,
    propertyType: firstDefined(det.propertyType, det.style, raw.propertyType),
    style: firstDefined(det.style, raw.style),
    listingAgent: firstDefined(raw.listingAgent?.name, raw.agent?.name),
    brokerage: firstDefined(raw.listingAgent?.brokerage, raw.brokerage),
    openHouse: Array.isArray(raw.openHouse)
      ? raw.openHouse.map((oh) => ({ date: oh.date, startTime: oh.startTime, endTime: oh.endTime }))
      : [],
    listingUrl: firstDefined(raw.listingUrl, raw.url),
  };
}

export function registerGetListingDetailsTool(server) {
  server.registerTool(
    "get_listing_details",
    {
      title: "Get Listing Details",
      description:
        "Get full details for a single property listing by MLS number, including rooms, taxes, images, and listing agent info.",
      inputSchema: getListingDetailsInputSchema,
    },
    async (args) => {
      const parseResult = getListingDetailsInputSchema.safeParse(args || {});
      if (!parseResult.success) {
        throw createError(ERROR_CODES.VALIDATION_ERROR, "Invalid get_listing_details arguments", {
          issues: parseResult.error.issues,
        });
      }

      const { mlsNumber } = parseResult.data;

      try {
        const raw = await getListingByMls(mlsNumber);
        const details = normalizeListingDetails(raw);

        return {
          content: [{ type: "text", text: JSON.stringify(details) }],
          structuredContent: details,
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
