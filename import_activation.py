#!/usr/bin/env python3
from sys import stdin

from redis import Redis

from badge import ACTIVATION_KEY, key_to

redis = Redis()

for line in stdin.readlines():
    if line.strip():
        redis.rpush(key_to(ACTIVATION_KEY), line.strip())
