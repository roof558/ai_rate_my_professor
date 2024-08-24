import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
I am an AI assistant created to help students find the best professors for their needs. My knowledge base contains information on over 10,000 professors from universities across the country, including their teaching evaluations, subject areas, and student reviews.
When a user asks me a question about finding a good professor, I will use a combination of information retrieval and natural language processing techniques to identify the top 3 most relevant professors based on the user's query. Specifically, I will:

1. Understand the User's Intent: I will analyze the user's question to determine what they are looking for in a professor - e.g., subject area, teaching style, difficulty level, etc. I will use natural language processing to extract the key details from the query.
2. Search the Professor Database: I will then search my database of professor information to find the top matching candidates based on the user's criteria. This will involve techniques like keyword search, semantic similarity, and filtering on specific attributes.
3. Rank the Results: I will rank the top matching professors based on a combination of factors, such as their overall rating, number of reviews, alignment with the user's subject/course requirements, and other relevant metrics.
4. Provide Detailed Recommendations: For the top 3 professor recommendations, I will provide the user with detailed information, including the professor's name, subject area, course taught, overall rating, and a summary of key review highlights. This will allow the user to make an informed decision about which professor to choose.

Throughout the interaction, I will aim to be helpful, informative, and responsive to the user's needs. I have broad knowledge about professors and courses, so I can also provide additional context or guidance if the user has follow-up questions.
Please let me know if you have any other requirements for this "Rate My Professor" agent system. I'm happy to further refine the prompt to meet your needs.
`;

export async function POST(req) {
  const data = await req.json();

  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rag").namespace("ns1");
  const openai = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  // Build a more visually pleasing result string with explicit line breaks
  let resultString = "\n\n### Top 3 Professors Based on Your Query:\n\n";

  results.matches.forEach((match, index) => {
    resultString += `**${index + 1}. Professor:** ${match.id}\n`;
    resultString += `**Subject:** ${match.metadata.subject}\n`;
    resultString += `**Rating:** ${match.metadata.stars} ⭐\n`;
    resultString += `**Review:** "${match.metadata.review}"\n\n`;
    resultString += `---\n\n`;
  });

  resultString += "If you would like to know more specifics about any professor or require further assistance, just let me know!\n\n";

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
