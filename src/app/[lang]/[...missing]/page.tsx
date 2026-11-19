import { notFound } from "next/navigation";

// Sends unknown paths such as /ne/does-not-exist to the bilingual not-found page.
export default function MissingPage() {
  notFound();
}
