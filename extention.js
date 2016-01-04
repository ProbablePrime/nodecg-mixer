'use strict';

var nodecg;
var Channel = require('./lib/Channel.js');
var channels = [];

module.exports = function (extensionApi) {
    nodecg = extensionApi;

    if (!Object.keys(nodecg.bundleConfig).length) {
        throw new Error('No config found in cfg/lfg-twitch.json, aborting!');
    }

    if (!nodecg.bundleConfig.channels) {
        throw new Error('No channels present in the config file aborting');
    }

    nodecg.bundleConfig.channels.forEach(function(channel){
    	channels[channel] = new Channel(channel,nodecg);
    });
}
