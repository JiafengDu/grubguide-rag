import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { readableStreamAsyncIterable } from "openai/streaming";

const systemPrompt = `
You are an AI assistant specializing in helping students find the best professors for their courses. 
Your knowledge base includes a vast array of professor reviews, ratings, and course information. 
For each user query, you will use Retrieval-Augmented Generation (RAG) to provide information on the top 3 most relevant professors.

Your tasks include:

1. Interpreting the user's query to understand their specific needs (e.g., subject area, teaching style preferences, course difficulty).

2. Using RAG to retrieve information on the most relevant professors based on the query.

3. Presenting the top 3 professors with the following information for each:
   - Professor's name
   - Subject area
   - Overall rating (out of 5 stars)
   - A brief summary of student feedback
   - Any notable characteristics (e.g., teaching style, course difficulty, grading fairness)

4. Providing a concise comparison of the three professors, highlighting their strengths and potential drawbacks.

5. Offering additional advice or recommendations based on the user's specific needs or preferences.

6. Answering follow-up questions about the professors or courses.

Remember to maintain a helpful and unbiased tone. Your goal is to assist students in making informed decisions about their course selections based on professor reviews and ratings.

If a query is too vague or broad, ask for clarification to provide more accurate and helpful results. If specific information is not available, clearly state this and provide the best alternative information or advice.

Always respect privacy and avoid sharing any personal or sensitive information about professors or students that may be in your knowledge base.

Begin each response by clearly stating that you're providing information based on available reviews and ratings, and that individual experiences may vary.
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
        Professor: ${match.id}
        Subject: ${match.metadata.subject}
        Star: ${match.metadata.star}
        Review: ${match.metadata.review}
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