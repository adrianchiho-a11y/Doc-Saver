# Doc Saver Chat setup

The website chat code is in `index.html`. It uses the existing Firebase Authentication session and Firestore in the existing `doc-saver-515422` project.

## 1. Publish Firestore security rules

In Firebase Console, open **Firestore Database → Rules**. Replace the rules with the contents of `firestore.rules`, then click **Publish**.

These rules:
- Keep each user's existing `users/{uid}/...` data private to that user.
- Keep the existing preliminary `sharedItems` owner/recipient access.
- Allow signed-in Doc Saver accounts to search the minimal public account directory by exact email.
- Restrict conversations and their messages to the conversation's member UIDs.
- Allow message reactions and pins while limiting message edits/deletes to the sender (group creator can delete messages).

The public profile directory exposes the account email/name to other authenticated Doc Saver users so they can find one another. Do not publish a different set of rules that makes all workspace data public.

## 2. Deploy the notification function

Install Node.js 20 and Firebase CLI, then run these commands from the repository folder:

```bash
npm install -g firebase-tools
firebase login
firebase use doc-saver-515422
cd functions
npm install
cd ..
firebase deploy --only firestore:rules,functions
```

Cloud Functions deployment requires the Firebase project to use the **Blaze** billing plan. Firebase Cloud Messaging itself does not require you to put server credentials in the website.

## 3. Add the Web Push public key

In Firebase Console, open **Project settings → Cloud Messaging → Web Push certificates** and generate a key pair if one does not exist. Copy the **public key**.

After the website update is published, open Doc Saver, open Chat, click **Enable notifications**, and paste the public key when asked. Then allow notifications in the browser. Do this on each device where notifications are wanted.

The public VAPID key is stored in that browser's local storage. The FCM registration token is stored under the signed-in account's private `users/{uid}/pushTokens` collection. Never put a service-account private key in the website.

## Chat features currently included

- Direct messages found by exact Doc Saver account email
- Group conversations created with multiple account emails
- Live message updates
- Emoji reactions (❤️, 👍, 😂)
- Replies, message editing/deletion, and pin/unpin
- Typing indicator and read timestamps
- In-app/desktop notifications while the page is open
- Background push notification plumbing for installed PWAs after the Cloud Function and VAPID key are configured

This is the first chat release. It does not yet include voice/video calls, file attachments, message forwarding, message search, or member management after a group is created.
