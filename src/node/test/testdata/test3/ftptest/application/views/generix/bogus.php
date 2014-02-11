#!/usr/bin/env python

import os
import re
import pdb

raw = raw_input('Enter input seperated by comma:').split(',')

def check(pwd):
    #pdb.set_trace()

    if 4 <= len(pwd) <= 6:
        if ' ' not in pwd:
            if re.match(r'.*\d', pwd):
                if re.match(r'.*[A-Z]', pwd):
                    if re.match(r'.*[a-z]', pwd):
                        return True

dlist = filter(check, raw)
#print dlist
print ','.join(dlist)
