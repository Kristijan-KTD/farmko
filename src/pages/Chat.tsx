import { useState, useEffect } from "react";
import { User, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  last_message: string | null;
  last_message_at: string | null;
  participant_one: string;
  participant_two: string;
  other_user?: { name: string; avatar_url: string | null };
  unread_count?: number;
}

const Chat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchConversations = async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from("conversations")
          .select("*")
          .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
          .order("last_message_at", { ascending: false });

        if (fetchErr) throw fetchErr;
        if (!mounted) return;

        if (data) {
          const otherIds = data.map(c => c.participant_one === user.id ? c.participant_two : c.participant_one);
          const uniqueIds = [...new Set(otherIds)];

          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", uniqueIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          const { data: unreadData } = await supabase
            .from("messages")
            .select("conversation_id")
            .eq("read", false)
            .neq("sender_id", user.id);

          const unreadMap = new Map<string, number>();
          unreadData?.forEach(m => {
            unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
          });

          if (mounted) {
            setConversations(data.map(c => {
              const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
              return {
                ...c,
                other_user: profileMap.get(otherId) || { name: "Unknown", avatar_url: null },
                unread_count: unreadMap.get(c.id) || 0,
              };
            }));
          }
        }
      } catch (e: unknown) {
        if (mounted) {
          console.error("[Chat] Fetch error:", e instanceof Error ? e.message : e);
          setError(true);
          toast({ title: "Failed to load conversations", variant: "destructive" });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchConversations();

    const channel = supabase
      .channel("chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <MobileLayout>
      <PageHeader title="Chat" />

      <div className="flex-1 pb-20 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive/40 mb-3" />
            <p className="text-muted-foreground text-sm mb-3">Failed to load conversations</p>
            <button onClick={() => window.location.reload()} className="text-xs font-semibold text-primary">Retry</button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageCircle className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start by contacting a farmer or customer</p>
          </div>
        ) : (
          conversations.map((chat) => (
            <button
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {chat.other_user?.avatar_url ? (
                    <img src={chat.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                {(chat.unread_count || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {chat.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{chat.other_user?.name}</h3>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(chat.last_message_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.last_message || "Start a conversation"}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Chat;
