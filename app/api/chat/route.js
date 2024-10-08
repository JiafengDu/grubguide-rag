import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { readableStreamAsyncIterable } from "openai/streaming";

const systemPrompt = `
You are an AI assistant specializing in helping users find the best restaurants to eat at. 
Your knowledge base includes a vast array of restaurants ratings, summaries, tags, location, and contact information. Do not hallucinate. 
For each user query, you will only use Retrieval-Augmented Generation (RAG) to provide information on the most relevant restaurants based on user's requests. 
If the user is not requesting information on restaurants, engage in a friendly and casual conversation without providing information that is not requested.
Do not say that the user has provided information. 

Your tasks include:

1. Interpreting the user's query to understand their specific wants and needs.

2. If user input is not inquiring information, engage in a friendly and casual manner without providing information that is not requested.

3. Using RAG to retrieve information on the most relevant restaurants based on the query.

4. Presenting a restaurants in your knowledge base with the following information for each:
   - Restaurant name
   - Cuisine type
   - Price range
   - Overall rating (out of 5 stars)
   - An approximately 50 word brief summary of the restaurant
   - Any notable characteristics (e.g., price range, location, hours)

5. Offering additional advice or recommendations based on the user's specific needs or preferences.

6. Answering follow-up questions about the restaurants. 

Remember to maintain a helpful and unbiased tone. Your goal is to assist users in making informed decisions about which restaurant is best based on reviews and ratings.

If a query is vague or broad, offer the closest match based on the information provided.

Begin each response to a query about restaurants by clearly stating that you're providing information based on available reviews and ratings, and that individual experiences may vary.
`;

export async function POST(request) {
    const data = await request.json();
    const pc = new Pinecone({
        apiKey : process.env.PINECONE_API_KEY,
    });
    const index = pc.index('rag').namespace('ns1');
    const openai = new OpenAI();
    
    const text = data[data.length - 1].content;
    const embeddings = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: 'float',
    });

    const results = await index.query({
        topK: 5,
        includeMetadata: true,
        vector: embeddings.data[0].embedding,
    });

    let resultString = "<CONTEXT>\n";
    results.matches.forEach((match) => {
        resultString += `
        Restaurant: ${match.id}
        Rating: ${match.metadata.rating}
        Tags: ${match.metadata.tags}
        Location: ${match.metadata.url}
        Hours: ${match.metadata.hours}
        Price_range: ${match.metadata.price_range}
        \n\n`;
    });
    resultString += `<\n\\CONTEXT>`;

    console.log(resultString);


    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    const completion = await openai.chat.completions.create({
       messages:[
        {role:'system', content: systemPrompt},
        ...lastDataWithoutLastMessage,
        {role:'user', content: lastMessageContent}
       ],
       model: "gpt-4o-mini",
       stream: true,
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            }
            catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        },
    });
    return new NextResponse(stream);
}