// Local preview only. Fail closed: this entrypoint always selects the test database.
process.env.FIRESTORE_DATABASE_ID = 'testing';
module.exports = require('../functions/lib/src/testing');
