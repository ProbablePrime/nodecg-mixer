'use strict';
const Channel = require('./lib/Channel.js');
const LiveLoading = require('./lib/Live.js');
const channelCache = {};

const toArray = require('object-values-to-array');

module.exports = function (extensionApi) {
	const nodecg = extensionApi;
	const live = new LiveLoading(nodecg);
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

	function onFollow(channelName, username) {
		log(`Follow: ${username}`);
		nodecg.sendMessage('follow', {
			name: username,
			channel: channelName,
			ts: Date.now()
		});
	};

	function onSub(channelName, username, ts) {
		var content = {
			name: username,
			channel: channelName,
			ts: ts
		};
		log(`Sub: ${username}`);
		nodecg.sendMessage('subscription', content);
	};

	function onHost(channelName, hoster, ts) {
		log(`Host: ${hoster}`);
		nodecg.sendMessage('host', {
			name: username,
			channel: channelName,
			ts: ts
		});
	}

	function onUpdate(channel, data) {
		nodecg.sendMessage('update', channel, data);
	};

	function addChannels() {
		var self = this;
		nodecg.bundleConfig.channels.forEach(channelName => {
			if (channelCache[channelName] === undefined) {
				var channel = new Channel(channelName, nodecg, live);
				channel.on('follow', onFollow.bind(self, channelName));
				channel.on('sub', onSub.bind(self, channelName));
				channel.on('update', onUpdate.bind(self, channelName));
				channel.on('host', onHost.bind(self, channelName));
				channelCache[channelName] = channel;
			}
		});
	}

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
		var promises = eachChannel(channel => channel[func]());
		Promise.all(promises).then(result => {
			var combinedArray = result.reduce((previous, next) => previous.concat(next), []);
			cb(null, combinedArray);
		}).catch(err => cb(err, []));
	}

	nodecg.listenFor('getFollows', function (value, cb) {
		getUnDismissed('follows', cb);
	});
	nodecg.listenFor('getChannelData', function(value, cb) {
		cb(null, channelCache[value].data);
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

	addChannels();
};
