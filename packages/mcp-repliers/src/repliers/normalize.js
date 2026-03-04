// Normalization logic: raw Repliers listing -> simplified property shape.
// The Repliers API nests many fields under a `details` sub-object, so we
// check both top-level and details for each field.

function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function safeNum(val) {
  if (val === undefined || val === null || val === "") return null;
  // Handle range strings like "1500-2000" by taking the lower bound
  if (typeof val === "string" && val.includes("-")) {
    const lower = Number(val.split("-")[0]);
    return Number.isNaN(lower) ? null : lower;
  }
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

export function normalizeListing(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const details = raw.details || {};
  const addressObj = raw.address || {};

  const streetParts = [addressObj.streetNumber, addressObj.streetName]
    .filter(Boolean)
    .join(" ")
    .trim();

  let address = streetParts;

  if (addressObj.city) {
    address = address ? `${address}, ${addressObj.city}` : addressObj.city;
  }

  const state = addressObj.state || addressObj.stateOrProvince;
  if (state) {
    address = address ? `${address}, ${state}` : state;
  }

  if (!address) {
    const fallbackParts = [
      addressObj.city,
      addressObj.area,
      addressObj.district,
    ].filter(Boolean);
    address = fallbackParts.join(", ");
  }

  const price = safeNum(firstDefined(raw.listPrice));

  const beds =
    safeNum(firstDefined(
      details.numBedroomsTotal,
      raw.numBedroomsTotal,
      details.numBedrooms,
      raw.numBedrooms,
    )) ?? 0;

  const bedsPlus = safeNum(firstDefined(details.numBedroomsPlus, raw.numBedroomsPlus));

  const baths =
    safeNum(firstDefined(
      details.numBathrooms,
      raw.numBathrooms,
    )) ?? 0;

  const sqft = safeNum(firstDefined(
    details.sqft,
    raw.sqft,
    details.livingArea,
    raw.livingArea,
  ));

  let listingUrl = raw.listingUrl || raw.url || null;
  if (!listingUrl && raw.mlsNumber) {
    listingUrl = `https://example.com/listings/${encodeURIComponent(
      String(raw.mlsNumber)
    )}`;
  }
  if (!listingUrl) {
    listingUrl = "N/A";
  }

  const mlsNumber = raw.mlsNumber ? String(raw.mlsNumber) : null;

  // Normalize type to lowercase so "Sale"→"sale", "Lease"→"lease"
  const rawType = firstDefined(raw.type, details.type);
  const type = typeof rawType === "string" ? rawType.toLowerCase() : null;

  // Prefer details.propertyType ("Detached", "Townhouse") over top-level
  // propertyType which is often a class/type combo like "Residential Lease"
  const propertyType = firstDefined(
    details.propertyType,
    details.style,
    raw.propertyType,
  );

  const daysOnMarket = safeNum(firstDefined(raw.daysOnMarket, details.daysOnMarket));

  const description = firstDefined(raw.description, raw.remarks, details.description);

  let imageUrl = null;
  const imgSource = Array.isArray(raw.images) ? raw.images : Array.isArray(raw.photos) ? raw.photos : null;
  if (imgSource && imgSource.length > 0) {
    const first = imgSource[0];
    let rawUrl = typeof first === "string" ? first : first?.url || first?.src || first?.href || null;
    if (rawUrl && !rawUrl.startsWith("http")) {
      rawUrl = `https://cdn.repliers.io/${rawUrl}`;
    }
    imageUrl = rawUrl;
  }

  if (!address || price === null) {
    return null;
  }

  return {
    mlsNumber,
    address,
    price,
    beds: bedsPlus ? beds + bedsPlus : beds,
    baths,
    sqft,
    type,
    propertyType,
    daysOnMarket,
    description,
    imageUrl,
    listingUrl,
  };
}

