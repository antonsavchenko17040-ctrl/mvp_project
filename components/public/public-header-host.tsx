import { PublicHeader } from "@/components/public/public-header";
import { getCurrentProfile } from "@/lib/auth/session";

export async function PublicHeaderHost() {
  const profile = await getCurrentProfile();

  return (
    <PublicHeader
      user={
        profile
          ? {
              fullName: profile.fullName,
              roles: profile.roles,
            }
          : null
      }
    />
  );
}
