import express from "express";
import crypto from "node:crypto";
import { runAgent } from "../agent/agent.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};

    if (!message || typeof message !== "string") {
      res.status(400).json({
        error: "BAD_REQUEST",
        message: "Request body must include a non-empty 'message' string.",
      });
      return;
    }

    const effectiveSessionId = sessionId || crypto.randomUUID();

    const result = await runAgent(effectiveSessionId, message);

    res.json({
      sessionId: effectiveSessionId,
      reply: result.reply,
      properties: result.properties,
      toolCalls: result.toolCalls,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error handling /api/chat:", err);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to process chat request.",
    });
  }
});

export default router;

