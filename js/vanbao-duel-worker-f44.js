/* Short-lived worker; no networking, account state or rewards. */
self.window=self;
importScripts('vanbao-chess-f44.js','vanbao-duel-f44.js');
self.onmessage=event=>self.postMessage({move:self.DuduVanBaoDuelF44.choose(event.data.board,event.data.p)});
