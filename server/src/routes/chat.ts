import { Request, Response, Router } from 'express';
import { taxAgent } from '../agent';
import { ChatRequest, ChatResponse } from '../types';
import { mongoMemory } from '../services/mongodb-memory';

// Type definition for stream events
interface StreamEvent {
    type: 'start' | 'step-start' | 'reasoning-start' | 'reasoning-delta' | 'reasoning-finish' |
          'step-finish' | 'text-start' | 'text-delta' | 'text-finish' |
          'tool-call' | 'tool-result' | 'error' | 'finish' | string;
    payload?: {
        text?: string;
        toolName?: string;
        toolCallId?: string;
        args?: Record<string, any>;
        result?: any;
        error?: string;
        [key: string]: any;
    };
    finishReason?: string;
    error?: string;
    textDelta?: string;
    [key: string]: any;
}

const router = Router();

/**
 * GET /api/chat/conversations
 * Get all conversations (for sidebar)
 */
router.get('/conversations', async (req: Request, res: Response) => {
    try {
        const conversations = await mongoMemory.getAllConversations(undefined, 50);

        res.json({
            success: true,
            conversations: conversations.map(conv => ({
                conversationId: conv.conversationId,
                title: conv.title,
                taxYear: conv.taxYear,
                metadata: conv.metadata,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt,
            })),
        });
    } catch (error: any) {
        console.error('[Chat] Failed to get conversations:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to retrieve conversations',
        });
    }
});

/**
 * GET /api/chat/conversations/:id
 * Get specific conversation with messages
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.id;
        const messages = await mongoMemory.getHistory(conversationId, 200);

        res.json({
            success: true,
            conversationId,
            messages,
        });
    } catch (error: any) {
        console.error('[Chat] Failed to get conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to retrieve conversation',
        });
    }
});

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.id;
        await mongoMemory.deleteConversation(conversationId);

        res.json({
            success: true,
            message: 'Conversation deleted',
        });
    } catch (error: any) {
        console.error('[Chat] Failed to delete conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete conversation',
        });
    }
});

/**
 * POST /api/chat/stream-with-tools
 * Stream chat responses with tool calling support
 * Handles tool calls and allows user confirmation
 */
