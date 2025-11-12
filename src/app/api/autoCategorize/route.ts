import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function classifyCategory(title: string, description: string, imageUrl?: string): Promise<string> {
    const API_KEY = process.env.GEMINI_TAGGING_API_KEY || process.env.GEMINI_API_KEY;
    const text = `${title} ${description}`.toLowerCase();

    console.log("🔍 [GEMINI] Classifying:", { title, description, imageUrl });
    console.log("🔑 [GEMINI] API_KEY exists:", !!API_KEY, "value length:", API_KEY?.length || 0);

    // If API key is missing, use keyword-based fallback
    if (!API_KEY) {
        console.warn("❌ [GEMINI] API key missing - using keyword fallback");
        return keywordBasedClassification(text);
    }

    try {
        // Initialize Gemini with the API key
        const genAIInstance = new GoogleGenerativeAI(API_KEY);

        // Try different models in order of preference
        const modelsToTry = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-pro"];

        for (const modelName of modelsToTry) {
            try {
                console.log(`📤 [GEMINI] Trying model: ${modelName} for categorization`);

                const model = genAIInstance.getGenerativeModel({ model: modelName });

                // Fetch and prepare image if provided
                let imagePart = null;
                if (imageUrl) {
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
                        console.warn("⚠️ [GEMINI] Could not fetch image for categorization, proceeding with text-only:", imageError instanceof Error ? imageError.message : String(imageError));
                    }
                }

                const prompt = `You are a classification AI for a digital marketplace. Analyze the provided content (including any images) and choose **exactly one** of these categories:
["All", "Subscription", "Templates", "Coupon Code", "Art", "Others"].

Consider the visual content, title, and description to determine the most appropriate category.

Output only the category name — no punctuation or explanations.

Title: "${title}"
Description: "${description}"`;

                let result;
                if (imagePart) {
                    // Use multimodal content with image and text
                    result = await model.generateContent([imagePart, prompt]);
                } else {
                    // Text-only content
                    result = await model.generateContent(prompt);
                }

                const response = await result.response;
                const category = response.text().trim();

                console.log("📊 [GEMINI] API result:", category);

                // Validate that the response is one of our expected categories
                const validCategories = ["All", "Subscription", "Templates", "Coupon Code", "Art", "Others"];
                if (validCategories.includes(category)) {
                    console.log("✅ [GEMINI] Classified as:", category);
                    return category;
                } else {
                    console.warn("⚠️ [GEMINI] Unexpected category:", category, "- trying next model");
                    continue; // Try next model
                }

            } catch (modelError) {
                console.warn(`⚠️ [GEMINI] Model ${modelName} failed for categorization:`, modelError instanceof Error ? modelError.message : String(modelError));
                continue; // Try next model
            }
        }

        // If all models failed, fall back to keyword classification
        console.log("🔄 [GEMINI] All models failed, falling back to keyword-based classification");
        return keywordBasedClassification(text);

    } catch (error) {
        console.error("❌ [GEMINI] Category classification failed:", error);
        console.log("🔄 [GEMINI] Falling back to keyword-based classification");
        return keywordBasedClassification(text);
    }
}

// Keyword-based fallback classification
function keywordBasedClassification(text: string): string {
    console.log("🔤 [KEYWORD] Analyzing text:", text);

    // Coupon Code keywords (highest priority - check for explicit coupon/code mentions)
    if (text.includes('coupon') || text.includes('code') || text.includes('discount') ||
        text.includes('voucher') || text.includes('promo') || text.includes('deal') ||
        text.includes('offer') || text.includes('ticket') || text.includes('percent')) {
        console.log("✅ [KEYWORD] Classified as: Coupon Code");
        return 'Coupon Code';
    }

    // Subscription keywords
    if (text.includes('subscription') || text.includes('netflix') || text.includes('spotify') ||
        text.includes('prime') || text.includes('hulu') || text.includes('disney') ||
        text.includes('hbo') || text.includes('max') || text.includes('paramount') ||
        text.includes('hotstar') || text.includes('monthly') ||
        text.includes('annual') || text.includes('yearly') || text.includes('account')) {
        console.log("✅ [KEYWORD] Classified as: Subscription");
        return 'Subscription';
    }

    // Templates keywords
    if (text.includes('template') || text.includes('design') || text.includes('psd') ||
        text.includes('figma') || text.includes('sketch') || text.includes('canva') ||
        text.includes('mockup') || text.includes('ui') || text.includes('ux') ||
        text.includes('scheduler') || text.includes('tool') || text.includes('automation')) {
        console.log("✅ [KEYWORD] Classified as: Templates");
        return 'Templates';
    }

    // Art keywords
    if (text.includes('art') || text.includes('drawing') || text.includes('digital') ||
        text.includes('painting') || text.includes('illustration') || text.includes('nft') ||
        text.includes('photoshop') || text.includes('graphic') || text.includes('artwork')) {
        console.log("✅ [KEYWORD] Classified as: Art");
        return 'Art';
    }

    console.log("✅ [KEYWORD] Classified as: Others");
    return 'Others';
}

export async function POST(request: NextRequest) {
    try {
        const { title, description, imageUrl } = await request.json()

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
        }

        const category = await classifyCategory(title, description, imageUrl)

        return NextResponse.json({ category })
    } catch (error) {
        console.error('Categorization error:', error)
        // Fallback to Others on any error
        return NextResponse.json({ category: 'Others' })
    }
}
