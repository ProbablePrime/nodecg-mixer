# nodecg-beam
Hook into Beam Events and emit them to NodeCG Compatible channels.

This is a [NodeCG](http://github.com/nodecg/nodecg) 0.7 bundle.

# TODO

## Events
- [X] Follow
- [X] Sub -Thanks so much NonGenericName
- [X] Misc Update Events
- [ ] Status
- [ ] Polls

## API Loading
For events that happen whilst the bundle is offline the Beam API can be pulled and compared to the internal data store.


# Installation
1. Install to `nodecg/bundles/nodecg-beam`
2. Create a config file in `nodecg/cfg/` called `nodecg-beam.json`
3. Add the channels you wish to track with e.g.
```
{
  "channels":["ChannelName"]
}
```

# Use 

This module does nothing by itself. To use it for alerts and other media you need to listen to the events it outputs.

Checkout [prime-alerts](https://github.com/ProbablePrime/prime-alerts) for a basic example

## Follow
```
nodecg.listenFor('follow', 'nodecg-beam', function(data) {
  //Snazzy Alerts
}

```

```
{
  "name":"username",
  "channel":"channel",
  "ts":3123123123123
}
```

## Update
```
nodecg.listenFor('update', 'nodecg-beam', function(data) {
  //Snazzy Alerts
}

```
This event is mostly parroted from the underlying Beam layer. Use them if they are useful!
