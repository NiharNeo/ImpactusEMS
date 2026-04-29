import { supabase } from "@/integrations/supabase/client";

export async function sendRegistrationNotification(eventId: string, registrationData: Record<string, string>) {
  try {
    // 1. Get the event name
    const { data: event } = await supabase
      .from("events")
      .select("name, user_id")
      .eq("id", eventId)
      .single();

    if (!event) return;

    // 2. Get active integrations for this user
    const { data: integrations } = await supabase
      .from("integrations")
      .select("platform, webhook_url")
      .eq("user_id", event.user_id)
      .eq("is_active", true);

    if (!integrations || integrations.length === 0) return;

    // 3. Format the message
    const name = registrationData["Full Name"] || registrationData["Name"] || "Someone";
    const email = registrationData["Email Address"] || registrationData["Email"] || "No email";
    
    const message = {
      text: `🎉 *New Registration for ${event.name}*`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🎉 *New Registration for ${event.name}*`
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Attendee:*\n${name}` },
            { type: "mrkdwn", text: `*Email:*\n${email}` }
          ]
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `Registered at ${new Date().toLocaleString()}` }
          ]
        }
      ]
    };

    // 4. Send to each active integration
    const promises = integrations.map(integration => 
      fetch(integration.webhook_url, {
        method: "POST",
        body: JSON.stringify(message),
      }).catch(err => console.error(`Failed to send to ${integration.platform}`, err))
    );

    await Promise.all(promises);
  } catch (err) {
    console.error("Notification error:", err);
  }
}
 
