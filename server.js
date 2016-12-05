var session = require('cookie-session');
var express = require('express');
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var assert = require('assert');
var app = express();

var MONGODBURL = 'mongodb://admin:admin@ds159747.mlab.com:59747/learning';
var ObjectId = require('mongodb').ObjectID;
mongoose.connect(MONGODBURL);
var restaurantSchema = require('./models/restaurant');
var userSchema = require('./models/user');

var user = mongoose.model('user', userSchema);
var restaurant = mongoose.model('restaurant', restaurantSchema);

app.use(session({
	name : 'session',
	keys : ['key1', 'key2'],
	maxAge : 60 * 60 * 1000
}));

app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(fileUpload());
app.use(bodyParser.json());

app.set('view engine', 'ejs');

app.get("/", function (req,res) {
	if(req.session.user_id == null){
		res.redirect('\login');
	}else{
		res.redirect('/read');
	}
})

app.get("/login", function (req,res) {
	res.sendFile( __dirname + '/views/login.html')
})

app.post("/login", function (req,res) {
	user.findOne(
		{
			user_name : req.body.user_name,
			password : req.body.password
		},
		function (err, docs) {
			if (err) {
				res.status(500).json(err);
				throw err
			}else {
				console.log(docs);
				if(docs != null){
					req.session.user_id = docs._id.toString();
					req.session.user_name = docs.user_name;
					res.redirect('/read')
				}else{
					res.end("wrong username/ password");
				}
				// res.json(docs);
			}
		}
	);
})

app.get("/read", function(req, res){
	var display = {};
	display[req.query.criteria] = req.query.keyword;
	if(req.query.criteria == undefined){
		req.query.criteria = 'name';
	}
	var criteria = {};
	criteria[req.query.criteria] = new RegExp(req.query.keyword, 'i');
	find_restaurant(criteria, function(docs){
		res.render("show",{"user_name" : req.session.user_name, "restaurants" : docs, "criteria" : JSON.stringify(display)});
	});
})

app.get("/read/name/:name", function(req, res) {
	find_restaurant({"name" : req.params.name}, function(docs){
		res.end(JSON.stringify(docs));
	});
})
app.get("/read/borough/:borough", function(req, res) {
	find_restaurant({"borough" : req.params.borough}, function(docs){
		res.end(JSON.stringify(docs));
	});
})
app.get("/read/cuisine/:cuisine", function(req, res) {
	find_restaurant({"cuisine" : req.params.cuisine}, function(docs){
		res.end(JSON.stringify(docs));
	});
})

function find_restaurant(criteria, callback){
	restaurant.find(criteria,function (err, docs) {
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			callback(docs);
		}
	});
}

app.get("/new", function (req,res) {
	res.sendFile( __dirname + '/views/restaurantsForm.html')
})

app.post("/new", function(req, res){
	var rObj = {};
	rObj.address = {};
	rObj.address.building = req.body.building;
	rObj.address.street = req.body.street;
	rObj.address.zipcode = req.body.zipcode;
	rObj.address.coord = [];
	rObj.address.coord.push(req.body.lon);
	rObj.address.coord.push(req.body.lat);
	rObj.borough = req.body.borough;
	rObj.cuisine = req.body.cuisine;
	rObj.name = req.body.name;
	rObj.createBy = req.session.user_name;
	rObj.photo = new Buffer(req.files.sampleFile.data).toString('base64');
	rObj.minetype = req.files.sampleFile.mimetype;

	var r = new restaurant(rObj);
	r.save(function(err) {
		if (err) {
			res.status(500).json(err);
			throw err
		}
		// console.log('Restaurant created!')
		res.redirect('/read');
		// res.status(200).json({message: 'insert done', id: r._id});
	});
})

app.post("/create", function(req, res){
	var body = "";
	console.log(req.body.address);

	var r = new restaurant(req.body);
	r.save(function(err, docs) {
		if(err){
			res.end(JSON.stringify({"status" : "failed"}));
		}else
			res.end(JSON.stringify({"status" : "ok", "_id" : docs._id.toString() }));// console.log('Restaurant created!')
	});
})

app.get("/display", function(req,res){
	restaurant.findOne(
		{
			_id : ObjectId(req.query._id)
		},function (err, docs) {
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			res.render("restaurantDetail",{"user_name" : req.session.user_name, "restaurant" : docs});
		}
	});
})

app.get("/rate", function(req,res){
	res.render("rateForm",{"id" : req.query._id});
})

app.post("/rate", function(req,res){

	if(req.session.user_name == ""){
		res.redirect("/login");
	}
	restaurant.findById(req.body.id, function(err, restaurant){
		if(err){
			res.status(500).send(err);
		}else{
			var repeat = false;
			for(var i = 0; i<restaurant.rating.length; i++){

				if(req.session.user_name == restaurant.rating[i].rateBy){
					repeat = true;
					break;
				}
			}
			if(!repeat){
				restaurant.rating.push({"rate":req.body.rating, "rateBy" : req.session.user_name});
				restaurant.save(function (err,docs) {
					if(err){
						res.status(500).send(err);
					}
					res.redirect("/display?_id=" + restaurant._id.toString());
				})
			}else{
				res.write("<p>already rate with this user name</p>");
				res.end("<p><a href='/read'>back to home page</a>");
			}
		}
	});
})

app.get("/edit", function(req,res){
	restaurant.findOne(
		{
			_id : ObjectId(req.query._id)
		},function (err, docs) {
			if (err) {
				res.status(500).json(err);
				throw err
			}else {
				res.render("editForm",{"user_name" : req.session.user_name, "restaurant" : docs});
			}
	});
})

app.post("/edit", function(req,res){

	if(req.session.user_name == ""){
		res.redirect("/login");
	}
	restaurant.findById(req.body.id, function(err, restaurant){
		if(err){
			res.status(500).send(err);
		}else{
			restaurant.address.building = req.body.building;
			restaurant.address.street = req.body.street;
			restaurant.address.zipcode = req.body.zipcode;
			var coord = [req.body.lon, req.body.lat];
			restaurant.address.coord = coord;
			restaurant.borough = req.body.borough;
			restaurant.cuisine = req.body.cuisine;
			restaurant.name = req.body.name;
			restaurant.photo = new Buffer(req.files.sampleFile.data).toString('base64');
			restaurant.minetype = req.files.sampleFile.mimetype;
			console.log(restaurant);
			restaurant.save(function (err,docs) {
				if(err){
					res.status(500).send(err);
				}
				res.redirect("/display?_id=" + restaurant._id.toString());
			})
		}
	});
})

app.get("/delete", function(req,res){
	restaurant.remove({_id : ObjectId(req.query._id)}, function(err){
		if(err){
			res.status(500).json(err);
			throw err;
		}else{
			res.redirect('/read');
		}
	});
})

app.get("/map", function(req,res) {
	var lat  = req.query.lat;
	var lon  = req.query.lon;
	var zoom = req.query.zoom;

	res.render("map.ejs",{'lat' : lat, 'lon' : lon, 'zoom' : zoom, 'name' : req.query.name});
	res.end();
});

app.listen(process.env.PORT || 8099);
