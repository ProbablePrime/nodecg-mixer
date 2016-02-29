'use strict';

var EventEmitter = require('events');
var util = require('util');

var WsabiClient = require('wsabi-client-bacon');
var Promise = require('bluebird');

function Live(nodecg) {
	var self = this;

	self.nodecg = nodecg;

	self.channels = {};
	self.openTime = 0;

	self.wsabi = new WsabiClient('wss://realtime.beam.pro');
	self.wsabi.liveUrl = '/api/v1/live';

	self.wsabi.socket.on('open', function () {
		self.openTime = Date.now();
		self.log('Connected to Beam Servers');
		self.emit('connected');
	});
	self.wsabi.socket.on('reopen', function () {
		self.openTime = Date.now();
		self.nodecg.log.warn('Beam connection re-opened');
		self.emit('reconnected');
	});
	self.wsabi.socket.on('close', function () {
		self.lastClose = Date.now();
		self.emit('disconnected');
	});
	self.wsabi.on('error', function (err) {
		self.log(err);
	});

	EventEmitter.call(self);
}
util.inherits(Live, EventEmitter);

Live.prototype.log = function (msg) {
	var self = this;
	self.nodecg.log.info(msg);
	self.nodecg.sendMessage('log', msg);
};

Live.prototype.addChannel = function (channel) {
	var self = this;
	if (!self.channels[channel.name]) {
		self.channels[channel.name] = channel;
	}
	self.wsabi.get('/api/v1/channels/' + channel.name).then(function (res) {
		channel.setData(res);
		self.log('Subscribing to ' + channel.name + ' events');
		self.registerEvent('user', 'update', channel.userID, channel);
		self.registerEvent('channel', 'subscribed', channel.id, channel);
		self.registerEvent('channel', 'resubscribed', channel.id, channel);
		self.registerEvent('channel', 'update', channel.id, channel);
		self.registerEvent('channel', 'status', channel.id, channel);
		self.registerEvent('channel', 'followed', channel.id, channel);
		self.log('Subscribed to ' + channel.name + ' events');
		channel.checkFollows();
	}, function (res) {
		if (res.body) {
			throw new Error('Problem with config: ' + res.body);
		}
	});
};

Live.prototype.registerEvent = function (type, eventName, id, channel) {
	var self = this;
	var slugString = self.buildSlug(type, eventName, id);
	self.wsabi.live(slugString).then(function (res) {
		res.onValue(channel.onUpdate.bind(channel, slugString));
	}, function (err) {
		self.nodecg.log.error(err);
	});
};

Live.prototype.checkStatus = function () {
	var self = this;
	self.log('Checking status');
	self.wsabi.get('/api/v1/live').then(function (data) {
		console.log(data);
	}, function (err) {
		console.log(err);
	});
};

Live.prototype.buildSlug = function (type, eventName, id) {
	return type + ':' + id + ':' + eventName;
};

Live.prototype.scrapeFollowers = function (channel) {
	var self = this;
	self.nodecg.log.info('polling followers');
	return self.wsabi.get('/api/v1/channels/' + channel.id + '?fields=numFollowers').then(function (res) {
		var followers = res.numFollowers;
		var pages = Math.floor(followers / 100);
		var remainder = followers % 100;
		if (remainder > 0) {
			pages += 1;
		}
		return pages;
	}).then(function (pages) {
		var length = pages;
		var pageNum;
		var promises = [];
		for (pageNum = 0; pageNum < length; pageNum++) {
			promises.push(self.wsabi.get('/api/v1/channels/' + channel.id + '/follow?limit=100&fields=id,username&page=' + pageNum));
		}
		return Promise.all(promises);
	}).then(function (result) {
		var combinedArray;
		if (result.length > 1) {
			combinedArray = result.reduce(function (previous, next) {
				return previous.concat(next);
			}, []);
		} else {
			combinedArray = result[0];
		}
		if (!combinedArray) {
			return [];
		}
		return combinedArray;
	});
};

module.exports = Live;
