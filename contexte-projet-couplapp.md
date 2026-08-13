# CoupApp — Contexte projet

## Objectif
Application mobile Android de communication privée entre Florent et Caro. Chat temps réel, partage photo/vidéo, stockage commun, et une architecture modulaire permettant d'ajouter facilement d'autres fonctionnalités (todo-list commune, calendrier partagé, tracker, etc.) au fil du temps.

Usage strictement personnel, à deux utilisateurs (pas de scalabilité multi-tenant à prévoir pour la V1).

## Stack technique

**Backend**
- FastAPI (Python)
- WebSockets natifs FastAPI pour le chat temps réel
- PostgreSQL comme base relationnelle principale
- Stockage médias : bucket S3-compatible (Minio self-hosted ou Cloudflare R2 / Backblaze B2)
- Auth JWT simple, 2 comptes utilisateurs fixes

**Frontend mobile (Android)**
- Capacitor ou React Native (arbitrage à faire selon fluidité souhaitée pour le chat)
- Cible Android uniquement pour la V1, portabilité iOS non exclue plus tard

**Modélisation**
- Méthodologie Merise (MCD/MLD) pour la conception de la base de données
- Format de travail : Mermaid erDiagram

## Principe d'architecture modulaire
- Une table `modules` en base : chaque fonctionnalité (chat, galerie, stockage, todo, etc.) est pensée comme un module isolé avec ses propres routes API et son propre schéma de données
- Objectif : pouvoir ajouter un nouveau module sans casser l'existant
- Le chat + partage médias + stockage commun constituent le socle du module "core" de la V1

## Roadmap
1. **V1** : chat (texte + photo/vidéo), stockage commun basique, auth 2 utilisateurs
2. **V2+** : modules additionnels (à définir avec Caro au fur et à mesure des besoins du quotidien)

## Prochaine étape en cours
Construire le MCD (Modèle Conceptuel de Données) Merise pour la V1 : entités probables — Utilisateur, Message, Média, Conversation, Module, Stockage.

## Contraintes / préférences de Florent
- Réutiliser au maximum les compétences déjà maîtrisées (FastAPI, PostgreSQL, Merise) plutôt que d'apprendre une stack totalement nouvelle
- Projet perso hors cadre professionnel Actemium, à ne pas confondre avec les projets d'alternance
- Préférence pour une solution self-hosted quand c'est raisonnable (ex. Minio) plutôt que dépendre de services tiers payants
