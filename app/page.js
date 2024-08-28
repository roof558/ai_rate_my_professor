"use client"
import React, { useState, useRef, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Slider,
} from "@mui/material"
import ReactMarkdown from "react-markdown"
import SendIcon from "@mui/icons-material/Send"
import LinkIcon from "@mui/icons-material/Link"
import SearchIcon from "@mui/icons-material/Search"

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the Rate My Professor support assistant. How can I help you find the perfect professor today?",
    },
  ])
  const [message, setMessage] = useState("")
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const chatBoxRef = useRef(null)
  const [subject, setSubject] = useState("")
  const [teachingStyle, setTeachingStyle] = useState("")
  const [difficulty, setDifficulty] = useState(50)
  const [starRating, setStarRating] = useState(0)
  const [containerHeight, setContainerHeight] = useState("70vh")

  const isValidRateMyProfessorURL = (url) => {
    const regex = /https?:\/\/www\.ratemyprofessors\.com\/professor\/\d+/
    return regex.test(url)
  }

  const scrollToBottom = () => {
    chatBoxRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
    // Adjust container height based on message count
    const newHeight = Math.min(70 + messages.length * 5, 90)
    setContainerHeight(`${newHeight}vh`)
  }, [messages])

  const sendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || message
    if (messageToSend.trim() === "") return

    const newMessage = { role: "user", content: messageToSend }
    setMessages((prevMessages) => [
      ...prevMessages,
      newMessage,
      { role: "assistant", content: "" },
    ])
    setMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([...messages, newMessage]),
      })

      if (!response.ok) throw new Error("Network response was not ok")

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
          setIsLoading(false)
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
      setIsLoading(false)
    }
  }

  const handleAdvancedSearch = () => {
    let searchQuery = "I'm looking for a professor"

    if (subject) {
      searchQuery += ` in ${subject}`
    }

    if (teachingStyle) {
      searchQuery += ` with a ${teachingStyle} teaching style`
    }

    if (difficulty) {
      const difficultyText =
        difficulty <= 33
          ? "easy"
          : difficulty <= 66
          ? "moderate"
          : "challenging"
      searchQuery += ` who teaches a ${difficultyText} course (${difficulty}% on the difficulty scale)`
    }

    if (starRating > 0) {
      searchQuery += ` and has at least ${starRating} stars.`
    }

    if (searchQuery === "I'm looking for a professor") {
      searchQuery += "."
    }

    sendMessage(searchQuery)
  }

  const difficultyLabels = (value) => {
    if (value <= 33) return "Easy"
    if (value <= 66) return "Moderate"
    return "Challenging"
  }
  const sendURL = async () => {
    if (isValidRateMyProfessorURL(url)) {
      try {
        const response = await fetch("/api/submit-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    <Container
      maxWidth="lg"
      sx={{
        height: containerHeight,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        py: 4,
        transition: "height 0.3s ease-in-out",
      }}
    >
      <Box sx={{ display: "flex", height: "100%", gap: 2 }}>
        <Paper
          elevation={3}
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 4,
            transition: "all 0.3s ease-in-out",
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              overflow: "auto",
              p: 2,
              backgroundColor: "#f5f5f5",
            }}
            ref={chatBoxRef}
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  justifyContent:
                    message.role === "assistant" ? "flex-start" : "flex-end",
                  mb: 2,
                  opacity: 0,
                  transform: "translateY(20px)",
                  animation: "fadeIn 0.5s ease-out forwards",
                  "@keyframes fadeIn": {
                    "0%": { opacity: 0, transform: "translateY(20px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                  },
                  animationDelay: `${index * 0.1}s`,
                  maxWidth: "800px",
                  maxHeight: "10000px",
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor:
                      message.role === "assistant" ? "#fff" : "#1976d2",
                    color:
                      message.role === "assistant" ? "text.primary" : "#fff",
                    maxWidth: "75%",
                    borderRadius:
                      message.role === "assistant"
                        ? "20px 20px 20px 5px"
                        : "20px 20px 5px 20px",
                    "& ol, & ul": {
                      paddingLeft: "20px",
                      marginBottom: 0,
                    },
                    "& li": {
                      marginBottom: "8px",
                    },
                    "& li:last-child": {
                      marginBottom: 0,
                    },
                  }}
                >
                  <ReactMarkdown
                    components={{
                      ol: ({ node, ...props }) => (
                        <ol
                          style={{ paddingLeft: "20px", marginBottom: 0 }}
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          style={{ paddingLeft: "20px", marginBottom: 0 }}
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li style={{ marginBottom: "8px" }} {...props} />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </Paper>
              </Box>
            ))}

            {/* <div ref={messagesEndRef} /> */}
          </Box>
          <Box sx={{ p: 2, backgroundColor: "#fff" }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    color="primary"
                    onClick={() => sendMessage()}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                ),
              }}
            />
          </Box>
        </Paper>
        <Box
          sx={{
            width: "300px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Paper elevation={3} sx={{ p: 2, borderRadius: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Advanced Professor Search:
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Subject</InputLabel>
              <Select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                label="Subject"
              >
                <MenuItem value="Computer Science">Computer Science</MenuItem>
                <MenuItem value="Mathematics">Mathematics</MenuItem>
                <MenuItem value="Physics">Physics</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Teaching Style</InputLabel>
              <Select
                value={teachingStyle}
                onChange={(e) => setTeachingStyle(e.target.value)}
                label="Teaching Style"
              >
                <MenuItem value="Lecture-based">Lecture-based</MenuItem>
                <MenuItem value="Interactive">Interactive</MenuItem>
                <MenuItem value="Project-based">Project-based</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ mb: 2 }}>
              <Typography id="difficulty-slider" gutterBottom>
                Difficulty
              </Typography>
              <Slider
                value={difficulty}
                onChange={(e, newValue) => setDifficulty(newValue)}
                aria-labelledby="difficulty-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={difficultyLabels}
                step={1}
                marks
                min={0}
                max={100}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography id="star-rating-slider" gutterBottom>
                Minimum Star Rating
              </Typography>
              <Slider
                value={starRating}
                onChange={(e, newValue) => setStarRating(newValue)}
                aria-labelledby="star-rating-slider"
                valueLabelDisplay="auto"
                step={0.5}
                marks
                min={0}
                max={5}
              />
            </Box>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleAdvancedSearch}
              startIcon={<SearchIcon />}
            >
              Search
            </Button>
          </Paper>
          <Paper elevation={3} sx={{ p: 2, borderRadius: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Submit Rate My Professor URL:
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Enter URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  sendURL()
                }
              }}
              sx={{ mb: 1 }}
            />
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={sendURL}
              startIcon={<LinkIcon />}
            >
              Submit URL
            </Button>
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}
