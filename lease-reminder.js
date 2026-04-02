// ============================================================
//  Lease WhatsApp Reminder — Twilio
//  Run daily. Sends alerts at 70 and 60 days before expiry.
// ============================================================

const twilio = require("twilio");

// ── TWILIO CREDENTIALS ───────────────────────────────────────
const ACCOUNT_SID      = "ACc15c67e5e0bc35283dd1c622893c0b73";
const AUTH_TOKEN       = process.env.TWILIO_AUTH_TOKEN; // set this: export TWILIO_AUTH_TOKEN="your_token"
const FROM_WHATSAPP    = "whatsapp:+14155238886";        // your Twilio sandbox number
const TEMPLATE_SID     = "HXb5b62575e6e4ff6129ad7c8efe1f983e"; // Appointment Reminders template

// ── LEASE DATA ───────────────────────────────────────────────
const leases = [
  {
    address: "240 Whitlock Pl NE",
    expiry:  "2026-06-12",
    phone:   "+1403835499"
  }


  {
    address: "230 Whitlock Pl NE",
    expiry:  "2026-06-11",
    phone:   "+1403835499"
  }
  // Add more leases here as needed:
  // { address: "...", expiry: "YYYY-MM-DD", phone: "+1..." },
];

// ── REMINDER WINDOWS ─────────────────────────────────────────
const REMINDER_DAYS = [70, 60];

// ── HELPERS ──────────────────────────────────────────────────
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + "T00:00:00"); expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

// ── SEND VIA APPROVED TEMPLATE ───────────────────────────────
// Reuses your "Appointment Reminders" template:
//   "Your appointment is coming up on {{1}} at {{2}}."
//   {{1}} = lease expiry date
//   {{2}} = urgency note (70 days / 60 days warning)
async function sendTemplateMessage(client, toPhone, expiryDateStr, daysLeft) {
  const to = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;
  const urgencyNote = daysLeft === 70
    ? "70 days left — start renewal process"
    : "60 days left — urgent action required";

  const msg = await client.messages.create({
    from:             FROM_WHATSAPP,
    to,
    contentSid:       TEMPLATE_SID,
    contentVariables: JSON.stringify({
      "1": formatDate(expiryDateStr),
      "2": urgencyNote
    })
  });
  return msg.sid;
}

// ── MAIN ─────────────────────────────────────────────────────
async function runReminders() {
  if (!AUTH_TOKEN) {
    console.error("❌  TWILIO_AUTH_TOKEN environment variable is not set.");
    console.error("    Run:  export TWILIO_AUTH_TOKEN=\"your_token_here\"");
    process.exit(1);
  }

  console.log(`\n🏠  Lease reminder check — ${new Date().toDateString()}`);
  console.log("─".repeat(55));

  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  let sentCount = 0;

  for (const lease of leases) {
    const days = daysUntil(lease.expiry);
    console.log(`\nProperty : ${lease.address}`);
    console.log(`Expiry   : ${lease.expiry}  (${days} days away)`);

    if (REMINDER_DAYS.includes(days)) {
      console.log(`🔔  ${days}-day reminder triggered — sending WhatsApp...`);
      try {
        const sid = await sendTemplateMessage(client, lease.phone, lease.expiry, days);
        console.log(`✅  Sent to ${lease.phone}  [SID: ${sid}]`);
        sentCount++;
      } catch (err) {
        console.error(`❌  Failed: ${err.message}`);
      }
    } else {
      const next = days > 70 ? 70 : days > 60 ? 60 : null;
      const info = next ? `next alert in ${days - next} days (at ${next}-day mark)` : "past alert window";
      console.log(`   No reminder today — ${info}`);
    }
  }

  console.log("\n─".repeat(55));
  console.log(`Done. ${sentCount} message(s) sent.\n`);
}

runReminders();

// ============================================================
//  QUICK START
// ============================================================
//
//  1. Install dependency:
//       npm init -y && npm install twilio
//
//  2. Set your Auth Token (find it at console.twilio.com):
//       export TWILIO_AUTH_TOKEN="your_auth_token_here"
//
//  3. Run manually to test:
//       node lease-reminder.js
//
//  4. Schedule daily (Linux/Mac — runs at 8 AM every day):
//       crontab -e
//       Add this line:
//       0 8 * * * TWILIO_AUTH_TOKEN="your_token" /usr/bin/node /path/to/lease-reminder.js >> ~/lease-reminder.log 2>&1
//
//  ── YOUR REMINDER DATES ──────────────────────────────────────
//  Property  : 240 Whitlock Pl NE
//  Expiry    : June 12, 2026
//  70-day alert fires → April 3, 2026
//  60-day alert fires → April 13, 2026
//
//  ── WHATSAPP MESSAGE THAT WILL BE SENT ───────────────────────
//  At 70 days:
//    "Your appointment is coming up on Friday, June 12, 2026
//     at 70 days left — start renewal process."
//
//  At 60 days:
//    "Your appointment is coming up on Friday, June 12, 2026
//     at 60 days left — urgent action required."
//
//  ── ADDING MORE LEASES ───────────────────────────────────────
//  Add entries to the leases array at the top of this file:
//  { address: "123 Example Ave", expiry: "2026-09-01", phone: "+15871234567" }
//
// ============================================================
