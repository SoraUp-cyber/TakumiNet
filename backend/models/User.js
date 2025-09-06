const Datastore = require('nedb');
const path = require('path');

// Crea la base de datos en un archivo local llamado users.db
const db = new Datastore({
  filename: path.join(__dirname, '../data/users.db'),
  autoload: true
});

// Función para crear usuario
function createUser(user, callback) {
  db.insert(user, callback);
}

// Función para buscar usuario por email o username
function findUser(query, callback) {
  db.findOne(query, callback);
}

module.exports = { createUser, findUser };
