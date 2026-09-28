import { redirect } from "next/navigation";

/** /practice is the former name for the quizzes page (addendum §2). */
export default function PracticePage() {
  redirect("/quizzes");
}
