import { useState } from "react";
import { useApp } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuthPage() {
  const { login, registerUser } = useApp();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Login State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRole, setLoginRole] = useState<"user" | "admin">("user");

  // Register State
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regDept, setRegDept] = useState("");
  const [regRole, setRegRole] = useState<"user" | "admin">("user");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(loginUsername, loginRole, loginPassword);
    setIsLoading(false);
    if (success) {
      setLocation(loginRole === "admin" ? "/admin" : "/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await registerUser({
      username: regUsername,
      name: regName,
      email: regEmail,
      mobile: regMobile,
      department: regDept,
      role: regRole,
      password: regPassword,
    });
    setIsLoading(false);
    if (success) {
      setLocation(regRole === "admin" ? "/admin" : "/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">QRPASS Access</CardTitle>
          <CardDescription>Secure event management system</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    placeholder="Enter your username" 
                    required 
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={loginRole} onValueChange={(v: any) => setLoginRole(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Authenticating..." : "Login"}
                </Button>
                <div className="text-center text-xs text-muted-foreground mt-4">
                  <p>Demo Credentials:</p>
                  <p>User: johndoe / user / user</p>
                  <p>Admin: admin / admin / admin</p>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input id="reg-username" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input id="reg-name" required value={regName} onChange={(e) => setRegName(e.target.value)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label htmlFor="reg-dept">Department</Label>
                    <Input id="reg-dept" required value={regDept} onChange={(e) => setRegDept(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-mobile">Mobile Number</Label>
                    <Input id="reg-mobile" type="tel" required value={regMobile} onChange={(e) => setRegMobile(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <Select value={regRole} onValueChange={(v: any) => setRegRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
