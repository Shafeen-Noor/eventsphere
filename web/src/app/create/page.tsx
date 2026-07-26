import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/CreateEventForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser, isAccountUser, publicUserDto } from "@/lib/auth";

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user || !isAccountUser(user)) {
    redirect("/signup?next=/create");
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
        <CreateEventForm host={publicUserDto(user)} />
      </div>
    </main>
  );
}
