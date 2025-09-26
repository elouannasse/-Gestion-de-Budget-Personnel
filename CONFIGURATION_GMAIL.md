## 🔧 GUIDE RAPIDE - Configuration Gmail

### ÉTAPES À SUIVRE :

1. **Générer un mot de passe d'application Gmail :**

   - Allez sur: https://myaccount.google.com/security
   - Activez la "Validation en 2 étapes"
   - Cherchez "Mots de passe d'application"
   - Créez un nouveau mot de passe pour "Autre (nom personnalisé)"
   - Nommez-le "Gestion Budget"
   - COPIEZ le mot de passe généré (16 caractères)

2. **Modifier le fichier .env :**
   - Ouvrez le fichier .env
   - Remplacez `REMPLACEZ_PAR_VOTRE_EMAIL@gmail.com` par votre vrai email
   - Remplacez `REMPLACEZ_PAR_VOTRE_MOT_DE_PASSE_APP` par le mot de passe généré

### EXEMPLE :

```
SMTP_USER=moncompte@gmail.com
SMTP_PASS=abcdefghijklmnop
```

### TEST :

Après modification, lancez dans le terminal :

```
node scripts/testEmailSimple.js
```

### ⚠️ IMPORTANT :

- N'utilisez PAS votre mot de passe Gmail normal
- Utilisez UNIQUEMENT le mot de passe d'application généré
- Le mot de passe fait exactement 16 caractères
- Pas d'espaces dans le mot de passe

### 🎯 RÉSULTAT ATTENDU :

Une fois configuré, vous recevrez de vrais emails au lieu des liens de test !
