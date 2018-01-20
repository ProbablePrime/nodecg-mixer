(function () {
	'use strict';
	Polymer({
		is: 'panel-body',

		properties: {
			followers: {
				type: Array,
				value: []
			},
			subscriptions: {
				type: Array,
				value: []
			}
		},
		ready() {
			nodecg.sendMessage('getChannelData','ProbablePrime', (err, result) => {
				console.log(result);
				this.onUpdate(result,result);
			})

			nodecg.sendMessage('getFollows', '', (err, f) => {
				console.log(f);
				if (f) {
					this.set('followers', f);
				}
			});
			nodecg.sendMessage('getSubscriptions', '', (err, subs) => {
				if (subs) {
					this.set('subscriptions', subs);
				}
			});
			nodecg.listenFor('subscription', this.addSub);
			nodecg.listenFor('follow', this.addFollow);
			nodecg.listenFor('update', this.onUpdate);
		},
		addSub() {
		},
		addFollow() {

		},
		onUpdate() {

		},
		itemDismissed(e) {
			const item = e.detail.item;
			console.log('dismiss', item);
			nodecg.sendMessage('dismiss', item);
			this.removeItem(item);
		},
		removeItem(item) {
			if (item.type === 'follow') {
				this.arrayDelete('followers', item);
			}
			if (item.type === 'subscription') {
				this.arrayDelete('subscriptions', item);
			}
		}
	});
})();
