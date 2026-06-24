const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const path = require("path");

const AUTH_DIR = path.resolve(__dirname, ".whatsapp-auth");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: {
      level: "silent",
      trace: () => {}, debug: () => {}, info: () => {},
      warn: () => {}, error: () => {}, fatal: () => {},
      child: () => ({
        level: "silent",
        trace: () => {}, debug: () => {}, info: () => {},
        warn: () => {}, error: () => {}, fatal: () => {},
        child: () => ({})
      })
    }
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n===========================================");
      console.log("   NETLINK AGENCIES — WhatsApp Bot");
      console.log("   Scan the QR code below with WhatsApp");
      console.log("===========================================\n");
      qrcode.generate(qr, { small: true });
      console.log("\n  Waiting for scan...\n");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      if (loggedOut) {
        console.log("Logged out. Delete .whatsapp-auth folder and restart.");
      } else {
        console.log(`Disconnected (code ${statusCode}). Reconnecting in 3s...`);
        setTimeout(() => startBot(), 3000);
      }
    }

    if (connection === "open") {
      console.log("\n✅ NETLINK AGENCIES WhatsApp Bot is connected!\n");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const jid = msg.key.remoteJid;
      if (!jid) continue;

      const text =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        "";

      const input = text.trim().toLowerCase();
      console.log(`📩 ${jid}: ${text || "(media)"}`);

      let reply = "";

      // Main menu
      if (["hi", "hello", "hey", "menu", "start", "0"].includes(input)) {
        reply =
          `🏢 *NETLINK AGENCIES* 🏢\n\n` +
          `👋 Hello! How may I help you?\n\n` +
          `Please reply with a number:\n\n` +
          `1️⃣ 1 — 💸 Withdraw\n` +
          `2️⃣ 2 — 💰 Deposit\n` +
          `3️⃣ 3 — 💳 Pay\n` +
          `4️⃣ 4 — 🤝 Talk to Agent\n\n` +
          `_Reply with the number or keyword_`;
      }

      // Withdraw
      else if (["1", "withdraw"].includes(input)) {
        reply =
          `💸 *WITHDRAWAL*\n` +
          `──────────────────────\n` +
          `To process your withdrawal, please provide:\n\n` +
          `📌 Amount to withdraw\n` +
          `📌 Your account number\n` +
          `📌 Bank name\n\n` +
          `Our team will process your request promptly ✅\n\n` +
          `──────────────────────\n` +
          `Reply *0* or *menu* to go back 🏠`;
      }

      // Deposit
      else if (["2", "deposit"].includes(input)) {
        reply =
          `💰 *DEPOSIT*\n` +
          `──────────────────────\n` +
          `To make a deposit, please provide:\n\n` +
          `📌 Amount to deposit\n` +
          `📌 Your account number\n` +
          `📌 Payment method (M-Pesa / Bank)\n\n` +
          `Our team will confirm your deposit ✅\n\n` +
          `──────────────────────\n` +
          `Reply *0* or *menu* to go back 🏠`;
      }

      // Pay
      else if (["3", "pay"].includes(input)) {
        reply =
          `💳 *PAY*\n` +
          `──────────────────────\n` +
          `To make a payment, please provide:\n\n` +
          `📌 Amount to pay\n` +
          `📌 Recipient details\n` +
          `📌 Payment reference\n\n` +
          `Our team will process your payment ✅\n\n` +
          `──────────────────────\n` +
          `Reply *0* or *menu* to go back 🏠`;
      }

      // Talk to Agent
      else if (["4", "agent", "talk to agent"].includes(input)) {
        reply =
          `🤝 *TALK TO AGENT*\n` +
          `──────────────────────\n` +
          `You are being connected to a live agent.\n\n` +
          `⏳ Please wait, an agent will respond shortly.\n\n` +
          `Business hours: *Mon–Sat, 8AM–6PM*\n\n` +
          `──────────────────────\n` +
          `Reply *0* or *menu* to go back 🏠`;
      }

      // Unknown
      else {
        reply =
          `❓ I didn't understand that.\n\n` +
          `Please reply with:\n` +
          `*1* — Withdraw\n` +
          `*2* — Deposit\n` +
          `*3* — Pay\n` +
          `*4* — Talk to Agent\n\n` +
          `Or type *menu* to start over.`;
      }

      try {
        await sock.sendMessage(jid, { text: reply });
        console.log(`✅ Replied to ${jid}`);
      } catch (err) {
        console.error(`Failed to reply:`, err);
      }
    }
  });
}

console.log("Starting NETLINK AGENCIES WhatsApp Bot...\n");
startBot().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
