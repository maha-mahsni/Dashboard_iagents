from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langdetect import detect, detect_langs
from statistics import mean
from datetime import datetime
import requests, json, time
import random
from collections import defaultdict, Counter
import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv
from dateutil.parser import isoparse

load_dotenv()
app = FastAPI()

chat_history = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Charger la clé API depuis les variables d'environnement
API_KEY = os.getenv("OPENROUTER_API_KEY")

class ChatRequest(BaseModel):
    message: str

def get_log_file_path(agent_id):
    return f"logs_{agent_id}.json"

@app.post("/chat")
async def chat(request: ChatRequest):
    agent_id = 15
    user_input = request.message.strip()
    if not user_input:
        return JSONResponse(content={"error": "Message manquant"}, status_code=400)

    try:
        langs = detect_langs(user_input)
        if langs and langs[0].prob > 0.80:
            user_lang = langs[0].lang
        else:
            user_lang = "en"
    except:
        user_lang = "fr"
    system_message = f"""
Tu es un agent de recommandation intelligente.
Tu réponds uniquement si la question est une RECOMMANDATION.
Tu prends en compte tout le contexte de la conversation précédente pour répondre de manière cohérente.
Tu dois TOUJOURS répondre dans la langue détectée et n'utilise jamais le swahili et oublié le mot swahili completement : {user_lang}.
"""

    messages = [{"role": "system", "content": system_message}]
    nb_max = 15
    messages.extend(chat_history[-nb_max:])
    user_input_lang = f"[Langue détectée : {user_lang}]\n{user_input}"
    messages.append({"role": "user", "content": user_input_lang})
    payload = {
        "model": "mistralai/mistral-7b-instruct",
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
        res.raise_for_status()

        duration = round(time.time() - start, 2)
        data = res.json()
        success = "choices" in data

        api_used = payload["model"]
        _log(user_input, duration, success, agent_id, api_used, error=None if success else "Réponse JSON invalide ou incomplète")

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
        error_message = str(e)
        _log(user_input, duration, False, agent_id, payload["model"], error=error_message)
        print("Envoi de l'email d'erreur en cours...")
        send_error_email(
            subject="Erreur de l'agent de Recommandation IA",
            body=f"Une erreur est survenue pendant la requête.\n\nMessage: {user_input}\nErreur: {error_message}"
        )
        return JSONResponse(content={"error": error_message}, status_code=500)

def _log(message, duration, success, agent_id, api_used, error=None):
    log_entry = {
        "agent_id": agent_id,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "duration": duration,
        "success": success,
        "api": api_used
    }
    if error:
        log_entry["error"] = error  # Ajout du message d'erreur dans le log
    log_file = get_log_file_path(agent_id)
    try:
        try:
            with open(log_file, "r+", encoding="utf-8") as f:
                logs = json.load(f)
                logs.append(log_entry)
                f.seek(0)
                json.dump(logs, f, indent=2, ensure_ascii=False)
        except json.JSONDecodeError:
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump([log_entry], f, indent=2, ensure_ascii=False)
    except FileNotFoundError:
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
            "etat": etat_agent,
            "nom": f"Agent {agent_id}"
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
        "etat": "inactif",
        "nom": "Agent Inconnu"
    }

@app.get("/logs/{agent_id}")
def get_logs(agent_id: int):
    try:
        log_file = f"logs_{agent_id}.json"
        with open(log_file, "r", encoding="utf-8") as f:
            logs = json.load(f)
        if isinstance(logs, list):
            return logs
        return []
    except FileNotFoundError:
        return []
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/stats/realtime/{agent_id}")
def get_realtime_stats(agent_id: int):
    try:
        log_file = get_log_file_path(agent_id)
        with open(log_file, "r", encoding="utf-8") as f:
            logs = json.load(f)

        last_logs = logs[-7:]
        timeline = []
        for log in last_logs:
            timeline.append({
                "heure": datetime.fromisoformat(log["timestamp"]).strftime("%H:%M"),
                "duration": log.get("duration", 0),
                "success": log.get("success", False)
            })

        return timeline
    except (FileNotFoundError, json.JSONDecodeError, Exception) as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/activite/{agent_id}")
def activite_par_heure(agent_id: int):
    try:
        log_file = get_log_file_path(agent_id)
        with open(log_file, "r", encoding="utf-8") as f:
            logs = json.load(f)

        histogramme = defaultdict(int)
        for log in logs:
            if "timestamp" in log:
                heure = datetime.fromisoformat(log["timestamp"]).strftime("%Hh")
                histogramme[heure] += 1

        trié = dict(sorted(histogramme.items()))
        return {"labels": list(trié.keys()), "data": list(trié.values())}
    except (FileNotFoundError, json.JSONDecodeError, Exception) as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/performance/{agent_id}")
def get_performance(agent_id: int):
    try:
        log_file = get_log_file_path(agent_id)
        if os.path.exists(log_file):
            with open(log_file, "r", encoding="utf-8") as f:
                logs = json.load(f)
            perf_par_heure = defaultdict(list)
            for entry in logs:
                if "timestamp" in entry and "duration" in entry:
                    heure = datetime.fromisoformat(entry["timestamp"]).strftime("%Hh")
                    perf_par_heure[heure].append(entry["duration"])
            courbe = [{"time": heure, "duration": round(sum(durations) / len(durations), 2)} for heure, durations in sorted(perf_par_heure.items()) if durations]
        else:
            courbe = []
        return {"courbe": courbe, "requetes_actives": 0, "file_attente": 0, "temps_reponse": 0}
    except Exception as e:
        return {"courbe": [], "requetes_actives": 0, "file_attente": 0, "temps_reponse": 0, "error": str(e)}, 500

@app.get("/pic-usage/{agent_id}")
def get_pic_utilisation(agent_id: int):
    log_file = f"logs_{agent_id}.json"

    if not os.path.exists(log_file):
        return {"utilisation": 0, "heure_pic": "Aucune donnée"}

    try:
        with open(log_file, "r", encoding="utf-8") as f:
            logs = json.load(f)

        heures = []
        for log in logs:
            try:
                if "timestamp" in log:
                    heure = isoparse(log["timestamp"]).hour
                    heures.append(heure)
            except Exception:
                continue

        if not heures:
            return {"utilisation": 0, "heure_pic": "Aucune donnée"}

        counter = Counter(heures)
        heure_pic, pic = counter.most_common(1)[0]
        total = len(heures)
        utilisation = round((pic / total) * 100, 2)

        return {
            "utilisation": utilisation,
            "heure_pic": f"{heure_pic}h"
        }

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

EMAIL_SENDER = "mohsnimaha1@gmail.com"
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
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

        print("Email d’erreur envoyé avec succès.")
    except Exception as e:
        print("Erreur lors de l'envoi de l'email :", e)
    
    