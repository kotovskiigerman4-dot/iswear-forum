// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button, Input, Card } from "./ui/cyber-components";
import { Terminal, Send, Eye, FileText, Shield, Activity } from "lucide-react";
import { leet } from "@/lib/leet";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

export function ChatBox() {
  const [text, setText] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/chat"],
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => apiRequest("POST", "/api/chat", { content }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    }
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleMouseEnter = (id: number) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setHoveredMsgId(id);
  };

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setHoveredMsgId(null), 300);
  };

  const getStyle = (role: string) => {
    switch (role) {
      case "ADMIN": return { label: "ADM", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/50" };
      case "MODERATOR": return { label: "MOD", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/50" };
      case "OLDGEN": return { label: "OLD", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/50" };
      default: return { label: "MBR", color: "text-primary", bg: "bg-primary/10", border: "border-primary/50" };
    }
  };

  return (
    <Card className="h-[500px] flex flex-col border-primary/30 bg-black/60 backdrop-blur-md overflow-hidden shadow-[0_0_20px_rgba(0,255,159,0.1)]">
      <div className="p-3 border-b border-primary/20 bg-primary/5 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-[10px] font-display tracking-[0.2em]">{leet("GLOBAL_CHAT")}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg: any) => {
          const style = getStyle(msg.author.role);
          return (
            <div key={msg.id} className="relative group">
              <div className="flex items-start gap-2">
                <span className="text-[8px] text-muted-foreground opacity-30 mt-1">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                
                <div className="relative" 
                     onMouseEnter={() => handleMouseEnter(msg.id)}
                     onMouseLeave={handleMouseLeave}>
                  
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span className={`text-[7px] px-1 border ${style.border} ${style.bg} ${style.color} font-bold`}>{style.label}</span>
                    <span className={`font-mono text-[11px] font-bold ${style.color} hover:text-white transition-colors`}>{msg.author.username}:</span>
                  </div>

                  <AnimatePresence>
                    {hoveredMsgId === msg.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 5 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute bottom-full left-0 z-[100] mb-2 w-56 bg-black border-2 border-primary shadow-[0_0_30px_rgba(0,255,159,0.4)] p-4 pointer-events-auto"
                        onMouseEnter={() => handleMouseEnter(msg.id)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-primary/20">
                          <Avatar className="h-12 w-12 border border-primary/30 rounded-none">
                            <AvatarImage src={msg.author.avatarUrl || msg.author.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary rounded-none">
                                {msg.author.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="leading-tight overflow-hidden">
                            <Link href={`/user/${msg.author.id}`}>
                              <a className="text-primary font-bold text-sm hover:underline truncate block">{msg.author.username}</a>
                            </Link>
                            <p className={`text-[9px] mt-1 ${style.color} font-black tracking-widest uppercase`}>{msg.author.role}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-[9px] font-mono uppercase text-primary/80">
                          <div className="flex justify-between border-b border-primary/5 pb-1">
                            <span className="text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3"/> JOINED:</span> 
                            <span>{format(new Date(msg.author.createdAt), 'dd.MM.yy')}</span>
                          </div>
                          <div className="flex justify-between border-b border-primary/5 pb-1">
                            <span className="text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3"/> DATA_THREADS:</span> 
                            <span>{msg.author.threadCount || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3"/> SCANS:</span> 
                            <span>{msg.author.views || 0}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-[11px] text-primary/90 break-words font-mono leading-relaxed">{msg.content}</span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if(text.trim()) sendMutation.mutate(text); }} className="p-3 bg-black/80 border-t border-primary/20 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={leet("TYPE_MESSAGE...")} className="h-9 text-[11px] bg-black/40 font-mono" disabled={!user} />
        <Button size="sm" className="h-9 px-4" disabled={!user || !text.trim()}><Send className="w-4 h-4" /></Button>
      </form>
    </Card>
  );
}
