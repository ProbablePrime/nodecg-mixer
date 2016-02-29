'use strict';
var Datastore = require('nedb');

var Promise = require('bluebird');
var createUser = require('./createUser');

var Store = function (name) {
	var dbName;
	if (name) {
		dbName = name;
	} else {
		dbName = '';
	}
	console.log(dbName);
	this.db = new Datastore({filename: './db/nodecg-beam/' + dbName, autoload: true});
	this.db.persistence.setAutocompactionInterval(1000 * 60);
};

Store.prototype = {
	storeUser: function (user) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.db.insert(user, function (err, doc) {
				if (err) {
					reject(err);
				} else {
					resolve(doc);
				}
			});
		});
	},
	updateUser: function (user) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.db.update({username: user.username}, user, {upsert: true}, function (err, numReplaced) {
				if (err) {
					reject(err);
				} else {
					resolve(numReplaced);
				}
			});
		});
	},
	_findUnDismissed: function (event) {
		var self = this;
		return new Promise(function (resolve, reject) {
			var searchObj = {};
			searchObj[event + '.dismissed'] = false;
			searchObj[event + '.active'] = true;
			console.log('searchObj');
			self.db.find(searchObj, function (err, docs) {
				if (err) {
					reject(err);
				} else {
					resolve(docs);
				}
			});
		});
	},
	findUnDismissedFollows: function () {
		return this._findUnDismissed('follow');
	},
	findUnDismissedSubscriptions: function () {
		return this._findUnDismissed('subscription');
	},
	getUser: function (username) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.db.find({username: username}, function (err, docs) {
				if (err) {
					reject(err);
				} else {
					resolve(docs[0]);
				}
			});
		});
	},
	hasFollow: function (username) {
		return this._hasEvent(username, 'follow');
	},
	hasSubscription: function (username, ts) {
		return this._hasEvent(username, 'subscription', ts);
	},
	_hasEvent: function (username, type, ts) {
		var self = this;
		return self.getUser(username).then(function (user) {
			if (!user) {
				return false;
			}
			var event = user[type];
			if (!event.active) {
				return false;
			}
			if (ts && event.ts !== ts) {
				return false;
			}
			return true;
		});
	},
	_addEvent: function (username, type, ts) {
		var self = this;
		return self.getUser(username).then(function (user) {
			if (!user) {
				user = createUser(username);
			}
			user[type].active = true;
			user[type].dismissed = false;
			user[type].ts = ts;
			return user;
		}).then(function (user) {
			return self.updateUser(user);
		});
	},
	addFollow: function (username, ts) {
		return this._addEvent(username, 'follow', ts);
	},
	addSubscription: function (username, ts) {
		return this._addEvent(username, 'subscription', ts);
	},
	_dismissEvent: function (username, type) {
		var self = this;
		return self.getUser(username).then(function (user) {
			if (!user) {
				user = createUser(username);
			}
			user[type].dismissed = true;
			return user;
		}).then(function (user) {
			return self.updateUser(user);
		});
	},
	dismissFollow: function (username) {
		return this._dismissEvent(username, 'follow');
	},
	dismissSubscription: function (username) {
		return this._dismissEvent(username, 'subscription');
	}
};
module.exports = Store;
