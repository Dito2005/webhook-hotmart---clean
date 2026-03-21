const express = require("express");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// 🔑 Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// 🔥 ROTA TESTE (IMPORTANTE PRO RENDER)
app.get("/", (req, res) => {
  res.send("Servidor online 🚀");
});

// 🔥 WEBHOOK HOTMART
app.post("/webhook", async (req, res) => {
  const data = req.body;

  console.log("Recebido:", data);

  if (data.event === "PURCHASE_APPROVED") {
    const email = data.data.buyer.email;

    const license =
      "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    try {
      // 💾 SALVAR NO SUPABASE
      await fetch(`${SUPABASE_URL}/rest/v1/licenses`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          license_key: license,
          status: "active",
          email: email,
        }),
      });

      console.log("✅ Licença criada:", license);

      // 📧 ENVIAR EMAIL
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Sua licença - Presell Studio",
        html: `
          <h2>Compra confirmada!</h2>
          <p>Sua licença:</p>
          <b>${license}</b>
        `,
      });

      console.log("📧 Email enviado para:", email);
    } catch (err) {
      console.log("❌ Erro:", err.message);
    }
  }

  res.sendStatus(200);
});

// 🔐 VERIFICAR LICENÇA
app.post("/verificar-licenca", async (req, res) => {
  const { license_key, device_id } = req.body;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${license_key}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.json({ valido: false });
    }

    const lic = data[0];

    // 🔗 PRIMEIRO USO → vincula device
    if (!lic.device_id) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${license_key}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ device_id }),
        }
      );

      console.log("🔗 Device vinculado");

      return res.json({ valido: true });
    }

    // ❌ Device diferente
    if (lic.device_id !== device_id) {
      return res.json({ valido: false });
    }

    return res.json({ valido: true });
  } catch (err) {
    console.log("❌ Erro:", err.message);
    return res.status(500).json({ erro: true });
  }
});

// 🚀 PORTA CORRETA PRO RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
