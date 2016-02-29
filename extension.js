'use strict';

var nodecg;
var Channel = require('./lib/Channel.js');
var LiveLoading = require('./lib/Live.js');
var channelCache = {};

var live;

module.exports = function (extensionApi) {
	nodecg = extensionApi;
	if (!nodecg.bundleConfig || !Object.keys(nodecg.bundleConfig).length) {
		throw new Error('No config found in cfg/nodecg-beam.json, aborting!');
	}

	if (!nodecg.bundleConfig.channels) {
		throw new Error('No channels present in the config file aborting');
	}

	function log(msg) {
		nodecg.log.info(msg);
		nodecg.sendMessage('log', msg);
	}

	var onFollow = function (channelName, username) {
		var content = {
			name: username,
			channel: channelName,
			ts: Date.now()
		};
		log('follow ' + username);
		nodecg.sendMessage('follow', content);
	};

	var onSub = function (channelName, username, ts) {
		var content = {
			name: username,
			channel: channelName,
			ts: ts
		};
		log('Sub ' + username);
		nodecg.sendMessage('subscription', content);
	};

	var onUpdate = function (channel, data) {
		this.emit('update', channel, data);
		this.nodecg.sendMessage('update', channel, data);
	};

	function createLive() {
		live = new LiveLoading(nodecg);
	}

	function addChannels() {
		var self = this;
		nodecg.bundleConfig.channels.forEach(function (channelName) {
			if (channelCache[channelName] === undefined) {
				var channel = new Channel(channelName, nodecg, live);
				channel.on('follow', onFollow.bind(self, channelName));
				channel.on('sub', onSub.bind(self, channelName));
				channel.on('update', onUpdate.bind(self, channelName));
				// setTimeout(function() {
				// 	setInterval(function() {
				// 		channel.onUpdate('channel:000:resubscribed', {user:{username:'Bamb'}});
				// 	},1000);
				// },3000);
				channelCache[channelName] = channel;
			}
		});
	}

	createLive();
	addChannels();
	//Static'ed to prim atm
	var channel = 'ProbablePrime';
	nodecg.listenFor('getFollows', function (value, cb) {
		if (typeof cb === 'function') {
			channelCache[channel].findUnDismissedFollows().then(function (follows) {
				cb(null, follows);
			}).catch(function (err) {
				cb(err, null);
			});
		}
	});
	nodecg.listenFor('getSubscriptions', function (value, cb) {
		if (typeof cb === 'function') {
			channelCache[channel].findUnDismissedSubscriptions().then(function (subscriptions) {
				cb(null, subscriptions);
			}).catch(function (err) {
				cb(err, null);
			});
		}
	});

	nodecg.listenFor('dismissFollow', function (value) {
		channelCache[channel].dismissFollow(value);
	});
	nodecg.listenFor('dismissSubscription', function (value) {
		channelCache[channel].dismissSubscription(value);
	});
};
