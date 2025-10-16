import { db, admin } from '../config/db.js';

const COLLECTION = 'orcamentos';

export const updateOrcamentoWithImage = async (orcamentoId, { newImages, public_id }) => {
  const ref = db.collection(COLLECTION).doc(orcamentoId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('Orçamento não encontrado');

  let currentImages = doc.data().imagens || [];

  if (public_id) {
    currentImages = currentImages.filter(img => img.public_id !== public_id);
  } else if (newImages) {
    currentImages = [...currentImages, ...newImages];
  }

  await ref.update({
    imagens: currentImages,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
};
