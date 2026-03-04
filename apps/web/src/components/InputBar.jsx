import React, { useState } from "react";

function InputBar({ onSend, disabled }) {
  const [value, setValue] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue("");
  };

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="input-field"
        placeholder="Ask about homes, neighborhoods, price ranges..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        className="send-button"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  );
}

export default InputBar;

