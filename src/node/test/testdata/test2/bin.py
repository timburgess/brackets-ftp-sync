#!/usr/bin/env python

# happy bananas

import os
import pdb
pdb.set_trace()

raw = raw_input('Enter input seperated by comma:').split(',')

dlist = [str(int(i,2)) for i in raw if not int(i,2) % 3]
print ','.join(dlist)
