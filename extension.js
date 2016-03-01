'use strict';

var nodecg;
var Channel = require('./lib/Channel.js');
var LiveLoading = require('./lib/Live.js');
var channelCache = {};

var toArray = require('object-values-to-array');

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
				channelCache[channelName] = channel;
			}
		});
	}

	createLive();
	addChannels();

	function eachChannel(func) {
		return toArray(channelCache).map(func);
	}

	function getUnDismissed(type, cb) {
		if (typeof cb !== 'function') {
			return;
		}
		var func = 'findUnDismissedFollows';
		if (type === 'subscriptions') {
			func = 'findUnDismissedSubscriptions';
		}
		var promises = eachChannel((channel) => channel[func]());
		Promise.all(promises).then((result) => {
			var combinedArray = result.reduce((previous, next) => previous.concat(next), []);
			cb(null, combinedArray);
		}).catch((err) => cb(err, []));
	}

	// Static'ed to prim atm
	nodecg.listenFor('getFollows', function (value, cb) {
		getUnDismissed('follows', cb);
	});
	nodecg.listenFor('getSubscriptions', function (value, cb) {
		getUnDismissed('subscriptions', cb);
	});

	nodecg.listenFor('dismissFollow', function (value) {
		eachChannel((channel) => channel.dismissFollow(value));
	});
	nodecg.listenFor('dismissSubscription', function (value) {
		eachChannel((channel) => channel.dismissSubscription(value));
	});
};
