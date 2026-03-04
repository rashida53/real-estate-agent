import React, { useState } from "react";

function formatArgs(args) {
  if (!args || typeof args !== "object") return "";
  const parts = [];
  if (args.city) parts.push(`city: ${args.city}`);
  if (args.beds) parts.push(`min beds: ${args.beds}`);
  if (args.maxPrice)
    parts.push(
      `max price: $${Number(args.maxPrice).toLocaleString()}`
    );
  return parts.join(" · ");
}

function ToolCallBadge({ toolCalls }) {
  const [expanded, setExpanded] = useState(false);

  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

  return (
    <div className="tool-call-row">
      {toolCalls.map((tc, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="tool-call-badge"
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        >
          <span className="tool-call-icon">⚙</span>
          <span className="tool-call-label">
            Called <strong>{tc.name}</strong>
            {tc.resultCount !== undefined && (
              <> · {tc.resultCount} result{tc.resultCount !== 1 ? "s" : ""}</>
            )}
          </span>
          <span className="tool-call-chevron">{expanded ? "▲" : "▼"}</span>
          {expanded && tc.args && (
            <span className="tool-call-args">{formatArgs(tc.args)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default ToolCallBadge;
