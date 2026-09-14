import { useSearchParams } from "react-router";
import { authClient } from "~/lib/auth-client";
import type { Route } from "./+types/login";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Flonion Desk — Sign In" }];
}

export default function Login() {
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/";

  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "desk",
      callbackURL: returnTo,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8]">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-semibold text-gray-900">
            Flonion Desk
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Sign in to access the operations console
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Sign in with Digital Covet
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          Authentication powered by Digital Covet IAM
        </p>
      </div>
    </div>
  );
}