router.post('/stream-with-tools', async (req: Request, res: Response) => {
    console.log(req.body);
    try {
        const {message, conversationHistory, conversationId: requestConversationId}: ChatRequest & { conversationId?: string } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
                timestamp: new Date().toISOString(),
            });
        }

        // Get or create conversation and load history
        let conversationId = requestConversationId;
        conversationId = await mongoMemory.getOrCreateConversation(requestConversationId);

        // Save user message to database
        await mongoMemory.saveMessage(conversationId, {
            role: 'user',
            content: message,
        });

        // Load conversation history from database
        const dbHistory = await mongoMemory.getHistory(conversationId);
        console.log(`[Chat] Loaded ${dbHistory.length} messages from MongoDB for conversation ${conversationId}`);

        // Use database history if available, otherwise fall back to request history
        const effectiveHistory = dbHistory.length > 0 ? dbHistory : (conversationHistory || []);

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Send initial connection message with conversationId
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            conversationId: conversationId,
            timestamp: new Date().toISOString()
        })}\n\n`);

        try {
            // Get the full stream with tool support using effective history
            // Updated to support Mastra Memory: threadId, resourceId, conversationHistory
            const fullStream = taxAgent.streamChatWithTools(
                message,
                conversationId, // Use conversationId as threadId
                undefined, // resourceId (not used in legacy route)
                effectiveHistory // conversation history for fallback
            );

            // Collect assistant response for saving to database
            let assistantResponse = '';
            const toolCalls: any[] = [];

            console.log('Starting stream for message:', message);

            for await (const rawEvent of fullStream) {
                const event = rawEvent as StreamEvent;

                // Check if response is still writable (client hasn't disconnected)
                if (!res.writable) {
                    console.log('Client disconnected - stopping stream');
                    break;
                }

                console.log("Stream event received:", {
                    type: event.type,
                    eventKeys: Object.keys(event),
                    event: event
                });

                const eventType = event.type as string;
                switch (eventType) {
                    /** ------------------------------
                     *  Reasoning Phase (new models)
                     * ------------------------------ */
                    case "start":
                    case "step-start":
                    case "reasoning-start":
                        // These mark the beginning of a reasoning or step phase
                        console.log(`${event.type} event from agent:`, event.payload);
                        break;

                    case "reasoning-delta": {
                        const reasoningText = event.payload?.text ?? "";
                        console.log("🧠 Reasoning:", reasoningText);
                        res.write(`data: ${JSON.stringify({
                            type: "reasoning",
                            content: reasoningText,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    case "reasoning-finish":
                        res.write(`data: ${JSON.stringify({
                            type: "reasoning-finish",
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;

                    case "step-finish":
                        res.write(`data: ${JSON.stringify({
                            type: "step-finish",
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;

                    /** ------------------------------
                     *  Text generation (streaming)
                     * ------------------------------ */
                    case "text-start":
                        console.log("ext stream started:", event.payload);
                        break;

                    case "text-delta": {
                        const textChunk = event.payload?.text ?? event.textDelta ?? "";
                        assistantResponse += textChunk; // Collect for saving to DB
                        console.log("Text chunk:", textChunk);
                        res.write(`data: ${JSON.stringify({
                            type: "chunk",
                            content: textChunk,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    case "text-finish":
                        console.log("Text generation completed");
                        res.write(`data: ${JSON.stringify({
                            type: "text-finish",
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;

                    /** ------------------------------
                     *  Tool calls
                     * ------------------------------ */
                    case "tool-call": {
                        console.log("Tool call detected:", {event});
                        // Collect tool calls for saving to DB
                        toolCalls.push({
                            toolName: event.payload?.toolName,
                            toolCallId: event.payload?.toolCallId,
                            args: event.payload?.args,
                        });
                        res.write(`data: ${JSON.stringify({
                            type: "tool-call",
                            toolName: event.payload?.toolName,
                            toolCallId: event.payload?.toolCallId,
                            args: event.payload?.args,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    case "tool-result": {
                        console.log({event});
                        console.log("Tool result received:", {event});
                        // Update tool call with result
                        const toolCall = toolCalls.find(tc => tc.toolCallId === event.payload?.toolCallId);
                        if (toolCall) {
                            toolCall.result = event.payload?.result;
                        }
                        res.write(`data: ${JSON.stringify({
                            type: "tool-result",
                            toolCallId: event.payload?.toolCallId,
                            toolName: event.payload?.toolName,
                            result: event.payload?.result,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    /** ------------------------------
                     * Error Handling
                     * ------------------------------ */
                    case "error": {
                        console.error("Stream error event:", event);
                        res.write(`data: ${JSON.stringify({
                            type: "error",
                            error: event.payload?.error || event.error || "Unknown error",
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    /** ------------------------------
                     *  Finish / Stream Complete
                     * ------------------------------ */
                    case "finish": {
                        console.log({event}, "Finish")
                        const finishReason = event.finishReason ?? "unknown";
                        res.write(`data: ${JSON.stringify({
                            type: "done",
                            finishReason,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    /** ------------------------------
                     *  Unknown / Future Event Types
                     * ------------------------------ */
                    default: {
                        // OpenAI may introduce new delta types (e.g., image-delta, tool-status)
                        console.warn("Unknown event type:", event.type, event);
                        res.write(`data: ${JSON.stringify({
                            type: "unknown",
                            eventType: event.type,
                            raw: event,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }
                }
            }

            console.log('Stream completed successfully');

            // Save assistant response to database
            if (conversationId && assistantResponse.trim()) {
                await mongoMemory.saveMessage(conversationId, {
                    role: 'assistant',
                    content: assistantResponse,
                    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                });
                console.log(`[Chat] Saved assistant response to MongoDB for conversation ${conversationId}`);
            }

            res.end();
        } catch (streamError: any) {
            console.error('Streaming error:', streamError);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: streamError.message,
                timestamp: new Date().toISOString()
            })}\n\n`);
            res.end();
        }
    } catch (error: any) {
        console.error('Chat stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to start chat stream',
                timestamp: new Date().toISOString(),
            });
        }
    }
});


export default router;
