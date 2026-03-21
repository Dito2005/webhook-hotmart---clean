const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.post("/webhook", async (req, res) => {

  const data = req.body;

  console.log("Recebido:", data);

  if(data.event === "PURCHASE_APPROVED"){

    const email = data.data.buyer.email;

    const license = "LIC-" + Math.random().toString(36).substring(2,10).toUpperCase();

    await fetch(`${SUPABASE_URL}/rest/v1/licenses`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        license_key: license,
        status: "active",
        email: email
      })
    });

    console.log("Licença criada:", license);
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
