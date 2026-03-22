const express = require("express");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// 🔥 WEBHOOK HOTMART
app.post("/webhook", async (req, res) => {

  const data = req.body;

  // ⚡ RESPONDE IMEDIATO (EVITA ERRO 408)
  res.sendStatus(200);

  try {

    console.log("Recebido:", data);

    if (data.event === "PURCHASE_APPROVED") {

      const email = data.data.buyer.email;

      const license = "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 💾 SALVAR NO SUPABASE
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

      // 📧 ENVIAR EMAIL (SEM TRAVAR O WEBHOOK)
      try {

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Sua licença - Presell Studio",
          html: `
            <h2>Compra confirmada!</h2>
            <p>Sua licença:</p>
            <b>${license}</b>
          `
        });

        console.log("📧 Email enviado para:", email);

      } catch (err) {
        console.log("❌ Erro ao enviar email:", err.message);
      }

    }

  } catch (err) {
    console.log("❌ Erro geral:", err.message);
  }

});

// 🔐 VERIFICAR LICENÇA
app.post("/verificar-licenca", async (req, res) => {

  const { license_key, device_id } = req.body;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${license_key}`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await response.json();

  if (!data || data.length === 0) {
    return res.json({ valido: false });
  }

  const lic = data[0];

  // 🔗 PRIMEIRO ACESSO → VINCULA DEVICE
  if (!lic.device_id) {

    await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${license_key}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ device_id })
    });

    console.log("🔗 Device vinculado");

    return res.json({ valido: true });
  }

  // ❌ DEVICE DIFERENTE
  if (lic.device_id !== device_id) {
    return res.json({ valido: false });
  }

  // ✅ OK
  return res.json({ valido: true });
});

// 🚀 START SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Servidor rodando na porta", process.env.PORT || 3000);
});
