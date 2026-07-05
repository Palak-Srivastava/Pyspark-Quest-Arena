export function getCsrfTokenFromCookie() {
  if (typeof document === "undefined") {
    return "";
  }

  const parts = document.cookie.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith("sparkquest_csrf="));
  if (!match) {
    return "";
  }

  return decodeURIComponent(match.slice("sparkquest_csrf=".length));
}
