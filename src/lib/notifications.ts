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
    const promises = integrations.map(integration => {
      let payload = {};
      
      if (integration.platform.toLowerCase() === 'discord') {
        // Discord Format
        payload = {
          content: `🎉 **New Registration for ${event.name}**`,
          embeds: [{
            title: "Attendee Details",
            color: 5814783, // Nexus Blue
            fields: [
              { name: "Name", value: name, inline: true },
              { name: "Email", value: email, inline: true },
              { name: "Time", value: new Date().toLocaleString(), inline: false }
            ],
            footer: { text: "Nexus Event Management" }
          }]
        };
      } else {
        // Slack Format
        payload = message;
      }

      return fetch(integration.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(err => console.error(`Failed to send to ${integration.platform}`, err));
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("Notification error:", err);
  }
}
 
 
