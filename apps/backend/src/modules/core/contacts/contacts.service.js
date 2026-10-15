const Contact = require('../../../models/contact.model');

const MAX_CONTACTS_PER_USER = 5;

const getUserContacts = async (userId) => {
  return await Contact.find({ userId })
    .select('_id name phone createdAt')
    .sort({ createdAt: -1 })
    .lean();
};

const createContact = async (userId, { name, phone, telegramToken }) => {
  const currentCount = await Contact.countDocuments({ userId });
  if (currentCount >= MAX_CONTACTS_PER_USER) {
    const error = new Error(`Maximum limit of ${MAX_CONTACTS_PER_USER} trusted contacts reached.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedPhone = phone.trim();

  // Check if contact already exists for this user
  const existing = await Contact.findOne({ userId, phone: normalizedPhone });
  if (existing) {
    const error = new Error('You have already added a contact with this phone number.');
    error.statusCode = 409;
    throw error;
  }

  const contact = await Contact.create({
    userId,
    name: name.trim(),
    phone: normalizedPhone,
    telegramToken: telegramToken ? telegramToken.trim() : null
  });

  return {
    _id: contact._id.toString(),
    name: contact.name,
    phone: contact.phone,
    createdAt: contact.createdAt
  };
};

const deleteContact = async (userId, contactId) => {
  const contact = await Contact.findById(contactId);

  if (!contact) {
    const error = new Error('Contact not found');
    error.statusCode = 404;
    throw error;
  }

  // Cross-user authorization check
  if (contact.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized to delete this contact');
    error.statusCode = 403;
    throw error;
  }

  await Contact.findByIdAndDelete(contactId);
  return { id: contactId, deleted: true };
};

module.exports = {
  MAX_CONTACTS_PER_USER,
  getUserContacts,
  createContact,
  deleteContact
};
