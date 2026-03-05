import { useState } from "react";
import { Send, User } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";

const mockMessages = [
  { id: 1, text: "Hi, I'm interested in your organic eggs", sent: false, time: "10:30 AM" },
  { id: 2, text: "Hello! Yes, they're available. How many dozen would you like?", sent: true, time: "10:32 AM" },
  { id: 3, text: "I'd like 3 dozen. What's the price?", sent: false, time: "10:33 AM" },
  { id: 4, text: "$5 per dozen, so $15 total. I can have them ready by Friday.", sent: true, time: "10:35 AM" },
  { id: 5, text: "That sounds great! Can I pick them up from your farm?", sent: false, time: "10:36 AM" },
  { id: 6, text: "Sure, I'll have the eggs ready by Friday", sent: true, time: "10:37 AM" },
];

const ChatConversation = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages([
      ...messages,
      { id: messages.length + 1, text: message, sent: true, time: "Now" },
    ]);
    setMessage("");
  };

  return (
    <MobileLayout noPadding>
      <div className="px-6">
        <PageHeader title="Jane Smith" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-3 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.sent
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              <p>{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.sent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={handleSend} className="p-2 bg-primary rounded-full">
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ChatConversation;
