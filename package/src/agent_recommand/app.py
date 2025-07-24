from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langdetect import detect
from statistics import mean
from datetime import datetime
import requests, json, time
import random
from collections import defaultdict
import json
import smtplib
from email.message import EmailMessage
from langdetect import detect_langs
from fastapi import FastAPI, HTTPException
import os
app = FastAPI()
chat_history = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

API_KEY = "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"

class ChatRequest(BaseModel):
    message: str

def get_log_file_path(agent_id):
    return f"logs_{agent_id}.json"

@app.post("/chat")
async def chat(request: ChatRequest):
    agent_id = 15  # À modifier dynamiquement si nécessaire (par exemple, via un paramètre)
    user_input = request.message.strip()
    if not user_input:
        return JSONResponse(content={"error": "Message manquant"}, status_code=400)

    try:
        langs = detect_langs(user_input)
        if langs and langs[0].prob > 0.80:
            user_lang = langs[0].lang
        else:
            user_lang = "en"  # par défaut
    except:
        user_lang = "fr"
    system_message = f"""
Tu es un agent de recommandation intelligente.
Tu réponds uniquement si la question est une RECOMMANDATION.
Tu prends en compte tout le contexte de la conversation précédente pour répondre de manière cohérente.
Tu dois TOUJOURS répondre dans la langue détectée : {user_lang}.
"""

    # 🧠 Appel à l’API externe
    messages = [{"role": "system", "content": system_message}]

    # Ajouter jusqu'à 10 derniers messages pour garder le contexte conversationnel
    nb_max = 10
    messages.extend(chat_history[-nb_max:])  # Alternance user/assistant

    # Ajouter le message courant avec langue détectée
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
        _log(user_input, duration, success, agent_id, api_used)

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
        _log(user_input, duration, False, agent_id, payload["model"])
        print("Envoi de l'email d'erreur en cours...")
        send_error_email(
            subject="Erreur de l'agent de Recommandation IA",
            body=f"Une erreur est survenue pendant la requête.\n\nMessage: {user_input}\nErreur: {str(e)}"
        )
        return JSONResponse(content={"error": str(e)}, status_code=500)

# 🔄 Fonction pour enregistrer les logs avec l'API utilisée
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
        return []  # Retourner un tableau vide si le fichier n'existe pas
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
@app.get("/stats/realtime/{agent_id}")
def get_realtime_stats(agent_id: int):
    try:
        log_file = get_log_file_path(agent_id)
        with open(log_file, "r", encoding="utf-8") as f:
            logs = json.load(f)

        last_logs = logs[-7:]  # Derniers 7 logs pour l’historique
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

        trié = dict(sorted(histogramme.items()))  # Trie les heures
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
            courbe = []  # Tableau vide si pas de logs
        return {"courbe": courbe, "requetes_actives": 0, "file_attente": 0, "temps_reponse": 0}
    except Exception as e:
        return {"courbe": [], "requetes_actives": 0, "file_attente": 0, "temps_reponse": 0, "error": str(e)}, 500
@app.get("/pic-usage/{agent_id}")
def get_pic_utilisation(agent_id: int):
    log_file = f"logs_{agent_id}.json"
    
    if not os.path.exists(log_file):
        return {"utilisation": 0}
    
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            logs = json.load(f)

        heures = [datetime.fromisoformat(log["timestamp"]).hour for log in logs if "timestamp" in log]
        if not heures:
            return {"utilisation": 0}
        heure_max = max(set(heures), key=heures.count)
        total = len(heures)
        pic = heures.count(heure_max)
        utilisation = round((pic / total) * 100, 2)

        return {"utilisation": utilisation}
    
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