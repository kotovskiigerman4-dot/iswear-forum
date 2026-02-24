import React from "react";
import { cn } from "@/lib/utils";
import { leet } from "@/lib/leet";

// ==========================================
// Button
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  leetText?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", leetText = true, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-display font-semibold uppercase transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none active:scale-95",
          {
            "bg-primary text-primary-foreground hover:shadow-[0_0_15px_rgba(0,255,159,0.6)]": variant === "default",
            "border border-primary text-primary bg-transparent hover:bg-primary/10 hover:shadow-[0_0_10px_rgba(0,255,159,0.3)]": variant === "outline",
            "bg-transparent text-foreground hover:bg-secondary hover:text-primary": variant === "ghost",
            "bg-destructive text-destructive-foreground hover:shadow-[0_0_15px_rgba(255,0,0,0.6)]": variant === "destructive",
            "h-10 px-4 py-2": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-12 px-8 text-lg": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      >
        {leetText && typeof children === 'string' ? leet(children) : children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ==========================================
// Input
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full border border-border bg-card px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_10px_rgba(0,255,159,0.2)] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ==========================================
// Textarea
// ==========================================
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full border border-border bg-card px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_10px_rgba(0,255,159,0.2)] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ==========================================
// Card
// ==========================================
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-card border border-border overflow-hidden relative group", className)} {...props}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {children}
    </div>
  );
}

// ==========================================
// Badge & RoleBadge
// ==========================================
export function Badge({ className, children, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "outline" | "destructive" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold uppercase font-display",
        {
          "border-primary bg-primary/10 text-primary": variant === "default",
          "border-border text-foreground": variant === "outline",
          "border-destructive bg-destructive/10 text-destructive": variant === "destructive",
        },
        className
      )}
      {...props}
    >
      {typeof children === 'string' ? leet(children) : children}
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "ADMIN":
      return <Badge className="border-accent bg-accent/10 text-accent shadow-[0_0_8px_rgba(176,38,255,0.4)]">{role}</Badge>;
    case "MODERATOR":
      return <Badge className="border-blue-500 bg-blue-500/10 text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]">{role}</Badge>;
    case "OLDGEN":
      return <Badge className="border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]">{role}</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}
