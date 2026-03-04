import fetch from "node-fetch";
import { ERROR_CODES, createError } from "./errors.js";

const REPLIERS_BASE_URL = "https://api.repliers.io";
const DEFAULT_TIMEOUT_MS = 10_000;

async function doFetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err && err.name === "AbortError") {
      throw createError(
        ERROR_CODES.UPSTREAM_ERROR,
        "Repliers request timed out"
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function handleResponseErrors(response, url, options, retryOnServerError, retryFn) {
  if (response.status === 401) {
    throw createError(ERROR_CODES.API_KEY_INVALID, "Repliers API key is invalid");
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after") || null;
    throw createError(ERROR_CODES.RATE_LIMITED, "Repliers rate limit hit", { retryAfter });
  }
  if (response.status >= 400 && response.status < 500) {
    throw createError(
      response.status === 404 ? ERROR_CODES.NOT_FOUND : ERROR_CODES.BAD_REQUEST,
      `Repliers request failed with status ${response.status}`
    );
  }
  if (response.status >= 500) {
    if (retryOnServerError) {
      return "RETRY";
    }
    throw createError(ERROR_CODES.UPSTREAM_ERROR, `Repliers server error with status ${response.status}`);
  }
  return "OK";
}

async function performRequest(url, options, retryOnServerError = true) {
  try {
    const response = await doFetchWithTimeout(url, options, DEFAULT_TIMEOUT_MS);
    const status = handleResponseErrors(response, url, options, retryOnServerError);
    if (status === "RETRY") {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      return performRequest(url, options, false);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.listings)) {
      throw createError(ERROR_CODES.INVALID_RESPONSE, "Repliers response missing listings array");
    }
    return data;
  } catch (err) {
    if (err && err.mcpError) throw err;
    throw createError(ERROR_CODES.UPSTREAM_ERROR, "Unexpected error calling Repliers API");
  }
}

async function performRequestGeneric(url, options, retryOnServerError = true) {
  try {
    const response = await doFetchWithTimeout(url, options, DEFAULT_TIMEOUT_MS);
    const status = handleResponseErrors(response, url, options, retryOnServerError);
    if (status === "RETRY") {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      return performRequestGeneric(url, options, false);
    }

    const data = await response.json();
    if (!data || typeof data !== "object") {
      throw createError(ERROR_CODES.INVALID_RESPONSE, "Repliers response is not a valid object");
    }
    return data;
  } catch (err) {
    if (err && err.mcpError) throw err;
    throw createError(ERROR_CODES.UPSTREAM_ERROR, "Unexpected error calling Repliers API");
  }
}

function getApiKey() {
  const apiKey = process.env.REPLIERS_API_KEY;
  if (!apiKey) {
    throw createError(
      ERROR_CODES.API_KEY_MISSING,
      "REPLIERS_API_KEY environment variable is not set"
    );
  }
  return apiKey;
}

function appendIfPresent(params, key, value) {
  if (value !== undefined && value !== null) {
    params.append(key, String(value));
  }
}

/**
 * Search Repliers listings using the constrained subset of filters
 * defined by the MCP tool contract.
 */
export async function searchListings({
  city,
  minBedrooms,
  maxPrice,
  minPrice,
  type,
  class: propClass,
  propertyType,
  minBaths,
  maxBaths,
  minSqft,
  maxSqft,
  minYearBuilt,
  sortBy,
  status,
  lastStatus,
  neighborhood,
  resultsPerPage,
}) {
  const apiKey = getApiKey();

  const params = new URLSearchParams();

  appendIfPresent(params, "city", city);
  appendIfPresent(params, "minBedrooms", minBedrooms);
  if (typeof maxPrice === "number") {
    params.append("maxPrice", String(Math.floor(maxPrice)));
  }
  if (typeof minPrice === "number") {
    params.append("minPrice", String(Math.floor(minPrice)));
  }
  appendIfPresent(params, "type", type);
  appendIfPresent(params, "class", propClass);
  appendIfPresent(params, "propertyType", propertyType);
  appendIfPresent(params, "minBathrooms", minBaths);
  appendIfPresent(params, "maxBathrooms", maxBaths);
  appendIfPresent(params, "minSqft", minSqft);
  appendIfPresent(params, "maxSqft", maxSqft);
  appendIfPresent(params, "minYearBuilt", minYearBuilt);
  appendIfPresent(params, "sortBy", sortBy);
  appendIfPresent(params, "status", status);
  appendIfPresent(params, "lastStatus", lastStatus);
  appendIfPresent(params, "neighborhood", neighborhood);

  params.append("resultsPerPage", String(resultsPerPage || 20));
  params.append("page", "1");

  const url = `${REPLIERS_BASE_URL}/listings?${params.toString()}`;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "REPLIERS-API-KEY": apiKey,
    },
    body: JSON.stringify({}),
  };

  return performRequest(url, options);
}

/**
 * Fetch a single listing by MLS number.
 */
export async function getListingByMls(mlsNumber) {
  const apiKey = getApiKey();

  const url = `${REPLIERS_BASE_URL}/listings/${encodeURIComponent(mlsNumber)}`;

  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "REPLIERS-API-KEY": apiKey,
    },
  };

  return performRequestGeneric(url, options);
}

/**
 * Get an AI-powered property value estimate.
 */
export async function createEstimate(params) {
  const apiKey = getApiKey();

  const url = `${REPLIERS_BASE_URL}/estimates`;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "REPLIERS-API-KEY": apiKey,
    },
    body: JSON.stringify(params),
  };

  return performRequestGeneric(url, options);
}

