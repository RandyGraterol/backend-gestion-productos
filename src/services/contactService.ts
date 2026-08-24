import ContactMessage from '../models/ContactMessage';

// ==================== PÚBLICO ====================

export interface CreateContactInput {
  name: string;
  email: string;
  message: string;
}

export const createContactMessage = async (input: CreateContactInput): Promise<ContactMessage> => {
  return ContactMessage.create({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    message: input.message.trim(),
    isRead: false,
  });
};

// ==================== ADMIN ====================

export const listContactMessages = async (page = 1, limit = 20) => {
  const { rows, count } = await ContactMessage.findAndCountAll({
    order: [
      ['isRead', 'ASC'],
      ['createdAt', 'DESC'],
    ],
    offset: (page - 1) * limit,
    limit,
  });
  return {
    items: rows,
    total: count,
    page,
    totalPages: Math.max(1, Math.ceil(count / limit)),
  };
};

export const markMessageAsRead = async (id: string, isRead: boolean): Promise<ContactMessage | null> => {
  const message = await ContactMessage.findByPk(id);
  if (!message) return null;

  await message.update({ isRead });
  return message;
};

export const deleteContactMessage = async (id: string): Promise<boolean> => {
  const rows = await ContactMessage.destroy({ where: { id } });
  return rows > 0;
};

export const getContactStats = async () => {
  const [total, unread] = await Promise.all([
    ContactMessage.count(),
    ContactMessage.count({ where: { isRead: false } }),
  ]);
  return { total, unread };
};
