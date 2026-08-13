# CoupApp (Bichou)

Application mobile Android de communication privée entre Florent et Caro : chat temps réel, partage photo/vidéo, stockage commun, avec une architecture modulaire permettant d'ajouter facilement d'autres fonctionnalités (todo-list commune, calendrier partagé, tracker, etc.) au fil du temps.

Usage strictement personnel, à deux utilisateurs (pas de scalabilité multi-tenant prévue pour la V1).

## Structure du repo

```
Bichou/
├── Bichou-app-mobile/        # Frontend mobile (Expo / React Native)
│   ├── app/                  # Routes (expo-router)
│   ├── components/           # Composants UI (ex: MessageBubble)
│   ├── screens/               # Écrans (ex: ChatScreen)
│   ├── data/                  # Données mock pour le dev
│   ├── hooks/                  # Hooks (ex: useAppTheme)
│   ├── theme/                  # Couleurs / thème
│   ├── types/                  # Types partagés
│   └── utils/                  # Utilitaires (ex: mediaPicker)
├── contexte-projet-couplapp.md  # Note de cadrage du projet
└── backend/                    # (à venir) API FastAPI
``` 

## Stack technique

**Backend** *(à venir)*
- FastAPI (Python)
- WebSockets natifs FastAPI pour le chat temps réel
- PostgreSQL comme base relationnelle principale
- Stockage médias : bucket S3-compatible (Minio self-hosted ou Cloudflare R2 / Backblaze B2)
- Auth JWT simple, 2 comptes utilisateurs fixes

**Frontend mobile (Android)**
- Expo / React Native
- Cible Android uniquement pour la V1, portabilité iOS non exclue plus tard

**Modélisation**
- Méthodologie Merise (MCD/MLD) pour la conception de la base de données
- Format de travail : Mermaid erDiagram

## Architecture modulaire

Une table `modules` en base : chaque fonctionnalité (chat, galerie, stockage, todo, etc.) est pensée comme un module isolé avec ses propres routes API et son propre schéma de données, pour pouvoir ajouter un nouveau module sans casser l'existant. Le chat + partage médias + stockage commun constituent le socle du module "core" de la V1.

## Roadmap

1. **V1** : chat (texte + photo/vidéo), stockage commun basique, auth 2 utilisateurs
2. **V1+** : modules additionnels (à définir au fil des besoins du quotidien)

## Démarrer le frontend

```bash
cd Bichou-app-mobile
npm install
npx expo start
```

Voir [contexte-projet-couplapp.md](contexte-projet-couplapp.md) pour le détail du cadrage et des contraintes du projet.
