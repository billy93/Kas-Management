export async function sendWhatsApp(toPhone: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { skipped: true };
  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "text",
    text: { body: text }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WhatsApp API error: ${res.status} ${t}`);
  }
  return res.json();
}
