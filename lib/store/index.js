const Datastore = require('nedb');

const createUser = require('./createUser');
const { FOLLOW, HOST, SUBSCRIPTION } = require('../util');

const Store = function(name) {
	var dbName;
	if (name) {
		dbName = name;
	} else {
		dbName = '';
	}
	this.db = new Datastore({
		filename: './db/nodecg-mixer/' + dbName,
		autoload: true
	});
	this.db.persistence.setAutocompactionInterval(1000 * 60);
};

Store.prototype = {
	storeUser: function(user) {
		var self = this;
		return new Promise(function(resolve, reject) {
			self.db.insert(user, function(err, doc) {
				if (err) {
					reject(err);
				} else {
					resolve(doc);
				}
			});
		});
	},
	updateUser: function(user) {
		var self = this;
		return new Promise(function(resolve, reject) {
			self.db.update(
				{ username: user.username },
				user,
				{ upsert: true },
				function(err, numReplaced) {
					if (err) {
						reject(err);
					} else {
						resolve(numReplaced);
					}
				}
			);
		});
	},
	_findUnDismissed: function(event) {
		var self = this;
		return new Promise(function(resolve, reject) {
			var searchObj = {};
			searchObj[event + '.dismissed'] = false;
			searchObj[event + '.active'] = true;
			self.db.find(searchObj, function(err, docs) {
				if (err) {
					reject(err);
				} else {
					resolve(docs);
				}
			});
		});
	},
	findUnDismissedFollows: function() {
		return this._findUnDismissed(FOLLOW);
	},
	findUnDismissedSubscriptions: function() {
		return this._findUnDismissed(SUBSCRIPTION);
	},
	getUser: function(username) {
		var self = this;
		return new Promise(function(resolve, reject) {
			self.db.find({ username: username }, function(err, docs) {
				if (err) {
					reject(err);
				} else {
					resolve(docs[0]);
				}
			});
		});
	},
	hasFollow: function(username) {
		return this._hasEvent(username, FOLLOW);
	},
	hasSubscription: function(username, ts) {
		return this._hasEvent(username, SUBSCRIPTION, ts);
	},
	_hasEvent: function(username, type, ts) {
		var self = this;
		return self.getUser(username).then(function(user) {
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
	_addEvent: function(username, type, ts) {
		var self = this;
		return self
			.getUser(username)
			.then(function(user) {
				if (!user) {
					user = createUser(username);
				}
				user[type].active = true;
				user[type].dismissed = false;
				user[type].ts = ts;
				return user;
			})
			.then(function(user) {
				return self.updateUser(user);
			});
	},
	addFollow: function(username, ts) {
		return this._addEvent(username, FOLLOW, ts);
	},
	addSubscription: function(username, ts) {
		return this._addEvent(username, SUBSCRIPTION, ts);
	},
	_dismissEvent: function(username, type) {
		var self = this;
		return self
			.getUser(username)
			.then(function(user) {
				if (!user) {
					user = createUser(username);
				}
				user[type].dismissed = true;
				return user;
			})
			.then(function(user) {
				return self.updateUser(user);
			});
	},
	dismissFollow: function(username) {
		return this._dismissEvent(username, FOLLOW);
	},
	dismissSubscription: function(username) {
		return this._dismissEvent(username, SUBSCRIPTION);
	}
};
module.exports = Store;
