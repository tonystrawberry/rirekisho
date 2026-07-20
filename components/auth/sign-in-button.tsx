"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      size="lg"
      onClick={() => signIn("github", { callbackUrl: "/resumes" })}
    >
      <Github className="size-5" aria-hidden />
      Continue with GitHub
    </Button>
  );
}
