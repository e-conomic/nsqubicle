Archived
======
Tech Leads: Repository archived due to inactivity in more than 6 months.
Please remember to add a CODEOWNERS file to the root of the repository when unarchiving.

# nsqubicle

Wraps [nsq.js](https://github.com/segmentio/nsq.js) into an easy to use interface

	npm install nsqubicle

## Usage

Read messages using `pull` and write messages using `push`

``` js
var nsq = require('nsqubicle');
var queue = nsq({
	nsqd: ['127.0.0.1:4150'],
	channel: 'my-channel'
});

queue.pull('test', function(message, callback) {
	console.log('we have pulled a message!', message);
	callback(); // we are done with the message
});

queue.push('test', {hello:'world'});
```

The options map is passed directly to [nsq.js](https://github.com/segmentio/nsq.js) as well.
In addition to the regular nsq options you can pass

``` js
{
	namespace: 'namespace-topics-with-me',
	broadcast: true // set to false to disable broadcasting
}
```

If you call the callback with an error the message will be requeued.

## Broadcasting

Per default nsqubicle broadcast all messages to a `broadcast` topic as well.
You can read these messages by calling `pull` without a topic

``` js
queue.pull(function(topic, message, callback) {
	console.log('someone pushed to', topic, 'with message', message);
	callback();
});
```

## License

MIT
