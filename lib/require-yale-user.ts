import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const ALLOWED_EMAIL_DOMAIN = "yale.edu";

function isYaleEmail(email: string) {
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

function getPrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  const primaryById = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
  return primaryById?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

export async function requireYaleUser() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = getPrimaryEmail(user);

  if (!email || !isYaleEmail(email)) {
    redirect("/unauthorized");
  }

  return { userId, email };
}

export async function isAuthorizedYaleUser() {
  const { userId } = await auth();

  if (!userId) {
    return false;
  }

  const user = await currentUser();
  const email = getPrimaryEmail(user);

  return Boolean(email && isYaleEmail(email));
}
