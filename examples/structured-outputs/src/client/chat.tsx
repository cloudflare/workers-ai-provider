import { useChat } from "ai/react";
import { useState } from "react";

type ChatProps = {
  id: string;
};

export default function Chat(props: ChatProps) {
  const { input, handleInputChange, setInput } = useChat();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: input },
    ]);
    const currentInput = input;
    setInput("");

    const response = await fetch(`/api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: currentInput }],
      }),
    });

    if (!response.ok) {
      console.error("Failed to send message");
      return;
    }

    const data = await response.text();

    if (data) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: data },
      ]);
    }
  };

  return (
    <>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input name="prompt" value={input} onChange={handleInputChange} />
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
