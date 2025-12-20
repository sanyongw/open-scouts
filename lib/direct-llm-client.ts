// Direct LLM client that bypasses AI SDK for better compatibility
import type { Message } from "ai";

interface Tool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: any;
  };
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

export async function* streamChatCompletion(params: {
  apiKey: string;
  baseURL: string;
  model: string;
  messages: Message[];
  system?: string;
  tools?: Tool[];
}) {
  const { apiKey, baseURL, model, messages, system, tools } = params;

  const fullMessages = system
    ? [{ role: "system" as const, content: system }, ...messages]
    : messages;

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      tools,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulatedText = "";
  const accumulatedToolCalls: Map<number, ToolCall> = new Map();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const jsonStr = trimmed.slice(6);
        const chunk: StreamChunk = JSON.parse(jsonStr);
        const delta = chunk.choices[0]?.delta;

        // Accumulate text content
        if (delta?.content) {
          accumulatedText += delta.content;
          yield { type: "text-delta" as const, textDelta: delta.content };
        }

        // Accumulate tool calls
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index;
            if (!accumulatedToolCalls.has(index)) {
              accumulatedToolCalls.set(index, {
                id: toolCallDelta.id || "",
                type: "function",
                function: {
                  name: toolCallDelta.function?.name || "",
                  arguments: toolCallDelta.function?.arguments || "",
                },
              });
            } else {
              const existing = accumulatedToolCalls.get(index)!;
              if (toolCallDelta.function?.name) {
                existing.function.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                existing.function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }

        // Finish
        if (chunk.choices[0]?.finish_reason) {
          yield {
            type: "finish" as const,
            finishReason: chunk.choices[0].finish_reason,
            text: accumulatedText,
            toolCalls: Array.from(accumulatedToolCalls.values()),
          };
        }
      } catch (e) {
        console.error("Failed to parse SSE chunk:", e, trimmed);
      }
    }
  }
}
