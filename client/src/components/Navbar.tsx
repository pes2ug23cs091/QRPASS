import { Link, useLocation } from "wouter";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut, QrCode, Database, LayoutDashboard, Calendar } from "lucide-react";

export function Navbar() {
  const { user, logout } = useApp();
  const [location] = useLocation();

  if (!user && location === "/auth") return null;

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">QRPASS<span className="text-primary">.SYSTEM</span></span>
          </div>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden md:block">
              {user.name} <span className="text-xs opacity-50">({user.role.toUpperCase()})</span>
            </div>
            
            {user.role === "admin" && (
              <div className="flex items-center gap-1">
                <Link href="/admin">
                  <Button variant={location === "/admin" ? "secondary" : "ghost"} size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </div>
            )}

            {user.role === "user" && (
               <div className="flex items-center gap-1">
               <Link href="/dashboard">
                 <Button variant={location === "/dashboard" ? "secondary" : "ghost"} size="sm">
                   <Calendar className="h-4 w-4 mr-2" />
                   My Events
                 </Button>
               </Link>
             </div>
            )}

            <Button variant="outline" size="sm" onClick={() => logout()} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        ) : (
          <Link href="/auth">
            <Button>Login / Register</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
