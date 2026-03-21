// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button, Input, Card } from "./ui/cyber-components";
import { Terminal, Send, Eye, FileText, User as UserIcon, Shield } from "lucide-react";
import { leet } from "@/lib/leet";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export function ChatBox() {
  const [text, setText] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/chat"],
    refetchInterval: 3000, // Авто-обновление каждые 3 секунды
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
      <div className="p-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-[10px] font-display tracking-[0.2em] text-primary">{leet("GLOBAL_SHOUTBOX")}</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {messages.map((msg: any) => {
          const style = getStyle(msg.author.role);
          return (
            <div key={msg.id} className="relative group border-l border-primary/10 pl-2 hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-[8px] text-muted-foreground opacity-30 mt-1 font-mono">
                  {format(new Date(msg.createdAt), 'HH:mm')}
                </span>
                
                <div className="relative">
                  <div 
                    className="flex items-center gap-1 cursor-help"
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    <span className={`text-[7px] px-1 border ${style.border} ${style.bg} ${style.color} font-bold`}>
                      {style.label}
                    </span>
                    <span className={`font-mono text-[11px] font-bold ${style.color} hover:text-white transition-colors`}>
                      {msg.author.username}:
                    </span>
                  </div>

                  <AnimatePresence>
                    {hoveredMsgId === msg.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 5 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute bottom-full left-0 z-50 mb-2 w-52 bg-black border-2 border-primary shadow-[0_0_30px_rgba(0,255,159,0.4)] p-3"
                      >
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-primary/20">
                          <div className="w-10 h-10 border border-primary/30 bg-primary/5 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="leading-tight overflow-hidden">
                            <Link href={`/user/${msg.author.id}`}>
                              <a className="text-primary font-bold text-sm hover:underline block truncate">{msg.author.username}</a>
                            </Link>
                            <p className={`text-[8px] mt-1 ${style.color} font-black uppercase tracking-widest`}>{msg.author.role}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-1.5 text-[9px] font-mono uppercase">
                          <div className="flex justify-between border-b border-primary/5 pb-1">
                            <span className="text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3"/> INIT_DATE:</span> 
                            <span className="text-primary">{format(new Date(msg.author.createdAt), 'dd.MM.yy')}</span>
                          </div>
                          <div className="flex justify-between border-b border-primary/5 pb-1">
                            <span className="text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3"/> DATA_THREADS:</span> 
                            <span className="text-primary">{msg.author.threadCount || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3"/> VISUAL_SCANS:</span> 
                            <span className="text-primary">{msg.author.views || 0}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-1 border-t border-primary/10 text-[7px] text-center text-primary/40 animate-pulse font-bold uppercase">
                          Establish Connection? (Click Username)
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-[11px] text-primary/90 break-words leading-relaxed font-mono">
                  {msg.content}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if(text.trim()) sendMutation.mutate(text); }} className="p-3 bg-black/80 border-t border-primary/20 flex gap-2">
        <Input 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder={user ? leet("TYPE_MESSAGE...") : "AUTH_REQUIRED_TO_SHOUT"} 
          className="h-9 text-[11px] bg-black/60 border-primary/20 focus:border-primary/50 font-mono transition-all" 
          disabled={!user} 
        />
        <Button 
          size="sm" 
          className="h-9 px-4 bg-primary/10 hover:bg-primary/20 border-primary/30" 
          disabled={!user || !text.trim() || sendMutation.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
