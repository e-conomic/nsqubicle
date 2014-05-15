var nsq = require('nsq.js');
var events = require('events');
var xtend = require('xtend');
var once = require('once');

var create = function(opts) {
	if (!opts) opts = {};
	if (!opts.channel) opts.channel = opts.service || '--global--';
	if (!opts.requeue) opts.requeue = 5000;
	if (!opts.namespace) opts.namespace = '';

	opts.namespace = opts.namespace ? '--'+opts.namespace+'--' : '';
	opts.broadcast = opts.broadcast !== false;

	var that = new events.EventEmitter();

	var writer;
	var ready = false;
	var pending = [];

	var conns = [];
	var onerror = function() {
		if (that.listeners('error').length) that.emit('error', err); // good idea???
	};

	var openWriter = function() {
		var drain = function(err) {
			while (pending.length) pending.shift()(err);
		};

		writer = nsq.writer(opts);
		writer.on('ready', function() {
			ready = true;
			drain();
		});
		writer.on('error', function(err) {
			onerror(err);
			ready = false;
			drain(err);
		});

		conns.push(writer);
	};

	var ensureWriter = function(cb) {
		if (!writer) openWriter();
		if (!ready) return pending.push(cb);
		cb();
	};

	var pull = function(topic, worker) {
		topic = opts.namespace + topic;
		var reader = nsq.reader(xtend(opts, {topic:topic}));

		reader.on('error', onerror);
		reader.on('discard', function(msg) {
			msg.finish();
		});
		reader.on('message', function(msg) {
			worker(msg.body, function(err) {
				if (err) return msg.requeue(opts.requeue);
				msg.finish();
			});
		});

		conns.push(reader);

		return function() {
			reader.close();
			var i = conns.indexOf(reader);
			if (i > -1) conns.splice(i, 1);
		};
	};

	var onbroadcast = function(worker) {
		return pull('broadcast', function(body, cb) {
			body = body.toString();
			var i = body.indexOf('@');
			worker(body.slice(0, i), JSON.parse(body.slice(i+1)), cb);
		});
	};

	that.pull = function(topic, worker) {
		if (arguments.length === 1) return onbroadcast(topic);
		return pull(topic, function(body, cb) {
			worker(JSON.parse(body.toString()), cb);
		});
	};

	var pushRetrier = function(topic, message) {
		var tries = 0;
		var timeout = 1000;
		return function cb(err) {
			if (!err) return;
			if (++tries >= 5) return onerror(err);
			setTimeout(function() {
				that.push(topic, message, cb);
			}, timeout *= 2);
		};
	};

	that.push = function(topic, message, cb) {
		topic = opts.namespace + topic;
		if (!cb) cb = pushRetrier(topic, message);
		ensureWriter(function(err) {
			if (err) return cb(err);
			message = JSON.stringify(message);
			writer.publish(topic, message, cb);
			if (opts.broadcast) writer.publish('broadcast', topic+'@'+message);
		});
	};

	that.close = function() {
		conns.forEach(function(conn) {
			conn.close();
		});
	};

	return that;
};

module.exports = create;