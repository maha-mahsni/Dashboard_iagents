from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langdetect import detect_langs
from statistics import mean
from datetime import datetime
import requests, json, time
import random
from collections import defaultdict
import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv
from dateutil.parser import isoparse  
from collections import Counter

load_dotenv()
app = FastAPI()
chat_history = []  # Historique global partagé

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"]
)

API_KEY = "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"

class ChatRequest(BaseModel):
    message: str

def get_log_file_path(agent_id):
    return f"logs_{agent_id}.json"

@app.post("/chat")
async def chat(request: ChatRequest):
    agent_id = 15  # À modifier dynamiquement si nécessaire
    user_input = request.message.strip()
    if not user_input:
        return JSONResponse(content={"error": "Message manquant"}, status_code=400)

    # Détection de langue améliorée
    try:
        langs = detect_langs(user_input)
        detected_lang = next((lang.lang for lang in langs if lang.prob > 0.85), "en")  # Priorité à la langue avec confiance > 85%
    except Exception:
        detected_lang = "en"  # Langue par défaut si détection échoue

    # Instruction système avec contrainte de langue
    system_message = f"""
Tu es un agent de recommandation intelligente.
Tu réponds UNIQUEMENT si la question concerne une RECOMMANDATION (ex. : films, livres, restaurants).
Tu prends en compte tout le contexte de la conversation précédente pour répondre de manière cohérente.
TU DOIS TOUJOURS répondre dans la langue détectée : {detected_lang}.
Ne jamais utiliser de langue autre que celle détectée.
"""

    # Construction des messages avec historique
    messages = [{"role": "system", "content": system_message}]
    max_history = 10
    messages.extend(chat_history[-max_history:])  # Derniers 10 messages
    messages.append({"role": "user", "content": f"[Langue : {detected_lang}]\n{user_input}"})

    payload = {
        "model": "mistralai/mistral-7b-instruct",
        "messages": messages,
        "temperature": 0.7  # Ajustement pour des réponses plus cohérentes
    }

    start = time.time()
    try:
        res = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            timeout=10,  # Augmentation du timeout pour éviter les erreurs
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json=payload
        )
        res.raise_for_status()

        duration = round(time.time() - start, 2)
        data = res.json()
        success = "choices" in data

        _log(user_input, duration, success, agent_id, payload["model"])

        if not success or not data["choices"]:
            send_error_email(
                subject="Réponse invalide de l'agent",
                body=f"Réponse JSON invalide ou vide.\nMessage: {user_input}\nDonnées: {json.dumps(data)}"
            )
            return JSONResponse(content={"error": "Réponse invalide"}, status_code=500)

        response = data["choices"][0]["message"]["content"]
        chat_history.append({"role": "user", "content": user_input, "lang": detected_lang})
        chat_history.append({"role": "assistant", "content": response, "lang": detected_lang})
        return {"response": response}

    except requests.RequestException as e:
        duration = round(time.time() - start, 2)
        _log(user_input, duration, False, agent_id, payload["model"])
        send_error_email(
            subject="Erreur de l'agent de Recommandation IA",
            body=f"Erreur réseau : {str(e)}\nMessage: {user_input}"
        )
        return JSONResponse(content={"error": str(e)}, status_code=500)
    except Exception as e:
        duration = round(time.time() - start, 2)
        _log(user_input, duration, False, agent_id, payload["model"])
        send_error_email(
            subject="Erreur interne de l'agent",
            body=f"Erreur : {str(e)}\nMessage: {user_input}"
        )
        return JSONResponse(content={"error": str(e)}, status_code=500)

def _log(message, duration, success, agent_id, api_used):
    log_entry = {
        "agent_id": agent_id,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "duration": duration,
        "success": success,
        "api": api_used
    }
    log_file = get_log_file_path(agent_id)
    try:
        if os.path.exists(log_file):
            with open(log_file, "r+", encoding="utf-8") as f:
                logs = json.load(f)
                logs.append(log_entry)
                f.seek(0)
                json.dump(logs, f, indent=2, ensure_ascii=False)
        else:
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump([log_entry], f, indent=2, ensure_ascii=False)
    except Exception:
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump([log_entry], f, indent=2, ensure_ascii=False)

@app.get("/stats/{agent_id}")
def get_stats(agent_id: int):
    try:
        log_file = get_log_file_path(agent_id)
        with open(log_file, "r", encoding="utf-8") as f:
            agent_logs = json.load(f)

        if not agent_logs:
            return _empty_stats()

        durations = [log.get("duration", 1.5) for log in agent_logs]
        success_count = sum(1 for log in agent_logs if log.get("success"))
        taux_succes = round((success_count / len(agent_logs)) * 100, 1) if agent_logs else 0
        etat_agent = "actif" if agent_logs[-1].get("success") else "erreur"
        tokens_total = len(agent_logs) * 30
        cout_total = round(tokens_total * 0.0001, 3)
        api_used = agent_logs[-1].get("api", "inconnu")

        return {
            "executions": len(agent_logs),
            "temps_moyen": f"{round(mean(durations), 2)}s",
            "derniere_execution": datetime.fromisoformat(agent_logs[-1]["timestamp"]).strftime("%d/%m/%Y %H:%M"),
            "taux_succes": f"{taux_succes}%",
            "tokens": tokens_total,
            "cout": f"{cout_total}$",
            "api": api_used,
            "etat": etat_agent
        }
    except (FileNotFoundError, json.JSONDecodeError):
        return _empty_stats()
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

def _empty_stats():
    return {
        "executions": 0,
        "temps_moyen": "0s",
        "derniere_execution": "-",
        "taux_succes": "0%",
        "tokens": 0,
        "cout": "0.00$",
        "api": "inconnu",
        "etat": "inactif"
    }

# (Les autres endpoints /logs, /stats/realtime, /activite, /performance, /pic-usage restent inchangés pour cet exemple)

EMAIL_SENDER = "mohsnimaha1@gmail.com"
EMAIL_PASSWORD = "uevrbbroclgsomhw"
EMAIL_RECEIVER = "maha.mahsni@esprit.tn"

def send_error_email(subject, body):
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = EMAIL_SENDER
    msg['To'] = EMAIL_RECEIVER

    html_content = f"""
    <html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="color: #d32f2f;">❌ Erreur détectée</h2>
            <p style="font-size: 16px;">Une erreur est survenue.</p>
            <div style="margin: 20px 0; padding: 15px; background-color: #ffecec; border-left: 4px solid #f44336;">
                <p><strong>Détails :</strong> {body}</p>
            </div>
            <p style="font-size: 14px; color: #555;">Heure : <strong>{datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}</strong></p>
        </div>
    </body></html>
    """

    msg.set_content("Erreur. Voir HTML.")
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_SENDER, EMAIL_PASSWORD)
            smtp.send_message(msg)
        print("Email envoyé avec succès.")
    except Exception as e:
        print(f"Erreur lors de l'envoi : {e}")