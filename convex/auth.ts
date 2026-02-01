import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { normalizeEmail } from "./authHelpers";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => {
        const email = normalizeEmail(String(params.email ?? ""));
        if (!email) {
          throw new Error("Email is required.");
        }

        const flow = String(params.flow ?? "");
        const roleIntent = String(params.roleIntent ?? "");

        if (flow === "signUp") {
          if (roleIntent !== "owner" && roleIntent !== "member") {
            throw new Error("Missing account type.");
          }
        }

        return { email };
      },
    }),
  ],
});
