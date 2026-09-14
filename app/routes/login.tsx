import { useSearchParams } from "react-router";
import { authClient } from "~/lib/auth-client";
import type { Route } from "./+types/login";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Flonion Desk — Sign In" }];
}

/**
 * Only a same-origin path may be the post-login destination.
 *
 * `returnTo` comes from the URL, so a crafted sign-in link could otherwise send
 * an operator to another site the moment better-auth's origin check is widened.
 * The fully decoded form is what gets checked: `/%2f%2fevil.example` is a path
 * to the browser but `//evil.example` to anything that decodes it first, and
 * browsers drop tabs and newlines, so `/\t/evil.example` is protocol-relative
 * too.
 */
function safeReturnTo(raw: string | null): string {
  if (!raw?.startsWith("/")) return "/";

  // Decode until stable. Malformed escapes, or nesting deeper than any real
  // link would carry, are refused rather than guessed at.
  let decoded = raw;
  for (let depth = 0; ; depth++) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return "/";
    }
    if (next === decoded) break;
    if (depth === 4) return "/";
    decoded = next;
  }

  const cleaned = [...decoded]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x1f && code !== 0x7f;
    })
    .join("");
  const isLocalPath =
    cleaned.startsWith("/") &&
    !cleaned.startsWith("//") &&
    !cleaned.includes("\\");
  return isLocalPath ? raw : "/";
}

export default function Login() {
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));

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
