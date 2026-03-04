import "dotenv/config";
import express from "express";
import chatRouter from "./routes/chat.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.use("/api", chatRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`LangChain backend listening on http://localhost:${port}`);
});

