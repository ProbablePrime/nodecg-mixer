'use strict';

const EventEmitter = require('events');
const util = require('util');
const ws = require('ws');
const fetch = require('node-fetch');

const Carina = require('carina').Carina;
Carina.WebSocket = ws;

const API_BASE = 'https://mixer.com/api/v1/';

function buildURL(path) {
	return API_BASE + path;
}

function jsonFetch(url) {
	return fetch(buildURL(url)).then(res => res.json());
}

function fetchChannel(channelName) {
	return jsonFetch(`channels/${channelName}`)
}

function fetchNumFollowers(channelId) {
	return jsonFetch(`channels/${channelId}?fields=numFollowers`);
}
function fetchPage(channelId, pageNum) {
	return jsonFetch(`channels/${channelId}/follow?limit=100&fields=id,username&page=${pageNum}`)
}

module.exports = class Live extends EventEmitter{
	constructor(nodecg) {
		super();
		this.nodecg = nodecg;

		this.channels = {};
		this.openTime = 0;
		this.carina = new Carina({ isBot: true }).open();


		this.carina.socket.on('open', () => {
			this.openTime = Date.now();
			this.log('Connected to Mixer Servers');
			this.emit('connected');
		});
		this.carina.socket.on('close', () => {
			this.lastClose = Date.now();
			this.nodecg.log.warn('Disconnected from Mixer, Attempting a reconnection');
			this.emit('disconnected');
		});
		this.carina.socket.on('error', err => this.log(err));
	}

	log(msg) {
		this.nodecg.log.info(msg);
		this.nodecg.sendMessage('log', msg);
	}

	addChannel(channel) {
		if (!this.channels[channel.name]) {
			this.channels[channel.name] = channel;
		}
		this.log('fetching channel, '+ channel.name);
		fetchChannel(channel.name)
		.then(res => {
			channel.setData(res);
			this.log('Subscribing to ' + channel.name + ' events');
			const events = [
				['channel', 'update'],
				['channel', 'subscribed'],
				['channel', 'resubShared'],
				['channel', 'status'],
				['channel', 'followed'],
				['channel', 'hosted'],

				['user', 'update'],
			];
			events.forEach(event => {
				this.registerEvent(event[0], event[1], channel);
			});
			this.log('Subscribed to ' + channel.name + ' events');
		})
		.catch(err => {
			console.log(err);
		})
	}

	registerEvent (type, eventName, channel) {
		let id;
		if (type === 'channel') {
			id = channel.id;
		} else {
			id = channel.userID;
		}
		const slugString = this.buildSlug(type, eventName, id);
		this.log(`subscribing to ${slugString}`);
		this.carina.subscribe(slugString, data => {
			channel.onUpdate(slugString, data);
		})
	}
	buildSlug(type, eventName, id) {
		return `${type}:${id}:${eventName}`;
	}
	scrapeFollowers(channel) {
		//TODO Refactor
		this.log('Polling for Followers due to new connection');
		return fetchNumFollowers(channel.id)
		.then(res => {
			const followers = res.numFollowers;
			let pages = Math.floor(followers / 100);
			const remainder = followers % 100;
			if (remainder > 0) {
				pages += 1;
			}
			return pages;
		}).then(pages => {
			const length = pages;
			let pageNum = 0;
			const promises = [];
			for (pageNum = 0; pageNum < length; pageNum++) {
				promises.push(fetchPage(channel.id, pageNum));
			}
			return Promise.all(promises);
		}).then(result => {
			let combinedArray = [];
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
}
