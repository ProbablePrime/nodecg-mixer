(function () {
	'use strict';
	const followers = [];
	const subscribers = [];
	Polymer({
		is: 'panel-body',

		properties: {

		},
		ready() {
			nodecg.sendMessage('getChannelData','ProbablePrime', function(err, result) {
				console.log(result);
				onUpdate(result,result);
			})

			nodecg.sendMessage('getFollows', '', function (err, follows) {
				if (follows) {
					followers = follows;
				}
			});
			nodecg.sendMessage('getSubscriptions', '', function (err, subscriptions) {
				if (subscriptions) {
					subscribers = subscriptions;
				}
			});
			nodecg.listenFor('subscription', this.addSub);
			nodecg.listenFor('follow', this.addFollow);
			nodecg.listenFor('update', this.onUpdate);
		}
	});
})();
