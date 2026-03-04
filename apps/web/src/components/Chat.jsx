import React, { useState } from "react";
import MessageList from "./MessageList.jsx";
import InputBar from "./InputBar.jsx";

async function postChatMessage({ message, sessionId }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      sessionId ? { message, sessionId } : { message }
    ),
  });

  if (!res.ok) {
    throw new Error("Failed to send message");
  }

  return res.json();
}

function Chat() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return;

    setError(null);

    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const data = await postChatMessage({ message: text.trim(), sessionId });

      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: data.reply || "",
        properties: Array.isArray(data.properties) ? data.properties : [],
        toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <MessageList messages={messages} isLoading={isLoading} />
      {error && <div className="error-banner">{error}</div>}
      <InputBar onSend={handleSend} disabled={isLoading} />
    </div>
  );
}

export default Chat;

