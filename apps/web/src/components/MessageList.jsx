import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import ListingCard from "./ListingCard.jsx";
import ToolCallBadge from "./ToolCallBadge.jsx";

function MessageBubble({ role, text }) {
  const isUser = role === "user";

  return (
    <div className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}>
      <div className={`message-bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
        {isUser ? (
          text
        ) : (
          <ReactMarkdown
            components={{
              a: (props) => (
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                <a {...props} target="_blank" rel="noreferrer" />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function MessageList({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isLoading]);

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="empty-state">
          <h2>Ask about homes, prices, or neighborhoods</h2>
          <p>
            For example: <span>"Show me 3-bedroom homes in Austin under 600k"</span>
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className="message-block">
          <MessageBubble role={msg.role} text={msg.text} />
          {msg.role === "assistant" && (
            <>
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <ToolCallBadge toolCalls={msg.toolCalls} />
              )}
              {Array.isArray(msg.properties) && msg.properties.length > 0 && (
                <div className="properties-grid">
                  {msg.properties.map((prop, index) => (
                    <ListingCard
                      // eslint-disable-next-line react/no-array-index-key
                      key={`${msg.id}-prop-${index}`}
                      property={prop}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="message-row message-row-assistant">
          <div className="message-bubble bubble-assistant">
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
