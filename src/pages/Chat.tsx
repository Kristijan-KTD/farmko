import { User } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";

const mockChats = [
  { id: 1, name: "Jane Smith", lastMessage: "Sure, I'll have the eggs ready by Friday", time: "2m ago", unread: 2 },
  { id: 2, name: "Bob Johnson", lastMessage: "What's the price for 5kg tomatoes?", time: "1h ago", unread: 0 },
  { id: 3, name: "Alice Williams", lastMessage: "Thank you! Great products", time: "3h ago", unread: 1 },
  { id: 4, name: "Mike Brown", lastMessage: "Can I pickup tomorrow morning?", time: "1d ago", unread: 0 },
];

const Chat = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout>
      <PageHeader title="Chat" />

      <div className="flex-1 pb-20 space-y-2">
        {mockChats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => navigate(`/chat/${chat.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 relative">
              <User className="w-6 h-6 text-muted-foreground" />
              {chat.unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  {chat.unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{chat.name}</h3>
                <span className="text-[10px] text-muted-foreground">{chat.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Chat;
