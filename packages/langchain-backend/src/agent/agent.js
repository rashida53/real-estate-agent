import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  callSearchProperties,
  callGetListingDetails,
  callGetPropertyEstimate,
} from "../mcpClient.js";

const searchPropertiesSchema = z.object({
  city: z.string().min(1, "city is required"),
  beds: z.number().int().positive().optional(),
  maxPrice: z.number().positive().optional(),
  minPrice: z.number().positive().optional(),
  type: z.enum(["sale", "lease"]).optional().describe("Filter by sale or lease"),
  class: z.enum(["residential", "condo", "commercial"]).optional(),
  propertyType: z.string().optional().describe('e.g. "Detached", "Semi-Detached", "Townhouse"'),
  minBaths: z.number().positive().optional(),
  maxBaths: z.number().positive().optional(),
  minSqft: z.number().positive().optional(),
  maxSqft: z.number().positive().optional(),
  minYearBuilt: z.number().int().optional(),
  sortBy: z
    .enum(["listPriceAsc", "listPriceDesc", "bedsDesc", "sqftDesc", "updatedOnDesc"])
    .optional(),
  status: z.enum(["A", "U"]).optional().describe('Active or Unavailable listings'),
  lastStatus: z.string().optional().describe('e.g. "Sld" for recently sold'),
  neighborhood: z.string().optional(),
  resultsPerPage: z.number().int().positive().optional(),
});

const searchPropertiesTool = tool(
  async (args) => {
    const result = await callSearchProperties(args);
    return JSON.stringify(result);
  },
  {
    name: "search_properties",
    description:
      "Search real estate properties with flexible filters. Use when the user asks for listings, homes, rentals, or properties. Supports city, beds, price range, sale/lease type, property class/type, baths, sqft, year built, sorting, status, neighborhood, and results count.",
    schema: searchPropertiesSchema,
  }
);

const getListingDetailsSchema = z.object({
  mlsNumber: z.string().min(1, "mlsNumber is required"),
});

const getListingDetailsTool = tool(
  async ({ mlsNumber }) => {
    const result = await callGetListingDetails({ mlsNumber });
    return JSON.stringify(result);
  },
  {
    name: "get_listing_details",
    description:
      "Get full details for a single property listing by MLS number. Use when the user asks for more info about a specific property, room breakdown, taxes, listing agent, etc.",
    schema: getListingDetailsSchema,
  }
);

const getPropertyEstimateSchema = z.object({
  streetNumber: z.string(),
  streetName: z.string(),
  city: z.string(),
  zip: z.string(),
  numBedrooms: z.number(),
  numBathrooms: z.number(),
  sqft: z.number(),
  propertyType: z.string(),
  style: z.string(),
  yearBuilt: z.number().optional(),
  overallQuality: z.string().optional(),
});

const getPropertyEstimateTool = tool(
  async (args) => {
    const result = await callGetPropertyEstimate(args);
    return JSON.stringify(result);
  },
  {
    name: "get_property_estimate",
    description:
      "Get an AI-powered property value estimate given address and property attributes. Use when the user asks how much a property is worth or wants a valuation.",
    schema: getPropertyEstimateSchema,
  }
);

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0,
});

const allTools = [searchPropertiesTool, getListingDetailsTool, getPropertyEstimateTool];
const modelWithTools = model.bindTools(allTools);

// Each session stores flat (HumanMessage | plain AIMessage) pairs only.
// Tool-calling messages are NEVER persisted—they are only live inside a single
// runAgent call.  This guarantees we never send OpenAI a history that has an
// AIMessage-with-tool_calls without its matching ToolMessages.
const sessions = new Map();
const MAX_HISTORY_PAIRS = 6; // 6 human+assistant pairs = 12 messages

function getHistory(sessionId) {
  const existing = sessions.get(sessionId);
  return existing ? [...existing] : [];
}

function saveHistory(sessionId, currentMessages, newHuman, newAssistant) {
  const existing = getHistory(sessionId);
  // Append the new (human, assistant) pair
  const updated = [...existing, newHuman, newAssistant];
  // Trim to keep only the last MAX_HISTORY_PAIRS pairs (2 messages each)
  const maxMessages = MAX_HISTORY_PAIRS * 2;
  const trimmed =
    updated.length > maxMessages
      ? updated.slice(updated.length - maxMessages)
      : updated;
  sessions.set(sessionId, trimmed);
}

