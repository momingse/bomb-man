import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginSchema, registerSchema } from "@/lib/validation";

import { loginRequest, registerRequest } from "@/api/auth";
import { useNavigate } from "react-router";
import { z } from "zod";
import { usePlayersStore } from "@/state/player";

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { setPlayer } = usePlayersStore();

  const navigate = useNavigate();

  // Login Form Setup
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register Form Setup
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    reset: resetRegister,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handle Login Submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await loginRequest({
        username: values.username,
        password: values.password,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Login failed");
      } else {
        const { user } = await response.json();
        setPlayer(user);

        resetLogin();
        navigate("/playground");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register Submission
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await registerRequest({
        username: values.username,
        password: values.password,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Registration failed");
      } else {
        const { user } = await response.json();
        setPlayer(user);

        resetRegister();
        navigate("/playground");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

            {/* Login Tab */}
            <TabsContent value="login">
              <form
                onSubmit={handleLoginSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username" className="pixel-label">
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    {...registerLogin("username")}
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
                    {...registerLogin("password")}
                    className="pixel-input"
                  />
                </div>
                {registerErrors.username ? (
                  <p className="text-red-500 text-sm">
                    {registerErrors.username.message}
                  </p>
                ) : registerErrors.password ? (
                  <p className="text-red-500 text-sm">
                    {registerErrors.password.message}
                  </p>
                ) : registerErrors.confirmPassword ? (
                  <p className="text-red-500 text-sm">
                    {registerErrors.confirmPassword.message}
                  </p>
                ) : (
                  error && <p className="text-red-500 text-sm">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full pixel-button bg-[#e83b3b] hover:bg-[#c52f2f]"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form
                onSubmit={handleRegisterSubmit(onRegisterSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="pixel-label">
                    Username
                  </Label>
                  <Input
                    id="reg-username"
                    placeholder="Choose username"
                    {...registerRegister("username")}
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
                    {...registerRegister("password")}
                    className="pixel-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="pixel-label">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    {...registerRegister("confirmPassword")}
                    className="pixel-input"
                  />
                </div>
                {registerErrors.username ? (
                  <p className="text-red-500 text-sm">
                    {registerErrors.username.message}
                  </p>
                ) : registerErrors.password ? (
                  <p className="text-red-500 text-sm">
                    {registerErrors.password.message}
                  </p>
                ) : registerErrors.confirmPassword ? (
                  <p className="text-red-500 text-sm">
                    {registerErrors.confirmPassword.message}
                  </p>
                ) : (
                  error && <p className="text-red-500 text-sm">{error}</p>
                )}
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
