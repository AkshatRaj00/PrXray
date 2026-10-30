import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const target = body.target || 'Manual Test Trigger';
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log(`\n========================================`);
    console.log(`>>> [ALERT ENGINE TRIGGERED] Target: ${target}`);
    console.log(`========================================`);

    if (!token || !chatId) {
      console.error('[ALERT ENGINE] Token or Chat ID missing in process.env');
      return NextResponse.json({ ok: false, error: 'missing_env' }, { status: 500 });
    }

    const safeTarget = String(target).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    const htmlMessage = `⚡ <b>PR-XRay Scan Triggered</b>\n` +
      `────────────────────────\n` +
      `🎯 <b>Target:</b> <code>${safeTarget}</code>\n` +
      `⏰ <b>Timestamp:</b> <code>${timeStr}</code>\n` +
      `────────────────────────`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (data.ok) {
      console.log(`>>> [TELEGRAM SUCCESS] Delivered! Msg ID: ${data.result.message_id}\n`);
      return NextResponse.json({ ok: true, msgId: data.result.message_id });
    } else {
      console.error(`>>> [TELEGRAM ERROR]:`, data);
      return NextResponse.json({ ok: false, error: data }, { status: 400 });
    }
  } catch (err: any) {
    console.error(`>>> [DISPATCH ERROR]:`, err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}