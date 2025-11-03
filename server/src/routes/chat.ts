import { Request, Response, Router } from 'express';
import { taxAgent } from '../services/tax-agent';
import { ChatRequest, ChatResponse } from '../types';

const router = Router();

/**
 * POST /api/chat
 * Send a message to the tax assistant agent
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {message, conversationHistory}: ChatRequest = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
                timestamp: new Date().toISOString(),
            } as ChatResponse);
        }

        // Get response from tax agent
        const response = await taxAgent.chat(message, conversationHistory);

        res.json(response as ChatResponse);
    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process chat message',
            timestamp: new Date().toISOString(),
        } as ChatResponse);
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
        const {message, conversationHistory}: ChatRequest = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
                timestamp: new Date().toISOString(),
            });
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Send initial connection message
        res.write(`data: ${JSON.stringify({type: 'connected', timestamp: new Date().toISOString()})}\n\n`);

        try {
            // Get the full stream with tool support
            const fullStream = taxAgent.streamChatWithTools(message, conversationHistory);

            console.log('🔄 Starting stream for message:', message);

// -------------
            for await (const event of fullStream) {
                console.log("📦 Stream event received:", {
                    type: event.type,
                    eventKeys: Object.keys(event),
                    event: event
                });

                switch (event.type) {
                    /** ------------------------------
                     *  🧠 Reasoning Phase (new models)
                     * ------------------------------ */
                    case "start":
                    case "step-start":
                    case "reasoning-start":
                        // These mark the beginning of a reasoning or step phase
                        console.log(`🧩 ${event.type} event from agent:`, event.payload);
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

                    /** ------------------------------
                     *  💬 Text generation (streaming)
                     * ------------------------------ */
                    case "text-start":
                        console.log("📝 Text stream started:", event.payload);
                        break;

                    case "text-delta": {
                        const textChunk = event.payload?.text ?? (event as any).textDelta ?? "";
                        console.log("💬 Text chunk:", textChunk);
                        res.write(`data: ${JSON.stringify({
                            type: "chunk",
                            content: textChunk,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    /** ------------------------------
                     *  🛠️ Tool calls
                     * ------------------------------ */
                    case "tool-call": {
                        const toolEvent = event as any;
                        console.log({toolEvent});
                        console.log("🔧 Tool call detected:", {
                            toolName: toolEvent.payload.toolName,
                            toolCallId: toolEvent.payload.toolCallId,
                            args: toolEvent.payload.args
                        });
                        res.write(`data: ${JSON.stringify({
                            type: "tool-call",
                            toolName: toolEvent.payload.toolName,
                            toolCallId: toolEvent.payload.toolCallId,
                            args: toolEvent.payload.args,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    case "tool-result": {
                        const resultEvent = event as any;
                        console.log({resultEvent});
                        console.log("✅ Tool result received:", {
                            toolCallId: resultEvent.payload.toolCallId,
                            toolName: resultEvent.payload.toolName,
                            result: resultEvent.payload.result
                        });
                        res.write(`data: ${JSON.stringify({
                            type: "tool-result",
                            toolCallId: resultEvent.payload.toolCallId,
                            toolName: resultEvent.payload.toolName,
                            result: resultEvent.payload.result,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    /** ------------------------------
                     *  🏁 Finish / Stream Complete
                     * ------------------------------ */
                    case "finish": {
                        console.log({event}, "Finish")
                        const finishReason = (event as any).finishReason ?? "unknown";
                        res.write(`data: ${JSON.stringify({
                            type: "done",
                            finishReason,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        break;
                    }

                    /** ------------------------------
                     *  ❓ Unknown / Future Event Types
                     * ------------------------------ */
                    default: {
                        // OpenAI may introduce new delta types (e.g., image-delta, tool-status)
                        console.warn("❓ Unknown event type:", event.type, event);
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

            console.log('✅ Stream completed successfully');

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

/**
 * POST /api/chat/generate-form
 * Generate tax form based on user data
 */
router.post('/generate-form', async (req: Request, res: Response) => {
    try {
        const {taxData} = req.body;

        if (!taxData) {
            return res.status(400).json({
                success: false,
                error: 'Tax data is required',
                timestamp: new Date().toISOString(),
            });
        }

        const response = await taxAgent.generateTaxForm(taxData);

        res.json(response);
    } catch (error: any) {
        console.error('Generate form error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate tax form',
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
