# 🧠 IA Dashboard – Plateforme de gestion des agents intelligents

## 📌 Description

**IA Dashboard** est une application web moderne développée avec **Next.js**, **Material UI (MUI)** et **Framer Motion** et  **Python**, permettant de **gérer, surveiller et visualiser les performances de plusieurs agents d'intelligence artificielle**. Le tableau de bord propose une interface ergonomique, esthétique et responsive pour superviser les agents, analyser les statistiques en temps réel et interagir avec des chatbots intelligents.

---

## ✨ Fonctionnalités principales

- ✅ **Gestion complète des agents IA**
  - Création, édition, suppression et activation/désactivation d’agents.
  - Interface de filtrage et tri selon l’état (actif/inactif).
  
- 📊 **Tableau de bord détaillé par agent**
  - Statistiques en temps réel.
  - Graphiques dynamiques (ApexCharts).
  - Logs récents et indicateurs de performance.
  - Gauge pour le taux d'utilisation journalier.

- 🤖 **Chatbot IA intégré**
  - Intégré dans la sidebar.
  - Recommandations intelligentes (films, musique, restaurants, etc.).
  - Capable de comprendre le contexte et la langue de l'utilisateur.

- 🌐 **Internationalisation (i18n)**
  - Support multilingue : Français, Anglais, Arabe.

- 📩 **Système de notification d’erreur**
  - Envoi automatique d’e-mails stylisés en cas d’erreur .

---

## 🌗 Thème clair / sombre

L’interface du dashboard est entièrement **responsive au thème** :
- Basculable en **mode sombre** ou **mode clair**.
- Design fluide et couleurs adaptées automatiquement via MUI et `useTheme`.
- Expérience utilisateur optimale de jour comme de nuit.

---

## 🛠️ Technologies utilisées

- **Frontend**
  - [Next.js 14+](https://nextjs.org/)
  - [Material UI](https://mui.com/)
  - [Framer Motion](https://www.framer.com/motion/)
  - [ApexCharts](https://apexcharts.com/)
  - React Hooks, Context API

- **Backend**
  - [FastAPI](https://fastapi.tiangolo.com/)
  - Python 3.11+
  - Recommandation intelligente via LLM (OpenRouter / mistralai)

- **Base de données**
  - [Prisma ORM](https://www.prisma.io/)
  - MySQL

---

## 🖼️ Aperçu de l’interface

> Interface moderne avec composants animés, layout clair, et expérience utilisateur fluide (UX/UI design inspiré des dashboards pro comme Vercel, Linear, etc.).

---

## 🚀 Lancer le projet en local

### Prérequis

- Node.js 18+
- Python 3.11+
- Prisma (`npx prisma generate`)
- (Facultatif) : .env local pour les clés API et configuration

### Commandes

```bash
# Lancer le frontend
npm install
cd package 
npm run dev


# Test Jenkins CI/CD
