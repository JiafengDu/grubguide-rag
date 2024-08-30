"use client";
import {
  Box,
  Button,
  Stack,
  TextField,
  AppBar,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello, I'm your personal GrubGuide! Let me help you figure out where to eat. Ask me anything!`,
    },
  ]);
  const [message, setMessage] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  const sendMessage = async () => {
    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  const theme = createTheme({
    palette: {
      primary: {
        main: "#13294B", // Primary color
      },
      secondary: {
        main: "#ff5f05", // Secondary color
      },
      background: {
        default: "#", // Background color
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            GrubGuide (Urbana-Champaign Edition)
          </Typography>
          <SignedOut>
            <Button
              variant="contained"
              sx={{
                color: "white",
              }}
              href="/sign-in"
            >
              Login
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </Toolbar>
      </AppBar>
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        bgcolor="background.default"
      >
        <Stack
          direction={"column"}
          width="500px"
          height="700px"
          border="1px solid black"
          p={2}
          spacing={3}
          bgcolor={"dark blue"}
        >
          <Stack
            direction={"column"}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
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
                  color="white"
                  borderRadius={16}
                  p={3}
                >
                  <Markdown>{message.content}</Markdown>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
          <Stack direction={"row"} spacing={2}>
            <TextField
              label="Message"
              fullWidth
              value={message}
              onKeyPress={handleKeyPress}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button variant="contained" onClick={sendMessage}>
              Send
            </Button>
          </Stack>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
