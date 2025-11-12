import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// AI-powered description generation using Gemini Vision
async function generateDescriptionWithAI(title: string, imageUrl: string, mode?: string): Promise<string> {
    const API_KEY = process.env.GEMINI_DESCRIPTION_API_KEY || process.env.GEMINI_TAGGING_API_KEY || process.env.GEMINI_API_KEY;

    console.log("🎨 [GEMINI] Generating description for:", { title, imageUrl, mode });

    // If API key is missing, return error message
    if (!API_KEY) {
        return "AI API key not configured. Please set GEMINI_DESCRIPTION_API_KEY in environment variables.";
    }

    try {
        // Initialize Gemini with the API key
        const genAIInstance = new GoogleGenerativeAI(API_KEY);

        // Try different models in order of preference
        const modelsToTry = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-pro"];

        for (const modelName of modelsToTry) {
            try {
                console.log(`📤 [GEMINI] Trying model: ${modelName}`);

                const model = genAIInstance.getGenerativeModel({ model: modelName });

                // Fetch and prepare image
                let imagePart = null;
                try {
                    const imageResponse = await fetch(imageUrl);
                    if (imageResponse.ok) {
                        const imageBuffer = await imageResponse.arrayBuffer();
                        const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

                        imagePart = {
                            inlineData: {
                                data: Buffer.from(imageBuffer).toString('base64'),
                                mimeType: mimeType
                            }
                        };
                    }
                } catch (imageError) {
                    console.warn("⚠️ [GEMINI] Could not fetch image, proceeding with text-only:", imageError instanceof Error ? imageError.message : String(imageError));
                }

                const modeText = mode ? `Mode: ${mode}` : '';
                const actionText = mode === 'requesting'
                    ? 'Write a description that clearly states what you are looking for and what you are willing to pay or offer.'
                    : 'Write a description that highlights what you are selling and why someone should buy it.';

                const prompt = `You are a professional marketplace description writer. Analyze the provided content and create a compelling, realistic product description.

${modeText}
Title: "${title}"

Key requirements:
- Focus on what the ${mode === 'requesting' ? 'buyer wants to find' : 'seller is offering'}
- Highlight practical benefits and value
- Keep it concise but informative (2-3 sentences)
- Use persuasive but honest language
- Make it sound like a real marketplace listing
- Be specific and realistic based on the title and image
- ${mode === 'requesting' ? 'Clearly state what you are looking for and any specific requirements' : 'Emphasize the value and appeal of what you are selling'}

${actionText}`;

                let result;
                if (imagePart) {
                    // Use multimodal content with image and text
                    result = await model.generateContent([imagePart, prompt]);
                } else {
                    // Text-only content
                    result = await model.generateContent(prompt);
                }
                const response = await result.response;
                const description = response.text().trim();

                if (description && description.length > 10) {
                    console.log("✅ [GEMINI] Description generated successfully with model:", modelName);
                    return description;
                }

            } catch (modelError) {
                console.warn(`⚠️ [GEMINI] Model ${modelName} failed:`, modelError instanceof Error ? modelError.message : String(modelError));
                continue; // Try next model
            }
        }

        // If all models failed
        return "AI description generation failed. All Gemini models returned errors. Please check your API key configuration.";

    } catch (error) {
        console.error("❌ [GEMINI] Description generation failed:", error);
        return `AI Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
}

// Keyword-based fallback description generation
function generateDescriptionFromKeywords(title: string): string {
    const titleLower = title.toLowerCase()

    // Common patterns for different product types
    if (titleLower.includes('netflix') || titleLower.includes('subscription')) {
        return 'Premium streaming account with unlimited access to movies, TV shows, and exclusive content. Perfect for entertainment lovers!'
    }

    if (titleLower.includes('spotify') || titleLower.includes('music')) {
        return 'Ad-free music streaming with millions of songs, playlists, and podcasts. Elevate your listening experience!'
    }

    if (titleLower.includes('canva') || titleLower.includes('design')) {
        return 'Professional design tool with templates, graphics, and creative assets. Create stunning visuals effortlessly!'
    }

    if (titleLower.includes('chatgpt') || titleLower.includes('ai') || titleLower.includes('gpt')) {
        return 'Advanced AI assistant for writing, coding, and creative tasks. Boost your productivity with intelligent conversations!'
    }

    if (titleLower.includes('gaming') || titleLower.includes('game')) {
        return 'Premium gaming account with exclusive content, skins, and early access. Level up your gaming experience!'
    }

    if (titleLower.includes('software') || titleLower.includes('tool')) {
        return 'Professional software license with full features and updates. Essential tool for productivity and creativity!'
    }

    if (titleLower.includes('coupon') || titleLower.includes('voucher') || titleLower.includes('discount') || titleLower.includes('code') || titleLower.includes('offer')) {
        if (titleLower.includes('swiggy')) {
            return 'Swiggy discount codes for delicious food delivery. Get up to 50% off on your favorite restaurants and cuisines. Valid for all users!'
        }
        if (titleLower.includes('amazon')) {
            return 'Amazon coupon codes for shopping savings. Enjoy discounts on electronics, fashion, home essentials and more. Easy redemption at checkout!'
        }
        if (titleLower.includes('zomato') || titleLower.includes('food')) {
            return 'Food delivery discount codes for your favorite restaurants. Save on pizza, burgers, biryani and more. Limited time offers!'
        }
        if (titleLower.includes('netflix') || titleLower.includes('streaming')) {
            return 'Entertainment discount codes for movies and shows. Get premium access at reduced prices. Perfect for binge-watching!'
        }
        return 'Exclusive discount codes for amazing savings. Apply these promo codes at checkout for instant discounts on your purchases!'
    }

    // Generic fallback - make it more realistic
    return `Get instant access to ${title.toLowerCase()} with all premium features included. Perfect for anyone looking to enhance their experience!`
}

export async function POST(req: Request) {
    try {
        const { title, imageUrl, mode } = await req.json()

        if (!title || !imageUrl) {
            return NextResponse.json(
                { error: 'Title and imageUrl are required' },
                { status: 400 }
            )
        }

        // Use AI-powered description generation
        const aiDescription = await generateDescriptionWithAI(title, imageUrl, mode)

        return NextResponse.json({ aiDescription })
    } catch (error) {
        console.error('Error generating description:', error)
        return NextResponse.json(
            { error: 'Failed to generate description' },
            { status: 500 }
        )
    }
}

// Test endpoint to check environment variables
export async function GET() {
    return NextResponse.json({
        GEMINI_DESCRIPTION_API_KEY: process.env.GEMINI_DESCRIPTION_API_KEY ? "SET" : "NOT SET",
        GEMINI_TAGGING_API_KEY: process.env.GEMINI_TAGGING_API_KEY ? "SET" : "NOT SET",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "SET" : "NOT SET",
        description_key_length: process.env.GEMINI_DESCRIPTION_API_KEY?.length || 0,
        tagging_key_length: process.env.GEMINI_TAGGING_API_KEY?.length || 0,
        fallback_key_length: process.env.GEMINI_API_KEY?.length || 0
    })
}
