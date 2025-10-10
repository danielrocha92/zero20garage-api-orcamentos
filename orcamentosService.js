import { db, admin } from '../config/db.js';

const COLLECTION = 'orcamentos';

export const updateOrcamentoWithImage = async (orcamentoId, { imageUrl, public_id, remove = false }) => {
  const ref = db.collection(COLLECTION).doc(orcamentoId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Orçamento não encontrado');

  let currentImages = doc.data().imagens || [];

  if (remove) {
    currentImages = currentImages.filter(img => img.public_id !== public_id);
  } else {
    if (imageUrl && public_id) {
      currentImages.push({ imagemUrl: imageUrl, public_id });
    }
  }

  await ref.update({ imagens: currentImages, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
};
