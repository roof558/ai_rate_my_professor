import { NextResponse } from "next/server"
import { Pinecone } from "@pinecone-database/pinecone"
import OpenAI from "openai"

const systemPrompt = `
You are an AI assistant specializing in recommending professors based on student criteria. Use the following steps to provide personalized recommendations:

1. Analyze the user's query to extract key criteria such as subject area, teaching style, course difficulty, star rating, and any specific requirements.
2. Use the extracted criteria to formulate a relevant search query for the professor database.
3. Rank the results based on the user's priorities, including the minimum star rating if specified, and the professors' overall ratings.
4. Provide detailed recommendations for the top 3 matching professors, including their name, subject area, courses taught, overall rating, and key review highlights.
5. Offer additional context or guidance if the user has follow-up questions.

Ensure your responses are helpful, informative, and tailored to the user's specific needs.
`

export async function POST(req) {
  const data = await req.json()

  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  })
  const index = pc.index("rag").namespace("ns1")
  const openai = new OpenAI()

  const userQuery = data[data.length - 1].content

  // Generate a more specific search query based on user input
  const searchQueryResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "Generate a concise search query based on the user's input. Focus on key criteria like subject, teaching style, course difficulty, and minimum star rating.",
      },
      { role: "user", content: userQuery },
    ],
  })

  const searchQuery = searchQueryResponse.choices[0].message.content

  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: searchQuery,
    encoding_format: "float",
  })

  const results = await index.query({
    topK: 20, // Increased to get more candidates for ranking
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  })

  // Extract minimum star rating from the query if present
  const starRatingMatch = userQuery.match(/at least (\d+(?:\.\d+)?) stars/)
  const minStarRating = starRatingMatch ? parseFloat(starRatingMatch[1]) : 0

  // Rank and filter results
  const rankedResults = rankResults(results.matches, userQuery, minStarRating)

  let resultString = "\n\n### Top 3 Professors Based on Your Criteria:\n\n"

  rankedResults.slice(0, 3).forEach((match, index) => {
    resultString += `**${index + 1}. Professor:** ${match.id}\n`
    resultString += `**Subject:** ${match.metadata.subject}\n`
    resultString += `**Rating:** ${match.metadata.stars} ⭐\n`
    resultString += `**Review Highlight:** "${match.metadata.review.slice(
      0,
      100
    )}..."\n\n`
    resultString += `---\n\n`
  })

  resultString +=
    "Would you like more details about any of these professors or have any other criteria to consider?\n\n"

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...data.slice(0, data.length - 1),
      { role: "user", content: userQuery + resultString },
    ],
    model: "gpt-4",
    stream: true,
  })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            const text = encoder.encode(content)
            controller.enqueue(text)
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream)
}

function rankResults(results, userQuery, minStarRating) {
  // Implement a more sophisticated ranking algorithm here
  return results
    .filter((result) => parseFloat(result.metadata.stars) >= minStarRating)
    .sort((a, b) => {
      const aRelevance = calculateRelevance(a, userQuery)
      const bRelevance = calculateRelevance(b, userQuery)
      return bRelevance - aRelevance
    })
}

function calculateRelevance(result, userQuery) {
  // Implement a more sophisticated relevance calculation
  let relevance = parseFloat(result.metadata.stars)
  if (result.metadata.subject.toLowerCase().includes(userQuery.toLowerCase())) {
    relevance += 2
  }
  if (result.metadata.review.toLowerCase().includes(userQuery.toLowerCase())) {
    relevance += 1
  }
  return relevance
}
