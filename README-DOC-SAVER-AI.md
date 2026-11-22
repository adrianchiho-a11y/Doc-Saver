# Doc Saver AI setup

Doc Saver AI runs through an authenticated Firebase callable Cloud Function. The OpenAI API key is stored in Google Secret Manager through Firebase Functions secrets; it must never be added to `index.html`, GitHub Pages, or any other browser code.

## What is included

- One AI assistant button shared by Docs, Sheets, and Slides.
- Suggestions-only mode when the consent checkbox is unchecked.
- Direct document changes only when the user checks the consent checkbox.
- A one-step **Undo AI Changes** action immediately after an AI edit.
- Firebase Authentication is required before the callable function will run.
- The callable function validates the editor type and payload size before sending data to OpenAI.
- Each signed-in account is limited to 30 AI requests per UTC day by default to help control API costs.

## One-time account setup

You need access to the Firebase project `doc-saver-515422`, an OpenAI API account, and a computer with Node.js 20 or newer.

### 1. Enable Firebase billing

Firebase Cloud Functions deployment requires the **Blaze (pay-as-you-go)** plan. In the Firebase console, open the Doc Saver project, go to **Usage and billing**, and upgrade to Blaze. Google may ask you to attach a billing account.

Cloud Functions, Cloud Build, Artifact Registry, and Secret Manager can incur Google Cloud charges. Set a Google Cloud budget alert before deploying. A budget alert is a warning, not a hard spending cap.

### 2. Create an OpenAI API key

1. Open https://platform.openai.com/api-keys.
2. Create a new secret API key for Doc Saver.
3. Add a payment method or API credits in the OpenAI Platform billing settings.
4. Keep the key private. Do not paste it into GitHub, this HTML file, or a public chat.

ChatGPT subscriptions do not include OpenAI API usage. API requests are billed separately by OpenAI.

### 3. Install the Firebase command-line tools

Install Node.js 20 LTS from https://nodejs.org/ if it is not already installed.

Open PowerShell or Command Prompt and run:

```powershell
npm install -g firebase-tools
firebase login
```

### 4. Download the Doc Saver branch

Use GitHub Desktop (recommended for beginners):

1. Open the Doc Saver repository in GitHub Desktop.
2. Choose **Current Branch** and select `feature/doc-saver-ai-2026-11-22`.
3. Choose **Fetch origin**, then **Repository > Show in Explorer**.
4. Open a terminal in that repository folder.

Or use Git:

```powershell
git clone https://github.com/adrianchiho-a11y/Doc-Saver.git
cd Doc-Saver
git switch feature/doc-saver-ai-2026-11-22
```

### 5. Connect the folder to the Firebase project

From the repository root folder, run:

```powershell
firebase use doc-saver-515422
```

If the CLI says the project is not selected, run `firebase projects:list` and confirm that your Google account has access to `doc-saver-515422`.

### 6. Save the OpenAI key as a Firebase secret

From the repository root, run:

```powershell
firebase functions:secrets:set OPENAI_API_KEY
```

When prompted, paste the OpenAI secret key. The CLI stores it in Secret Manager. Do not put it in a source file or commit it to GitHub.

### 7. Install backend dependencies and deploy

Run these commands from the repository root:

```powershell
cd functions
npm install
cd ..
firebase deploy --only functions:docSaverAI
```

The first deployment may ask to enable Google Cloud services. Approve the required services for Firebase Functions, Cloud Build, Artifact Registry, and Secret Manager. Wait for deployment to finish and confirm that the `docSaverAI` function is deployed in `us-central1`.

If you change the secret later, run `firebase functions:secrets:set OPENAI_API_KEY` again and redeploy the function.

## Test checklist

After the function deploys, open the GitHub Pages test build using the branch preview workflow (or deploy the branch to a test site):

1. Sign in to Doc Saver with Firebase.
2. Open a test document and click **Doc Saver AI**.
3. Leave the checkbox unchecked and ask for a grammar review. Confirm the AI gives suggestions and the document does not change.
4. Check the consent box and ask it to rewrite a short test document. Confirm it applies the changes.
5. Click **Undo AI Changes** immediately and confirm the previous content returns.
6. Repeat with a test sheet and a test slide deck.
7. Test with an account that is signed out; the backend should reject the request.

## Important notes

- The current callable function sends the selected document content and the user's prompt to OpenAI for processing. Do not send passwords, payment details, or other sensitive information.
- The function does not save a separate copy of document contents. The normal Doc Saver save flow stores the result in the user's existing workspace.
- AI output can be incorrect or destructive. Review important work and keep backups.
- The consent checkbox is an explicit product confirmation, not a guarantee that a liability disclaimer is legally enforceable.
- Each signed-in account has a default limit of 30 AI requests per UTC day. This is a safety limit in the backend code and can be adjusted later.
- API usage is billed separately by OpenAI. Firebase/Google Cloud usage may also be billed under Blaze.
- Do not merge this branch into `main` until the AI has been tested successfully.
