"use client"
import { Box, Button, Container, TextField, Typography, Paper, IconButton } from "@mui/material";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import SendIcon from '@mui/icons-material/Send';
import LinkIcon from '@mui/icons-material/Link';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ]);

  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const isValidRateMyProfessorURL = (url) => {
    const regex = /https?:\/\/www\.ratemyprofessors\.com\/professor\/\d+/;
    return regex.test(url);
  };

  const sendMessage = async () => {
    if (message.trim() === "") return;

    const newMessage = { role: "user", content: message };
    setMessages((prevMessages) => [...prevMessages, newMessage, { role: "assistant", content: "" }]);
    setMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([...messages, newMessage]),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      const processText = async ({ done, value }) => {
        if (done) {
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...updatedMessages[updatedMessages.length - 1],
              content: result,
            };
            return updatedMessages;
          });
          return;
        }
        result += decoder.decode(value, { stream: true });
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            content: result,
          };
          return updatedMessages;
        });
        return reader.read().then(processText);
      };
      await reader.read().then(processText);
    } catch (error) {
      console.error("Failed to fetch response:", error);
    }
  };

  const sendURL = async () => {
    if (isValidRateMyProfessorURL(url)) {
      try {
        const response = await fetch("/api/submit-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Error: ${errorData.error}`);
        } else {
          alert("URL submitted successfully");
        }
      } catch (error) {
        alert(`An unexpected error occurred: ${error.message}`);
      }
    } else {
      alert("Invalid URL");
    }
    setUrl("");
  };

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 4 }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, backgroundColor: '#f5f5f5' }}>
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: message.role === "assistant" ? "flex-start" : "flex-end",
                mb: 2,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  backgroundColor: message.role === "assistant" ? '#fff' : '#1976d2',
                  color: message.role === "assistant" ? 'text.primary' : '#fff',
                  maxWidth: '75%',
                  borderRadius: message.role === "assistant" ? '20px 20px 20px 5px' : '20px 20px 5px 20px',
                }}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        <Box sx={{ p: 2, backgroundColor: '#fff' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
              }
            }}
            InputProps={{
              endAdornment: (
                <IconButton color="primary" onClick={sendMessage}>
                  <SendIcon />
                </IconButton>
              ),
            }}
          />
        </Box>
      </Paper>
      <Paper elevation={3} sx={{ mt: 2, p: 2, borderRadius: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Submit Rate My Professor URL to update our database:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendURL();
              }
            }}
            sx={{ mr: 1 }}
          />
          <IconButton color="secondary" onClick={sendURL}>
            <LinkIcon />
          </IconButton>
        </Box>
      </Paper>
    </Container>
  );
}