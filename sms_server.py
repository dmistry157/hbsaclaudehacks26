import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Form, Response
from supabase import create_client
from twilio.rest import Client as TwilioClient
from agent import run_agent, build_context

app = FastAPI()

twilio = TwilioClient(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
TWILIO_NUMBER = os.environ["TWILIO_NUMBER"]


def get_db():
    # Uses service role key to bypass RLS — safe for server-side use only.
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def send_sms(to: str, body: str) -> None:
    # Truncate to 1600 chars (10 SMS segments) if Claude's response is long.
    if len(body) > 1600:
        body = body[:1597] + "..."
    twilio.messages.create(to=to, from_=TWILIO_NUMBER, body=body)


@app.post("/sms")
async def receive_sms(From: str = Form(...), Body: str = Form(...)):
    db = get_db()

    # 1. Look up user by phone number
    phone_result = db.table("user_phones").select("user_id").eq("phone", From).execute()
    if not phone_result.data:
        send_sms(From, "Your number isn't linked to an account yet. Log in at the web app and link your phone number in the sidebar.")
        return Response(content="", media_type="text/xml")

    user_id = phone_result.data[0]["user_id"]

    # 2. Load most recent saved analysis
    analysis_result = (
        db.table("variant_analyses")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not analysis_result.data:
        send_sms(From, "No saved analyses found. Run a variant analysis on the web app and save it first.")
        return Response(content="", media_type="text/xml")

    analysis = analysis_result.data[0]

    # 3. Load conversation history (last 20 messages)
    history = (
        db.table("sms_conversations")
        .select("role,content")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .limit(20)
        .execute()
    ).data or []

    # 4. Build message list with genetic context as a priming exchange
    messages = [
        {"role": "user", "content": build_context(analysis)},
        {"role": "assistant", "content": "I have your complete genetic analysis. What would you like to know?"},
        *[{"role": h["role"], "content": h["content"]} for h in history],
        {"role": "user", "content": Body},
    ]

    # 5. Run agent
    response_text = run_agent(messages)

    # 6. Persist both sides of the exchange
    db.table("sms_conversations").insert([
        {"user_id": user_id, "role": "user", "content": Body},
        {"user_id": user_id, "role": "assistant", "content": response_text},
    ]).execute()

    # 7. Send reply
    send_sms(From, response_text)
    return Response(content="", media_type="text/xml")


@app.get("/health")
def health():
    return {"status": "ok"}
