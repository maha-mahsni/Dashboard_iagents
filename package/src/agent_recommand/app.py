from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langdetect import detect
from statistics import mean
from datetime import datetime
import requests, json, time
import random
import requests, json, time, random
from collections import defaultdict
import json
import smtplib
from email.message import EmailMessage
app = FastAPI()
chat_history = []
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

API_KEY = "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"
MODEL = "mistralai/mistral-7b-instruct"

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    user_input = request.message.strip()
    if not user_input:
        return JSONResponse(content={"error": "Message manquant"}, status_code=400)

    try:
        user_lang = detect(user_input)
    except:
        user_lang = "fr"

    system_message = f"""
Tu es un agent de recommandation intelligente.
Tu dois répondre uniquement si la question est une RECOMMANDATION.
Tu réponds TOUJOURS en langue détectée : {user_lang}
"""

    # 🧠 Appel à l’API externe
# Ajouter l'historique au prompt
    messages = [{"role": "system", "content": system_message}]
    messages.extend(chat_history[-10:])  # Max 6 derniers échanges
    messages.append({"role": "user", "content": user_input})

    payload = {
    "model": MODEL,
    "messages": messages
               }

    start = time.time()
    try:
        res = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            timeout=8,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        res.raise_for_status()  # OBLIGATOIRE pour déclencher une erreur réseau/API

        duration = round(time.time() - start, 2)
        data = res.json()
        success = "choices" in data

        _log(user_input, duration, success)

        if not success:
            send_error_email(
                subject="Réponse invalide de l'agent",
                body=f"Réponse JSON invalide ou incomplète.\n\nMessage: {user_input}\nDonnées: {json.dumps(data)}"
            )
            return JSONResponse(content={"error": "Erreur inconnue"}, status_code=500)

        response = data["choices"][0]["message"]["content"]
        chat_history.append({"role": "user", "content": user_input})
        chat_history.append({"role": "assistant", "content": response})
        return {"response": response}

    except Exception as e:
        duration = round(time.time() - start, 2)
        _log(user_input, duration, False)
        print("Envoi de l'email d'erreur en cours...")
        send_error_email(
            subject="❌Erreur de l'agent de Recommandation IA",
            body=f"Une erreur est survenue pendant la requête.\n\nMessage: {user_input}\nErreur: {str(e)}"
        )
        return JSONResponse(content={"error": str(e)}, status_code=500)


# 🔄 Fonction pour retirer une requête de la file
def _log(message, duration, success):
    log_entry = {
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "duration": duration,
        "success": success
    }
    try:
        with open("logs.json", "r+", encoding="utf-8") as f:
            logs = json.load(f)
            logs.append(log_entry)
            f.seek(0)
            json.dump(logs, f, indent=2, ensure_ascii=False)
    except FileNotFoundError:
        with open("logs.json", "w", encoding="utf-8") as f:
            json.dump([log_entry], f, indent=2, ensure_ascii=False)

@app.get("/stats")
def get_stats():
    try:
        with open("logs.json", "r", encoding="utf-8") as f:
            logs = json.load(f)

        if not logs:
            return _empty_stats()

        durations = [log.get("duration", 1.5) for log in logs]
        success_count = sum(1 for log in logs if log.get("success"))
        taux_succes = round((success_count / len(logs)) * 100, 1)
        etat_agent = "actif" if logs[-1].get("success") else "erreur"
        tokens_total = len(logs) * 30
        cout_total = round(tokens_total * 0.0001, 3)

        return {
            "executions": len(logs),
            "temps_moyen": f"{round(mean(durations), 2)}s",
            "derniere_execution": datetime.fromisoformat(logs[-1]["timestamp"]).strftime("%d/%m/%Y %H:%M"),
            "taux_succes": f"{taux_succes}%",
            "tokens": tokens_total,
            "cout": f"{cout_total}$",
            "api": MODEL,
            "etat": etat_agent
        }

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
        "api": MODEL,
        "etat": "inactif"
    }
