import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { createSupabaseClient } from "./utils/db.ts";

const supabase = createSupabaseClient("public");

// welcome emails
// subscribe user insert
// TODO

// create emails for new users
// TODO
while (true) {
  const { data, error } = await supabase
    .from("users")
    .select(`*, github_users (*)`);

  if (data) {
    for (const user of data) {
      const email_list: string[] = [];

      user.github_users?.forEach((github_user: { email: string[] }) => {
        if (github_user.email) {
          email_list.push(github_user.email[0]);
        }
      });

      console.log(email_list);

      if (email_list.length > 0) {
        const mail_to = email_list[0].trim();

        const { data: emails, error } = await supabase
          .from("emails")
          .select()
          .eq("is_welcome", true)
          .eq("mail_to", mail_to);

        console.log(`Emails: ${emails}`);

        if (!emails || emails.length == 0) {
          console.log(`Try create welcome email ${mail_to}`);
          await supabase
            .from("emails")
            .insert({
              mail_to: mail_to,
              subject: "Welcome to GOSH!",
              content: `\
Good news!

Your repository has been successfully uploaded to GOSH

Your DAO has been set up for you, and you're now all set to build consensus around your code

START BUILDING https://app.gosh.sh/a/signin
`,
              html: `\
<h1>Good news!</h1>

<p>Your repository has been successfully uploaded to GOSH </p>

<p>Your DAO has been set up for you, and you're now all set to build consensus around your code </p>

<p><a href="https://app.gosh.sh/a/signin">START BUILDING</a></p>
`,
              is_welcome: true,
            })
            .then((res: any) => {
              console.log(`Email insert:`, res);
            });
        }
      }
    }
  }

  //
  console.log("Sleep...");
  await sleep(10);
}
