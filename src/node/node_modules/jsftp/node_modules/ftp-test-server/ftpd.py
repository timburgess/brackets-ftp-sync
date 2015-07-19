#!/usr/bin/env python
# $Id: basic_ftpd.py 977 2012-01-22 23:05:09Z g.rodola $

#  pyftpdlib is released under the MIT license, reproduced below:
#  ======================================================================
#  Copyright (C) 2007-2012 Giampaolo Rodola' <g.rodola@gmail.com>
#
#                         All Rights Reserved
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation
# files (the "Software"), to deal in the Software without
# restriction, including without limitation the rights to use,
# copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following
# conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
# OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
# WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
# OTHER DEALINGS IN THE SOFTWARE.
#
#  ======================================================================

"""A basic FTP server which uses a DummyAuthorizer for managing 'virtual
users', setting a limit for incoming connections.
"""

import os, sys, inspect, logging

from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer


def main():
    port = 3334
    user = ''
    password = ''
    l = sys.argv

    if (len(l) > 1 and l[1]):
        user = l[1]

    if (len(l) > 2 and l[2]):
        password = l[2]

    if (len(l) > 3 and l[3]):
        port = int(l[3])


    authorizer = DummyAuthorizer()
    authorizer.add_user(user, password, os.getcwd(), perm='elradfmwM')
    #authorizer.add_anonymous("/home/nobody")

    handler = FTPHandler
    handler.authorizer = authorizer

    logging.basicConfig(level=logging.DEBUG)

    server = FTPServer(("127.0.0.1", port), handler)
    server.serve_forever()

if __name__ == '__main__':
    main()