@app.get("/logs")
def get_logs():
    try:
        with open("logs.json", "r", encoding="utf-8") as f:
            logs = json.load(f)
        if isinstance(logs, list):
            return logs  # ✅ un vrai tableau
        return []
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/stats/realtime")
def get_realtime_stats():
    try:
        with open("logs.json", "r", encoding="utf-8") as f:
            logs = json.load(f)

        last_logs = logs[-7:]  # ⏱️ Derniers 7 logs pour l’historique
        timeline = []
        for log in last_logs:
            timeline.append({
                "heure": datetime.fromisoformat(log["timestamp"]).strftime("%H:%M"),
                "duration": log.get("duration", 0),
                "success": log.get("success", False)
            })

        return timeline
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/activite")
def activite_par_heure():
    try:
        with open("logs.json", "r", encoding="utf-8") as f:
            logs = json.load(f)

        histogramme = defaultdict(int)

        for log in logs:
            if "timestamp" in log:
                heure = datetime.fromisoformat(log["timestamp"]).strftime("%Hh")
                histogramme[heure] += 1

        trié = dict(sorted(histogramme.items()))  # Trie les heures

        return {"labels": list(trié.keys()), "data": list(trié.values())}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
@app.get("/performance")
def get_performance():
    try:
        with open("logs.json", "r", encoding="utf-8") as f:
            logs = json.load(f)

        # Grouper les durées par heure
        perf_par_heure = defaultdict(list)
        for entry in logs:
            if "timestamp" in entry and "duration" in entry:
                heure = datetime.fromisoformat(entry["timestamp"]).strftime("%Hh")
                perf_par_heure[heure].append(entry["duration"])

        courbe = []
        for heure, durations in sorted(perf_par_heure.items()):
            if durations:
                moyenne = round(sum(durations) / len(durations), 2)
                courbe.append({"time": heure, "duration": moyenne})

        # Requêtes actives et file attente
        try:
            with open("queue.json", "r", encoding="utf-8") as f:
                queue = json.load(f)
            requetes_actives = len(queue)
        except FileNotFoundError:
            requetes_actives = 0

        file_attente = max(0, requetes_actives - 1)

        return {
            
            "courbe": courbe
        }
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/pic-usage")
def get_pic_utilisation():
    try:
        with open("logs.json", "r", encoding="utf-8") as f:
            logs = json.load(f)

        activite_par_heure = defaultdict(int)
        for log in logs:
            heure = datetime.fromisoformat(log["timestamp"]).strftime("%H")
            activite_par_heure[heure] += 1

        if not activite_par_heure:
            return {"heure": "00h", "pic_utilisation": 0}

        heure_pic = max(activite_par_heure, key=activite_par_heure.get)
        total = sum(activite_par_heure.values())
        pourcentage = round((activite_par_heure[heure_pic] / total) * 100, 2)

        return {"heure": f"{heure_pic}h", "pic_utilisation": pourcentage}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

EMAIL_SENDER = "mohsnimaha1@gmail.com"
EMAIL_PASSWORD = "uevrbbroclgsomhw"
EMAIL_RECEIVER = "maha.mahsni@esprit.tn"

def send_error_email(subject, body):
    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = EMAIL_SENDER
        msg['To'] = EMAIL_RECEIVER

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <h2 style="color: #d32f2f;">❌ Erreur détectée dans l'agent IA</h2>
                <p style="font-size: 16px;">Une erreur est survenue pendant le traitement de la requête utilisateur.</p>

                <div style="margin: 20px 0; padding: 15px; background-color: #ffecec; border-left: 4px solid #f44336;">
                    <p><strong>Message :</strong> {body.split("Message:")[1].split("Erreur:")[0].strip()}</p>
                    <p><strong>Erreur :</strong> {body.split("Erreur:")[1].strip()}</p>
                </div>

                <p style="font-size: 14px; color: #555;">Heure de détection : <strong>{datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}</strong></p>

            </div>
        </body>
        </html>
        """

        msg.set_content("Une erreur est survenue. Voir la version HTML pour plus de détails.")
        msg.add_alternative(html_content, subtype='html')

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_SENDER, EMAIL_PASSWORD)
            smtp.send_message(msg)

        print(" Email d’erreur envoyé avec succès.")
    except Exception as e:
        print(" Erreur lors de l'envoi de l'email :", e)
