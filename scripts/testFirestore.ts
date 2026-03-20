import { db } from '../services/firebaseConfig';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

async function testFirestore() {
  console.log('--- FIRESTORE TEST START ---');
  try {
    const testId = 'test_' + Date.now();
    console.log('1. Attempting to add document to p2p_messages...');
    const docRef = await addDoc(collection(db, 'p2p_messages'), {
      chatId: 'test_chat_id',
      senderId: 'test_sender',
      receiverId: 'test_receiver',
      text: 'Hello Firestore ' + testId,
      timestamp: new Date().toISOString(),
      isRead: false
    });
    console.log('✅ Success! Doc ID:', docRef.id);

    console.log('2. Attempting to query p2p_messages back...');
    const q = query(collection(db, 'p2p_messages'), where('chatId', '==', 'test_chat_id'));
    const snapshot = await getDocs(q);
    console.log('✅ Query returned', snapshot.docs.length, 'documents');
    
    snapshot.forEach(doc => {
      console.log(' -> Found text:', doc.data().text);
    });

  } catch (err) {
    console.error('❌ Firestore Test Failed:', err);
  }
  console.log('--- FIRESTORE TEST END ---');
}

testFirestore();
