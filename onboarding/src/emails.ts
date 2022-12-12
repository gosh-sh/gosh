import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { createSupabaseClient } from "./utils/db.ts";
import { sendEmail } from "./utils/email.ts";

const supabase = createSupabaseClient("public");

while (true) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("*")
    .is("sent_at", null);

  console.log("Emails", emails);

  if (emails) {
    for (const email of emails) {
      console.log("About to send email", email);

      await sendEmail({
        to: email.mail_to,
        subject: email.subject,
        content: email.content,
        html: email.html,
      });

      await supabase
        .from("emails")
        .update({
          sent_at: new Date().toISOString(),
        })
        .eq("id", email.id);
    }
  }

  //
  console.log("Sleep...");
  await sleep(10);
}
