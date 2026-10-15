const contactsService = require('./contacts.service');

const getContacts = async (req, res, next) => {
  try {
    const contacts = await contactsService.getUserContacts(req.user._id);
    return res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    next(error);
  }
};

const addContact = async (req, res, next) => {
  try {
    const { name, phone, telegramToken } = req.body;
    const contact = await contactsService.createContact(req.user._id, { name, phone, telegramToken });

    return res.status(201).json({
      success: true,
      message: 'Contact added successfully',
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

const removeContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await contactsService.deleteContact(req.user._id, id);

    return res.status(200).json({
      success: true,
      message: 'Contact removed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContacts,
  addContact,
  removeContact
};
