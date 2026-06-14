import { sql } from "drizzle-orm";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { getContactForms } from "@/lib/queries";
import { ContactsManager, type FormRow } from "@/components/admin/ContactsManager";

export default async function ContactsPage() {
  const forms = (await getContactForms()).slice().sort((a, b) => a.name.localeCompare(b.name));
  const counts = await db
    .select({ formName: contactSubmissions.formName, count: sql<number>`count(*)::int` })
    .from(contactSubmissions)
    .groupBy(contactSubmissions.formName);
  const countMap = new Map(counts.map((c) => [c.formName ?? "", c.count]));

  const rows: FormRow[] = forms.map((f) => ({
    id: f.id,
    name: f.name,
    fields: f.fields,
    submitLabel: f.submitLabel,
    receiverEmail: f.receiverEmail,
    formName: f.formName,
    successMode: f.successMode,
    successMessage: f.successMessage,
    successPath: f.successPath,
    submissionCount: countMap.get(f.formName) ?? 0,
  }));

  return <ContactsManager initial={rows} />;
}
