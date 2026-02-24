const express = require('express');
const axios = require('axios');

const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// 🔹 Verificación del webhook (Meta)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token = req.query['hub.verify_token'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`Webhook received ${timestamp}`);
  console.log(JSON.stringify(req.body, null, 2));

  try {
    await axios.post(process.env.N8N_WEBHOOK_URL, req.body);
    console.log('Sent to n8n successfully');
  } catch (error) {
    console.error('Error sending to n8n:', error.message);
  }

  res.status(200).end();
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
