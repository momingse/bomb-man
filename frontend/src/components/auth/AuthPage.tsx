import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a2e4a] p-4">
      <div className="pixel-container w-full max-w-md bg-[#2a4a7f] p-1 relative">
        <div className="pixel-inner bg-[#4a6ea5] p-6">
          <div className="flex justify-center mb-6">
            <div className="pixel-logo-container">
              <div className="pixel-logo">
                <span className="text-white">BOMB</span>
                <span className="text-[#ffcc00]">MAN</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 pixel-tabs">
              <TabsTrigger value="login" className="pixel-tab">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="pixel-tab">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="pixel-label">
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    required
                    className="pixel-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="pixel-label">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    required
                    className="pixel-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full pixel-button bg-[#e83b3b] hover:bg-[#c52f2f]"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="pixel-label">
                    Username
                  </Label>
                  <Input
                    id="reg-username"
                    placeholder="Choose username"
                    required
                    className="pixel-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="pixel-label">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email"
                    required
                    className="pixel-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="pixel-label">
                    Password
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Create password"
                    required
                    className="pixel-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full pixel-button bg-[#3b82e8] hover:bg-[#2f6ac5]"
                  disabled={isLoading}
                >
                  {isLoading ? "Registering..." : "Register"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
