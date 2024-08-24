import { NextResponse } from "next/server"
import { Pinecone } from "@pinecone-database/pinecone"
import OpenAI from "openai"
import fetch from "node-fetch"
import * as cheerio from "cheerio"

export async function POST(req) {
  console.log("POST request received")
  const { url } = await req.json()

  const response = await fetch(url)
  const html = await response.text()
  const $ = cheerio.load(html)

  const metaContent = $('meta[name="title"]').attr("content")

  const professor = metaContent.split(" at ")[0]
  console.log("Professor:", professor)

  const review = $(".Comments__StyledComments-dzzyvm-0.gRjWel").text().trim()
  // console.log("Review: ", review)
  const subject = $(
    ".TeacherDepartment__StyledDepartmentLink-fl79e8-0.iMmVHb"
  ).text()
  // console.log("subject: ", subject)
  const stars = $(".RatingValue__Numerator-qw8sqy-2.liyUjw").text().trim()
  // console.log("Star: ", stars)

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
        id: professor,
        metadata: { review, subject, stars },
      },
    ],
  })

  return NextResponse.json({ success: true })
}
