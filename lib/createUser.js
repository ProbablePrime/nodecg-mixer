var eventType = require('./eventType');
var createUser = function (username) {
	return {
		username: username,
		subscription: eventType(),
		follow: eventType()
	};
};

module.exports = createUser;
