import { redirect } from "next/navigation";

// The studio replaced the projects list (Phase 10+).
export default function ProjectsPage() {
  redirect("/studio");
}
