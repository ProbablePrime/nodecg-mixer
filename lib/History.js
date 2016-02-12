//Stolen from https://raw.githubusercontent.com/SupportClass/lfg-sublistener/master/extension/history.js :)
'use strict';

var MAX_LEN = 100;
var JSONStorage = require('node-localstorage').JSONStorage;
var jsonStorage = new JSONStorage('./db/nodecg-beam');

function History(channel,type) {
	channel = channel.toLowerCase();
	this.storeKey = channel + '-' + type;
	this.store = jsonStorage.getItem(this.storeKey);

	if (!this.store) {
		this.store = [];
	}
}

History.prototype = {
	add: function(username, ts) {
		username = username.toLowerCase();

		this.store.push({username:username, ts:ts});

		if (this.store.length > MAX_LEN) {
			this.truncate();
		}
		this.save();
	},
	removeOldest: function() {
		this.store.shift();
	},
	truncate: function() {
		while(this.store.length > MAX_LEN) {
			this.removeOldest();
		}
	},
	hasEvent: function(username, ts) {
		username = username.toLowerCase();
		return this.store.some(function(user) {
			if(ts === void 0) {
				return user.username === username;
			}
			return (user.ts === ts && user.username === username);
		});
	},
	save: function() {
		jsonStorage.setItem(this.storeKey, this.store);
	}
};


module.exports = History;
