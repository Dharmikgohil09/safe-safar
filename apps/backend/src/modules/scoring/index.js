const express = require('express');
const models = require('./models');

// Empty router ready to be mounted by Dharmik's bootstrap
const router = express.Router();

module.exports = {
  router,
  ...models
};
