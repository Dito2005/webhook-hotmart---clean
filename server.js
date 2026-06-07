
const express = require("express");
const fetch = require("node-fetch");
const { Resend } = require("resend");

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const resend = new Resend(process.env.RESEND_API_KEY);

function gerarLicenca() {
  return "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const data = req.body;

    console.log("Webhook recebido:", JSON.stringify(data));

    if (data.event !== "PURCHASE_APPROVED") {
      console.log("Evento ignorado:", data.event);
      return;
    }

    const email = data?.data?.buyer?.email;

    if (!email) {
      console.log("Email do comprador não encontrado no payload");
      return;
    }

    const license = gerarLicenca();

    const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/licenses`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        license_key: license,
        status: "active",
        email: email
      })
    });

    const supabaseText = await supabaseResponse.text();

    if (!supabaseResponse.ok) {
      console.log("Erro ao criar licença no Supabase:", supabaseText);
      return;
    }

    console.log("Licença criada:", license, "para:", email);

    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: "Sua licença - Presell Studio",
      html: `
        <h2>Compra confirmada!</h2>
        <p>Obrigado por comprar o Presell Studio.</p>
        <p>Sua chave de licença é:</p>
        <h3>${license}</h3>
      `
    });

    if (emailResult.error) {
      console.log("Erro ao enviar email pelo Resend:", emailResult.error);
      return;
    }

    console.log("Email enviado pelo Resend para:", email);
  } catch (err) {
    console.log("Erro geral no webhook:", err.message);
  }
});

app.post("/verificar-licenca", async (req, res) => {
  try {
    const { license_key, device_id } = req.body;

    if (!license_key || !device_id) {
      return res.json({ valido: false });
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(license_key)}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.json({ valido: false });
    }

    const lic = data[0];

    if (lic.status !== "active") {
      return res.json({ valido: false });
    }

    if (!lic.device_id) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(license_key)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ device_id })
        }
      );

      return res.json({ valido: true });
    }

    if (lic.device_id !== device_id) {
      return res.json({ valido: false });
    }

    return res.json({ valido: true });
  } catch (err) {
    console.log("Erro ao verificar licença:", err.message);
    return res.json({ valido: false });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando na porta", process.env.PORT || 3000);
});
