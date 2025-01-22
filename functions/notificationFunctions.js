const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');



exports.sendNotification = functions.firestore
  .onDocumentCreated('notifications/{notificationId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return;
    }
    const newNotification = snapshot.data();
    const userId = newNotification.userId;

    try {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userToken = userDoc.data()?.deviceToken;

      if (!userToken) {
        console.log('Nessun token trovato per l\'utente:', userId);
        return;
      }

      const message = {
        notification: {
          title: 'Nuova notifica',
          body: newNotification.message,
        },
        token: userToken,
      };

      const response = await admin.messaging().send(message);
      console.log('Notifica inviata con successo:', response);
    } catch (error) {
      console.error('Errore nell\'invio della notifica:', error);
    }
  });