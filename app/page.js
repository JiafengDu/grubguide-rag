'use client';
import { useState } from "react";
import Image from "next/image";

export default function Home() {
    const [messages, setMessages] = useState([
      {
        role: "assistant",
        content: "Hi! I am the Rate My Professor support assistant. How can I help you today?",
      },
    ]);
    const [message, setMessage] = useState("");
    const sendMessage = async () => {
      setMessages(messages=[
        ...messages,
        {role: "user", content: message},
        {role: "assistant", content: ""},
      ])  

      const response = fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ...messages,
          {role: "user", content: message},
        ]),
      }).then( async (res) => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let result = "";
        return reader.read().then(function processText({done, value}) {
          if (done) {
            return;
          }
          result += decoder.decode(value, {stream: true});
          const lines = result.split("\n");
          lines.forEach((line) => {
            const data = JSON.parse(line);
            setMessages((messages) => [
              ...messages,
              {role: "assistant", content: data.choices[0].delta.content},
            ]);
          });
          result = lines[lines.length - 1];
          return reader.read().then(processText);
        })
    });
      setMessage("");
    };
  return();
}
