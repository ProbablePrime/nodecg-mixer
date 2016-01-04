//Stolen from https://raw.githubusercontent.com/SupportClass/lfg-sublistener/master/extension/history.js :)
'use strict';

var hist = {};
var MAX_LEN = 100;
var JSONStorage = require('node-localstorage').JSONStorage;
var jsonStorage = new JSONStorage('./db/nodecg-beam');

module.exports = {
	add: function(username, channel, event, subTS) {
		username = username.toLowerCase();
		channel = channel.toLowerCase();

		// Make the channel key if it doesn't exist yet
		if (!hist.hasOwnProperty(channel)) {
			hist[channel] = jsonStorage.getItem(channel) || [];
		}
		var user = this.get(channel,username);
		if(!user) {
			user = {
				username:username,
				sub:false,
				follow:false
			};
			hist[channel].push(user);
		}
		if(event === 'follow') {
			user.follow = true;
		}
		if(event === 'sub') {
			user.sub = true;
			if(subTS !== undefined) {
				user.subTS = subTS;
			}
		}

		// Maintain a reasonable max length for the history
		var items = hist[channel];
		while (items.length > MAX_LEN) { // If we have more than MAX_LEN items, remove the oldest items
			items.shift();
		}

		jsonStorage.setItem(channel, hist[channel]);
	},
	eventExists: function(username, channel, event,subTS) {
		username = username.toLowerCase();
		channel = channel.toLowerCase();

		if (!hist.hasOwnProperty(channel)) {
			hist[channel] = jsonStorage.getItem(channel) || [];
		}
		var user = this.get(channel,username);
		if(!user) {
			return false;
		}
		if (hist[channel].length === 0) {
			return false;
		}

		if(event === 'follow') {
			return user.follow;
		} else {
			if (typeof subTS !== 'undefined') {
				return user.subTS === subTS && user.sub;
			} else {
				return user.sub;
			}
		}
		return false;
	},
	get: function(channel,username) {
		username = username.toLowerCase();
		channel = channel.toLowerCase();

		if (!hist.hasOwnProperty(channel)) {
			hist[channel] = jsonStorage.getItem(channel) || [];
		}

		return hist[channel].find(function(value) {
			return value.username === username;
		});
	},
	MAX_LEN: MAX_LEN
};
