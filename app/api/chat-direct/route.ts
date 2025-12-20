import type { Message } from "ai";
import {
  supabaseServer,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { z } from "zod";
import { streamChatCompletion } from "@/lib/direct-llm-client";

export const maxDuration = 300;

const MESSAGE_WINDOW_SIZE = 10;

type Location = {
  city: string;
  latitude: number;
  longitude: number;
};

export async function POST(req: Request) {
  let body: {
    messages: Message[];
    scoutId: string;
    location: Location | null;
  };

  try {
    body = await req.json();
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, scoutId, location } = body;

  // Auth check + scout ownership + scout data
  const supabase = await createServerSupabaseClient();
  const [authResult, scoutResult] = await Promise.all([
    supabase.auth.getUser(),
    supabaseServer.from("scouts").select("*").eq("id", scoutId).single(),
  ]);

  const user = authResult.data?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: scoutData, error: scoutError } = scoutResult;
  if (scoutError || !scoutData || scoutData.user_id !== user.id) {
    return new Response(
      JSON.stringify({ error: "Scout not found or unauthorized" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const currentScout = scoutData;

  // Save user message
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      const content = lastMessage.content;
      if (content) {
        await supabaseServer.from("scout_messages").insert({
          scout_id: scoutId,
          role: "user",
          content,
        });
      }
    }
  }

  // Apply message windowing
  const windowedMessages = messages.slice(-MESSAGE_WINDOW_SIZE);

  // System prompt
  const systemPrompt = `You are an intelligent assistant that helps users create "Scouts" - automated monitoring and search tasks.

**User's Detected Location:** ${location ? `${location.city} (${location.latitude}, ${location.longitude})` : "Not available"}

**Current Scout Status:**
${currentScout.title ? `- Title: ${currentScout.title}` : "- Title: Not set"}
${currentScout.goal ? `- Goal: ${currentScout.goal}` : "- Goal: Not set"}
${currentScout.description ? `- Description: ${currentScout.description}` : "- Description: Not set"}
${currentScout.location ? `- Location: ${currentScout.location.city}` : "- Location: Not set"}
${currentScout.search_queries?.length > 0 ? `- Search Queries: ${JSON.stringify(currentScout.search_queries)}` : "- Search Queries: Not set"}
${currentScout.frequency ? `- Frequency: ${currentScout.frequency}` : "- Frequency: Not set"}

**CRITICAL RULES:**

1. **ALWAYS RESPOND WITH TEXT:**
   - ALWAYS provide a brief text response to the user, even when calling tools
   - After calling update_scout_config, briefly acknowledge what you've done (e.g., "Got it! I've set that up.")
   - Keep your responses SHORT - one sentence is enough
   - NEVER leave the user with no response

2. **UPDATE SCOUT IMMEDIATELY:**
   - INSTANTLY call update_scout_config as soon as you understand what the user wants
   - DO NOT ask for confirmation before updating - just do it
   - From ANY request, you MUST immediately update ALL of these fields:
     * title: Short 2-4 word name (e.g., "AI News", "Coffee Shops SF")
     * goal: What they want to track (e.g., "Track new AI news and developments")
     * description: Detailed explanation (e.g., "Monitor and alert about new artificial intelligence news, breakthroughs, and developments")
     * search_queries: 3-5 diverse search terms to maximize coverage (e.g., ["AI news", "artificial intelligence news", "AI developments"])
   - These 4 fields can ALWAYS be inferred from the user's request - fill them ALL in your first tool call
   - ONLY ask the user for location (if not inferable) and frequency
   - NEVER set is_active to true - only the user can activate via the UI button

3. **DON'T BE REDUNDANT:**
   - The UI shows a checklist of what's been filled in - you don't need to repeat this
   - DO NOT list what you've saved or configured
   - ONLY ask for missing information that you cannot infer
   - Keep responses SHORT and focused on getting missing info

4. **LOCATION HANDLING:**
   - **DEFAULT to "any" for non-location-specific topics** (news, trends, tech updates, etc.)
   - **ONLY use detected location if user explicitly mentions**: "near me", "in my area", "in my town", "in my city", "locally", etc.
   - Examples:
     * "Find recent AI news" → INSTANTLY set location to {city: "any", latitude: 0, longitude: 0}
     * "Track tech trends" → INSTANTLY set location to {city: "any", latitude: 0, longitude: 0}
     * "Alert me about new restaurants" → ASK: "Where should I monitor? (You can say 'anywhere' or 'any' for global searches)"
     * "Alert me about new restaurants near me" → INSTANTLY use detected location
     * "Alert me about new restaurants in SF" → INSTANTLY use San Francisco
     * "Alert me about restaurants anywhere" → INSTANTLY set location to {city: "any", latitude: 0, longitude: 0}
   - **Never assume detected location should be used** unless explicitly requested
   - If user says "anywhere", "any", "globally", or similar → use {city: "any", latitude: 0, longitude: 0}

5. **TITLE MUST BE SHORT:**
   - Title: 2-4 words MAX, describing what's being tracked
   - ✅ "New Restaurants", "Indian Restaurants", "Pizza SF", "Coffee Shops"
   - ❌ "Alert me whenever a new restaurant opens up"
   - Extract the core subject, remove filler words

6. **EXAMPLE FLOW:**
   User: "Alert me about new Indian restaurants"
   AI: [INSTANTLY calls update_scout_config with:
        title: "Indian Restaurants",
        goal: "Track new Indian restaurant openings",
        description: "Monitor and alert about new Indian restaurants opening in the area",
        search_queries: ["new Indian restaurants", "Indian restaurant openings", "Indian cuisine", "Indian food", "Indian dining"]
       ] "Where should I monitor?"
   User: "San Francisco"
   AI: [calls update_scout_config with location] "How often - daily, every 3 days, or weekly?"
   User: "Every 3 days"
   AI: [calls update_scout_config with frequency] "Done! Click the green button to activate."

7. **BE CONCISE:**
   - Short, direct questions for missing info
   - No need to confirm what you saved (the UI shows it)
   - Just ask for what's needed next

8. **Frequency Options (use human-friendly language):**
   - "daily" - Say "once a day" or "daily"
   - "every_3_days" - Say "every 3 days" or "every three days"
   - "weekly" - Say "once a week" or "weekly"
   - NEVER use technical formats like "every_3_days" with underscores when talking to users

9. **IMPORTANT - HUMAN-FRIENDLY COMMUNICATION:**
   - You are talking to regular users, NOT developers
   - NEVER use technical terms, variable names, or code-like formats
   - NEVER use underscores in your responses (e.g., say "every 3 days" not "every_3_days")
   - Use natural, conversational language
   - Format options as readable text (e.g., "daily, every 3 days, or weekly")

Be conversational and helpful. When scout is complete, tell user they can modify anything by chatting with you. Never use em dashes (—)`;

  // Define update_scout_config tool
  const updateScoutConfigTool = {
    type: "function" as const,
    function: {
      name: "update_scout_config",
      description:
        "Update the scout configuration with new information gathered from the user",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "A short, descriptive name for the scout",
          },
          goal: {
            type: "string",
            description: "What the scout is trying to monitor or find",
          },
          description: {
            type: "string",
            description: "A detailed explanation of what this scout does",
          },
          location: {
            type: "object",
            properties: {
              city: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
            },
            description: "The geographic location for the scout",
          },
          search_queries: {
            type: "array",
            items: { type: "string" },
            maxItems: 5,
            description: "3-5 diverse search terms to maximize coverage (max 5)",
          },
          frequency: {
            type: "string",
            enum: ["daily", "every_3_days", "weekly"],
            description: "How often the scout should run",
          },
        },
      },
    },
  };

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      const toolCallsToExecute: any[] = [];

      try {
        // Stream from LLM
        for await (const chunk of streamChatCompletion({
          apiKey: process.env.OPENAI_API_KEY!,
          baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: windowedMessages,
          system: systemPrompt,
          tools: [updateScoutConfigTool],
        })) {
          if (chunk.type === "text-delta") {
            // Stream text to client
            controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk.textDelta)}\n`));
          } else if (chunk.type === "finish") {
            fullText = chunk.text;

            // Execute tool calls if any
            if (chunk.toolCalls && chunk.toolCalls.length > 0) {
              for (const toolCall of chunk.toolCalls) {
                if (toolCall.function.name === "update_scout_config") {
                  try {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log("[DIRECT API] Tool call args:", args);

                    // Update scout
                    const { error } = await supabaseServer
                      .from("scouts")
                      .update(args)
                      .eq("id", scoutId);

                    if (error) {
                      console.error("[DIRECT API] Scout update error:", error);
                    } else {
                      console.log("[DIRECT API] Scout updated successfully");

                      // Check if complete
                      const merged = { ...currentScout, ...args };
                      const isComplete =
                        merged.title &&
                        merged.goal &&
                        merged.description &&
                        merged.location &&
                        (merged.search_queries?.length ?? 0) > 0 &&
                        merged.frequency;

                      console.log("[DIRECT API] Scout complete:", isComplete);
                    }
                  } catch (e) {
                    console.error("[DIRECT API] Tool execution error:", e);
                  }
                }
              }
            }

            // Save assistant message
            // If model called tools but didn't provide text, add a brief confirmation
            console.log("[DIRECT API] DEBUG - fullText:", JSON.stringify(fullText), "type:", typeof fullText, "length:", fullText.length);
            console.log("[DIRECT API] DEBUG - toolCalls exists:", !!chunk.toolCalls, "count:", chunk.toolCalls?.length || 0);
            console.log("[DIRECT API] DEBUG - condition check: !fullText =", !fullText, "has toolCalls =", !!(chunk.toolCalls && chunk.toolCalls.length > 0));

            let messageToSave = fullText;
            let usedFallback = false;

            if (!fullText && chunk.toolCalls && chunk.toolCalls.length > 0) {
              messageToSave = "Got it! I've updated the configuration.";
              usedFallback = true;
              console.log("[DIRECT API] No text from model, using fallback message");

              // Stream the fallback message to client since model didn't provide any text
              controller.enqueue(encoder.encode(`0:${JSON.stringify(messageToSave)}\n`));
            }

            console.log("[DIRECT API] Saving assistant message, text:", messageToSave, "usedFallback:", usedFallback);
            if (messageToSave) {
              await supabaseServer.from("scout_messages").insert({
                scout_id: scoutId,
                role: "assistant",
                content: messageToSave,
              });
            }
          }
        }

        controller.enqueue(encoder.encode(`d:{}\n`));
        controller.close();
      } catch (error) {
        console.error("[DIRECT API] Stream error:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
