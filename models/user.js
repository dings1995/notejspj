var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    user_name: String,
    password: String
})

module.exports = userSchema;