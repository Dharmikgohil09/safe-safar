const express = require('express');
const contactsController = require('./contacts.controller');
const { createContactSchema, deleteContactSchema } = require('./contacts.validation');
const validate = require('../../../middleware/validate.middleware');
const { requireAuth } = require('../../../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', contactsController.getContacts);
router.post('/', validate(createContactSchema), contactsController.addContact);
router.delete('/:id', validate(deleteContactSchema), contactsController.removeContact);

module.exports = router;
