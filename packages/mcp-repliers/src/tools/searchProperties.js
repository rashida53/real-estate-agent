import { z } from "zod";
import { searchListings } from "../repliers/client.js";
import { normalizeListing } from "../repliers/normalize.js";
import { ERROR_CODES, createError, toStructuredError } from "../repliers/errors.js";

export const searchPropertiesInputSchema = z.object({
  city: z.string().min(1, "city is required"),
  beds: z.number().int().positive().optional(),
  maxPrice: z.number().positive().optional(),
  minPrice: z.number().positive().optional(),
  type: z.enum(["sale", "lease"]).optional(),
  class: z.enum(["residential", "condo", "commercial"]).optional(),
  propertyType: z.string().optional(),
  minBaths: z.number().positive().optional(),
  maxBaths: z.number().positive().optional(),
  minSqft: z.number().positive().optional(),
  maxSqft: z.number().positive().optional(),
  minYearBuilt: z.number().int().optional(),
  sortBy: z
    .enum(["listPriceAsc", "listPriceDesc", "bedsDesc", "sqftDesc", "updatedOnDesc"])
    .optional(),
  status: z.enum(["A", "U"]).optional(),
  lastStatus: z.string().optional(),
  neighborhood: z.string().optional().describe(
    'Exact MLS neighborhood name (e.g. "Hyde Park", "Mueller", "Barton Hills"). ' +
    'Do NOT use broad directional areas — they will return 0 results.'
  ),
  resultsPerPage: z.number().int().positive().optional(),
});

export const searchPropertiesOutputSchema = z.object({
  properties: z.array(
    z.object({
      mlsNumber: z.string().nullable(),
      address: z.string(),
      price: z.number(),
      beds: z.number(),
      baths: z.number(),
      sqft: z.number().nullable(),
      type: z.string().nullable(),
      propertyType: z.string().nullable(),
      daysOnMarket: z.number().nullable(),
      description: z.string().nullable(),
      listingUrl: z.string(),
    })
  ),
});

export function registerSearchPropertiesTool(server) {
  server.registerTool(
    "search_properties",
    {
      title: "Search Properties",
      description:
        "Search real estate properties with flexible filters: city (required), beds, price range, sale/lease type, property class/type, baths, sqft, year built, sorting, status, neighborhood, and results count.",
      inputSchema: searchPropertiesInputSchema,
      outputSchema: searchPropertiesOutputSchema,
    },
    async (args) => {
      const parseResult = searchPropertiesInputSchema.safeParse(args || {});
      if (!parseResult.success) {
        throw createError(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid search_properties arguments",
          {
            issues: parseResult.error.issues,
          }
        );
      }

      const params = parseResult.data;

      try {
        const raw = await searchListings({
          city: params.city,
          minBedrooms: typeof params.beds === "number" ? params.beds : undefined,
          maxPrice: params.maxPrice,
          minPrice: params.minPrice,
          type: params.type,
          class: params.class,
          propertyType: params.propertyType,
          minBaths: params.minBaths,
          maxBaths: params.maxBaths,
          minSqft: params.minSqft,
          maxSqft: params.maxSqft,
          minYearBuilt: params.minYearBuilt,
          sortBy: params.sortBy,
          status: params.status,
          lastStatus: params.lastStatus,
          neighborhood: params.neighborhood,
          resultsPerPage: params.resultsPerPage,
        });

        const normalized = (raw.listings || [])
          .map((listing) => normalizeListing(listing))
          .filter((item) => item !== null);

        const structured = {
          properties: normalized,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(structured),
            },
          ],
          structuredContent: structured,
        };
      } catch (err) {
        const structuredError = toStructuredError(err);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(structuredError),
            },
          ],
          structuredContent: structuredError,
        };
      }
    }
  );
}

