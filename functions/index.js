const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

exports.notifyChatMembers = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const message = event.data && event.data.data();
    if (!message || !message.senderUid) return;

    const chatId = event.params.chatId;
    const chatSnap = await db.doc('chats/' + chatId).get();
    if (!chatSnap.exists) return;

    const chat = chatSnap.data() || {};
    const recipients = (chat.memberUids || []).filter(uid => uid !== message.senderUid);
    if (!recipients.length) return;

    const tokenDocs = await Promise.all(recipients.map(uid =>
      db.collection('users').doc(uid).collection('pushTokens').get()
    ));
    const tokenRows = tokenDocs.flatMap(snapshot =>
      snapshot.docs.map(doc => ({ ref: doc.ref, token: doc.data().token })).filter(row => !!row.token)
    );
    if (!tokenRows.length) return;

    const title = chat.isGroup
      ? (chat.title || 'Doc Saver group')
      : (message.senderName || 'New message');
    const body = chat.isGroup
      ? ((message.senderName || 'Someone') + ': ' + String(message.text || 'Sent a message').slice(0, 120))
      : String(message.text || 'Sent you a message').slice(0, 140);

    const response = await getMessaging().sendEachForMulticast({
      tokens: tokenRows.map(row => row.token),
      notification: { title, body },
      data: { chatId, messageId: event.params.messageId },
      webpush: {
        notification: {
          title,
          body,
          icon: 'https://adrianchiho-a11y.github.io/Doc-Saver/icons/doc-saver-icon.svg',
          badge: 'https://adrianchiho-a11y.github.io/Doc-Saver/icons/doc-saver-icon.svg',
          tag: 'docsaver-chat-' + chatId,
          renotify: true
        },
        fcmOptions: { link: 'https://adrianchiho-a11y.github.io/Doc-Saver/' }
      }
    });

    const invalid = [];
    response.responses.forEach((result, index) => {
      if (!result.success && result.error &&
          ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(result.error.code)) {
        invalid.push(tokenRows[index].ref.delete());
      }
    });
    if (invalid.length) await Promise.all(invalid);
  }
);
