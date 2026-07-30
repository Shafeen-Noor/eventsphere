import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/CreateEventForm";
import { SiteHeader } from "@/components/SiteHeader";
import {
  getCurrentUser,
  isAccountUser,
  isEmailVerified,
  publicUserDto,
} from "@/lib/auth";

type Props = { searchParams: Promise<{ mode?: string }> };

export default async function CreatePage({ searchParams }: Props) {
  const { mode: rawMode } = await searchParams;
  const mode = rawMode === "instant" ? "instant" : "subscription";
  const next = `/create?mode=${mode}`;

  const user = await getCurrentUser();
  if (!user || !isAccountUser(user)) {
    redirect(`/signup?next=${encodeURIComponent(next)}`);
  }
  if (!isEmailVerified(user)) {
    redirect(`/verify?next=${encodeURIComponent(next)}`);
  }

  return (
    <main>
      <SiteHeader
        right={
          <Link href="/" className="hover:opacity-70">
            Home
          </Link>
        }
      />
      <div className="container pb-20 pt-4">
        <CreateEventForm host={publicUserDto(user)} mode={mode} />
      </div>
    </main>
  );
}
