const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;

//
// 🔹 1. Verificación webhook Meta (WhatsApp)
//
app.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ META WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

//
// 🔹 2. Webhook mensajes WhatsApp (Meta → Chatwoot)
//
app.post("/", async (req, res) => {
  console.log("📩 META EVENT RECEIVED");

  try {
    await axios.post(N8N_WEBHOOK_URL, {
      source: "meta",
      payload: req.body
    });

    console.log("✅ Sent to n8n");
  } catch (error) {
    console.error("❌ Error sending to n8n:", error.message);
  }

  res.sendStatus(200);
});

//
// 🔹 3. Webhook Chatwoot → IA
//
app.post("/webhook/chatwoot", async (req, res) => {
  const data = req.body;

  console.log("📩 CHATWOOT EVENT");
  console.log(JSON.stringify(data, null, 2));

  try {
    // evitar loop con mensajes enviados por la IA
    if (data.event !== "message_created") {
      return res.sendStatus(200);
    }

    if (data.message_type !== "incoming") {
      return res.sendStatus(200);
    }

    const message = data.content;
    const conversationId = data.conversation.id;
    const contact = data.sender;

    const payload = {
      source: "chatwoot",
      message,
      conversationId,
      contact
    };

    await axios.post(N8N_WEBHOOK_URL, payload);

    console.log("✅ Message sent to n8n");

  } catch (error) {
    console.error("❌ Chatwoot webhook error:", error.message);
  }

  res.sendStatus(200);
});

//
// 🔹 4. Endpoint para responder desde n8n
//
app.post("/chatwoot/reply", async (req, res) => {
  const { conversationId, message } = req.body;

  try {
    const url = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;

    await axios.post(
      url,
      {
        content: message,
        message_type: "outgoing",
        private: false
      },
      {
        headers: {
          api_access_token: CHATWOOT_API_TOKEN
        }
      }
    );

    console.log("✅ Reply sent to Chatwoot");

    res.json({ status: "sent" });

  } catch (error) {
    console.error("❌ Error sending reply:", error.message);
    res.status(500).json({ error: "Failed to send message" });
  }
});

//
// 🔹 Start server
//
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
