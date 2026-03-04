import React from "react";
import Chat from "./components/Chat.jsx";

function App() {
  return (
    <div className="app-root">
      <div className="app-shell">
        <header className="app-header">
          <div className="logo-circle">RA</div>
          <div>
            <h1 className="app-title">Real Estate Agent</h1>
            <p className="app-subtitle">
              Ask in natural language and let the agent search live properties.
            </p>
          </div>
        </header>
        <main className="app-main">
          <Chat />
        </main>
      </div>
    </div>
  );
}

export default App;

