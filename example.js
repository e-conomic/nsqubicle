var nsq = require('./');

var queue = nsq({
	nsqd: [':4150'],
	namespace: 'lols',
	channel: 'meh'
});

queue.pull(function(topic, message, cb) {
	console.log('[broadcast]', topic, message);
	cb();
});

queue.pull('hello', function(message, cb) {
	console.log('[unicast]', message);
	cb();
});

queue.push('hello', {hello:'world'});
queue.push('world', {world:true});