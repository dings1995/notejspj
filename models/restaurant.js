var mongoose = require('mongoose');

var restaurantSchema = mongoose.Schema({
    address : {
        street: String,
        zipcode: String,
        building: String,
        coord: [Number,Number]
    },
    borough: String,
    cuisine: String,
    rating: [{rate: {type: Number, min: 0, max: 10}, rateBy: String}],
    name: {type: String, required: true},
    createBy: String,
    photo: String,
    minetype: String
});

module.exports = restaurantSchema;