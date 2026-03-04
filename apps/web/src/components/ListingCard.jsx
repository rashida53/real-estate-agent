import React from "react";

function formatPrice(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toLocaleString()}`;
  }
}

function ListingCard({ property }) {
  const {
    address,
    price,
    beds,
    baths,
    sqft,
    type,
    propertyType,
    daysOnMarket,
    imageUrl,
    listingUrl,
  } = property || {};

  return (
    <article className="listing-card">
      {imageUrl && (
        <div className="listing-image-wrapper">
          <img
            src={imageUrl}
            alt={address || "Property"}
            className="listing-image"
            loading="lazy"
          />
        </div>
      )}
      <div className="listing-body">
        <header className="listing-header">
          <div className="listing-header-left">
            <h3 className="listing-address">{address || "Unknown address"}</h3>
            {(type || propertyType) && (
              <div className="listing-badges">
                {type && (
                  <span
                    className={`listing-type-badge ${
                      type === "lease" ? "badge-lease" : "badge-sale"
                    }`}
                  >
                    {type === "lease" ? "Lease" : "Sale"}
                  </span>
                )}
                {propertyType && (
                  <span className="listing-property-type">{propertyType}</span>
                )}
              </div>
            )}
          </div>
          <div className="listing-price">{formatPrice(price)}</div>
        </header>
        <div className="listing-meta">
          <span>{beds ?? 0} bd</span>
          <span>{baths ?? 0} ba</span>
          <span>{sqft ? `${sqft.toLocaleString()} sqft` : "Size N/A"}</span>
          {daysOnMarket != null && <span>{daysOnMarket} DOM</span>}
        </div>
        <footer className="listing-footer">
          {listingUrl && listingUrl !== "N/A" ? (
            <a
              href={listingUrl}
              target="_blank"
              rel="noreferrer"
              className="listing-link"
            >
              View details
            </a>
          ) : (
            <span className="listing-link listing-link-disabled">
              Details unavailable
            </span>
          )}
        </footer>
      </div>
    </article>
  );
}

export default ListingCard;

