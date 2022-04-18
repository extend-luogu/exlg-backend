#!/usr/bin/env python3
from sys import stdin

from redis import Redis

redis = Redis()

for line in stdin.readlines():
    if line.strip():
        redis.rpush("exlg:activation", line.strip())
