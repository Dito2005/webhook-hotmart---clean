const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// 🔐 variáveis do Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;





// ==============================
// 🔥 WEBHOOK HOTMART
// ==============================
app.post("/webhook", async (req, res) => {

  const data = req.body;

  console.log("Recebido:", data);

  if (data.event === "PURCHASE_APPROVED") {

    const email = data.data.buyer.email;

    const license = "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    try {

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

      console.log("✅ Licença criada:", license);

    } catch (err) {
      console.error("❌ Erro ao criar licença:", err);
    }
  }

  res.sendStatus(200);
});





// ==============================
// 🔐 VALIDAR LICENÇA
// ==============================
app.post("/verificar-licenca", async (req, res) => {

  const { license_key, device_id } = req.body;

  try {

    // 🔍 busca licença no Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${license_key}`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.json({ valido: false });
    }

    const lic = data[0];

    // 🔥 se não tem device → vincula automaticamente
    if (!lic.device_id) {

      await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${license_key}`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          device_id: device_id
        })
      });

      console.log("🔗 Device vinculado");

      return res.json({ valido: true });
    }

    // 🔒 valida se é o mesmo dispositivo
    if (lic.device_id !== device_id) {
      return res.json({ valido: false });
    }

    return res.json({ valido: true });

  } catch (err) {
    console.error("❌ Erro ao validar licença:", err);
    return res.status(500).json({ valido: false });
  }

});





// ==============================
// 🚀 START SERVIDOR
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
