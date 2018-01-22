(function() {
	Polymer({
		is: 'list-event',
		properties: {
			item: {
				type: Object,
				observer: 'changed',
			},
		},
		changed(item) {
			Object.assign(this, item);
		},
		dismiss() {
			this.fire(`dismiss`, this);
		},
		resend() {
			nodecg.sendMessage(
				this.item.type,
				Object.assign({}, this.item, { replay: true }),
			);
		},
	});
})();
