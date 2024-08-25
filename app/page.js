"use client"
import { Box, Button, Stack, TextField, Typography } from "@mui/material"
import { useState } from "react"
import ReactMarkdown from "react-markdown"

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ])

  const [message, setMessage] = useState("")
  const [url, setUrl] = useState("")

  const isValidRateMyProfessorURL = (url) => {
    const regex = /https?:\/\/www\.ratemyprofessors\.com\/professor\/\d+/
    return regex.test(url)
  }

  const sendMessage = async () => {
    if (message.trim() === "") return // Prevent sending empty messages

    const newMessage = { role: "user", content: message }
    setMessages((prevMessages) => [
      ...prevMessages,
      newMessage,
      { role: "assistant", content: "" },
    ])

    setMessage("")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([...messages, newMessage]),
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ""

      const processText = async ({ done, value }) => {
        if (done) {
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages]
            updatedMessages[updatedMessages.length - 1] = {
              ...updatedMessages[updatedMessages.length - 1],
              content: result,
            }
            return updatedMessages
          })
          return
        }
        result += decoder.decode(value, { stream: true })
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages]
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            content: result,
          }
          return updatedMessages
        })
        return reader.read().then(processText)
      }
      await reader.read().then(processText)
    } catch (error) {
      console.error("Failed to fetch response:", error)
    }
  }

  const sendURL = async () => {
    if (isValidRateMyProfessorURL(url)) {
      try {
        const response = await fetch("/api/submit-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          alert(`Error: ${errorData.error}`)
        } else {
          alert("URL submitted successfully")
        }
      } catch (error) {
        alert(`An unexpected error occurred: ${error.message}`)
      }
    } else {
      alert("Invalid URL")
    }
    setUrl("")
  }

  return (
    <Box
      width={"100vw"}
      height={"100vh"}
      display={"flex"}
      flexDirection={"column"}
      justifyContent={"center"}
      alignItems={"center"}
      p={2}
    >
      <Stack
        direction={"column"}
        width={"500px"}
        height={"700px"}
        border={"1px solid #ccc"}
        borderRadius={2}
        p={2}
        spacing={2}
        bgcolor={"background.paper"}
        boxShadow={3}
      >
        <Stack direction={"column"} spacing={2} flexGrow={1} overflow={"auto"}>
          {messages.map((message, index) => (
            <Box
              key={index}
              display={"flex"}
              justifyContent={
                message.role === "assistant" ? "flex-start" : "flex-end"
              }
            >
              <Box
                bgcolor={
                  message.role === "assistant"
                    ? "primary.main"
                    : "secondary.main"
                }
                color={"white"}
                borderRadius={2}
                p={2}
                maxWidth={"75%"}
                boxShadow={1}
              >
                <ReactMarkdown allowHtml>{message.content}</ReactMarkdown>
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction={"row"} spacing={2} mt={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" color="primary" onClick={sendMessage}>
            Send
          </Button>
        </Stack>
        <Typography mt={2}>
          Submit the link of Rate My Professor to update our database:
        </Typography>
        <Stack direction={"row"} spacing={2} mt={2}>
          <TextField
            label="URL"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" color="secondary" onClick={sendURL}>
            Submit
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
