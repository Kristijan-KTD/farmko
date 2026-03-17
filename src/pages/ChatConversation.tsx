import { useState, useEffect, useRef } from "react";
import { Send, User, Loader2, AlertTriangle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  read: boolean | null;
  _pending?: boolean;
}

const ChatConversation = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    let mounted = true;

    const fetchData = async () => {
      try {
        const { data: conv } = await supabase
          .from("conversations")
          .select("participant_one, participant_two")
          .eq("id", conversationId)
          .maybeSingle();

        if (conv) {
          const otherId = conv.participant_one === user.id ? conv.participant_two : conv.participant_one;
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", otherId)
            .maybeSingle();
          if (mounted && profile) setOtherUser(profile);
        }

        const { data: msgs, error: msgError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (msgError) throw msgError;
        if (mounted) setMessages(msgs || []);

        // Mark unread messages as read
        await supabase
          .from("messages")
          .update({ read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", user.id)
          .eq("read", false);
      } catch (e: unknown) {
        if (mounted) {
          console.error("[Chat] Fetch error:", e instanceof Error ? e.message : e);
          setError(true);
          toast({ title: "Failed to load messages", variant: "destructive" });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          // Prevent duplicates (from optimistic add)
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Replace pending message
          const filtered = prev.filter(m => !m._pending || m.text !== newMsg.text);
          return [...filtered, newMsg];
        });
        if (newMsg.sender_id !== user.id) {
          supabase.from("messages").update({ read: true }).eq("id", newMsg.id).then();
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !user || !conversationId || sending) return;

    setSending(true);
    setMessage("");

    // Optimistic message
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      text,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      read: false,
      _pending: true,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text,
      });

      if (insertError) throw insertError;

      await supabase.from("conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", conversationId);
    } catch (e: unknown) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setMessage(text); // Restore input
      toast({ title: "Failed to send message", description: "Tap send to retry", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <MobileLayout noPadding>
      <div className="px-3 lg:px-6">
        <PageHeader title={
          <div className="flex items-center gap-2">
            {otherUser && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {otherUser.avatar_url ? (
                  <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
            )}
            <span>{otherUser?.name || "Chat"}</span>
          </div>
        } />
      </div>

      <div className="flex-1 overflow-y-auto px-3 lg:px-6 space-y-3 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Failed to load messages</p>
            <button onClick={() => window.location.reload()} className="text-xs font-semibold text-primary">Retry</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Start the conversation</p>
            <p className="text-xs text-muted-foreground">Send a message to get started</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSent = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex items-end gap-1.5 ${isSent ? "justify-end" : "justify-start"}`}>
                {!isSent && (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 mb-1">
                    {otherUser?.avatar_url ? (
                      <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    isSent
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  } ${msg._pending ? "opacity-60" : ""}`}
                >
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isSent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {msg._pending ? "Sending..." : formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="p-2 bg-primary rounded-full disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ChatConversation;
