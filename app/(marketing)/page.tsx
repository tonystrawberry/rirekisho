import { Syne } from "next/font/google";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth/sign-in-button";
import { BrandMark } from "@/components/brand/brand-mark";
import { HomeProductPreview } from "@/components/marketing/home-product-preview";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-home-display",
  weight: ["600", "700", "800"],
});

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/resumes");
  }

  return (
    <main
      className={`${display.variable} relative flex h-full flex-col px-5 sm:px-8`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="home-glow home-glow-a absolute -left-24 top-[-20%] h-[70%] w-[70%] rounded-full bg-[#ff5757]/25 blur-3xl" />
        <div className="home-glow home-glow-b absolute -right-16 bottom-[-10%] h-[55%] w-[55%] rounded-full bg-[#ffb4a2]/40 blur-3xl" />
      </div>

      <div className="mx-auto grid h-full w-full max-w-6xl flex-1 grid-cols-1 items-center gap-3 py-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-8 lg:py-6">
        <section className="home-copy relative z-10 flex min-h-0 flex-col justify-center">
          <div className="home-fade flex items-center gap-3 sm:gap-4">
            <BrandMark
              size={56}
              priority
              className="rounded-2xl shadow-sm sm:size-[72px]"
            />
            <h1 className="font-[family-name:var(--font-home-display)] text-[clamp(2.15rem,7vw,4.25rem)] font-extrabold leading-[0.95] tracking-tight text-foreground">
              {APP_NAME}
            </h1>
          </div>

          <p className="home-fade home-fade-delay-1 mt-4 max-w-md text-[clamp(0.95rem,2.2vw,1.25rem)] leading-snug text-muted sm:mt-6">
            {APP_TAGLINE}
          </p>

          <div className="home-fade home-fade-delay-2 mt-5 sm:mt-8">
            <SignInButton />
          </div>

          <p className="home-fade home-fade-delay-3 mt-3 text-xs text-muted/80 sm:mt-5">
            Sign in with GitHub · resumes stay private until you share
          </p>
        </section>

        <section className="home-visual relative min-h-0 h-[42dvh] lg:h-full lg:min-h-0">
          <HomeProductPreview />
        </section>
      </div>
    </main>
  );
}