export async function runAgent(sessionId, userInput) {
  const history = getHistory(sessionId);
  const humanMessage = new HumanMessage(userInput);

  // Build the live message list for this turn only.
  // History contains only plain human+assistant messages.
  const messages = [
    new SystemMessage(
      "You are a helpful real estate assistant. You have the following tools:\n" +
        "- search_properties: Search listings with rich filters (city, beds, price, type sale/lease, property class, sqft, etc.)\n" +
        "- get_listing_details: Get full details for a single listing by MLS number\n" +
        "- get_property_estimate: Get an AI-powered property value estimate given address and attributes\n\n" +
        "IMPORTANT tool-selection rules:\n" +
        "- When a user asks for properties, locations, price ranges, bedrooms, or similar, call search_properties.\n" +
        "- When they ask about a specific property from previous results (e.g. 'tell me more about the 3rd one'), look up the MLS number from the search results in the conversation history and call get_listing_details. Do NOT re-call search_properties for follow-up questions about a single property.\n" +
        "- When they want a valuation, use get_property_estimate.\n\n" +
        "IMPORTANT response format rules:\n" +
        "- The UI automatically renders rich property cards (with images, price, beds, baths, sqft, etc.) below your message. NEVER repeat those details in your text.\n" +
        "- After a search, keep your reply SHORT: a one-sentence intro and optionally list just the addresses. Example: 'Here are 3 homes in Pflugerville under $350K.' Do NOT include price, beds, baths, sqft, descriptions, images, or links in your text—the cards show all of that.\n" +
        "- For get_listing_details responses, summarize the key highlights conversationally without dumping every field.\n" +
        "Otherwise, answer from your own knowledge."
    ),
    ...history,
    humanMessage,
  ];

  let finalAiMessage = null;
  let lastToolResult = null;
  const toolCallLog = []; // { name, args, resultCount }

  for (let step = 0; step < 3; step += 1) {
    const aiMessage = await modelWithTools.invoke(messages);
    messages.push(aiMessage);

    const toolCalls = aiMessage.tool_calls || [];

    if (!toolCalls.length) {
      finalAiMessage = aiMessage;
      break;
    }

    const toolSchemas = {
      search_properties: searchPropertiesSchema,
      get_listing_details: getListingDetailsSchema,
      get_property_estimate: getPropertyEstimateSchema,
    };

    const toolHandlers = {
      search_properties: callSearchProperties,
      get_listing_details: callGetListingDetails,
      get_property_estimate: callGetPropertyEstimate,
    };

    for (const toolCall of toolCalls) {
      let toolContent;

      const schema = toolSchemas[toolCall.name];
      const handler = toolHandlers[toolCall.name];

      if (!schema || !handler) {
        toolContent = JSON.stringify({
          error: true,
          code: "UNKNOWN_TOOL",
          message: `Tool "${toolCall.name}" is not available.`,
        });
      } else {
        const parseResult = schema.safeParse(toolCall.args || {});

        if (!parseResult.success) {
          toolContent = JSON.stringify({
            error: true,
            code: "VALIDATION_ERROR",
            message: `Invalid arguments for ${toolCall.name}.`,
          });
        } else {
          const toolResult = await handler(parseResult.data);

          if (toolCall.name === "search_properties") {
            lastToolResult = toolResult;
          }

          toolCallLog.push({
            name: toolCall.name,
            args: parseResult.data,
            resultCount: Array.isArray(toolResult?.properties)
              ? toolResult.properties.length
              : null,
          });

          toolContent = JSON.stringify(toolResult);
        }
      }

      messages.push(
        new ToolMessage({
          content: toolContent,
          tool_call_id: toolCall.id,
        })
      );
    }
  }

  if (!finalAiMessage) {
    finalAiMessage = new AIMessage(
      "I was unable to complete your request. Please try again."
    );
  }

  let replyText = "";
  if (Array.isArray(finalAiMessage.content)) {
    replyText = finalAiMessage.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("\n")
      .trim();
  } else if (typeof finalAiMessage.content === "string") {
    replyText = finalAiMessage.content;
  } else {
    replyText = JSON.stringify(finalAiMessage.content);
  }

  // Build the text we persist to history. We append a compact reference of
  // search results (MLS + address) so the LLM can use get_listing_details on
  // follow-up turns instead of re-searching.
  let historyText = replyText;
  if (lastToolResult && Array.isArray(lastToolResult.properties) && lastToolResult.properties.length > 0) {
    const refs = lastToolResult.properties
      .map((p, i) => `${i + 1}. ${p.address} (MLS: ${p.mlsNumber || "N/A"})`)
      .join("\n");
    historyText += `\n\n[Search results for reference — use get_listing_details with the MLS number for follow-ups]\n${refs}`;
  }

  // Persist only the plain (human, final-assistant) pair — no tool artifacts.
  // Reconstruct a fresh AIMessage from the text content to guarantee no
  // tool_calls or additional_kwargs.tool_calls bleed into history, which
  // would cause OpenAI to reject the next turn with a 400 "tool_calls must
  // be followed by tool messages" error.
  saveHistory(sessionId, messages, humanMessage, new AIMessage(historyText));

  // Only show listing cards when search_properties was the primary action.
  // If detail/estimate tools were also called, it's a follow-up turn — skip cards.
  const calledNonSearchTool = toolCallLog.some(
    (tc) => tc.name !== "search_properties"
  );
  const properties =
    lastToolResult &&
    Array.isArray(lastToolResult.properties) &&
    !calledNonSearchTool
      ? lastToolResult.properties
      : null;

  return {
    reply: replyText,
    properties,
    toolCalls: toolCallLog,
  };
}
