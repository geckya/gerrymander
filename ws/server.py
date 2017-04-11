###############################################################################
#
# The MIT License (MIT)
#
# Copyright (c) Tavendo GmbH
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
###############################################################################

from autobahn.twisted.websocket import WebSocketServerProtocol, \
    WebSocketServerFactory
from twisted.internet import reactor, defer
from twisted.python import log
from datetime import datetime, timedelta
import os
import sys
from gerryRunner import runData, error


class MyServerProtocol(WebSocketServerProtocol):
    recent_requests = {} # {ip : [window_start_time, num_requests_in_window]}
    td = timedelta(seconds=300) # 5 minute window
    window_max_requests = 5
    
    def onConnect(self, request):
        self.ip = request.headers['x-forwarded-for'] if 'x-forwarded-for' in request.headers else None
        print "connection from %s" % self.ip

    def onOpen(self):
        # print("WebSocket connection open.")
        pass

    def onMessage(self, payload, isBinary):
        if isBinary:
            return # we shouldn't get any of these

        # clean up old requests
        self.__class__.recent_requests = {ip:l for ip,l in self.recent_requests.items() if l[0]+self.td > datetime.now()}
        ip = self.ip
        if ip == None:
            # No IP found, so just run the request
            reactor.callInThread(lambda: runData(payload, ip, self.sendMessage), False)
        else:
            if not ip in self.recent_requests:
                self.recent_requests[ip] = [datetime.now(), 0]

            if self.recent_requests[ip][1] >= self.window_max_requests:
                # return an error
                reactor.callInThread(lambda: self.sendMessage(error("You've done too many calculations recently. Please wait a few minutes and try again.")))
            else:
                self.recent_requests[ip][1] += 1
                reactor.callInThread(lambda x: runData(payload, ip, self.sendMessage), False) # XXX why is lambda given an argument?

    def onClose(self, wasClean, code, reason):
        # print("WebSocket connection closed: {0}".format(reason))
        pass


if __name__ == '__main__':
    log.startLogging(sys.stdout)

    factory = WebSocketServerFactory(u"ws://gerrymander.princeton.edu:9001")
    factory.protocol = MyServerProtocol
    # factory.setProtocolOptions(maxConnections=2)

    reactor.listenTCP(9001, factory)
    reactor.run()
