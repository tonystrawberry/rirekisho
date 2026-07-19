import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth/sign-in-button";
import { BrandMark } from "@/components/brand/brand-mark";
import { APP_NAME } from "@/lib/brand";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/resumes");
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <BrandMark size={96} priority className="rounded-2xl shadow-sm" />
        <div>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            {APP_NAME}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Build your resume in a conversation, then export a polished PDF or
            Word doc.
          </p>
          <div className="mt-8">
            <SignInButton />
          </div>
        </div>
      </div>
    </main>
  );
}
