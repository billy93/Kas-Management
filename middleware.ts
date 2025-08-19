export { default } from "next-auth/middleware";
export const config = { matcher: ["/((?!api/auth|api/chat|_next|.*\\..*|favicon.ico|$).*)"] };
