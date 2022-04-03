from functools import partial

from flask import Flask, jsonify, request
from redis import Redis

NAMESPACE = "exlg"
BADGE = "badge"

KEY = f"{NAMESPACE}:{{}}:{{key}}"
badge = partial(KEY.format, key=BADGE)
app = Flask(__name__)
r = Redis(decode_responses=True)


@app.route("/get/")
def get_badge():
    q = set(request.json)
    return jsonify(dict(zip(q, r.mget(map(badge, q)))))


@app.route("/set/")
def set_badge():
    r.mset(dict(zip(map(badge, request.json.keys()), request.json.values())))
    return jsonify(request.json)


if __name__ == "__main__":
    app.run()
