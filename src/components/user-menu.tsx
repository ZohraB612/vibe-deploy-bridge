import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Settings, LogOut, CreditCard, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "./auth/AuthDialog";
import { ProfileDialog } from "./profile-dialog";
import { Link } from "react-router-dom";

export function UserMenu() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setShowAuth(true)}>
          <User className="h-4 w-4 mr-2" />
          Sign In
        </Button>
        <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      </>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "pro":
        return "bg-primary text-primary-foreground";
      case "enterprise":
        return "bg-gradient-primary text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="text-xs">
                {getInitials(user?.name || "U")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">{user?.profile?.name || user?.name || user?.email}</p>
                <Badge className={`text-xs ${getPlanColor("free")}`}>
                  FREE
                </Badge>
              </div>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <ProfileDialog open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
}