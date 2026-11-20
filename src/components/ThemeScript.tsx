"use client";

export const THEME_KEY = "theme";

// Runs in <head> before the page paints, so a saved or system dark theme never flashes light.
const script = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

// The browser runs this script once while parsing the server HTML. On the client React
// only sees type="text/plain", so it neither re-runs the script nor warns about it;
// suppressHydrationWarning covers the type attribute differing between server and client.
export default function ThemeScript() {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
