import { NextResponse } from "next/server"
import { Pinecone } from "@pinecone-database/pinecone"
import OpenAI from "openai"
import fetch from "node-fetch"
import cheerio from "cheerio"

export async function POST(req) {
  const { url } = await req.json()

  const response = await fetch(url)
  const html = await response.text()
  const $ = cheerio.load(html)

  // const review = $("#review-content").text()
  // const subject = $("#subject").text()
  // const stars = $("#stars").text()

  const openai = new OpenAI()
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: review,
  })

  const embedding = embeddingResponse.data[0].embedding

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  const index = pc.index("rag").namespace("ns1")

  await index.upsert({
    vectors: [
      {
        values: embedding,
        id: url,
        metadata: { review, subject, stars },
      },
    ],
  })

  return NextResponse.json({ success: true })
}
